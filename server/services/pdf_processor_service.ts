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

// 번역 진행률 상수 정의
const PROGRESS_MILESTONES = {
  INITIAL_BATCH_SIZE: 10,           // 우선 번역할 세그먼트 수
  PARTIAL_READY_THRESHOLD: 70,      // 일부 완료로 표시할 진행률
  TRANSLATION_START: 70,            // 나머지 번역 시작 진행률
  COMPLETE: 100                     // 완료 진행률
};

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

  if (segments.length === 0) {
    return;
  }

  // 1단계: 첫 N개 세그먼트를 우선 번역 (사용자가 빠르게 확인 가능)
  const initialBatch = segments.slice(0, PROGRESS_MILESTONES.INITIAL_BATCH_SIZE);
  const remainingSegments = segments.slice(PROGRESS_MILESTONES.INITIAL_BATCH_SIZE);

  console.log(`첫 번째 배치: ${initialBatch.length}개 세그먼트 번역 시작`);

  // 첫 10개 세그먼트 번역
  for (const segment of initialBatch) {
    await translateSingleSegment(segment, project.sourceLanguage, project.targetLanguage);
  }

  // 첫 번째 배치 완료 후 파일 상태를 'partially_ready'로 업데이트
  await updateProcessingProgress(fileId, PROGRESS_MILESTONES.PARTIAL_READY_THRESHOLD, "partially_ready");

  console.log(`첫 번째 배치 완료. 나머지 ${remainingSegments.length}개 세그먼트 백그라운드 번역 시작`);

  // 2단계: 나머지 세그먼트를 백그라운드에서 순차적으로 번역
  if (remainingSegments.length > 0) {
    // 백그라운드에서 나머지 번역 처리
    setImmediate(async () => {
      await translateRemainingSegments(remainingSegments, project.sourceLanguage, project.targetLanguage, fileId);
    });
  } else {
    // 모든 번역 완료 (세그먼트가 10개 이하인 경우)
    await updateProcessingProgress(fileId, 100, "ready");
  }

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const progress = 70 + Math.round((i / segments.length) * 30); // 70%에서 100%로

    try {
      console.log(`[비동기 처리] 세그먼트 ${segment.id} 번역 시작 (${i + 1}/${segments.length})`);

      // 진행률 업데이트 - 번역 상태로 변경
      await updateProcessingProgress(fileId, progress, 'translating');

      // 번역 API 호출 및 결과 업데이트
      // await translateAndUpdateSegment(segment, fileId); // 이 함수는 필요에 따라 구현
    } catch (error) {
      console.error(`세그먼트 ${segment.id} 번역 중 오류 발생:`, error);
      // 오류 처리 (예: 오류 상태 업데이트, 재시도 로직 등)
    }
  }

  // 최종적으로 'ready' 상태로 업데이트 (모든 세그먼트가 완료되었음을 가정)
  await updateProcessingProgress(fileId, 100, 'ready');
}

async function translateSingleSegment(
  segment: any, 
  sourceLanguage: string, 
  targetLanguage: string
): Promise<void> {
  try {
    // 번역 중 상태로 업데이트
    await db.update(schema.translationUnits)
      .set({
        status: 'Draft', // 번역 워크플로에 맞는 상태
        target: '번역 중...', // 사용자에게 진행 상황 표시
        origin: 'MT',
        updatedAt: new Date()
      })
      .where(eq(schema.translationUnits.id, segment.id));

    const translation = await translateWithRetry(
      segment.source,
      sourceLanguage,
      targetLanguage
    );

    await db.update(schema.translationUnits)
      .set({
        target: translation,
        status: 'MT', // MT 번역 완료 시 바로 MT 상태로 설정
        origin: 'MT',
        updatedAt: new Date()
      })
      .where(eq(schema.translationUnits.id, segment.id));

    console.log(`세그먼트 ${segment.id} 번역 완료: ${segment.source.substring(0, 50)}...`);

  } catch (error) {
    console.error(`세그먼트 ${segment.id} 번역 실패:`, error);

    // 번역 실패 시 원문 그대로 두고 상태 유지
    await db.update(schema.translationUnits)
      .set({
        target: '', // 빈 상태로 두어 수동 번역 필요함을 표시
        status: 'new', // 번역되지 않은 상태로 되돌림
        origin: '', // origin 초기화
        updatedAt: new Date()
      })
      .where(eq(schema.translationUnits.id, segment.id));
  }
}

async function translateRemainingSegments(
  segments: any[],
  sourceLanguage: string,
  targetLanguage: string,
  fileId: number
): Promise<void> {
  let completedCount = 0;
  const totalRemaining = segments.length;

  console.log(`백그라운드 번역 시작: ${totalRemaining}개 세그먼트`);

  for (const segment of segments) {
    await translateSingleSegment(segment, sourceLanguage, targetLanguage);
    completedCount++;

    // 진행률 업데이트 (PARTIAL_READY_THRESHOLD% + 나머지를 점진적으로)
    const remainingProgress = PROGRESS_MILESTONES.COMPLETE - PROGRESS_MILESTONES.PARTIAL_READY_THRESHOLD;
    const progress = PROGRESS_MILESTONES.PARTIAL_READY_THRESHOLD + Math.round((completedCount / totalRemaining) * remainingProgress);
    await updateProcessingProgress(fileId, progress, "translating");

    // 진행 상황 로그
    if (completedCount % 5 === 0 || completedCount === totalRemaining) {
      console.log(`백그라운드 번역 진행: ${completedCount}/${totalRemaining} (${progress}%)`);
    }

    // 과부하 방지를 위한 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  // 모든 번역 완료
  await updateProcessingProgress(fileId, 100, "ready");
  console.log(`✅ 모든 세그먼트 번역 완료: 총 ${10 + totalRemaining}개`);
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