/**
 * DOCX Template Fill Utility
 * docx-templater를 사용하여 템플릿에 번역된 내용을 삽입하고 .docx 파일을 생성
 */

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '../constants';

const OUTPUT_DIR = path.join(REPO_ROOT, 'uploads', 'generated');

// 출력 디렉토리가 없으면 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export interface TemplateData {
  [placeholder: string]: string | any;
}

export interface DocxFillResult {
  filePath: string;
  fileName: string;
  success: boolean;
  error?: string;
}

/**
 * 템플릿 파일에 데이터를 삽입하여 새로운 DOCX 파일 생성
 */
export async function fillDocxTemplate(
  templatePath: string,
  data: TemplateData,
  outputFileName?: string
): Promise<DocxFillResult> {
  try {
    // 템플릿 파일 읽기
    const content = fs.readFileSync(templatePath, 'binary');
    
    // PizZip으로 압축 해제
    const zip = new PizZip(content);
    
    // docx-templater 인스턴스 생성
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    
    // 템플릿에 데이터 적용
    doc.render(data);
    
    // 결과 DOCX 생성
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      // compression: DEFLATE adds a compression step.
      // For a 50MB output document, expect 500ms additional processing time
      compression: 'DEFLATE',
    });
    
    // 출력 파일명 생성
    const fileName = outputFileName || `filled_template_${Date.now()}.docx`;
    const outputPath = path.join(OUTPUT_DIR, fileName);
    
    // 파일 저장
    fs.writeFileSync(outputPath, buf);
    
    return {
      filePath: outputPath,
      fileName,
      success: true,
    };
  } catch (error) {
    console.error('DOCX 템플릿 채우기 오류:', error);
    return {
      filePath: '',
      fileName: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * DOCX 템플릿에서 placeholder 목록 추출
 */
export async function extractPlaceholders(templatePath: string): Promise<string[]> {
  try {
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip);
    
    // document.xml에서 placeholder 추출
    const documentXml = zip.files['word/document.xml'].asText();
    
    // {{placeholder}} 패턴 매칭
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders = new Set<string>();
    let match;
    
    while ((match = placeholderRegex.exec(documentXml)) !== null) {
      // 공백 제거 및 정리
      const placeholder = match[1].trim();
      if (placeholder) {
        placeholders.add(placeholder);
      }
    }
    
    return Array.from(placeholders);
  } catch (error) {
    console.error('Placeholder 추출 오류:', error);
    return [];
  }
}

/**
 * 템플릿 유효성 검사 - 올바른 docx-templater 형식인지 확인
 */
export async function validateTemplate(templatePath: string): Promise<{
  isValid: boolean;
  placeholders: string[];
  errors: string[];
}> {
  try {
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    // 기본 docx 구조 확인
    const requiredFiles = ['word/document.xml', '[Content_Types].xml', 'word/_rels/document.xml.rels'];
    const errors: string[] = [];
    
    for (const file of requiredFiles) {
      if (!zip.files[file]) {
        errors.push(`필수 파일 누락: ${file}`);
      }
    }
    
    if (errors.length > 0) {
      return {
        isValid: false,
        placeholders: [],
        errors,
      };
    }
    
    // placeholder 추출 시도
    const placeholders = await extractPlaceholders(templatePath);
    
    // docx-templater로 렌더링 테스트
    try {
      const doc = new Docxtemplater(zip);
      // 빈 데이터로 렌더링 테스트
      const testData: TemplateData = {};
      placeholders.forEach(p => {
        testData[p] = `TEST_${p}`;
      });
      doc.render(testData);
      
      return {
        isValid: true,
        placeholders,
        errors: [],
      };
    } catch (renderError) {
      errors.push(`템플릿 렌더링 오류: ${renderError instanceof Error ? renderError.message : 'Unknown error'}`);
      return {
        isValid: false,
        placeholders,
        errors,
      };
    }
  } catch (error) {
    return {
      isValid: false,
      placeholders: [],
      errors: [`템플릿 파일 처리 오류: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * 생성된 파일 정리 - 오래된 임시 파일 삭제
 */
export function cleanupOldFiles(maxAgeHours: number = 24): void {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) return;
    
    const files = fs.readdirSync(OUTPUT_DIR);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // milliseconds
    
    for (const file of files) {
      const filePath = path.join(OUTPUT_DIR, file);
      const stat = fs.statSync(filePath);
      
      if (now - stat.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`오래된 파일 삭제: ${file}`);
      }
    }
  } catch (error) {
    console.error('파일 정리 오류:', error);
  }
}