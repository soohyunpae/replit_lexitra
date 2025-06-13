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
import { 
  validateTemplate, 
  extractPlaceholders, 
  fillDocxTemplate, 
  analyzeDocumentStructure,
  type TemplateData,
  type DocumentStructure 
} from '../utils/docx_fill';

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
    
    // 사용자 문서는 일반 텍스트 문서이므로 placeholder가 없는 것이 정상
    // 텍스트 기반 매칭만 사용
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
      
      // 레이아웃 기반 매칭 사용 (구조 + 내용 종합 분석)
      const layoutMatchResult = await calculateLayoutBasedMatchScore(docxPath, template);
      const matchScore = layoutMatchResult.overallScore;
      
      console.log(`템플릿 "${template.name}" 레이아웃 기반 매칭:`);
      console.log(`  - ${layoutMatchResult.details}`);
      console.log(`  - 최종 점수: ${(matchScore * 100).toFixed(1)}%`);
      
      // 현재까지의 최고 점수 업데이트 (임계값을 0.3으로 상향 조정)
      if (matchScore > 0.3 && (!bestMatch || matchScore > bestMatch.matchScore)) {
        bestMatch = {
          template: templateDetail.template,
          matchScore,
          fields: templateDetail.fields.filter(f => f.isTranslatable),
          matchDetails: layoutMatchResult.details // 매칭 상세 정보 추가
        };
        console.log(`새로운 최고 매칭: "${template.name}" (점수: ${(matchScore * 100).toFixed(1)}%)`);
        console.log(`  상세: ${layoutMatchResult.details}`);
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
 * 사용자 문서는 일반 텍스트이므로 placeholder 매칭은 사용하지 않음
 * 템플릿은 {{placeholder}} 형태이고, 사용자 문서는 실제 내용이 있는 일반 문서
 */

/**
 * 레이아웃 기반 템플릿 매칭 스코어 계산 (새로운 메인 함수)
 */
async function calculateLayoutBasedMatchScore(
  docxPath: string,
  template: schema.DocTemplate
): Promise<{
  overallScore: number;
  structureScore: number;
  tableScore: number;
  headingScore: number;
  contentScore: number;
  details: string;
}> {
  try {
    // 사용자 문서와 템플릿 문서 구조 분석
    const [userStructure, templateStructure] = await Promise.all([
      analyzeDocumentStructure(docxPath),
      analyzeDocumentStructure(template.docxFilePath)
    ]);

    // 1. 구조적 유사도 (40% 가중치)
    const structureScore = calculateStructuralSimilarity(userStructure, templateStructure);
    
    // 2. 표 구조 유사도 (30% 가중치)  
    const tableScore = calculateTableSimilarity(userStructure.tables, templateStructure.tables);
    
    // 3. 제목 계층 유사도 (20% 가중치)
    const headingScore = calculateHeadingSimilarity(userStructure.headings, templateStructure.headings);
    
    // 4. 텍스트 내용 유사도 (10% 가중치)
    const contentScore = await calculateTextBasedMatchScore(docxPath, template);
    
    // 가중 평균 계산
    const overallScore = (
      structureScore * 0.4 +
      tableScore * 0.3 +
      headingScore * 0.2 +
      contentScore * 0.1
    );

    const details = `구조:${(structureScore*100).toFixed(1)}% | 표:${(tableScore*100).toFixed(1)}% | 제목:${(headingScore*100).toFixed(1)}% | 내용:${(contentScore*100).toFixed(1)}%`;

    console.log(`레이아웃 매칭 분석: ${details} => 최종:${(overallScore*100).toFixed(1)}%`);

    return {
      overallScore,
      structureScore,
      tableScore,
      headingScore,
      contentScore,
      details
    };
  } catch (error) {
    console.error("레이아웃 기반 매칭 오류:", error);
    // 구조 분석 실패 시 텍스트 기반 매칭으로 폴백
    const fallbackScore = await calculateTextBasedMatchScore(docxPath, template);
    return {
      overallScore: fallbackScore,
      structureScore: 0,
      tableScore: 0,
      headingScore: 0,
      contentScore: fallbackScore,
      details: `구조분석실패, 텍스트기반: ${(fallbackScore*100).toFixed(1)}%`
    };
  }
}

/**
 * 구조적 유사도 계산
 */
function calculateStructuralSimilarity(user: DocumentStructure, template: DocumentStructure): number {
  let score = 0;
  let factors = 0;

  // 1. 문서 유형 일치 (가장 중요)
  if (user.layoutMetrics.documentType === template.layoutMetrics.documentType) {
    score += 0.4;
  }
  factors += 0.4;

  // 2. 표 개수 유사도
  const tableRatio = Math.min(user.layoutMetrics.totalTables, template.layoutMetrics.totalTables) / 
                    Math.max(user.layoutMetrics.totalTables, template.layoutMetrics.totalTables, 1);
  score += tableRatio * 0.25;
  factors += 0.25;

  // 3. 제목 계층 깊이 유사도
  const headingRatio = Math.min(user.layoutMetrics.maxHeadingLevel, template.layoutMetrics.maxHeadingLevel) / 
                      Math.max(user.layoutMetrics.maxHeadingLevel, template.layoutMetrics.maxHeadingLevel, 1);
  score += headingRatio * 0.2;
  factors += 0.2;

  // 4. 번호 매기기 사용 일치
  if (user.layoutMetrics.hasNumberedLists === template.layoutMetrics.hasNumberedLists) {
    score += 0.15;
  }
  factors += 0.15;

  return score / factors;
}

/**
 * 표 구조 유사도 계산
 */
function calculateTableSimilarity(userTables: TableInfo[], templateTables: TableInfo[]): number {
  if (userTables.length === 0 && templateTables.length === 0) {
    return 1.0; // 둘 다 표가 없으면 완전 일치
  }
  
  if (userTables.length === 0 || templateTables.length === 0) {
    return 0.1; // 한쪽만 표가 없으면 낮은 점수
  }

  let totalScore = 0;
  const maxTables = Math.max(userTables.length, templateTables.length);
  
  // 각 표의 구조 비교
  for (let i = 0; i < Math.min(userTables.length, templateTables.length); i++) {
    const userTable = userTables[i];
    const templateTable = templateTables[i];
    
    let tableScore = 0;
    
    // 행/열 수 유사도
    const rowSimilarity = Math.min(userTable.rowCount, templateTable.rowCount) / 
                         Math.max(userTable.rowCount, templateTable.rowCount);
    const colSimilarity = Math.min(userTable.columnCount, templateTable.columnCount) / 
                         Math.max(userTable.columnCount, templateTable.columnCount);
    
    tableScore = (rowSimilarity + colSimilarity) / 2;
    totalScore += tableScore;
  }
  
  return totalScore / maxTables;
}

/**
 * 제목 계층 유사도 계산  
 */
function calculateHeadingSimilarity(userHeadings: HeadingInfo[], templateHeadings: HeadingInfo[]): number {
  if (userHeadings.length === 0 && templateHeadings.length === 0) {
    return 1.0;
  }
  
  if (userHeadings.length === 0 || templateHeadings.length === 0) {
    return 0.1;
  }

  // 제목 텍스트 유사도 계산
  let maxSimilarity = 0;
  
  for (const userHeading of userHeadings) {
    for (const templateHeading of templateHeadings) {
      if (userHeading.level === templateHeading.level) {
        // 같은 레벨의 제목들 간 텍스트 유사도
        const similarity = calculateTextSimilarity(
          userHeading.text.toLowerCase(),
          templateHeading.text.toLowerCase()
        );
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }
  }
  
  // 제목 개수 유사도도 고려
  const countSimilarity = Math.min(userHeadings.length, templateHeadings.length) / 
                         Math.max(userHeadings.length, templateHeadings.length);
  
  return (maxSimilarity + countSimilarity) / 2;
}

/**
 * 텍스트 유사도 계산 (기존 함수를 재사용 가능하도록 분리)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  const words1 = new Set(text1.split(/\s+/).filter(word => word.length > 2));
  const words2 = new Set(text2.split(/\s+/).filter(word => word.length > 2));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * 텍스트 기반 템플릿 매칭 점수 계산 (기존 함수 유지)
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
    
    // 개선된 키워드 기반 유사도 계산
    const documentWords = new Set(documentText.split(/\s+/).filter(w => w.length > 2)); // 길이 제한 완화
    const templateWords = new Set(templateText.split(/\s+/).filter(w => w.length > 2));
    
    console.log(`문서 단어 수: ${documentWords.size}, 템플릿 단어 수: ${templateWords.size}`);
    
    // 공통 단어 수 계산
    const commonWords = [...documentWords].filter(word => templateWords.has(word));
    const union = new Set([...documentWords, ...templateWords]);
    
    console.log(`공통 단어 수: ${commonWords.length}, 전체 단어 수: ${union.size}`);
    console.log(`공통 단어 예시:`, commonWords.slice(0, 5));
    
    const similarity = commonWords.length / union.size;
    
    // 파일명 기반 추가 점수 (옵션)
    let nameBonus = 0;
    const docName = docxPath.toLowerCase();
    const templateName = template.name.toLowerCase();
    
    console.log(`파일명 분석: 문서="${docName}", 템플릿="${templateName}"`);
    
    // 이름에 공통 키워드가 있으면 보너스 점수
    const nameWords = templateName.split(/\s+/);
    for (const word of nameWords) {
      if (word.length > 2 && docName.includes(word)) {
        nameBonus += 0.1;
        console.log(`파일명 매칭 보너스: "${word}" (+0.1)`);
      }
    }
    
    const finalScore = Math.min(similarity + nameBonus, 1.0);
    console.log(`최종 점수: 텍스트유사도(${similarity}) + 파일명보너스(${nameBonus}) = ${finalScore}`);
    
    return finalScore;
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