/**
 * DOCX Template Service
 * 관리자용 DOCX 템플릿 관리 및 사용자용 템플릿 적용 기능을 제공하는 서비스
 */

import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
import { REPO_ROOT } from '../constants';
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";

// 템플릿 파일 업로드 및 저장 경로
const TEMPLATE_DIR = path.join(REPO_ROOT, 'uploads', 'templates');

// 디렉토리가 없으면 생성
if (!fs.existsSync(TEMPLATE_DIR)) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
}

/**
 * DOCX 문서 구조 분석 및 템플릿 정의
 */
export async function analyzeDocxStructure(filePath: string): Promise<DocxStructureElement[]> {
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    const html = result.value;
    
    // 문서 구조 분석
    const structure = await analyzeHtmlStructure(html);
    return structure;
  } catch (error) {
    console.error("DOCX 문서 구조 분석 오류:", error);
    throw error;
  }
}

/**
 * HTML로 변환된 DOCX 문서 구조 분석
 */
async function analyzeHtmlStructure(html: string): Promise<DocxStructureElement[]> {
  const structure: DocxStructureElement[] = [];
  
  // 임시 DOM 생성을 위한 JSDOM 대신 간단한 파싱 방식 사용
  // 단락 검색
  const paragraphs = html.match(/<p[^>]*>.*?<\/p>/g) || [];
  paragraphs.forEach((p, index) => {
    // 스타일 클래스 추출 (mammoth는 스타일을 클래스로 변환)
    const styleMatch = p.match(/class="([^"]+)"/);
    const styleName = styleMatch ? styleMatch[1] : 'normal';
    
    // 단락 내용 텍스트 추출 (HTML 태그 제거)
    const paragraphContent = p.replace(/<[^>]*>/g, '').trim();
    const contentPreview = paragraphContent.length > 30 ? 
      paragraphContent.substring(0, 30) + '...' : 
      paragraphContent || '(빈 단락)';
    
    structure.push({
      elementType: 'paragraph',
      index,
      styleName,
      content: contentPreview,
      isTranslationTarget: true
    });
  });
  
  // 테이블 검색
  const tables = html.match(/<table[^>]*>.*?<\/table>/g) || [];
  tables.forEach((table, tableIndex) => {
    // 행 검색
    const rows = table.match(/<tr[^>]*>.*?<\/tr>/g) || [];
    
    rows.forEach((row, rowIndex) => {
      // 셀 검색
      const cells = row.match(/<t[dh][^>]*>.*?<\/t[dh]>/g) || [];
      
      cells.forEach((cell, cellIndex) => {
        // 셀 내용 텍스트 추출 (HTML 태그 제거)
        const cellContent = cell.replace(/<[^>]*>/g, '').trim();
        const contentPreview = cellContent.length > 30 ? 
          cellContent.substring(0, 30) + '...' : 
          cellContent || '(빈 셀)';
        
        structure.push({
          elementType: 'table',
          tableIndex,
          rowIndex,
          cellIndex,
          content: contentPreview,
          isTranslationTarget: true
        });
      });
    });
  });
  
  return structure;
}

/**
 * 관리자가 업로드한 템플릿 파일 저장 및 처리
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
    
    // DB에 템플릿 정보 저장
    const [newTemplate] = await db.insert(schema.docTemplates)
      .values({
        name,
        description,
        docxFilePath: templatePath,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // 문서 구조 분석
    const structure = await analyzeDocxStructure(templatePath);
    
    // 구조 정보 저장
    for (const element of structure) {
      await db.insert(schema.templateStructures)
        .values({
          templateId: newTemplate.id,
          segmentType: element.elementType,
          tableIndex: element.tableIndex,
          rowIndex: element.rowIndex,
          cellIndex: element.cellIndex,
          styleName: element.styleName,
          isTranslationTarget: element.isTranslationTarget,
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
 * 템플릿 구조 요소 업데이트
 */
export async function updateTemplateStructure(
  structureId: number,
  isTranslationTarget: boolean
): Promise<void> {
  try {
    await db.update(schema.templateStructures)
      .set({
        isTranslationTarget,
        updatedAt: new Date()
      })
      .where(eq(schema.templateStructures.id, structureId));
  } catch (error) {
    console.error("템플릿 구조 업데이트 오류:", error);
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
        }
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
export async function getTemplateDetails(templateId: number): Promise<TemplateDetail | null> {
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
        structures: true
      }
    });
    
    if (!template) return null;
    
    return {
      template,
      structures: template.structures
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
    // 템플릿 구조 요소 먼저 삭제
    await db.delete(schema.templateStructures)
      .where(eq(schema.templateStructures.templateId, templateId));
    
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
 * DOCX 파일과 템플릿 구조 비교
 * 사용자가 업로드한 DOCX가 등록된 템플릿과 일치하는지 확인
 */
export async function matchTemplateToDocument(
  docxPath: string
): Promise<TemplateMatchResult | null> {
  try {
    // 템플릿 목록 조회
    const templates = await getTemplates();
    
    if (templates.length === 0) return null;
    
    // 문서 구조 분석
    const documentStructure = await analyzeDocxStructure(docxPath);
    
    // 각 템플릿과 비교
    for (const template of templates) {
      const templateDetail = await getTemplateDetails(template.id);
      
      if (!templateDetail) continue;
      
      // 기본 구조 일치 검사
      // (간단한 구현을 위해 요소 개수 및 타입만 비교)
      const matchScore = calculateTemplateMatchScore(
        documentStructure, 
        templateDetail.structures
      );
      
      // 일치율이 높으면 해당 템플릿 반환
      if (matchScore > 0.8) {
        return {
          template: templateDetail.template,
          matchScore,
          structures: templateDetail.structures.filter(s => s.isTranslationTarget)
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("템플릿 매칭 오류:", error);
    return null;
  }
}

/**
 * 템플릿과 문서 구조의 일치율 계산
 */
function calculateTemplateMatchScore(
  documentStructure: DocxStructureElement[],
  templateStructures: schema.TemplateStructure[]
): number {
  // 구조 요소 개수가 너무 다르면 일치하지 않음
  if (Math.abs(documentStructure.length - templateStructures.length) > 5) {
    return 0;
  }
  
  let matches = 0;
  
  // 테이블 구조 비교
  const docTables = documentStructure.filter(e => e.elementType === 'table');
  const templateTables = templateStructures.filter(t => t.segmentType === 'table');
  
  if (docTables.length === templateTables.length) {
    matches += 1;
  }
  
  // 단락 개수 비교
  const docParagraphs = documentStructure.filter(e => e.elementType === 'paragraph');
  const templateParagraphs = templateStructures.filter(t => t.segmentType === 'paragraph');
  
  // 단락 일치율 계산
  const paragraphSimilarity = 1 - Math.abs(docParagraphs.length - templateParagraphs.length) / 
    (docParagraphs.length + templateParagraphs.length);
  
  matches += paragraphSimilarity;
  
  // 기본적인 일치율 계산
  return matches / 2; // 0~1 사이 값으로 정규화
}

// 타입 정의
export interface DocxStructureElement {
  elementType: 'paragraph' | 'table' | 'heading';
  index?: number;
  styleName?: string;
  tableIndex?: number;
  rowIndex?: number;
  cellIndex?: number;
  isTranslationTarget: boolean;
}

export interface TemplateDetail {
  template: schema.DocTemplate;
  structures: schema.TemplateStructure[];
}

export interface TemplateMatchResult {
  template: schema.DocTemplate;
  matchScore: number;
  structures: schema.TemplateStructure[];
}