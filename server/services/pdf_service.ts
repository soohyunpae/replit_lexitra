/**
 * PDF 처리 서비스 - Python 프로세서 브릿지
 * 
 * 이 서비스는 Express 애플리케이션과 Python PDF 처리기 사이의 인터페이스를 제공합니다.
 * child_process를 사용하여 Python 스크립트를 실행하고 결과를 처리합니다.
 */

import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { REPO_ROOT } from '../constants';

/**
 * PDF 처리 결과 타입
 */
export interface PDFProcessingResult {
  segments: Array<{
    id: number;
    source: string;
    page: number;
    bbox?: number[];
    position?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    original_segment_id?: number;
  }>;
  initialSegments?: any[];
  batches?: Array<{
    batchId: number;
    startSegmentId: number;
    endSegmentId: number;
    segmentCount: number;
  }>;
  metadata: {
    fileName: string;
    pageCount: number;
    processingTimeMs: number;
    extractionMethod: string;
    totalSegments?: number;
    batchCount?: number;
    fromCache?: boolean;
  };
  error?: string;
}

/**
 * PDF 서비스 클래스
 * Python 프로세서 브릿지 관리
 */
export class PDFService {
  private pythonPath: string;
  private scriptPath: string;
  private cacheDir: string;

  constructor() {
    // Python 스크립트 경로 설정
    this.scriptPath = path.join(REPO_ROOT, 'server', 'services', 'pdf_bridge.py');
    
    // 캐시 디렉토리 설정
    this.cacheDir = path.join(REPO_ROOT, 'uploads', 'cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    
    // Python 경로 설정 (환경에 따라 다름)
    this.pythonPath = this.detectPythonPath();
    
    // 스크립트에 실행 권한 부여
    this.ensureScriptExecutable();
  }

  /**
   * 시스템에서 Python 실행 파일 경로 감지
   */
  private detectPythonPath(): string {
    // 기본 Python 실행 파일들 검색
    const possiblePaths = ['python3', 'python'];
    
    // 환경 변수에 설정된 Python 경로가 있으면 사용
    if (process.env.PYTHON_PATH) {
      return process.env.PYTHON_PATH;
    }
    
    // 일반적으로 사용하는 'python3' 반환
    return 'python3';
  }

  /**
   * 스크립트 파일에 실행 권한 부여
   */
  private ensureScriptExecutable(): void {
    try {
      // Windows가 아니면 실행 권한 부여
      if (os.platform() !== 'win32') {
        fs.chmodSync(this.scriptPath, '755');
      }
    } catch (error) {
      console.error('Failed to set executable permission on script:', error);
    }
  }

  /**
   * PDF 파일에서 텍스트 추출
   * 
   * @param filePath PDF 파일 경로
   * @param options 추출 옵션
   * @returns PDF 처리 결과 Promise
   */
  public async extractTextFromPDF(
    filePath: string,
    options: {
      useSentences?: boolean;
      useCache?: boolean;
      maxSegments?: number;
    } = {}
  ): Promise<PDFProcessingResult> {
    const { useSentences = true, useCache = true, maxSegments = 50 } = options;
    
    // PDF 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // 명령어 구성
    let command = `${this.pythonPath} "${this.scriptPath}" extract "${filePath}" --cache-dir="${this.cacheDir}" --max-segments=${maxSegments}`;
    
    // 추가 옵션 적용
    if (useSentences) {
      command += ' --sentences';
    }
    
    if (!useCache) {
      command += ' --no-cache';
    }
    
    // 디버그 로그
    console.log(`Executing PDF processor command: ${command}`);
    
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`PDF processing error: ${error.message}`);
          console.error(`stderr: ${stderr}`);
          return reject(new Error(`PDF processing failed: ${error.message}`));
        }
        
        if (stderr) {
          console.warn(`PDF processing warning: ${stderr}`);
        }
        
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          console.error('Failed to parse PDF processor output:', parseError);
          console.error('Output:', stdout);
          reject(new Error('Failed to parse PDF processor output'));
        }
      });
    });
  }

  /**
   * PDF 파일 일괄 처리
   * 최적화된 처리를 위해 배치 처리 사용
   * 
   * @param filePath PDF 파일 경로
   * @param options 처리 옵션
   * @returns PDF 처리 결과 Promise
   */
  public async batchProcessPDF(
    filePath: string,
    options: {
      useCache?: boolean;
      maxSegments?: number;
    } = {}
  ): Promise<PDFProcessingResult> {
    return this.extractTextFromPDF(filePath, {
      ...options,
      useSentences: true
    });
  }

  /**
   * PDF 처리 배치 가져오기
   * 초기 응답 이후 추가 배치 가져올 때 사용
   * 
   * @param result 원본 PDF 처리 결과
   * @param batchId 가져올 배치 ID
   * @returns 요청된 배치의 세그먼트
   */
  public getBatchSegments(
    result: PDFProcessingResult,
    batchId: number
  ): Array<any> {
    if (!result.batches || batchId >= result.batches.length) {
      throw new Error(`Invalid batch ID: ${batchId}`);
    }
    
    const batch = result.batches[batchId];
    return result.segments.slice(
      batch.startSegmentId,
      batch.endSegmentId + 1
    );
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const pdfService = new PDFService();