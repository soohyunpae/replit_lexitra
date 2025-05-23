import express from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { REPO_ROOT, TEMP_UPLOAD_DIR } from '../constants';
import * as templateService from '../services/docx_template_service';

// 업로드 디렉토리 설정
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
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
router.get('/templates', async (req, res) => {
  try {
    const templates = await templateService.getTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('템플릿 목록 조회 오류:', error);
    res.status(500).json({ error: '템플릿 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({ error: '유효하지 않은 템플릿 ID입니다.' });
    }

    const templateDetail = await templateService.getTemplateDetails(templateId);
    if (!templateDetail) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
    }

    res.json({
      template: templateDetail.template,
      fields: templateDetail.fields
    });
  } catch (error) {
    console.error('템플릿 상세 정보 조회 오류:', error);
    res.status(500).json({ error: '템플릿 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

router.post('/templates', upload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '템플릿 파일이 제공되지 않았습니다.' });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: '템플릿 이름은 필수입니다.' });
    }

    // 테스트를 위해 사용자 인증 체크 우회 (기본 사용자 ID 1로 설정)
    const userId = 1; // 테스트용 고정 사용자 ID

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

router.put('/templates/:id/fields/:fieldId', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const fieldId = parseInt(req.params.fieldId);
    
    if (isNaN(templateId) || isNaN(fieldId)) {
      return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
    }

    const { description, isRequired, isTranslatable, fieldType, sampleContent } = req.body;

    await templateService.updateTemplateField(fieldId, {
      description,
      isRequired,
      isTranslatable,
      fieldType,
      sampleContent
    });

    res.json({ 
      success: true, 
      message: '템플릿 필드가 성공적으로 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('템플릿 필드 업데이트 오류:', error);
    res.status(500).json({ error: '템플릿 필드를 업데이트하는 중 오류가 발생했습니다.' });
  }
});

router.delete('/templates/:id', async (req, res) => {
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
router.post('/templates/match', async (req, res) => {
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