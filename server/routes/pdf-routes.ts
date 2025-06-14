/**
 * PDF 처리 및 번역 라우트
 * 
 * 개선된 PDF 처리 파이프라인을 위한 라우트 핸들러
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { verifyToken, optionalToken } from '../token-auth';
import { processPDFAndTranslate, extractTextWithPyMuPDF } from '../services/pdf_processor_service';
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, not, sql } from "drizzle-orm";

// 라우터 초기화
const router = Router();

// 파일 업로드 설정
const REPO_ROOT = process.cwd();
const TEMP_UPLOAD_DIR = path.join(REPO_ROOT, 'uploads', 'tmp');
const PROCESSED_DIR = path.join(REPO_ROOT, 'uploads', 'processed');

// 디렉토리 확인 및 생성
[TEMP_UPLOAD_DIR, PROCESSED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 멀터 스토리지 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // 파일명 안전하게 처리 (타임스탬프 + 랜덤 문자열)
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const safeFileName = `${timestamp}-${randomString}${ext}`;
    
    // 원본 파일명 저장 (req에 커스텀 프로퍼티 추가)
    if (!req.fileOriginalNames) {
      req.fileOriginalNames = {};
    }
    req.fileOriginalNames[safeFileName] = file.originalname;
    
    cb(null, safeFileName);
  }
});

// 업로드 미들웨어
const upload = multer({ storage });

// 관리자 접근 확인 헬퍼 함수
function checkAdminAccess(req: Request, res: Response): boolean {
  const user = (req as any).user;
  if (!user || !user.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

// PDF 텍스트 추출 라우트
router.post('/process', verifyToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!checkAdminAccess(req, res)) return;

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // PDF 파일 확인
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: "Uploaded file is not a PDF" });
    }

    console.log('PDF 파일 업로드됨:', file.originalname, file.size, 'bytes');

    // PyMuPDF로 텍스트 추출
    const result = await extractTextWithPyMuPDF(file.path);

    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'PDF 처리 실패'
      });
    }

    // 추출된 텍스트 파일 생성
    const outputFileName = file.originalname.replace(/\.pdf$/i, '-extracted.txt');
    const outputPath = path.join(
      PROCESSED_DIR,
      `${Date.now()}-${outputFileName}`
    );

    // 세그먼트에서 텍스트 추출
    const segments = result.segments || [];
    const extractedText = segments.map(segment => segment.source).join('\n\n');

    // 파일에 저장
    fs.writeFileSync(outputPath, extractedText);

    // 다운로드 URL 생성
    const fileUrl = `/api/download?file=${encodeURIComponent(outputPath)}`;

    // 응답 반환
    return res.status(200).json({
      message: 'PDF text extraction completed',
      fileSize: file.size,
      fileName: file.originalname,
      outputFileName,
      segments: segments.map(s => s.source),
      segmentCount: segments.length,
      extractedText: extractedText.substring(0, 1000) + 
        (extractedText.length > 1000 ? '...' : ''),
      pageCount: result.metadata?.pageCount || 1,
      processingTimeMs: result.metadata?.processingTimeMs || 0,
      fileUrl
    });
  } catch (error: any) {
    console.error('PDF 처리 오류:', error);
    return res.status(500).json({ 
      error: `PDF processing failed: ${error.message}` 
    });
  } finally {
    // 임시 파일 정리
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// PDF -> 프로젝트 생성 라우트
router.post('/process-project', verifyToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // PDF 파일 확인
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: "Uploaded file is not a PDF" });
    }

    // 프로젝트 정보 추출
    const { 
      projectName, 
      sourceLanguage = 'ko', 
      targetLanguage = 'en',
      description = ''
    } = req.body;

    if (!projectName) {
      return res.status(400).json({ error: "Project name is required" });
    }

    // 현재 사용자 
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // 1. 프로젝트 생성
      const [project] = await db.insert(schema.projects).values({
        name: projectName,
        description,
        sourceLanguage,
        targetLanguage,
        userId: user.id,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // 2. 파일 생성 - 스키마에 맞춰 필드 이름 및 값 설정
      const [fileRecord] = await db.insert(schema.files).values({
        projectId: project.id,
        name: file.originalname,
        content: "",  // 필요한 경우 내용 저장
        processingStatus: 'pending',
        processingProgress: 0
      }).returning();

      // 3. 즉시 응답 반환 (사용자가 빠르게 프로젝트에 접근 가능)
      const response = {
        message: 'Project created successfully',
        project,
        file: fileRecord
      };

      // 4. 백그라운드에서 비동기 PDF 처리 및 번역 시작
      setImmediate(async () => {
        try {
          await processPDFAndTranslate(fileRecord.id, file.path, project.id);
        } catch (error) {
          console.error('PDF 처리 및 번역 오류:', error);
        }
      });

      return res.status(201).json(response);
    } catch (error: any) {
      console.error('프로젝트 생성 오류:', error);
      return res.status(500).json({ 
        error: `Project creation failed: ${error.message}` 
      });
    }
  } catch (error: any) {
    console.error('요청 처리 오류:', error);
    return res.status(500).json({ 
      error: `Request processing failed: ${error.message}` 
    });
  }
});

// PDF 처리 상태 확인 라우트
router.get('/status/:fileId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId || isNaN(parseInt(fileId))) {
      return res.status(400).json({ error: "Invalid file ID" });
    }

    // 파일 정보 가져오기
    const file = await db.query.files.findFirst({
      where: eq(schema.files.id, parseInt(fileId)),
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // 세그먼트 수 확인
    const segmentCount = await db.select({ count: sql`count(*)` })
      .from(schema.translationUnits)
      .where(eq(schema.translationUnits.fileId, file.id))
      .execute()
      .then(result => result[0]?.count || 0);

    // 번역된 세그먼트 수 확인
    const translatedCount = await db.select({ count: sql`count(*)` })
      .from(schema.translationUnits)
      .where(
        and(
          eq(schema.translationUnits.fileId, file.id),
          not(eq(schema.translationUnits.target, ''))
        )
      )
      .execute()
      .then(result => result[0]?.count || 0);

    // 파일 상태와 함께 응답
    return res.status(200).json({
      file,
      segments: {
        total: Number(segmentCount),
        translated: Number(translatedCount),
        progress: Number(segmentCount) > 0 ? Math.round((Number(translatedCount) / Number(segmentCount)) * 100) : 0
      }
    });
  } catch (error: any) {
    console.error('파일 상태 확인 오류:', error);
    return res.status(500).json({ 
      error: `Status check failed: ${error.message}` 
    });
  }
});

// PDF 병합 라우트 (향후 구현)
router.post('/align', verifyToken, upload.fields([
  { name: 'sourceFile', maxCount: 1 },
  { name: 'targetFile', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    if (!checkAdminAccess(req, res)) return;

    // 이 부분은 향후 구현 예정
    return res.status(501).json({ message: "PDF alignment feature coming soon" });
  } catch (error: any) {
    console.error('PDF 병합 오류:', error);
    return res.status(500).json({ 
      error: `PDF alignment failed: ${error.message}` 
    });
  }
});

export default router;