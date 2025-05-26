/**
 * DOCX Template Service - docx-templater 기반으로 리팩토링
 * 관리자용 DOCX 템플릿 관리 및 사용자용 템플릿 적용 기능을 제공하는 서비스
 */

import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
import { REPO_ROOT } from '../constants';
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
// Import docx utility functions
import { validateTemplate, extractPlaceholders, fillDocxTemplate, type TemplateData } from '../utils/docx_fill';

// 템플릿 파일 업로드 및 저장 경로
const TEMPLATE_DIR = path.join(REPO_ROOT, 'uploads', 'templates');

// 디렉토리가 없으면 생성
if (!fs.existsSync(TEMPLATE_DIR)) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
}

/**
 * DOCX 템플릿 분석 - docx-templater placeholder 추출
 */
export async function analyzeDocxTemplate(filePath: string): Promise<{
  placeholders: string[];
  isValid: boolean;
  errors: string[];
  htmlPreview: string;
}> {
  try {
    // docx-templater를 사용하여 템플릿 유효성 검사 및 placeholder 추출
    const validation = await validateTemplate(filePath);
    
    // mammoth를 사용해 HTML 미리보기 생성 (표시용)
    let htmlPreview = '';
    try {
      const result = await mammoth.convertToHtml({ path: filePath });
      htmlPreview = result.value.substring(0, 1000);
    } catch (previewError) {
      console.warn("HTML 미리보기 생성 실패:", previewError);
      htmlPreview = '미리보기를 생성할 수 없습니다.';
    }
    
    return {
      placeholders: validation.placeholders,
      isValid: validation.isValid,
      errors: validation.errors,
      htmlPreview,
    };
  } catch (error) {
    console.error("DOCX 템플릿 분석 오류:", error);
    return {
      placeholders: [],
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      htmlPreview: '',
    };
  }
}

/**
 * 관리자가 업로드한 템플릿 파일 저장 및 처리 - docx-templater 기반
 */
