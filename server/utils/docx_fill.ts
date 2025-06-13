
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export interface TemplateData {
  [placeholder: string]: string;
}

export interface ValidationResult {
  isValid: boolean;
  placeholders: string[];
  errors: string[];
}

export interface DocumentStructure {
  tables: TableInfo[];
  headings: HeadingInfo[];
  paragraphs: ParagraphInfo[];
  sections: SectionInfo[];
  layoutMetrics: LayoutMetrics;
  wordCount: number;
}

export interface TableInfo {
  position: number;
  rowCount: number;
  columnCount: number;
  hasHeaders: boolean;
  cellTypes: string[];
  tableText: string;
}

export interface HeadingInfo {
  level: number;
  text: string;
  position: number;
  style: string;
}

export interface ParagraphInfo {
  text: string;
  position: number;
  isNumbered: boolean;
  indentLevel: number;
}

export interface SectionInfo {
  title: string;
  wordCount: number;
  hasTable: boolean;
  hasNumbering: boolean;
}

export interface LayoutMetrics {
  totalParagraphs: number;
  totalTables: number;
  maxHeadingLevel: number;
  hasNumberedLists: boolean;
  documentType: 'patent' | 'contract' | 'general';
}

export interface FillResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}

/**
 * DOCX 템플릿 유효성 검사 및 placeholder 추출
 */
export async function validateTemplate(templatePath: string): Promise<ValidationResult> {
  try {
    if (!fs.existsSync(templatePath)) {
      return {
        isValid: false,
        placeholders: [],
        errors: ['Template file not found']
      };
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Extract placeholders by getting all tags
    const placeholders: string[] = [];
    const fullText = doc.getFullText();
    const tags = fullText.match(/\{\{[^}]+\}\}/g) || [];

    tags.forEach(tag => {
      const cleanTag = tag.replace(/[{}]/g, '');
      if (!placeholders.includes(cleanTag)) {
        placeholders.push(cleanTag);
      }
    });

    return {
      isValid: true,
      placeholders,
      errors: []
    };
  } catch (error) {
    console.error('Template validation error:', error);
    return {
      isValid: false,
      placeholders: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * 템플릿에서 placeholder 추출
 */
export async function extractPlaceholders(templatePath: string): Promise<string[]> {
  const validation = await validateTemplate(templatePath);
  return validation.placeholders;
}

/**
 * DOCX 문서 구조 분석 - 레이아웃 기반 매칭을 위한 구조 정보 추출
 */
export async function analyzeDocumentStructure(docxPath: string): Promise<DocumentStructure> {
  try {
    if (!fs.existsSync(docxPath)) {
      throw new Error('Document file not found');
    }

    const content = fs.readFileSync(docxPath, 'binary');
    const zip = new PizZip(content);

    // document.xml 파싱
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const fullText = doc.getFullText();
    const words = fullText.split(/\s+/).filter(w => w.length > 0);

    // XML 내용 직접 파싱하여 구조 정보 추출
    const documentXml = zip.files['word/document.xml'];
    if (!documentXml) {
      throw new Error('Document XML not found');
    }

    const xmlContent = documentXml.asText();
    
    // 표 정보 추출
    const tables = extractTableInfo(xmlContent);
    
    // 제목 정보 추출
    const headings = extractHeadingInfo(xmlContent);
    
    // 단락 정보 추출
    const paragraphs = extractParagraphInfo(xmlContent);
    
    // 섹션 정보 추출
    const sections = extractSectionInfo(headings, paragraphs, tables);
    
    // 레이아웃 메트릭스 계산
    const layoutMetrics = calculateLayoutMetrics(tables, headings, paragraphs, fullText);

    return {
      tables,
      headings,
      paragraphs,
      sections,
      layoutMetrics,
      wordCount: words.length
    };
  } catch (error) {
    console.error('Document structure analysis error:', error);
    throw error;
  }
}

/**
 * XML에서 표 정보 추출
 */
function extractTableInfo(xmlContent: string): TableInfo[] {
  const tables: TableInfo[] = [];
  const tableRegex = /<w:tbl[^>]*>(.*?)<\/w:tbl>/gs;
  let tableMatch;
  let position = 0;

  while ((tableMatch = tableRegex.exec(xmlContent)) !== null) {
    const tableXml = tableMatch[1];
    
    // 행 수 계산
    const rowMatches = tableXml.match(/<w:tr[^>]*>/g) || [];
    const rowCount = rowMatches.length;
    
    // 열 수 계산 (첫 번째 행 기준)
    const firstRowMatch = tableXml.match(/<w:tr[^>]*>(.*?)<\/w:tr>/s);
    const columnCount = firstRowMatch 
      ? (firstRowMatch[1].match(/<w:tc[^>]*>/g) || []).length 
      : 0;
    
    // 표 텍스트 추출
    const tableText = tableXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    tables.push({
      position: position++,
      rowCount,
      columnCount,
      hasHeaders: rowCount > 1, // 단순 휴리스틱
      cellTypes: ['text'], // 기본값
      tableText
    });
  }

  return tables;
}

/**
 * XML에서 제목 정보 추출
 */
function extractHeadingInfo(xmlContent: string): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  const headingRegex = /<w:pStyle w:val="Heading(\d+)"[^>]*>.*?<w:t[^>]*>([^<]*)<\/w:t>/gs;
  let headingMatch;
  let position = 0;

  while ((headingMatch = headingRegex.exec(xmlContent)) !== null) {
    const level = parseInt(headingMatch[1]);
    const text = headingMatch[2].trim();
    
    if (text) {
      headings.push({
        level,
        text,
        position: position++,
        style: `Heading${level}`
      });
    }
  }

  return headings;
}

/**
 * XML에서 단락 정보 추출
 */
function extractParagraphInfo(xmlContent: string): ParagraphInfo[] {
  const paragraphs: ParagraphInfo[] = [];
  const paragraphRegex = /<w:p[^>]*>(.*?)<\/w:p>/gs;
  let paragraphMatch;
  let position = 0;

  while ((paragraphMatch = paragraphRegex.exec(xmlContent)) !== null) {
    const paragraphXml = paragraphMatch[1];
    
    // 텍스트 추출
    const textMatches = paragraphXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const text = textMatches
      .map(match => match.replace(/<[^>]+>/g, ''))
      .join(' ')
      .trim();
    
    if (text.length > 0) {
      // 번호 매기기 확인
      const isNumbered = paragraphXml.includes('<w:numPr>') || /^\d+\./.test(text);
      
      // 들여쓰기 레벨 확인 (단순화)
      const indentLevel = (paragraphXml.match(/<w:ind/g) || []).length;
      
      paragraphs.push({
        text,
        position: position++,
        isNumbered,
        indentLevel
      });
    }
  }

  return paragraphs;
}

/**
 * 섹션 정보 추출
 */
function extractSectionInfo(headings: HeadingInfo[], paragraphs: ParagraphInfo[], tables: TableInfo[]): SectionInfo[] {
  const sections: SectionInfo[] = [];
  
  // 각 제목을 기준으로 섹션 구분
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];
    
    // 해당 섹션의 단락들 찾기
    const sectionParagraphs = paragraphs.filter(p => 
      p.position > heading.position && 
      (!nextHeading || p.position < nextHeading.position)
    );
    
    // 해당 섹션의 표들 찾기
    const sectionTables = tables.filter(t => 
      t.position > heading.position && 
      (!nextHeading || t.position < nextHeading.position)
    );
    
    const wordCount = sectionParagraphs.reduce((sum, p) => 
      sum + p.text.split(/\s+/).length, 0
    );
    
    sections.push({
      title: heading.text,
      wordCount,
      hasTable: sectionTables.length > 0,
      hasNumbering: sectionParagraphs.some(p => p.isNumbered)
    });
  }
  
  return sections;
}

