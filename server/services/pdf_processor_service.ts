import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { REPO_ROOT } from '../constants';
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { translateWithGPT } from '../openai';

export interface PDFProcessingResult {
  success: boolean;
  segments?: Array<{
    id: number;
    source: string;
    page: number;
    bbox?: number[];
  }>;
  metadata?: {
    fileName: string;
    pageCount: number;
    processingTimeMs: number;
  };
  error?: string;
}

export async function extractTextWithPyMuPDF(filePath: string): Promise<PDFProcessingResult> {
  const pythonScript = path.join(REPO_ROOT, 'server', 'services', 'pdf_processor.py');
  const command = `python3 "${pythonScript}" extract "${filePath}"`;

  return new Promise((resolve) => {
    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('PDF 처리 오류:', error.message);
        resolve({ success: false, error: error.message });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve({ success: true, ...result });
      } catch (parseError) {
        console.error('PDF 파싱 오류:', parseError);
        resolve({ success: false, error: 'PDF 파싱 실패' });
      }
    });
  });
}

export async function processPDFAndTranslate(
  fileId: number,
  filePath: string,
  projectId: number
): Promise<void> {
  try {
    // 1. 파일 처리 상태 업데이트
    await updateProcessingProgress(fileId, 10, "processing");

    // 2. PDF 텍스트 추출
    const pdfResult = await extractTextWithPyMuPDF(filePath);

    if (!pdfResult.success) {
      await updateProcessingProgress(fileId, -1, "error", pdfResult.error);
      return;
    }

    await updateProcessingProgress(fileId, 30, "processing");

    // 3. 세그먼트 생성
    if (pdfResult.segments) {
      await createSegments(fileId, pdfResult.segments);
    }

    await updateProcessingProgress(fileId, 50, "translating");

    // 4. GPT 번역 시작 (재시도 로직 포함)
    await translateSegments(fileId, projectId);

    await updateProcessingProgress(fileId, 100, "ready");

  } catch (error) {
    console.error('PDF 처리 및 번역 오류:', error);
    await updateProcessingProgress(fileId, -1, "error", error instanceof Error ? error.message : "알 수 없는 오류");
  } finally {
    // 임시 파일 정리
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

async function updateProcessingProgress(
  fileId: number,
  progress: number,
  status: string,
  errorMessage?: string
): Promise<void> {
  const updateData: any = {
    processingStatus: status,
    processingProgress: progress >= 0 ? progress : 0,
    updatedAt: new Date()
  };

  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }

  await db.update(schema.files)
    .set(updateData)
    .where(eq(schema.files.id, fileId));
}

async function createSegments(
  fileId: number,
  segments: Array<{ id: number; source: string; page: number }>
): Promise<void> {
  const segmentData = segments.map(segment => ({
    fileId,
    source: segment.source,
    target: '',
    status: 'new' as const,
    page: segment.page,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  await db.insert(schema.translationUnits).values(segmentData);
}

async function translateSegments(fileId: number, projectId: number): Promise<void> {
  // 프로젝트 언어 정보 가져오기
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, projectId)
  });

  if (!project) {
    throw new Error('프로젝트를 찾을 수 없습니다');
  }

  // 번역할 세그먼트 가져오기
  const segments = await db.query.translationUnits.findMany({
    where: eq(schema.translationUnits.fileId, fileId)
  });

  // 각 세그먼트 번역 (재시도 로직 포함)
  for (const segment of segments) {
    try {
      const translation = await translateWithRetry(
        segment.source,
        project.sourceLanguage,
        project.targetLanguage
      );

      await db.update(schema.translationUnits)
        .set({
          target: translation,
          status: 'translated',
          origin: 'gpt',
          updatedAt: new Date()
        })
        .where(eq(schema.translationUnits.id, segment.id));

    } catch (error) {
      console.error(`세그먼트 ${segment.id} 번역 실패:`, error);
      // 개별 세그먼트 실패는 전체 프로세스를 중단시키지 않음
    }
  }
}

async function translateWithRetry(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  maxRetries: number = 3
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await translateWithGPT({
        source: text,
        sourceLanguage,
        targetLanguage
      });
      return result.target;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // 재시도 전 대기 (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return text; // 최종 실패 시 원문 반환
}