export async function saveTemplate(
  file: Express.Multer.File,
  name: string,
  description: string,
  userId: number
): Promise<number> {
  try {
    // 템플릿 파일 저장 경로
    const templateFilename = `template_${Date.now()}_${path.basename(file.originalname)}`;
    const templatePath = path.join(TEMPLATE_DIR, templateFilename);
    
    // 파일 복사
    fs.copyFileSync(file.path, templatePath);
    
    // 템플릿 분석
    const analysis = await analyzeDocxTemplate(templatePath);
    
    // DB에 템플릿 정보 저장
    const [newTemplate] = await db.insert(schema.docTemplates)
      .values({
        name,
        description,
        docxFilePath: templatePath,
        placeholderData: {
          placeholders: analysis.placeholders,
          htmlPreview: analysis.htmlPreview,
          analyzedAt: new Date().toISOString(),
        },
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // 각 placeholder를 템플릿 필드로 저장
    for (let i = 0; i < analysis.placeholders.length; i++) {
      const placeholder = analysis.placeholders[i];
      await db.insert(schema.templateFields)
        .values({
          templateId: newTemplate.id,
          placeholder,
          fieldType: 'text',
          description: `Auto-detected field: ${placeholder}`,
          isRequired: true,
          isTranslatable: true,
          orderIndex: i,
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }
    
    return newTemplate.id;
  } catch (error) {
    console.error("템플릿 저장 오류:", error);
    throw error;
  }
}

/**
 * 템플릿 필드 업데이트
 */
export async function updateTemplateField(
  fieldId: number,
  updates: Partial<{
    description: string;
    isRequired: boolean;
    isTranslatable: boolean;
    fieldType: string;
    sampleContent: string;
  }>
): Promise<void> {
  try {
    await db.update(schema.templateFields)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(schema.templateFields.id, fieldId));
  } catch (error) {
    console.error("템플릿 필드 업데이트 오류:", error);
    throw error;
  }
}

/**
 * 템플릿 목록 조회
 */
export async function getTemplates(): Promise<schema.DocTemplate[]> {
  try {
    const templates = await db.query.docTemplates.findMany({
      with: {
        creator: {
          columns: {
            id: true,
            username: true
          }
        },
        fields: true
      }
    });
    
    return templates;
  } catch (error) {
    console.error("템플릿 목록 조회 오류:", error);
    throw error;
  }
}

/**
 * 템플릿 상세 정보 조회
 */
export async function getTemplateDetails(templateId: number): Promise<{
  template: schema.DocTemplate;
  fields: schema.TemplateField[];
} | null> {
  try {
    const template = await db.query.docTemplates.findFirst({
      where: eq(schema.docTemplates.id, templateId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true
          }
        },
        fields: true
      }
    });
    
    if (!template) return null;
    
    return {
      template,
      fields: template.fields
    };
  } catch (error) {
    console.error("템플릿 상세 정보 조회 오류:", error);
    throw error;
  }
}

/**
 * 템플릿 삭제
 */
export async function deleteTemplate(templateId: number): Promise<boolean> {
  try {
    // 템플릿 필드 먼저 삭제
    await db.delete(schema.templateFields)
      .where(eq(schema.templateFields.templateId, templateId));
    
    // 템플릿 정보 조회
    const template = await db.query.docTemplates.findFirst({
      where: eq(schema.docTemplates.id, templateId)
    });
    
    if (!template) return false;
    
    // 파일 삭제
    if (fs.existsSync(template.docxFilePath)) {
      fs.unlinkSync(template.docxFilePath);
    }
    
    // 템플릿 정보 삭제
    await db.delete(schema.docTemplates)
      .where(eq(schema.docTemplates.id, templateId));
    
    return true;
  } catch (error) {
    console.error("템플릿 삭제 오류:", error);
    throw error;
  }
}

/**
 * DOCX 파일과 템플릿 구조 비교 - docx-templater 기반
 * 사용자가 업로드한 DOCX가 등록된 템플릿과 일치하는지 확인
 */
export async function matchTemplateToDocument(
  docxPath: string
): Promise<{
  template: schema.DocTemplate;
  matchScore: number;
  fields: schema.TemplateField[];
} | null> {
  try {
    console.log("템플릿 매칭 시작:", docxPath);
    
    // 템플릿 목록 조회
    const templates = await getTemplates();
    console.log(`등록된 템플릿 수: ${templates.length}`);
    
    if (templates.length === 0) {
      console.log("등록된 템플릿이 없습니다.");
      return null;
    }
    
    // 문서에서 placeholder 추출
    const analysis = await analyzeDocxTemplate(docxPath);
    const documentPlaceholders = analysis.placeholders;
    console.log("문서에서 추출된 placeholders:", documentPlaceholders);
    
    // placeholder가 없어도 텍스트 기반 매칭 시도
    let bestMatch: {
      template: schema.DocTemplate;
      matchScore: number;
      fields: schema.TemplateField[];
    } | null = null;
    
    // 각 템플릿과 비교
    for (const template of templates) {
      const templateDetail = await getTemplateDetails(template.id);
      
      if (!templateDetail) continue;
      
      console.log(`템플릿 "${template.name}" 검사 중...`);
      
      let matchScore = 0;
      
      // placeholder 기반 매칭 (있는 경우)
      if (documentPlaceholders.length > 0) {
        matchScore = calculatePlaceholderMatchScore(
          documentPlaceholders, 
          templateDetail.fields
        );
        console.log(`템플릿 "${template.name}" placeholder 매칭 점수: ${matchScore}`);
      }
      
      // placeholder 매칭이 부족한 경우 텍스트 기반 매칭
      if (matchScore < 0.5) {
        matchScore = await calculateTextBasedMatchScore(docxPath, template);
        console.log(`템플릿 "${template.name}" 텍스트 기반 매칭 점수: ${matchScore}`);
      }
      
      // 현재까지의 최고 점수 업데이트
      if (matchScore > 0.3 && (!bestMatch || matchScore > bestMatch.matchScore)) {
        bestMatch = {
          template: templateDetail.template,
          matchScore,
          fields: templateDetail.fields.filter(f => f.isTranslatable)
        };
      }
    }
    
    if (bestMatch) {
      console.log(`최적 매칭 템플릿: "${bestMatch.template.name}" (점수: ${bestMatch.matchScore})`);
    } else {
      console.log("매칭되는 템플릿을 찾을 수 없습니다.");
    }
    
    return bestMatch;
  } catch (error) {
    console.error("템플릿 매칭 오류:", error);
    return null;
  }
}

/**
 * placeholder 기반 템플릿 매칭 점수 계산
 */
function calculatePlaceholderMatchScore(
  documentPlaceholders: string[],
  templateFields: schema.TemplateField[]
): number {
  if (documentPlaceholders.length === 0 || templateFields.length === 0) {
    return 0;
  }
  
  const templatePlaceholders = templateFields.map(f => f.placeholder);
  
  // 정확히 일치하는 placeholder 개수
  const exactMatches = documentPlaceholders.filter(dp => 
    templatePlaceholders.includes(dp)
  ).length;
  
  // Jaccard similarity (교집합 / 합집합)
  const union = new Set([...documentPlaceholders, ...templatePlaceholders]).size;
  const intersection = exactMatches;
  
  return intersection / union;
}

/**
 * 텍스트 기반 템플릿 매칭 점수 계산
 */
async function calculateTextBasedMatchScore(
  docxPath: string,
  template: schema.DocTemplate
): Promise<number> {
  try {
    // mammoth를 사용해 문서 텍스트 추출
    const documentResult = await mammoth.extractRawText({ path: docxPath });
    const documentText = documentResult.value.toLowerCase();
    
    // 템플릿 파일에서 텍스트 추출
    const templateResult = await mammoth.extractRawText({ path: template.docxFilePath });
    const templateText = templateResult.value.toLowerCase();
    
    // 간단한 키워드 기반 유사도 계산
    const documentWords = new Set(documentText.split(/\s+/).filter(w => w.length > 3));
    const templateWords = new Set(templateText.split(/\s+/).filter(w => w.length > 3));
    
    // 공통 단어 수 계산
    const commonWords = [...documentWords].filter(word => templateWords.has(word));
    const union = new Set([...documentWords, ...templateWords]);
    
    const similarity = commonWords.length / union.size;
    
    // 파일명 기반 추가 점수 (옵션)
    let nameBonus = 0;
    const docName = docxPath.toLowerCase();
    const templateName = template.name.toLowerCase();
    
    // 이름에 공통 키워드가 있으면 보너스 점수
    const nameWords = templateName.split(/\s+/);
    for (const word of nameWords) {
      if (word.length > 2 && docName.includes(word)) {
        nameBonus += 0.1;
      }
    }
    
    return Math.min(similarity + nameBonus, 1.0);
  } catch (error) {
    console.error("텍스트 기반 매칭 오류:", error);
    return 0;
  }
}

/**
 * 템플릿에 데이터를 삽입하여 DOCX 파일 생성
 */
export async function generateDocxFromTemplate(
  templateId: number,
  data: { [placeholder: string]: string },
  outputFileName?: string
): Promise<{
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}> {
  try {
    const templateDetail = await getTemplateDetails(templateId);
    
    if (!templateDetail) {
      return {
        success: false,
        error: '템플릿을 찾을 수 없습니다.'
      };
    }
    
    // docxtemplater를 사용하여 실제 DOCX 파일 생성
    const result = await fillDocxTemplate(
      templateDetail.template.docxFilePath,
      data,
      outputFileName
    );
    
    if (result.success) {
      // 사용 횟수 증가
      await db.update(schema.docTemplates)
        .set({
          useCount: templateDetail.template.useCount + 1,
          updatedAt: new Date()
        })
        .where(eq(schema.docTemplates.id, templateId));
      
      return {
        success: true,
        fileName: result.fileName,
        filePath: result.filePath,
      };
    } else {
      return {
        success: false,
        error: result.error || 'DOCX 파일 생성에 실패했습니다.'
      };
    }
  } catch (error) {
    console.error("DOCX 생성 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}