/**
 * 레이아웃 메트릭스 계산
 */
function calculateLayoutMetrics(
  tables: TableInfo[], 
  headings: HeadingInfo[], 
  paragraphs: ParagraphInfo[], 
  fullText: string
): LayoutMetrics {
  const maxHeadingLevel = headings.length > 0 ? Math.max(...headings.map(h => h.level)) : 0;
  const hasNumberedLists = paragraphs.some(p => p.isNumbered);
  
  // 문서 유형 휴리스틱 판단
  let documentType: 'patent' | 'contract' | 'general' = 'general';
  
  const text = fullText.toLowerCase();
  if (text.includes('특허') || text.includes('patent') || text.includes('발명') || text.includes('청구항')) {
    documentType = 'patent';
  } else if (text.includes('계약') || text.includes('contract') || text.includes('agreement')) {
    documentType = 'contract';
  }
  
  return {
    totalParagraphs: paragraphs.length,
    totalTables: tables.length,
    maxHeadingLevel,
    hasNumberedLists,
    documentType
  };
}

/**
 * 템플릿에 데이터를 삽입하여 DOCX 파일 생성
 */
export async function fillDocxTemplate(
  templatePath: string,
  data: TemplateData,
  outputFileName?: string
): Promise<FillResult> {
  try {
    if (!fs.existsSync(templatePath)) {
      return {
        success: false,
        error: 'Template file not found'
      };
    }

    // Read template file
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Set template data
    doc.setData(data);

    try {
      // Render the document
      doc.render();
    } catch (error) {
      console.error('Template rendering error:', error);
      return {
        success: false,
        error: `Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }

    // Generate output buffer
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'uploads', 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate output filename
    const timestamp = Date.now();
    const fileName = outputFileName || `generated_${timestamp}.docx`;
    const outputPath = path.join(outputDir, fileName);

    // Write file
    fs.writeFileSync(outputPath, buf);

    return {
      success: true,
      filePath: outputPath,
      fileName
    };
  } catch (error) {
    console.error('DOCX fill error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
