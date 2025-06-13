
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
