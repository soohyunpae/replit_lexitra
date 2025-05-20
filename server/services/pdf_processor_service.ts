/**
 * PDF 처리 서비스
 * 개선된 PDF 처리 및 번역 워크플로우를 위한 서비스
 */

import { spawn, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { REPO_ROOT } from '../constants';
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { translateWithGPT } from "../openai";

// PDF 처리 결과 인터페이스
interface PDFProcessingResult {
  success: boolean;
  message: string;
  segments?: Array<{
    id: number;
    source: string;
    page?: number;
    position?: any;
  }>;
  metadata?: {
    fileName: string;
    pageCount: number;
    processingTimeMs: number;
    totalSegments?: number;
  };
  error?: string;
  fileUrl?: string;
}

// 유사도 계산 함수
function calculateSimilarity(text1: string, text2: string): number {
  // 간단한 유사도 계산 함수 (자카드 유사도)
  if (!text1 || !text2) return 0;
  
  // 소문자로 변환하고 단어 분리
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  // 공통 단어 수
  const intersection = words1.filter(word => words2.includes(word));
  const union = Array.from(new Set([...words1, ...words2]));
  
  // 자카드 유사도 계산
  return intersection.length / union.length;
}

/**
 * PyMuPDF 기반 PDF 텍스트 추출 함수
 * 
 * @param pdfPath PDF 파일 경로
 * @returns 처리 결과 
 */
export async function extractTextWithPyMuPDF(pdfPath: string): Promise<PDFProcessingResult> {
  return new Promise((resolve, reject) => {
    // Python 스크립트 경로 (server/services/pdf_bridge.py)
    const scriptPath = path.join(REPO_ROOT, 'server', 'services', 'pdf_bridge.py');
    const cachePath = path.join(REPO_ROOT, 'uploads', 'cache');
    
    // 캐시 디렉토리 생성
    if (!fs.existsSync(cachePath)) {
      fs.mkdirSync(cachePath, { recursive: true });
    }
    
    // Python 명령어 구성
    const command = `python3 "${scriptPath}" extract "${pdfPath}" --cache-dir="${cachePath}" --max-segments=50 --sentences`;
    
    console.log('PDF 추출 명령어 실행:', command);
    
    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('PDF 처리 오류:', error);
        console.error('오류 출력:', stderr);
        return resolve({
          success: false,
          message: '처리 오류',
          error: error.message
        });
      }
      
      if (stderr) {
        console.warn('PDF 처리 경고:', stderr);
      }
      
      try {
        // 출력 JSON 파싱
        const result = JSON.parse(stdout);
        
        // 오류 확인
        if (result.error) {
          return resolve({
            success: false,
            message: '처리 오류',
            error: result.error
          });
        }
        
        // 성공 결과 반환
        return resolve({
          success: true,
          message: '성공적으로 처리됨',
          segments: result.segments,
          metadata: result.metadata
        });
      } catch (parseError: any) {
        console.error('JSON 파싱 오류:', parseError);
        return resolve({
          success: false,
          message: 'JSON 파싱 오류',
          error: parseError.message
        });
      }
    });
  });
}

/**
 * PDF 파일 처리 및 번역 워크플로우
 * 
 * @param fileId 파일 ID
 * @param filePath 파일 경로
 * @param projectId 프로젝트 ID
 */
