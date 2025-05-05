import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, or, desc, like } from "drizzle-orm";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";
import { translateWithGPT } from "./openai";
import { setupAuth } from "./auth";
import { setupTokenAuth, verifyToken, JWT_SECRET, JwtPayload } from "./token-auth";
import jwt from "jsonwebtoken";
import { isAdmin, isResourceOwnerOrAdmin, canManageProject, errorHandler } from "./auth-middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

// 파일 경로를 위한 변수 설정
const __dirname = process.cwd();

// 파일 업로드를 위한 multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // uploads 디렉토리가 없으면 생성
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 고유한 파일 이름 생성
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB 제한
});

// Helper function for calculating text similarity
function calculateSimilarity(str1: string, str2: string): number {
  // Convert to lowercase and remove punctuation
  const s1 = str1.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  const s2 = str2.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(s1, s2);
  
  // Calculate similarity score (0 to 1)
  const maxLength = Math.max(s1.length, s2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

// Levenshtein distance algorithm
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return dp[m][n];
}

// API Error Handler
const handleApiError = (res: Response, error: unknown) => {
  console.error("API Error:", error);
  
  if (error instanceof ZodError) {
    const formattedError = fromZodError(error);
    return res.status(400).json({ 
      message: 'Validation error', 
      errors: formattedError.details 
    });
  }
  
  return res.status(500).json({ 
    message: error instanceof Error ? error.message : 'Internal server error' 
  });
};

// Admin routes for TM management and File Processing
function registerAdminRoutes(app: Express) {
  // Utility function to check admin permissions
  const checkAdminAccess = (req: Request, res: Response): boolean => {
    if (!req.user || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return false;
    }
    return true;
  };

  // Segment text helper function
  const segmentText = (text: string): string[] => {
    // Matches end of sentence: period, question mark, exclamation mark followed by space or end
    // But doesn't split on common abbreviations, decimal numbers, etc.
    const sentences = [];
    const regex = /[.!?]\s+|[.!?]$/g;
    let match;
    let lastIndex = 0;
    
    // Split on sentence endings
    while ((match = regex.exec(text)) !== null) {
      const sentence = text.substring(lastIndex, match.index + 1).trim();
      if (sentence) sentences.push(sentence);
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex).trim();
      if (remainingText) sentences.push(remainingText);
    }
    
    return sentences.length > 0 ? sentences : [text.trim()];
  };

  // TM Upload endpoint
  app.post("/api/admin/tm/upload", verifyToken, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!checkAdminAccess(req, res)) return;

      // Handle file upload logic here
      const { sourceLanguage, targetLanguage, format, description } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Process the uploaded file based on format
      try {
        const fileContent = fs.readFileSync(file.path, 'utf8');
        
        // For demo purposes, parse TM entries from CSV format
        // In a real implementation, you'd handle different formats (TMX, XLIFF, etc.)
        if (format === "csv") {
          // Simple CSV parsing (comma-separated source,target pairs)
          const entries = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0)
            .map(line => {
              const [source, target] = line.split(',').map(str => str.trim());
              if (source && target) {
                return {
                  source,
                  target,
                  sourceLanguage,
                  targetLanguage,
                  status: '100%', // Assume perfect match for imported TM
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
              }
              return null;
            })
            .filter(entry => entry !== null);
            
          if (entries.length > 0) {
            await db.insert(schema.translationMemory).values(entries);
            return res.status(200).json({ 
              message: `Successfully imported ${entries.length} TM entries`,
              count: entries.length
            });
          } else {
            return res.status(400).json({ error: "No valid entries found in the file" });
          }
        } else {
          return res.status(400).json({ error: "Unsupported format" });
        }
      } catch (fileError) {
        console.error("Error reading TM file:", fileError);
        return res.status(500).json({ error: "Failed to process the file" });
      } finally {
        // Clean up the temporary file
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          console.error(`Failed to unlink file ${file.path}:`, unlinkErr);
        }
      }
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // TM Alignment endpoint
  app.post("/api/admin/tm/alignment", verifyToken, upload.fields([
    { name: 'sourceFile', maxCount: 1 },
    { name: 'targetFile', maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    try {
      if (!checkAdminAccess(req, res)) return;

      const { sourceLanguage, targetLanguage } = req.body;
      const uploadedFiles = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!uploadedFiles || !uploadedFiles.sourceFile || !uploadedFiles.targetFile) {
        return res.status(400).json({ error: "Both source and target files are required" });
      }

      const sourceFile = uploadedFiles.sourceFile[0];
      const targetFile = uploadedFiles.targetFile[0];

      try {
        // Read file contents
        const sourceContent = fs.readFileSync(sourceFile.path, 'utf8');
        const targetContent = fs.readFileSync(targetFile.path, 'utf8');

        // Simple line-by-line alignment (assumes files have matching line counts)
        const sourceLines = sourceContent.split(/\r?\n/).filter(line => line.trim().length > 0);
        const targetLines = targetContent.split(/\r?\n/).filter(line => line.trim().length > 0);

        // Create aligned pairs (simplistic approach - in reality you would use more sophisticated alignment)
        const alignedCount = Math.min(sourceLines.length, targetLines.length);
        const entries = [];

        for (let i = 0; i < alignedCount; i++) {
          entries.push({
            source: sourceLines[i],
            target: targetLines[i],
            sourceLanguage,
            targetLanguage,
            status: 'Reviewed', // Assume reviewed status for aligned content
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        // Save to translation memory
        if (entries.length > 0) {
          await db.insert(schema.translationMemory).values(entries);
          return res.status(200).json({
            message: `Successfully aligned ${entries.length} segments`,
            alignedPairs: entries.map(e => ({ source: e.source, target: e.target }))
          });
        } else {
          return res.status(400).json({ error: "No alignable content found" });
        }

      } catch (fileError) {
        console.error("Error processing alignment files:", fileError);
        return res.status(500).json({ error: "Failed to process the files" });
      } finally {
        // Clean up the temporary files
        try {
          fs.unlinkSync(sourceFile.path);
          fs.unlinkSync(targetFile.path);
        } catch (unlinkErr) {
          console.error(`Failed to unlink alignment files:`, unlinkErr);
        }
      }
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // TM Cleanup endpoint
  app.post("/api/admin/tm/cleanup", verifyToken, async (req: Request, res: Response) => {
    try {
      if (!checkAdminAccess(req, res)) return;

      const { criteria } = req.body;
      let deletedCount = 0;

      // Basic cleanup operations based on criteria
      if (criteria?.duplicates) {
        // Find and remove duplicate TM entries (keeping the newest ones)
        // This is a simplified approach - real implementation would be more complex
        const allEntries = await db.query.translationMemory.findMany();
        const uniqueEntries = new Map();
        const duplicateIds = [];

        // Identify duplicates (same source and target, different IDs)
        for (const entry of allEntries) {
          const key = `${entry.source}|${entry.target}|${entry.sourceLanguage}|${entry.targetLanguage}`;
          if (uniqueEntries.has(key)) {
            const existing = uniqueEntries.get(key);
            // Keep the newer entry
            if (new Date(entry.createdAt) > new Date(existing.createdAt)) {
              duplicateIds.push(existing.id);
              uniqueEntries.set(key, entry);
            } else {
              duplicateIds.push(entry.id);
            }
          } else {
            uniqueEntries.set(key, entry);
          }
        }

        // Delete duplicates
        if (duplicateIds.length > 0) {
          for (const id of duplicateIds) {
            await db.delete(schema.translationMemory).where(eq(schema.translationMemory.id, id));
          }
          deletedCount = duplicateIds.length;
        }
      }

      return res.status(200).json({
        message: `Translation memory cleanup completed`,
        deletedCount
      });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // PDF Processing - Extract Text endpoint
  app.post("/api/admin/file/pdf/process", verifyToken, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!checkAdminAccess(req, res)) return;

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // For demonstration purposes, simulate PDF text extraction with a basic approach
      // In a real implementation, you would use a PDF parsing library like pdf.js or pdfminer
      try {
        const fileSize = fs.statSync(file.path).size;
        
        // Simple demonstration - we're just reading the PDF as a binary file
        // and extracting text-like patterns. In a real implementation, use a proper PDF parser.
        const fileBuffer = fs.readFileSync(file.path);
        const fileContent = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 10000));
        
        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'uploads', 'processed');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Generate a unique output file name
        const outputFileName = file.originalname.replace(/\.pdf$/i, '-extracted.txt');
        const outputPath = path.join(outputDir, `${Date.now()}-${outputFileName}`);
        
        // Extract text-like content from the PDF (simplified approach)
        const textLines = fileContent
          .replace(/[^\x20-\x7E\n\r\t]/g, '') // Keep only ASCII printable chars and whitespace
          .split(/\r?\n/)
          .filter(line => line.trim().length > 3) // Filter out very short lines
          .slice(0, 100); // Limit number of lines for demonstration
        
        // Further segment into sentences for translation
        let sentences: string[] = [];
        for (const line of textLines) {
          const lineSentences = segmentText(line);
          sentences = [...sentences, ...lineSentences];
        }
        
        // Join extracted text for saving to file
        const extractedText = sentences.join('\n\n');
        
        // Save extracted text to file
        fs.writeFileSync(outputPath, extractedText);
        
        // Generate a URL for the saved file
        const fileUrl = `/uploads/processed/${path.basename(outputPath)}`;
        
        // Return extracted text segments and file info
        return res.status(200).json({
          message: "PDF text extraction completed",
          fileSize: fileSize,
          fileName: file.originalname,
          outputFileName: outputFileName,
          segments: sentences,
          segmentCount: sentences.length,
          extractedText: extractedText.substring(0, 1000) + (extractedText.length > 1000 ? '...' : ''),
          pageCount: Math.max(1, Math.ceil(fileSize / 50000)), // Rough estimate
          fileUrl: fileUrl
        });
      } catch (pdfError) {
        console.error("Error processing PDF file:", pdfError);
        return res.status(500).json({ error: "Failed to process the PDF file" });
      } finally {
        // Clean up the temporary file
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          console.error(`Failed to unlink file ${file.path}:`, unlinkErr);
        }
      }
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // PDF Processing - Align PDFs endpoint
  app.post("/api/admin/file/pdf/align", verifyToken, upload.fields([
    { name: 'sourceFile', maxCount: 1 },
    { name: 'targetFile', maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    try {
      if (!checkAdminAccess(req, res)) return;
      
      const { sourceLanguage, targetLanguage } = req.body;
      const uploadedFiles = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!uploadedFiles || !uploadedFiles.sourceFile || !uploadedFiles.targetFile) {
        return res.status(400).json({ error: "Both source and target PDF files are required" });
      }

      const sourceFile = uploadedFiles.sourceFile[0];
      const targetFile = uploadedFiles.targetFile[0];

      // Simulate PDF alignment process
      try {
        // In a real implementation, you would use proper PDF text extraction and alignment
        // For demonstration, we'll read the first part of each file and create some sample aligned segments
        const sourceBuffer = fs.readFileSync(sourceFile.path);
        const targetBuffer = fs.readFileSync(targetFile.path);
        
        const sourceContent = sourceBuffer.toString('utf8', 0, Math.min(sourceBuffer.length, 5000));
        const targetContent = targetBuffer.toString('utf8', 0, Math.min(targetBuffer.length, 5000));
        
        // Extract text-like content (simplified approach)
        const sourceLines = sourceContent
          .replace(/[^\x20-\x7E\n\r\t]/g, '')
          .split(/\r?\n/)
          .filter(line => line.trim().length > 3)
          .slice(0, 20);
          
        const targetLines = targetContent
          .replace(/[^\x20-\x7E\n\r\t]/g, '')
          .split(/\r?\n/)
          .filter(line => line.trim().length > 3)
          .slice(0, 20);
        
        // Create aligned pairs (simplified approach)
        const alignedCount = Math.min(sourceLines.length, targetLines.length);
        const alignedPairs: { source: string; target: string }[] = [];
        
        for (let i = 0; i < alignedCount; i++) {
          alignedPairs.push({
            source: sourceLines[i],
            target: targetLines[i],
          });
        }
        
        // If this were a real implementation, we would save these to the translation memory
        // For demo purposes, just return the aligned pairs
        return res.status(200).json({
          message: `PDF alignment completed`,
          sourceFile: sourceFile.originalname,
          targetFile: targetFile.originalname,
          alignedPairs,
          pairCount: alignedPairs.length
        });
      } catch (pdfError) {
        console.error("Error aligning PDF files:", pdfError);
        return res.status(500).json({ error: "Failed to align the PDF files" });
      } finally {
        // Clean up the temporary files
        try {
          fs.unlinkSync(sourceFile.path);
          fs.unlinkSync(targetFile.path);
        } catch (unlinkErr) {
          console.error(`Failed to unlink PDF files:`, unlinkErr);
        }
      }
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // File Format Conversion endpoint
  app.post("/api/admin/file/convert", verifyToken, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!checkAdminAccess(req, res)) return;
      
      const file = req.file;
      const { inputFormat, outputFormat } = req.body;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      if (!inputFormat || !outputFormat) {
        return res.status(400).json({ error: "Input and output formats are required" });
      }
      
      // Check if conversion is supported
      const supportedConversions: Record<string, string[]> = {
        txt: ["txt", "csv", "xliff"],
        docx: ["docx", "csv", "xliff"],
        csv: ["csv", "txt"],
        xliff: ["xliff", "csv"],
        pdf: ["docx", "csv", "xliff"]
      };
      
      if (!supportedConversions[inputFormat as keyof typeof supportedConversions]?.includes(outputFormat)) {
        return res.status(400).json({ 
          error: `Conversion from ${inputFormat} to ${outputFormat} is not supported` 
        });
      }
      
      try {
        // For demonstration purposes, we'll perform a simple file conversion
        // In a real implementation, you would use proper libraries for each format
        const fileContent = fs.readFileSync(file.path, 'utf8');
        let convertedContent = fileContent;
        let convertedFilename = `converted-${Date.now()}.${outputFormat}`;
        let convertedPath = path.join(__dirname, '..', 'uploads', convertedFilename);
        
        // Very simplified conversions for demonstration
        if (inputFormat === 'txt' && outputFormat === 'csv') {
          // Convert plain text to CSV (one row per line)
          convertedContent = fileContent.split(/\r?\n/)
            .filter(line => line.trim().length > 0)
            .map(line => `"${line.replace(/"/g, '""')}",""`) // Escape quotes and add empty target column
            .join('\n');
        } else if (inputFormat === 'csv' && outputFormat === 'txt') {
          // Convert CSV to plain text (extract first column)
          convertedContent = fileContent.split(/\r?\n/)
            .filter(line => line.trim().length > 0)
            .map(line => {
              // Basic CSV parsing - handle quoted fields
              const match = line.match(/^"(.*?)"/) || line.match(/^([^,]*)/); 
              return match ? match[1].replace(/""/g, '"') : '';
            })
            .filter(text => text.length > 0)
            .join('\n');
        }
        // For other formats, in a real implementation, you would use appropriate libraries
        
        // Create processed directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'uploads', 'processed');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Use the processed directory for converted files
        convertedPath = path.join(outputDir, convertedFilename);
        
        // Write the converted file
        fs.writeFileSync(convertedPath, convertedContent);
        
        // Generate a download URL (in a real implementation, use a more secure approach)
        const fileUrl = `/uploads/processed/${convertedFilename}`;
        
        return res.status(200).json({
          message: `File successfully converted from ${inputFormat} to ${outputFormat}`,
          fileUrl,
          originalName: file.originalname,
          convertedName: convertedFilename
        });
      } catch (conversionError) {
        console.error("Error converting file:", conversionError);
        return res.status(500).json({ error: "Failed to convert the file" });
      } finally {
        // Clean up the temporary file
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          console.error(`Failed to unlink file ${file.path}:`, unlinkErr);
        }
      }
    } catch (error) {
      return handleApiError(res, error);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication systems
  setupAuth(app);
  setupTokenAuth(app); // Also setup token-based auth
  
  // Register admin routes
  registerAdminRoutes(app);
  
  // prefix all routes with /api
  const apiPrefix = "/api";
  
  // Debug authentication endpoint
  app.get(`${apiPrefix}/auth-debug`, (req, res) => {
    return res.json({
      authenticated: !!req.user,
      method: req.method,
      path: req.path,
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Not present',
        cookie: req.headers.cookie ? 'Present' : 'Not present'
      },
      user: req.user || null
    });
  });
  
  // Projects API
  app.get(`${apiPrefix}/projects`, verifyToken, async (req, res) => {
    try {
      console.log('[PROJECTS API]', {
        tokenAuthenticated: !!req.user,
        user: req.user
      });
      
      const projects = await db.query.projects.findMany({
        orderBy: desc(schema.projects.createdAt),
        with: {
          files: true,
          claimer: true
        }
      });
      
      return res.json(projects);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  app.post(`${apiPrefix}/projects`, verifyToken, upload.fields([
    { name: 'files', maxCount: 10 },
    { name: 'references', maxCount: 10 }
  ]), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      console.log('Project creation request:', {
        body: req.body,
        files: req.files ? 'Files present' : 'No files',
        user: req.user
      });
      
      const { name, sourceLanguage, targetLanguage, description, notes, deadline } = req.body;
      
      if (!name || !sourceLanguage || !targetLanguage) {
        return res.status(400).json({ message: 'Required fields missing' });
      }
      
      // 프로젝트 기본 정보 저장
      const projectData = {
        name,
        sourceLanguage,
        targetLanguage,
        description: description || null,
        notes: notes || null,
        deadline: deadline ? new Date(deadline) : null,
        userId: req.user.id,
        status: 'Unclaimed'
      };
      
      // 프로젝트 추가
      const [project] = await db.insert(schema.projects).values(projectData).returning();
      
      // 업로드된 파일 처리
      const files: typeof schema.files.$inferInsert[] = [];
      const uploadedFiles = (req.files as { [fieldname: string]: Express.Multer.File[] });
      
      if (uploadedFiles && uploadedFiles.files) {
        // 작업 파일 처리
        for (const file of uploadedFiles.files) {
          try {
            const fileContent = fs.readFileSync(file.path, 'utf8');
            files.push({
              name: file.originalname,
              content: fileContent,
              projectId: project.id,
              type: 'work',
              createdAt: new Date(),
              updatedAt: new Date()
            });
          } catch (fileErr) {
            console.error(`Error reading file ${file.originalname}:`, fileErr);
          }
        }
      }
      
      if (uploadedFiles && uploadedFiles.references) {
        // 참조 파일 처리
        for (const file of uploadedFiles.references) {
          try {
            const fileContent = fs.readFileSync(file.path, 'utf8');
            files.push({
              name: file.originalname,
              content: fileContent,
              projectId: project.id,
              type: 'reference',
              createdAt: new Date(),
              updatedAt: new Date()
            });
          } catch (fileErr) {
            console.error(`Error reading file ${file.originalname}:`, fileErr);
          }
        }
      }
      
      // 파일들을 데이터베이스에 저장
      let savedFiles: typeof schema.files.$inferSelect[] = [];
      if (files.length > 0) {
        savedFiles = await db.insert(schema.files).values(files).returning();
        
        // 분석 완료 후 임시 파일 삭제
        if (uploadedFiles) {
          Object.values(uploadedFiles).forEach(fileArray => {
            fileArray.forEach(file => {
              try {
                fs.unlinkSync(file.path);
              } catch (unlinkErr) {
                console.error(`Failed to unlink file ${file.path}:`, unlinkErr);
              }
            });
          });
        }
      }
      
      // 각 파일에 대해 세그먼트 생성
      if (savedFiles.length > 0) {
        for (const file of savedFiles) {
          if (file.type === 'work') { // 참조 파일이 아닌 작업 파일만 세그먼트 생성
            // Parse content into segments by splitting into sentences
            const segmentText = (text: string): string[] => {
              // Matches end of sentence: period, question mark, exclamation mark followed by space or end
              // But doesn't split on common abbreviations, decimal numbers, etc.
              const sentences = [];
              const regex = /[.!?]\s+|[.!?]$/g;
              let match;
              let lastIndex = 0;
              
              // Split on sentence endings
              while ((match = regex.exec(text)) !== null) {
                const sentence = text.substring(lastIndex, match.index + 1).trim();
                if (sentence) sentences.push(sentence);
                lastIndex = match.index + match[0].length;
              }
              
              // Add any remaining text
              if (lastIndex < text.length) {
                const remainingText = text.substring(lastIndex).trim();
                if (remainingText) sentences.push(remainingText);
              }
              
              return sentences.length > 0 ? sentences : [text.trim()];
            };
            
            // First split by lines, then split each line into sentences
            const contentLines = file.content.split(/\r?\n/).filter(line => line.trim().length > 0);
            let segments: {source: string, status: string, fileId: number}[] = [];
            
            // Process each line
            for (const line of contentLines) {
              const sentences = segmentText(String(line).trim());
              
              // Add each sentence as a separate segment
              segments = [
                ...segments,
                ...sentences.map(sentence => ({
                  source: sentence,
                  status: 'MT',
                  fileId: file.id
                }))
              ];
            }
            
            if (segments.length > 0) {
              console.log(`Creating ${segments.length} segments for file ID ${file.id}`);
              await db.insert(schema.translationUnits).values(segments);
            }
          }
        }
      }
      
      // 외부 호출에서 사용할 프로젝트 데이터
      const projectWithFiles = { ...project, files: savedFiles };
      
      return res.status(201).json(projectWithFiles);
    } catch (error) {
      console.error('Project creation error:', error);
      return handleApiError(res, error);
    }
  });
  
  app.get(`${apiPrefix}/projects/:id`, verifyToken, async (req, res) => {
    try {
      console.log('[PROJECT DETAIL]', {
        tokenAuthenticated: !!req.user,
        user: req.user
      });
      
      const id = parseInt(req.params.id);
      
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id),
        with: {
          files: true,
          claimer: true
        }
      });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // 클레임된 프로젝트이고 현재 사용자가 클레임하지 않았다면 접근 거부
      if (project.status === 'Claimed' && project.claimedBy !== req.user?.id) {
        return res.status(403).json({ message: 'Access denied. This project is claimed by another user.' });
      }
      
      return res.json(project);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // 완료된 프로젝트 목록 가져오기
  app.get(`${apiPrefix}/completed-projects`, verifyToken, async (req, res) => {
    try {
      
      const projects = await db.query.projects.findMany({
        where: eq(schema.projects.status, 'Completed'),
        orderBy: desc(schema.projects.completedAt),
        with: {
          files: true,
          claimer: true
        }
      });
      
      return res.json(projects);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // 프로젝트 클레임하기
  app.post(`${apiPrefix}/projects/:id/claim`, verifyToken, async (req, res) => {
    try {
      
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // 프로젝트가 존재하고 Unclaimed 상태인지 확인
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id)
      });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      if (project.status !== 'Unclaimed') {
        return res.status(400).json({ message: 'Project is already claimed' });
      }
      
      // 프로젝트 클레임 처리
      const [updatedProject] = await db
        .update(schema.projects)
        .set({
          status: 'Claimed',
          claimedBy: userId,
          claimedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(schema.projects.id, id))
        .returning();
      
      return res.json(updatedProject);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // 프로젝트 클레임 해제하기
  app.post(`${apiPrefix}/projects/:id/release`, verifyToken, async (req, res) => {
    try {
      
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // 프로젝트가 존재하고 현재 사용자가 클레임했는지 확인
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id)
      });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      if (project.status !== 'Claimed') {
        return res.status(400).json({ message: 'Project is not in claimed status' });
      }
      
      if (project.claimedBy !== userId) {
        return res.status(403).json({ message: 'You do not have permission to release this project' });
      }
      
      // 프로젝트 클레임 해제 처리
      const [updatedProject] = await db
        .update(schema.projects)
        .set({
          status: 'Unclaimed',
          claimedBy: null,
          claimedAt: null,
          updatedAt: new Date()
        })
        .where(eq(schema.projects.id, id))
        .returning();
      
      return res.json(updatedProject);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // 프로젝트 완료 처리하기
  app.post(`${apiPrefix}/projects/:id/complete`, verifyToken, async (req, res) => {
    try {
      
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // 프로젝트가 존재하고 현재 사용자가 클레임했는지 확인
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id)
      });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      if (project.status !== 'Claimed') {
        return res.status(400).json({ message: 'Project is not in claimed status' });
      }
      
      if (project.claimedBy !== userId) {
        return res.status(403).json({ message: 'You do not have permission to complete this project' });
      }
      
      // 프로젝트 완료 처리
      const [completedProject] = await db
        .update(schema.projects)
        .set({
          status: 'Completed',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(schema.projects.id, id))
        .returning();
      
      return res.json(completedProject);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // 완료된 프로젝트 재오픈하기
  app.post(`${apiPrefix}/projects/:id/reopen`, verifyToken, async (req, res) => {
    try {
      
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const isAdmin = req.user?.role === 'admin';
      
      // 프로젝트가 존재하고 Completed 상태인지 확인
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id)
      });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      if (project.status !== 'Completed') {
        return res.status(400).json({ message: 'Project is not in completed status' });
      }
      
      // 권한 확인: 이전 클레이머 또는 관리자만 재오픈 가능
      if (!isAdmin && project.claimedBy !== userId) {
        return res.status(403).json({ message: 'You do not have permission to reopen this project' });
      }
      
      // 프로젝트 재오픈 처리 - 이전 클레임 사용자가 그대로 유지됨
      const [reopenedProject] = await db
        .update(schema.projects)
        .set({
          status: 'Claimed',
          completedAt: null,
          updatedAt: new Date()
        })
        .where(eq(schema.projects.id, id))
        .returning();
      
      return res.json(reopenedProject);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // 프로젝트 삭제하기
  app.delete(`${apiPrefix}/projects/:id`, isAdmin, async (req, res) => {
    try {
      
      const id = parseInt(req.params.id);
      
      // 프로젝트가 존재하는지 확인
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id)
      });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // 프로젝트가 Completed 상태인지 확인
      if (project.status !== 'Completed') {
        return res.status(400).json({ message: 'Only completed projects can be deleted' });
      }
      
      // 먼저 연관된 모든 파일의 segments를 삭제
      const files = await db.query.files.findMany({
        where: eq(schema.files.projectId, id)
      });
      
      for (const file of files) {
        await db.delete(schema.translationUnits).where(eq(schema.translationUnits.fileId, file.id));
      }
      
      // 그 다음 파일 삭제
      await db.delete(schema.files).where(eq(schema.files.projectId, id));
      
      // 마지막으로 프로젝트 삭제
      await db.delete(schema.projects).where(eq(schema.projects.id, id));
      
      return res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Files API
  app.get(`${apiPrefix}/files/:id`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      console.log('[FILES API] Request for file ID:', id, {
        tokenAuthenticated: !!req.user,
        user: req.user
      });
      
      const file = await db.query.files.findFirst({
        where: eq(schema.files.id, id),
        with: {
          segments: {
            orderBy: schema.translationUnits.id
          }
        }
      });
      
      if (!file) {
        console.log(`[FILES API] File with ID ${id} not found`);
        return res.status(404).json({ message: 'File not found' });
      }
      
      console.log(`[FILES API] Successfully fetched file ${id}:`, {
        name: file.name,
        segmentsCount: file.segments?.length || 0
      });
      
      return res.json(file);
    } catch (error) {
      console.error('[FILES API] Error:', error);
      return handleApiError(res, error);
    }
  });
  
  // File Download API
  app.get(`${apiPrefix}/files/:id/download`, async (req, res) => {
    try {
      // 쿼리 파라미터에서 토큰을 받아서 검증
      const token = req.query.token as string || req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
      
      try {
        // 토큰 검증
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        
        // req.user 설정
        req.user = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role
        };
      } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      const id = parseInt(req.params.id);
      
      const file = await db.query.files.findFirst({
        where: eq(schema.files.id, id)
      });
      
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Set content disposition header for download with double quotes and encoded filename
      const encodedFilename = encodeURIComponent(file.name);
      res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      
      // Return file content
      return res.send(file.content);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  app.post(`${apiPrefix}/files`, verifyToken, async (req, res) => {
    try {
      const fileData = schema.insertFileSchema.parse(req.body);
      const [file] = await db.insert(schema.files).values(fileData).returning();
      
      // Parse content into segments by splitting into sentences
      // Use a more sophisticated sentence splitter that handles various end-of-sentence patterns
      const segmentText = (text: string): string[] => {
        // Matches end of sentence: period, question mark, exclamation mark followed by space or end
        // But doesn't split on common abbreviations, decimal numbers, etc.
        const sentences = [];
        const regex = /[.!?]\s+|[.!?]$/g;
        let match;
        let lastIndex = 0;
        
        // Split on sentence endings
        while ((match = regex.exec(text)) !== null) {
          const sentence = text.substring(lastIndex, match.index + 1).trim();
          if (sentence) sentences.push(sentence);
          lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text
        if (lastIndex < text.length) {
          const remainingText = text.substring(lastIndex).trim();
          if (remainingText) sentences.push(remainingText);
        }
        
        return sentences.length > 0 ? sentences : [text.trim()];
      };
      
      // First split by lines, then split each line into sentences
      const contentLines = fileData.content.split(/\r?\n/).filter(line => line.trim().length > 0);
      let segments: {source: string, status: string, fileId: number}[] = [];
      
      // Process each line
      for (const line of contentLines) {
        const sentences = segmentText(line.trim());
        
        // Add each sentence as a separate segment
        segments = [
          ...segments,
          ...sentences.map(sentence => ({
            source: sentence,
            status: 'MT',
            fileId: file.id
          }))
        ];
      }
      
      if (segments.length > 0) {
        await db.insert(schema.translationUnits).values(segments);
      }
      
      return res.status(201).json(file);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Translation Units API
  app.get(`${apiPrefix}/segments/:fileId`, verifyToken, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      
      const segments = await db.query.translationUnits.findMany({
        where: eq(schema.translationUnits.fileId, fileId),
        orderBy: schema.translationUnits.id
      });
      
      return res.json(segments);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // 프로젝트 노트 저장 API
  app.post(`${apiPrefix}/projects/:id/notes`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { notes } = req.body;
      
      // 프로젝트가 존재하는지 확인
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id)
      });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // 프로젝트 노트 업데이트
      const [updatedProject] = await db
        .update(schema.projects)
        .set({
          notes: notes,
          updatedAt: new Date()
        })
        .where(eq(schema.projects.id, id))
        .returning();
      
      return res.json({ success: true, project: updatedProject });
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // 프로젝트 참조 파일 저장 API
  app.post(`${apiPrefix}/projects/:id/references`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { files } = req.body; // 파일 메타데이터 배열
      
      // 프로젝트가 존재하는지 확인
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id)
      });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // 현재 참조 파일 메타데이터 가져오기
      let existingReferences = [];
      if (project.references) {
        try {
          existingReferences = JSON.parse(project.references);
        } catch (e) {
          console.warn('Failed to parse existing references:', e);
        }
      }
      
      // 새 참조 파일 메타데이터 추가
      const updatedReferences = [
        ...existingReferences,
        ...files.map((file: any) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          addedAt: new Date().toISOString()
        }))
      ];
      
      // 프로젝트 업데이트
      const [updatedProject] = await db
        .update(schema.projects)
        .set({
          references: JSON.stringify(updatedReferences),
          updatedAt: new Date()
        })
        .where(eq(schema.projects.id, id))
        .returning();
      
      return res.json({ 
        success: true, 
        message: 'References uploaded successfully',
        references: updatedReferences
      });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  app.patch(`${apiPrefix}/segments/:id`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateSchema = z.object({
        target: z.string().optional(),
        status: z.string().optional(),
        comment: z.string().optional()
      });
      
      const data = updateSchema.parse(req.body);
      const [updatedSegment] = await db
        .update(schema.translationUnits)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(schema.translationUnits.id, id))
        .returning();
      
      if (!updatedSegment) {
        return res.status(404).json({ message: 'Segment not found' });
      }
      
      // If the status is Reviewed, save to TM
      if (data.status === 'Reviewed' && updatedSegment.target) {
        const file = await db.query.files.findFirst({
          where: eq(schema.files.id, updatedSegment.fileId),
          with: {
            project: true
          }
        });
        
        if (file && file.project) {
          await db.insert(schema.translationMemory).values({
            source: updatedSegment.source,
            target: updatedSegment.target,
            status: 'Reviewed',
            sourceLanguage: file.project.sourceLanguage,
            targetLanguage: file.project.targetLanguage
          });
        }
      }
      
      return res.json(updatedSegment);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Translation API
  app.post(`${apiPrefix}/translate`, verifyToken, async (req, res) => {
    try {
      const translateSchema = z.object({
        source: z.string(),
        sourceLanguage: z.string(),
        targetLanguage: z.string()
      });
      
      const { source, sourceLanguage, targetLanguage } = translateSchema.parse(req.body);
      
      // Search for matches in TM
      const tmMatches = await db.query.translationMemory.findMany({
        where: and(
          eq(schema.translationMemory.sourceLanguage, sourceLanguage),
          eq(schema.translationMemory.targetLanguage, targetLanguage),
          like(schema.translationMemory.source, `%${source}%`)
        ),
        orderBy: [
          desc(schema.translationMemory.status),
          desc(schema.translationMemory.updatedAt)
        ],
        limit: 5
      });
      
      // Find relevant glossary terms for this source text
      const glossaryTerms = await db.query.glossary.findMany({
        where: and(
          eq(schema.glossary.sourceLanguage, sourceLanguage),
          eq(schema.glossary.targetLanguage, targetLanguage)
        )
      });
      
      // Filter terms that are present in the source text
      const relevantTerms = glossaryTerms.filter(term => 
        source.toLowerCase().includes(term.source.toLowerCase())
      );
      
      try {
        // Extract context from TM matches to help with translation
        const context = tmMatches.map(match => 
          `${match.source} => ${match.target}`
        );
        
        // Use OpenAI API for translation
        const translationResult = await translateWithGPT({
          source,
          sourceLanguage,
          targetLanguage,
          context: context.length > 0 ? context : undefined,
          glossaryTerms: relevantTerms.length > 0 ? relevantTerms.map(term => ({
            source: term.source,
            target: term.target
          })) : undefined
        });
        
        return res.json({
          source,
          target: translationResult.target,
          alternatives: translationResult.alternatives,
          status: 'MT',
          tmMatches,
          glossaryTerms: relevantTerms.length > 0 ? relevantTerms : undefined
        });
      } catch (translationError) {
        console.error('Error using GPT for translation:', translationError);
        
        // Fallback to TM if available
        let fallbackTranslation = '';
        if (tmMatches.length > 0) {
          fallbackTranslation = tmMatches[0].target;
        } else {
          fallbackTranslation = `[Translation failed] ${source}`;
        }
        
        return res.json({
          source,
          target: fallbackTranslation,
          alternatives: [], // Empty alternatives when translation fails
          status: 'MT',
          tmMatches,
          glossaryTerms: relevantTerms.length > 0 ? relevantTerms : undefined,
          error: 'Translation service unavailable, using fallback'
        });
      }
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // TM API
  app.post(`${apiPrefix}/search_tm`, verifyToken, async (req, res) => {
    try {
      const searchSchema = z.object({
        source: z.string(),
        sourceLanguage: z.string(),
        targetLanguage: z.string(),
        limit: z.number().optional()
      });
      
      const { source, sourceLanguage, targetLanguage, limit = 5 } = searchSchema.parse(req.body);
      
      const tmMatches = await db.query.translationMemory.findMany({
        where: and(
          eq(schema.translationMemory.sourceLanguage, sourceLanguage),
          eq(schema.translationMemory.targetLanguage, targetLanguage),
          like(schema.translationMemory.source, `%${source}%`)
        ),
        orderBy: [
          desc(schema.translationMemory.status),
          desc(schema.translationMemory.updatedAt)
        ],
        limit
      });
      
      return res.json(tmMatches);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  app.post(`${apiPrefix}/update_tm`, verifyToken, async (req, res) => {
    try {
      const data = schema.insertTranslationMemorySchema.parse(req.body);
      const [tmEntry] = await db.insert(schema.translationMemory).values(data).returning();
      
      return res.status(201).json(tmEntry);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Glossary API (Terminology Base)
  app.get(`${apiPrefix}/glossary`, verifyToken, async (req, res) => {
    try {
      const sourceLanguage = req.query.sourceLanguage as string;
      const targetLanguage = req.query.targetLanguage as string;
      
      if (!sourceLanguage || !targetLanguage) {
        return res.status(400).json({ message: 'Source and target languages are required' });
      }
      
      const terms = await db.query.glossary.findMany({
        where: and(
          eq(schema.glossary.sourceLanguage, sourceLanguage),
          eq(schema.glossary.targetLanguage, targetLanguage)
        )
      });
      
      return res.json(terms);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get all TB resources
  app.get(`${apiPrefix}/glossary/resources`, verifyToken, async (req, res) => {
    try {
      const tbResources = await db.query.tbResources.findMany({
        orderBy: desc(schema.tbResources.createdAt)
      });
      
      return res.json(tbResources);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get all glossary terms (for management page) with optional resourceId filter
  app.get(`${apiPrefix}/glossary/all`, verifyToken, async (req, res) => {
    try {
      const resourceId = req.query.resourceId ? parseInt(req.query.resourceId as string) : undefined;
      
      let terms;
      if (resourceId) {
        terms = await db.query.glossary.findMany({
          where: eq(schema.glossary.resourceId, resourceId),
          orderBy: desc(schema.glossary.createdAt)
        });
      } else {
        terms = await db.query.glossary.findMany({
          orderBy: desc(schema.glossary.createdAt)
        });
      }
      
      return res.json(terms);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Add new glossary term
  app.post(`${apiPrefix}/glossary`, verifyToken, async (req, res) => {
    try {
      const data = schema.insertGlossarySchema.parse(req.body);
      const [term] = await db.insert(schema.glossary).values(data).returning();
      
      return res.status(201).json(term);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Delete glossary term
  app.delete(`${apiPrefix}/glossary/:id`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if term exists
      const term = await db.query.glossary.findFirst({
        where: eq(schema.glossary.id, id)
      });
      
      if (!term) {
        return res.status(404).json({ message: 'Terminology term not found' });
      }
      
      // Delete the term
      await db.delete(schema.glossary).where(eq(schema.glossary.id, id));
      
      return res.json({ message: 'Terminology term deleted successfully' });
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Search glossary terms (TB search)
  app.post(`${apiPrefix}/glossary/search`, verifyToken, async (req, res) => {
    try {
      const searchSchema = z.object({
        text: z.string(),
        sourceLanguage: z.string(),
        targetLanguage: z.string()
      });
      
      const { text, sourceLanguage, targetLanguage } = searchSchema.parse(req.body);
      
      // Split the input text into words for matching
      const words = text.split(/\s+/);
      
      // Get all glossary terms for the specified language pair
      const allTerms = await db.query.glossary.findMany({
        where: and(
          eq(schema.glossary.sourceLanguage, sourceLanguage),
          eq(schema.glossary.targetLanguage, targetLanguage)
        )
      });
      
      // Find matches in the text
      const matches = allTerms.filter(term => {
        // Check if any word in the text matches the source term
        return words.some(word => 
          word.toLowerCase() === term.source.toLowerCase() ||
          text.toLowerCase().includes(term.source.toLowerCase())
        );
      });
      
      return res.json(matches);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Translation Memory API
  // Get all TM resources
  app.get(`${apiPrefix}/tm/resources`, verifyToken, async (req, res) => {
    try {
      const tmResources = await db.query.tmResources.findMany({
        orderBy: desc(schema.tmResources.createdAt)
      });
      
      return res.json(tmResources);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Add new TM resource
  app.post(`${apiPrefix}/tm/resources`, verifyToken, async (req, res) => {
    try {
      const resourceSchema = z.object({
        name: z.string().min(2),
        description: z.string().optional(),
        defaultSourceLanguage: z.string().min(2),
        defaultTargetLanguage: z.string().min(2),
        domain: z.string().optional(),
        isActive: z.boolean().default(true),
      });
      
      const data = resourceSchema.parse(req.body);
      
      const [resource] = await db.insert(schema.tmResources).values({
        name: data.name,
        description: data.description || '',
        defaultSourceLanguage: data.defaultSourceLanguage,
        defaultTargetLanguage: data.defaultTargetLanguage,
        domain: data.domain || 'General',
        isActive: data.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return res.status(201).json(resource);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get all TM entries (with optional resourceId filter)
  app.get(`${apiPrefix}/tm/all`, verifyToken, async (req, res) => {
    try {
      const resourceId = req.query.resourceId ? parseInt(req.query.resourceId as string) : undefined;
      
      let tmEntries;
      if (resourceId) {
        tmEntries = await db.query.translationMemory.findMany({
          where: eq(schema.translationMemory.resourceId, resourceId),
          orderBy: desc(schema.translationMemory.createdAt)
        });
      } else {
        tmEntries = await db.query.translationMemory.findMany({
          orderBy: desc(schema.translationMemory.createdAt)
        });
      }
      
      return res.json(tmEntries);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Get a specific TM resource and its entries
  app.get(`${apiPrefix}/tm/resource/:id`, verifyToken, async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      
      const resource = await db.query.tmResources.findFirst({
        where: eq(schema.tmResources.id, resourceId)
      });
      
      if (!resource) {
        return res.status(404).json({ message: 'TM resource not found' });
      }
      
      const entries = await db.query.translationMemory.findMany({
        where: eq(schema.translationMemory.resourceId, resourceId),
        orderBy: desc(schema.translationMemory.createdAt)
      });
      
      return res.json({
        resource,
        entries
      });
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Get TM entries by language pair
  app.get(`${apiPrefix}/tm`, verifyToken, async (req, res) => {
    try {
      const sourceLanguage = req.query.sourceLanguage as string;
      const targetLanguage = req.query.targetLanguage as string;
      
      if (!sourceLanguage || !targetLanguage) {
        return res.status(400).json({ message: 'Source and target languages are required' });
      }
      
      const tmEntries = await db.query.translationMemory.findMany({
        where: and(
          eq(schema.translationMemory.sourceLanguage, sourceLanguage),
          eq(schema.translationMemory.targetLanguage, targetLanguage)
        )
      });
      
      return res.json(tmEntries);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Search in TM
  app.post(`${apiPrefix}/tm/search`, verifyToken, async (req, res) => {
    try {
      const searchSchema = z.object({
        text: z.string(),
        sourceLanguage: z.string(),
        targetLanguage: z.string(),
        threshold: z.number().optional().default(0.7)
      });
      
      const { text, sourceLanguage, targetLanguage, threshold } = searchSchema.parse(req.body);
      
      // Get all TM entries for the language pair
      const allEntries = await db.query.translationMemory.findMany({
        where: and(
          eq(schema.translationMemory.sourceLanguage, sourceLanguage),
          eq(schema.translationMemory.targetLanguage, targetLanguage)
        )
      });
      
      // Find fuzzy matches based on similarity
      const matches = allEntries
        .map(entry => {
          const similarity = calculateSimilarity(text, entry.source);
          return {
            ...entry,
            similarity
          };
        })
        .filter(entry => entry.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
      
      return res.json(matches);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Add entry to TM
  app.post(`${apiPrefix}/tm`, verifyToken, async (req, res) => {
    try {
      const data = schema.insertTranslationMemorySchema.parse(req.body);
      const [entry] = await db.insert(schema.translationMemory).values(data).returning();
      
      return res.status(201).json(entry);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
