import express from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { REPO_ROOT } from '../constants';
import { isAdmin, isAuthenticated } from '../middlewares/auth';
import * as templateService from '../services/docx_template_service';

// 업로드 디렉토리 설정
const UPLOAD_DIR = path.join(REPO_ROOT, 'uploads', 'tmp');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'template-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 파일 필터 - DOCX 파일만 허용
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.docx') {
    return cb(new Error('Only .docx files are allowed'));
  }
  cb(null, true);
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB 제한
});

const router = express.Router();

// 관리자 전용 템플릿 API 라우트
router.get('/admin/templates', isAdmin, async (req, res) => {
  try {
    const templates = await templateService.getTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('템플릿 목록 조회 오류:', error);
    res.status(500).json({ error: '템플릿 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

router.get('/admin/templates/:id', isAdmin, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({ error: '유효하지 않은 템플릿 ID입니다.' });
    }

    const templateDetail = await templateService.getTemplateDetails(templateId);
    if (!templateDetail) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
    }

    res.json(templateDetail);
  } catch (error) {
    console.error('템플릿 상세 정보 조회 오류:', error);
    res.status(500).json({ error: '템플릿 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

router.post('/admin/templates', isAdmin, upload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '템플릿 파일이 제공되지 않았습니다.' });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: '템플릿 이름은 필수입니다.' });
    }

    // 세션에서 사용자 ID 가져오기
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '인증 정보가 유효하지 않습니다.' });
    }

    const templateId = await templateService.saveTemplate(
      req.file,
      name,
      description || '',
      userId
    );

    res.status(201).json({ 
      success: true, 
      message: '템플릿이 성공적으로 저장되었습니다.',
      templateId
    });
  } catch (error) {
    console.error('템플릿 생성 오류:', error);
    res.status(500).json({ error: '템플릿을 저장하는 중 오류가 발생했습니다.' });
  }
});

router.put('/admin/templates/:id/structures/:structureId', isAdmin, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const structureId = parseInt(req.params.structureId);
    
    if (isNaN(templateId) || isNaN(structureId)) {
      return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
    }

    const { isTranslationTarget } = req.body;
    if (typeof isTranslationTarget !== 'boolean') {
      return res.status(400).json({ error: '번역 대상 여부는 필수입니다.' });
    }

    await templateService.updateTemplateStructure(structureId, isTranslationTarget);

    res.json({ 
      success: true, 
      message: '템플릿 구조가 성공적으로 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('템플릿 구조 업데이트 오류:', error);
    res.status(500).json({ error: '템플릿 구조를 업데이트하는 중 오류가 발생했습니다.' });
  }
});

router.delete('/admin/templates/:id', isAdmin, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({ error: '유효하지 않은 템플릿 ID입니다.' });
    }

    const success = await templateService.deleteTemplate(templateId);
    if (!success) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
    }

    res.json({ 
      success: true, 
      message: '템플릿이 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('템플릿 삭제 오류:', error);
    res.status(500).json({ error: '템플릿을 삭제하는 중 오류가 발생했습니다.' });
  }
});

// 일반 사용자용 템플릿 매칭 API
router.post('/match-template', isAuthenticated, async (req, res) => {
  try {
    const { docxPath } = req.body;
    if (!docxPath) {
      return res.status(400).json({ error: 'DOCX 파일 경로가 제공되지 않았습니다.' });
    }

    const matchResult = await templateService.matchTemplateToDocument(docxPath);
    
    res.json({ 
      templateMatched: !!matchResult,
      matchResult
    });
  } catch (error) {
    console.error('템플릿 매칭 오류:', error);
    res.status(500).json({ error: '템플릿 매칭 중 오류가 발생했습니다.' });
  }
});

export default router;