export async function processPDFAndTranslate(fileId: number, filePath: string, projectId: number): Promise<void> {
  try {
    console.log(`[PDF 처리] 파일 ID ${fileId} 처리 시작`);
    
    // 1. PDF 텍스트 추출
    const extractionResult = await extractTextWithPyMuPDF(filePath);
    
    if (!extractionResult.success || !extractionResult.segments) {
      throw new Error(extractionResult.error || '텍스트 추출 실패');
    }
    
    const segments = extractionResult.segments;
    console.log(`[PDF 처리] ${segments.length}개 세그먼트 추출 완료`);
    
    // 2. 세그먼트 저장
    const segmentInserts = segments.map(segment => ({
      source: segment.source,
      target: "",
      fileId: fileId,
      status: "Draft",
      origin: "MT",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    // 세그먼트 데이터베이스 저장
    const savedSegments = await db
      .insert(schema.translationUnits)
      .values(segmentInserts)
      .returning();
    
    console.log(`[PDF 처리] ${savedSegments.length}개 세그먼트 저장 완료`);
    
    // 3. 프로젝트 정보 가져오기
    const projectInfo = await db.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });
    
    // 4. 번역 수행 (프로젝트 정보가 있는 경우만)
    if (projectInfo && projectInfo.sourceLanguage && projectInfo.targetLanguage) {
      console.log("[PDF 처리] 자동 번역 준비 중...");
      
      // 5. TM 및 용어집 가져오기
      const tmMatches = await db.query.translationMemory.findMany({
        where: and(
          eq(schema.translationMemory.sourceLanguage, projectInfo.sourceLanguage),
          eq(schema.translationMemory.targetLanguage, projectInfo.targetLanguage)
        ),
        limit: 100,
      });
      
      const glossaryTerms = await db.query.glossary.findMany({
        where: and(
          eq(schema.glossary.sourceLanguage, projectInfo.sourceLanguage),
          eq(schema.glossary.targetLanguage, projectInfo.targetLanguage)
        ),
        limit: 100,
      });
      
      // 6. 세그먼트 순차 번역 (병렬 처리로 개선 가능)
      console.log(`[PDF 처리] ${savedSegments.length}개 세그먼트 번역 시작`);
      
      // 배치 크기 설정 (한 번에 5개 세그먼트 병렬 처리)
      const batchSize = 5;
      
      // 세그먼트를 배치로 나누기
      for (let i = 0; i < savedSegments.length; i += batchSize) {
        const batch = savedSegments.slice(i, i + batchSize);
        
        // 배치 처리 진행률 표시
        console.log(`[PDF 처리] 배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(savedSegments.length / batchSize)} 처리 중...`);
        
        // 배치 내 세그먼트 병렬 처리
        await Promise.all(batch.map(async (segment) => {
          try {
            // TM 매칭 확인
            const relevantTmMatches = tmMatches
              .filter(tm => calculateSimilarity(segment.source, tm.source) > 0.7)
              .slice(0, 5);
            
            // 용어집 매칭 확인 
            const relevantTerms = glossaryTerms.filter(term => 
              segment.source.toLowerCase().includes(term.source.toLowerCase())
            );
            
            // TM 컨텍스트 준비
            const context = relevantTmMatches.map(tm => `${tm.source} => ${tm.target}`);
            
            // GPT 번역 호출
            const translationResult = await translateWithGPT({
              source: segment.source,
              sourceLanguage: projectInfo.sourceLanguage,
              targetLanguage: projectInfo.targetLanguage,
              context: context.length > 0 ? context : undefined,
              glossaryTerms: relevantTerms.map(term => ({
                source: term.source,
                target: term.target
              }))
            });
            
            if (translationResult) {
              // 번역 결과 저장
              await db
                .update(schema.translationUnits)
                .set({
                  target: translationResult.target,
                  status: "MT",
                  updatedAt: new Date(),
                })
                .where(eq(schema.translationUnits.id, segment.id));
              
              // 간단한 로그 (추후 progress 구현시 유용)
              if (segment.id % 10 === 0) {
                console.log(`[PDF 처리] 세그먼트 ${segment.id} 번역 완료 (총 ${savedSegments.length}개 중)`);
              }
            }
          } catch (translationError) {
            // 개별 세그먼트 번역 실패 시 계속 진행
            console.error(`[PDF 처리] 세그먼트 ID ${segment.id} 번역 실패:`, translationError);
          }
        }));
      }
      
      // 7. 파일 상태 업데이트 (번역 완료)
      await db
        .update(schema.files)
        .set({
          processingStatus: "ready",
          updatedAt: new Date(),
        })
        .where(eq(schema.files.id, fileId));
      
      console.log(`[PDF 처리] 파일 ID ${fileId}의 모든 처리 완료. 상태를 'ready'로 변경함`);
    }
  } catch (error: any) {
    console.error(`[PDF 처리] 처리 오류 (파일 ID: ${fileId}):`, error);
    
    // 오류 발생 시 파일 상태 업데이트
    await db
      .update(schema.files)
      .set({
        processingStatus: "error",
        errorMessage: error.message || "PDF 처리 중 오류 발생",
        updatedAt: new Date(),
      })
      .where(eq(schema.files.id, fileId));
  }
}