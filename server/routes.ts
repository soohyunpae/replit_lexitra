import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import WebSocket from 'ws';
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, or, desc, like, sql, inArray } from "drizzle-orm";
import type { TranslationUnit } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";
import { translateWithGPT } from "./openai";
import { setupAuth } from "./auth";
import {
  setupTokenAuth,
  verifyToken,
  optionalToken,
  JWT_SECRET,
  JwtPayload,
} from "./token-auth";
import jwt from "jsonwebtoken";
import {
  isAdmin,
  isResourceOwnerOrAdmin,
  canManageProject,
  errorHandler,
} from "./auth-middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

// 파일 경로를 위한 변수 설정
const REPO_ROOT = process.cwd();
console.log("Repository root:", REPO_ROOT);

// 필요한 모든 디렉토리를 생성하는 함수
function ensureDirectories() {
  const directories = [
    path.join(REPO_ROOT, "uploads"),
    path.join(REPO_ROOT, "uploads", "tmp"),
    path.join(REPO_ROOT, "uploads", "processed"),
    path.join(REPO_ROOT, "uploads", "references"),
  ];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Directory created: ${dir}`);
      } catch (err) {
        console.error(`Failed to create directory ${dir}:`, err);
      }
    } else {
      console.log(`Directory already exists: ${dir}`);
    }
  }
}

// 시작 시 디렉토리 확인
ensureDirectories();

// 일반 파일 업로드를 위한 multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(REPO_ROOT, "uploads", "tmp");
    // 업로드 직전에 디렉토리 확인
    if (!fs.existsSync(uploadDir)) {
      console.log(`Creating tmp directory for upload: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 고유한 파일 이름 생성
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename =
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname);
    console.log(`Generated filename for upload: ${filename}`);
    cb(null, filename);
  },
});

// 참조 파일 업로드를 위한 multer 설정
const referenceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(REPO_ROOT, "uploads", "references");
    // 업로드 직전에 디렉토리 확인
    if (!fs.existsSync(uploadDir)) {
      console.log(`Creating references directory for upload: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // projectId를 파일명에 포함시켜 저장
    const projectId = req.params.id;
    // 원본 파일명을 유지하면서 고유성 보장
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `${projectId}_${uniqueSuffix}_${file.originalname}`;
    console.log(`Generated reference filename: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB 제한 (50MB에서 증가)
  fileFilter: function (req, file, cb) {
    // 파일 확장자 확인
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [
      ".txt",
      ".docx",
      ".doc",
      ".pdf",
      ".xml",
      ".xliff",
      ".tmx",
      ".zip",
    ];

    if (allowedExtensions.includes(ext)) {
      console.log(`Accepting file upload: ${file.originalname} (${ext})`);
      return cb(null, true);
    }

    console.log(`Rejecting file upload: ${file.originalname} (${ext})`);
    cb(
      new Error(
        `Unsupported file format: ${ext}. Allowed formats: ${allowedExtensions.join(", ")}`,
      ),
    );
  },
});

const referenceUpload = multer({
  storage: referenceStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB 제한
  fileFilter: function (req, file, cb) {
    // 참조 파일에 대한 확장자 확인 (모든 파일 형식 허용)
    const ext = path.extname(file.originalname).toLowerCase();
    console.log(
      `Accepting reference file upload: ${file.originalname} (${ext})`,
    );
    return cb(null, true);
  },
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
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; i <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return dp[m][n];
}

// The global setTimeout is already patched in index.ts and openai.ts
// This function now simply uses the global safe implementation
const safeSetTimeout = (fn: Function, delay: number) => {
  // The global setTimeout has been patched to safely handle large delays
  setTimeout(() => fn(), delay);
};

// API Error Handler
const handleApiError = (res: Response, error: unknown) => {
  console.error("API Error:", error);

  if (error instanceof ZodError) {
    const formattedError = fromZodError(error);
    return res.status(400).json({
      message: "Validation error", 
      errors: formattedError.details,
    });
  }

  return res.status(500).json({
    message: error instanceof Error ? error.message : "Internal server error",
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
  app.post(
    "/api/admin/tm/upload",
    verifyToken,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!checkAdminAccess(req, res)) return;

        // Handle file upload logic here
        const { sourceLanguage, targetLanguage, format, description } =
          req.body;
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // Process the uploaded file based on format
        try {
          const fileContent = fs.readFileSync(file.path, "utf8");

          // For demo purposes, parse TM entries from CSV format
          // In a real implementation, you'd handle different formats (TMX, XLIFF, etc.)
          if (format === "csv") {
            // Simple CSV parsing (comma-separated source,target pairs)
            const entries = fileContent
              .split(/\r?\n/)
              .filter((line) => line.trim().length > 0)
              .map((line) => {
                const [source, target] = line
                  .split(",")
                  .map((str) => str.trim());
                if (source && target) {
                  return {
                    source,
                    target,
                    sourceLanguage,
                    targetLanguage,
                    status: "100%", // Assume perfect match for imported TM
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  };
                }
                return null;
              })
              .filter((entry) => entry !== null);

            if (entries.length > 0) {
              await db.insert(schema.translationMemory).values(entries);
              return res.status(200).json({
                message: `Successfully imported ${entries.length} TM entries`,
                count: entries.length,
              });
            } else {
              return res
                .status(400)
                .json({ error: "No valid entries found in the file" });
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
    },
  );

  // TM Alignment endpoint
  app.post(
    "/api/admin/tm/alignment",
    verifyToken,
    upload.fields([
      { name: "sourceFile", maxCount: 1 },
      { name: "targetFile", maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      try {
        if (!checkAdminAccess(req, res)) return;

        const { sourceLanguage, targetLanguage } = req.body;
        const uploadedFiles = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        if (
          !uploadedFiles ||
          !uploadedFiles.sourceFile ||
          !uploadedFiles.targetFile
        ) {
          return res
            .status(400)
            .json({ error: "Both source and target files are required" });
        }

        const sourceFile = uploadedFiles.sourceFile[0];
        const targetFile = uploadedFiles.targetFile[0];

        try {
          // Read file contents
          const sourceContent = fs.readFileSync(sourceFile.path, "utf8");
          const targetContent = fs.readFileSync(targetFile.path, "utf8");

          // Simple line-by-line alignment (assumes files have matching line counts)
          const sourceLines = sourceContent
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0);
          const targetLines = targetContent
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0);

          // Create aligned pairs (simplistic approach - in reality you would use more sophisticated alignment)
          const alignedCount = Math.min(sourceLines.length, targetLines.length);
          const entries = [];

          for (let i = 0; i < alignedCount; i++) {
            entries.push({
              source: sourceLines[i],
              target: targetLines[i],
              sourceLanguage,
              targetLanguage,
              status: "Reviewed", // Assume reviewed status for aligned content
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          // Save to translation memory
          if (entries.length > 0) {
            await db.insert(schema.translationMemory).values(entries);
            return res.status(200).json({
              message: `Successfully aligned ${entries.length} segments`,
              alignedPairs: entries.map((e) => ({
                source: e.source,
                target: e.target,
              })),
            });
          } else {
            return res
              .status(400)
              .json({ error: "No alignable content found" });
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
    },
  );

  // TM Cleanup endpoint
  app.post(
    "/api/admin/tm/cleanup",
    verifyToken,
    async (req: Request, res: Response) => {
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
              await db
                .delete(schema.translationMemory)
                .where(eq(schema.translationMemory.id, id));
            }
            deletedCount = duplicateIds.length;
          }
        }

        return res.status(200).json({
          message: `Translation memory cleanup completed`,
          deletedCount,
        });
      } catch (error) {
        return handleApiError(res, error);
      }
    },
  );

  // TB Upload endpoint (Glossary)
  app.post(
    "/api/admin/tb/upload",
    verifyToken,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!checkAdminAccess(req, res)) return;

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        console.log(
          "TB File upload received:",
          req.file.originalname,
          "Size:",
          req.file.size,
          "bytes",
        );
        console.log("File path:", req.file.path);

        // 처리된 파일 저장을 위한 디렉토리 확인
        const processedDir = path.join(REPO_ROOT, "uploads", "processed");
        if (!fs.existsSync(processedDir)) {
          console.log(`Creating processed directory: ${processedDir}`);
          fs.mkdirSync(processedDir, { recursive: true });
        }

        const file = req.file;
        // Make sure to provide defaults if values are not sent
        const sourceLanguage = req.body.sourceLanguage || "ko";
        const targetLanguage = req.body.targetLanguage || "en";
        const domain = req.body.domain || "";

        console.log(
          `Processing with sourceLanguage: ${sourceLanguage}, targetLanguage: ${targetLanguage}`,
        );

        // Process the file based on its type
        try {
          let glossaryEntries = [];
          let resourceName =
            req.body.name || `Glossary from ${file.originalname}`;

          console.log(`Using resource name: ${resourceName}`);

          // Extract file extension
          const fileExt = path.extname(file.originalname).toLowerCase();

          if (fileExt === ".csv") {
            // Read the file as text with error handling for different encodings
            let content;
            try {
              content = fs.readFileSync(file.path, "utf8");
            } catch (e) {
              // Fallback to binary read if UTF-8 fails
              const buffer = fs.readFileSync(file.path);
              content = buffer.toString();
            }

            // Try different line separators
            let lines = content.split("\n");
            if (lines.length <= 1) {
              lines = content.split("\r\n");
            }

            console.log(`File has ${lines.length} lines`);

            // Try to detect the delimiter by examining the first few lines
            const sampleLines = lines
              .slice(0, Math.min(5, lines.length))
              .filter((line) => line.trim().length > 0);
            let delimiter = ","; // Default delimiter

            // Check if the file uses tabs or semicolons instead of commas
            if (sampleLines.length > 0) {
              const firstSample = sampleLines[0];
              const commaCount = (firstSample.match(/,/g) || []).length;
              const tabCount = (firstSample.match(/\t/g) || []).length;
              const semicolonCount = (firstSample.match(/;/g) || []).length;

              if (tabCount > commaCount && tabCount > semicolonCount) {
                delimiter = "\t";
                console.log("Detected tab delimiter");
              } else if (
                semicolonCount > commaCount &&
                semicolonCount > tabCount
              ) {
                delimiter = ";";
                console.log("Detected semicolon delimiter");
              } else {
                console.log("Using comma delimiter");
              }
            }

            // Check if the file has headers
            const firstLine = lines[0]?.trim() || "";
            const hasHeaders =
              firstLine.toLowerCase().includes("source") ||
              firstLine.toLowerCase().includes("target") ||
              firstLine.toLowerCase().includes("domain") ||
              firstLine.toLowerCase().includes("term") ||
              firstLine.toLowerCase().includes("원문") ||
              firstLine.toLowerCase().includes("번역") ||
              firstLine.toLowerCase().includes("용어");

            console.log(
              `Has headers: ${hasHeaders}, first line: "${firstLine.substring(0, 50)}..."`,
            );
            const startIndex = hasHeaders ? 1 : 0;

            // Process CSV data
            for (let i = startIndex; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              // Split by the detected delimiter
              const columns = line.split(delimiter);

              // Proceed if we have at least two columns or try to be flexible
              if (
                columns.length >= 2 ||
                (columns.length === 1 && line.includes(":"))
              ) {
                let source = "";
                let target = "";

                if (columns.length >= 2) {
                  // Standard CSV format
                  source = columns[0]?.trim() || "";
                  target = columns[1]?.trim() || "";
                } else if (columns.length === 1 && line.includes(":")) {
                  // Try to handle "key: value" format
                  const parts = line.split(":");
                  if (parts.length >= 2) {
                    source = parts[0]?.trim() || "";
                    target = parts.slice(1).join(":").trim() || "";
                  }
                }

                // Optional fields: could be domain, notes, etc.
                let entrySourceLang = sourceLanguage;
                let entryTargetLang = targetLanguage;
                let entryDomain = domain;

                // Try to extract domain if available in the CSV
                if (hasHeaders && columns.length > 2) {
                  const headers = firstLine.toLowerCase().split(delimiter);
                  const domainIndex = headers.findIndex(
                    (h) =>
                      h.includes("domain") ||
                      h.includes("분야") ||
                      h.includes("카테고리"),
                  );

                  if (domainIndex >= 0 && columns[domainIndex]) {
                    entryDomain = columns[domainIndex].trim();
                  }
                }

                if (source && target) {
                  // Clean up potential quotes that might be part of CSV format
                  source = source.replace(/^["']|["']$/g, "");
                  target = target.replace(/^["']|["']$/g, "");

                  glossaryEntries.push({
                    source,
                    target,
                    sourceLanguage: entrySourceLang,
                    targetLanguage: entryTargetLang,
                    domain: entryDomain,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  });
                }
              }
            }
          } else if (fileExt === ".xlsx" || fileExt === ".xls") {
            return res.status(400).json({
              error:
                "Excel format is not supported yet. Please convert to CSV and try again.",
            });
          } else {
            return res.status(400).json({
              error: `Unsupported file format: ${fileExt}. Please use CSV format.`,
            });
          }

          if (glossaryEntries.length === 0) {
            return res
              .status(400)
              .json({ error: "No valid glossary entries found in the file" });
          }

          console.log(`Processed ${glossaryEntries.length} glossary entries`);

          // Create TB resource record first
          const tbResource = await db
            .insert(schema.tbResources)
            .values({
              name: resourceName,
              description: `Uploaded from ${file.originalname}`,
              domain: domain,
              defaultSourceLanguage: sourceLanguage,
              defaultTargetLanguage: targetLanguage,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          const resourceId = tbResource[0].id;

          // Add resource ID to all entries
          glossaryEntries = glossaryEntries.map((entry) => ({
            ...entry,
            resourceId,
          }));

          // Save glossary entries to database in chunks to avoid large inserts
          const chunkSize = 100; // Process in smaller batches for glossary
          for (let i = 0; i < glossaryEntries.length; i += chunkSize) {
            const chunk = glossaryEntries.slice(i, i + chunkSize);
            await db.insert(schema.glossary).values(chunk);
            console.log(
              `Inserted chunk ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(glossaryEntries.length / chunkSize)}`,
            );
          }

          return res.status(200).json({
            message: `Successfully processed ${glossaryEntries.length} glossary entries`,
            resourceId,
            resourceName,
          });
        } catch (fileError: any) {
          console.error("Error processing glossary file:", fileError);
          const errorMessage = fileError.message || "Unknown error occurred";
          return res
            .status(500)
            .json({
              error: "Failed to process the glossary file: " + errorMessage,
            });
        } finally {
          // Clean up the temporary file
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkErr) {
            console.error(`Failed to unlink file ${file.path}:`, unlinkErr);
          }
        }
      } catch (error) {
        console.error("TB upload error:", error);
        return handleApiError(res, error);
      }
    },
  );

  // PDF Processing - Extract Text endpoint
  app.post(
    "/api/admin/file/pdf/process",
    verifyToken,
    upload.single("file"),
    async (req: Request, res: Response) => {
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
          const fileContent = fileBuffer.toString(
            "utf8",
            0,
            Math.min(fileBuffer.length, 10000),
          );

          // Create output directory if it doesn't exist
          const outputDir = path.join(REPO_ROOT, "uploads", "processed");
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          // Generate a unique output file name
          const outputFileName = file.originalname.replace(
            /\.pdf$/i,
            "-extracted.txt",
          );
          const outputPath = path.join(
            outputDir,
            `${Date.now()}-${outputFileName}`,
          );

          // Extract text-like content from the PDF (simplified approach)
          const textLines = fileContent
            .replace(/[^\x20-\x7E\n\r\t]/g, "") // Keep only ASCII printable chars and whitespace
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 3) // Filter out very short lines
            .slice(0, 100); // Limit number of lines for demonstration

          // Further segment into sentences for translation
          let sentences: string[] = [];
          for (const line of textLines) {
            const lineSentences = segmentText(line);
            sentences = [...sentences, ...lineSentences];
          }

          // Join extracted text for saving to file
          const extractedText = sentences.join("\n\n");

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
            extractedText:
              extractedText.substring(0, 1000) +
              (extractedText.length > 1000 ? "..." : ""),
            pageCount: Math.max(1, Math.ceil(fileSize / 50000)), // Rough estimate
            fileUrl: fileUrl,
          });
        } catch (pdfError) {
          console.error("Error processing PDF file:", pdfError);
          return res
            .status(500)
            .json({ error: "Failed to process the PDF file" });
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
    },
  );

  // PDF Processing - Align PDFs endpoint
  app.post(
    "/api/admin/file/pdf/align",
    verifyToken,
    upload.fields([
      { name: "sourceFile", maxCount: 1 },
      { name: "targetFile", maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      try {
        if (!checkAdminAccess(req, res)) return;

        const { sourceLanguage, targetLanguage } = req.body;
        const uploadedFiles = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        if (
          !uploadedFiles ||
          !uploadedFiles.sourceFile ||
          !uploadedFiles.targetFile
        ) {
          return res
            .status(400)
            .json({ error: "Both source and target PDF files are required" });
        }

        const sourceFile = uploadedFiles.sourceFile[0];
        const targetFile = uploadedFiles.targetFile[0];

        // Simulate PDF alignment process
        try {
          // In a real implementation, you would use proper PDF text extraction and alignment
          // For demonstration, we'll read the first part of each file and create some sample aligned segments
          const sourceBuffer = fs.readFileSync(sourceFile.path);
          const targetBuffer = fs.readFileSync(targetFile.path);

          const sourceContent = sourceBuffer.toString(
            "utf8",
            0,
            Math.min(sourceBuffer.length, 5000),
          );
          const targetContent = targetBuffer.toString(
            "utf8",
            0,
            Math.min(targetBuffer.length, 5000),
          );

          // Extract text-like content (simplified approach)
          const sourceLines = sourceContent
            .replace(/[^\x20-\x7E\n\r\t]/g, "")
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 3)
            .slice(0, 20);

          const targetLines = targetContent
            .replace(/[^\x20-\x7E\n\r\t]/g, "")
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 3)
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
            pairCount: alignedPairs.length,
          });
        } catch (pdfError) {
          console.error("Error aligning PDF files:", pdfError);
          return res
            .status(500)
            .json({ error: "Failed to align the PDF files" });
        } finally {
          // Clean up the temporary files
          try {
            fs.unlinkSync(sourceFile.path);
            fs.unlinkSync(targetFile.path);
          } catch (unlinkErr) {
            console.error(`Failed tounlink PDF files:`, unlinkErr);
          }
        }
      } catch (error) {
        return handleApiError(res, error);
      }
    },
  );

  // File Format Conversion endpoint
  app.post(
    "/api/admin/file/convert",
    verifyToken,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!checkAdminAccess(req, res)) return;

        const file = req.file;
        const { inputFormat, outputFormat } = req.body;

        if (!file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        if (!inputFormat || !outputFormat) {
          return res
            .status(400)
            .json({ error: "Input and output formats are required" });
        }

        // Check if conversion is supported
        const supportedConversions: Record<string, string[]> = {
          txt: ["txt", "csv", "xliff"],
          docx: ["docx", "csv", "xliff"],
          csv: ["csv", "txt"],
          xliff: ["xliff", "csv"],
          pdf: ["docx", "csv", "xliff"],
        };

        if (
          !supportedConversions[
            inputFormat as keyof typeof supportedConversions
          ]?.includes(outputFormat)
        ) {
          return res.status(400).json({
            error: `Conversion from ${inputFormat} to ${outputFormat} is not supported`,
          });
        }

        try {
          // For demonstration purposes, we'll perform a simple file conversion
          // In a real implementation, you would use proper libraries for each format
          const fileContent = fs.readFileSync(file.path, "utf8");
          let convertedContent = fileContent;
          let convertedFilename = `converted-${Date.now()}.${outputFormat}`;
          let convertedPath = path.join(
            __dirname,
            "..",
            "uploads",
            convertedFilename,
          );

          // Very simplified conversions for demonstration
          if (inputFormat === "txt" && outputFormat === "csv") {
            // Convert plain text to CSV (one row per line)
            convertedContent = fileContent
              .split(/\r?\n/)
              .filter((line) => line.trim().length > 0)
              .map((line) => `"${line.replace(/"/g, '""')}",""`) // Escape quotes and add empty target column
              .join("\n");
          } else if (inputFormat === "csv" && outputFormat === "txt") {
            // Convert CSV to plain text (extract first column)
            convertedContent = fileContent
              .split(/\r?\n/)
              .filter((line) => line.trim().length > 0)
              .map((line) => {
                // Basic CSV parsing - handle quoted fields
                const match = line.match(/^"(.*?)"/) || line.match(/^([^,]*)/);
                return match ? match[1].replace(/""/g, '"') : "";
              })
              .filter((text) => text.length > 0)
              .join("\n");
          }
          // For other formats, in a real implementation, you would use appropriate libraries

          // Create processed directory if it doesn't exist
          const outputDir = path.join(REPO_ROOT, "uploads", "processed");
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
            convertedName: convertedFilename,
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
    },
  );
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
        authorization: req.headers.authorization ? "Present" : "Not present",
        cookie: req.headers.cookie ? "Present" : "Not present",
      },
      user: req.user || null,
    });
  });

  // Project Stats API
  app.get(`${apiPrefix}/projects/:id/stats`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Get all files for this project
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id),
        with: {
          files: true,
        },
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get file IDs
      const fileIds = project.files.map((file) => file.id);

      if (fileIds.length === 0) {
        return res.json({
          totalSegments: 0,
          statusCounts: {
            Reviewed: 0,
            "100%": 0,
            Fuzzy: 0,
            MT: 0,
            Edited: 0,
            Rejected: 0,
          },
        });
      }

      // Get segments for these files with proper error handling
      let segments: schema.TranslationUnit[] = [];
      try {
        segments = await db.query.translationUnits.findMany({
          where: inArray(schema.translationUnits.fileId, fileIds),
        });

        console.log(`📊 Found ${segments.length} segments for project ${id}`);
      } catch (err) {
        console.error(`Failed to query segments for project ${id}:`, err);
        segments = [];
      }

      const totalSegments = segments?.length || 0;
      const statusCounts: Record<string, number> = {
        Reviewed: 0,
        "100%": 0,
        Fuzzy: 0,
        MT: 0,
        Edited: 0,
        Rejected: 0
      };

      // Count segments by status without using forEach
      for (let i = 0; i < segments.length; i++) {
        const status = segments[i].status || "MT";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }

      // Calculate reviewed percentage
      const reviewedCount = statusCounts["Reviewed"] || 0;
      const reviewedPercentage = Math.min(totalSegments > 0 ? (reviewedCount / totalSegments) * 100 : 0, 100);

      // Use safeSetTimeout for any delayed operations
      safeSetTimeout(() => {
        // Simple logging with safe delay
        console.log(`Project ${id} stats:`, 
          `Total: ${totalSegments}`, 
          `Reviewed: ${reviewedCount}`, 
          `Percentage: ${reviewedPercentage.toFixed(1)}%`
        );
      }, 1);

      return res.json({
        totalSegments,
        statusCounts,
        reviewedPercentage
      });
    } catch (error) {
      console.error("Failed to get project stats:", error);
      return handleApiError(res, error);
    }
  });

  // Projects API
  app.get(`${apiPrefix}/projects`, verifyToken, async (req, res) => {
    try {
      console.log("[PROJECTS API]", {
        tokenAuthenticated: !!req.user,
        user: req.user,
      });

      const projects = await db.query.projects.findMany({
        orderBy: desc(schema.projects.createdAt),
        with: {
          files: true,
          claimer: true,
        },
      });

      return res.json(projects);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  app.post(
    `${apiPrefix}/projects`,
    verifyToken,
    upload.fields([
      { name: "files", maxCount: 10 },
      { name: "references", maxCount: 10 },
    ]),
    async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        console.log("Project creation request:", {
          body: req.body,
          files: req.files ? "Files present" : "No files",
          user: req.user,
        });

        const {
          name,
          sourceLanguage,
          targetLanguage,
          description,
          notes,
          deadline,
        } = req.body;

        if (!name || !sourceLanguage || !targetLanguage) {
          return res.status(400).json({ message: "Required fields missing" });
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
          status: "Unclaimed",
        };

        // 프로젝트 추가
        const [project] = await db
          .insert(schema.projects)
          .values(projectData)
          .returning();

        // 메모리 사용량 로깅 함수
        const logMemoryUsage = (label: string) => {
          const memUsage = process.memoryUsage();
          console.log(`Memory Usage (${label}):`, {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
          });
        };
        
        logMemoryUsage('Before file processing');
        
        // 업로드된 파일 처리
        const files: (typeof schema.files.$inferInsert)[] = [];
        const uploadedFiles = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        if (uploadedFiles && uploadedFiles.files) {
          // 작업 파일 처리
          for (const file of uploadedFiles.files) {
            try {
              const fileContent = fs.readFileSync(file.path, "utf8");
              files.push({
                name: file.originalname,
                content: fileContent,
                projectId: project.id,
                type: "work",
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            } catch (fileErr) {
              console.error(
                `Error reading file ${file.originalname}:`,
                fileErr,
              );
            }
          }
        }

        if (uploadedFiles && uploadedFiles.references) {
          // 참조 파일 처리
          for (const file of uploadedFiles.references) {
            try {
              const fileContent = fs.readFileSync(file.path, "utf8");
              files.push({
                name: file.originalname,
                content: fileContent,
                projectId: project.id,
                type: "reference",
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            } catch (fileErr) {
              console.error(
                `Error reading file ${file.originalname}:`,
                fileErr,
              );
            }
          }
        }

        // 파일들을 데이터베이스에 저장
        let savedFiles: (typeof schema.files.$inferSelect)[] = [];
        if (files.length > 0) {
          savedFiles = await db.insert(schema.files).values(files).returning();

          // 분석 완료 후 임시 파일 삭제
          if (uploadedFiles) {
            Object.values(uploadedFiles).forEach((fileArray) => {
              fileArray.forEach((file) => {
                try {
                  fs.unlinkSync(file.path);
                } catch (unlinkErr) {
                  console.error(
                    `Failed to unlink file ${file.path}:`,
                    unlinkErr,
                  );
                }
              });
            });
          }
        }

        // 각 파일에 대해 세그먼트 생성
        if (savedFiles.length > 0) {
          logMemoryUsage('After file DB save, before segments creation');
          for (const file of savedFiles) {
            if (file.type === "work") {
              // 참조 파일이 아닌 작업 파일만 세그먼트 생성
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
                  const sentence = text
                    .substring(lastIndex, match.index + 1)
                    .trim();
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
              const contentLines = file.content
                .split(/\r?\n/)
                .filter((line) => line.trim().length > 0);
              
              console.log(`Processing ${contentLines.length} lines for file ID ${file.id}`);
              logMemoryUsage('Before segment processing');
              
              // 메모리 사용을 최소화하기 위해 세그먼트 ID만 추적
              const BATCH_SIZE = 50; // 한 번에 최대 50개 세그먼트씩 처리
              let segmentIds: number[] = []; // 세그먼트 ID만 저장 (전체 객체 저장 X)
              let currentBatch: {
                source: string;
                status: string;
                fileId: number;
              }[] = [];
              
              let segmentCount = 0;
              
              // 연속적인 segments 배열 확장 사용 금지 (메모리 효율성)
              console.log('Processing content with optimized memory usage');
              
              // 각 라인마다 세그먼트로 분할하고 배치로 처리
              for (const line of contentLines) {
                const sentences = segmentText(String(line).trim());
                
                for (const sentence of sentences) {
                  // 현재 배치에 추가
                  currentBatch.push({
                    source: sentence,
                    status: "MT",
                    fileId: file.id,
                  });
                  
                  segmentCount++;
                  
                  // 배치가 가득 차면 DB에 저장하고 배치 초기화
                  if (currentBatch.length >= BATCH_SIZE) {
                    console.log(`Saving batch of ${currentBatch.length} segments (${segmentCount} total)`);
                    logMemoryUsage('Before batch insert');
                    
                    const batchSavedSegments = await db
                      .insert(schema.translationUnits)
                      .values(currentBatch)
                      .returning({ id: schema.translationUnits.id });
                    
                    // 메모리 효율을 위해 전체 객체가 아닌 ID만 저장
                    segmentIds = segmentIds.concat(batchSavedSegments.map(s => s.id));
                    currentBatch = []; // 배치 초기화
                    
                    logMemoryUsage('After batch insert');
                  }
                }
              }
              
              // 남은 세그먼트 저장 (마지막 배치)
              if (currentBatch.length > 0) {
                console.log(`Saving final batch of ${currentBatch.length} segments (${segmentCount} total)`);
                logMemoryUsage('Before final batch insert');
                
                const finalBatchSegments = await db
                  .insert(schema.translationUnits)
                  .values(currentBatch)
                  .returning({ id: schema.translationUnits.id });
                
                // 메모리 효율을 위해 전체 객체가 아닌 ID만 저장
                segmentIds = segmentIds.concat(finalBatchSegments.map(s => s.id));
                
                logMemoryUsage('After final batch insert');
              }
              
              if (segmentCount > 0) {
                console.log(`Created total ${segmentCount} segments for file ID ${file.id}`);
                
                // 필요한 세그먼트 정보만 가져옴 (메모리 효율성 향상)
                const savedSegments = segmentIds.length > 0 ? 
                  await db.query.translationUnits.findMany({
                    where: inArray(schema.translationUnits.id, segmentIds),
                    columns: {
                      id: true,
                      source: true,
                      fileId: true
                    }
                  }) : [];

                // 프로젝트 정보 가져오기 (언어 정보 필요)
                const projectInfo = await db.query.projects.findFirst({
                  where: eq(schema.projects.id, file.projectId),
                });

                if (projectInfo) {
                  // 번역 메모리 준비
                  const tmMatches = await db.query.translationMemory.findMany({
                    where: and(
                      eq(
                        schema.translationMemory.sourceLanguage,
                        projectInfo.sourceLanguage,
                      ),
                      eq(
                        schema.translationMemory.targetLanguage,
                        projectInfo.targetLanguage,
                      ),
                    ),
                    limit: 100,
                  });

                  // 용어집 준비
                  const glossaryTerms = await db.query.glossary.findMany({
                    where: and(
                      eq(
                        schema.glossary.sourceLanguage,
                        projectInfo.sourceLanguage,
                      ),
                      eq(
                        schema.glossary.targetLanguage,
                        projectInfo.targetLanguage,
                      ),
                    ),
                    limit: 100,
                  });

                  // 세그먼트 처리를 모두 비동기로 처리 (메모리 문제 방지)
                  console.log('Setting up delayed translation for segments');
                  logMemoryUsage('Before setting up delayed translations');
                  
                  // 번역 요청을 비동기로 예약만 하고 즉시 리턴 (실제 번역은 백그라운드에서 처리)
                  // 이렇게 하면 현재 요청 핸들러가 먼저 완료되어 메모리를 해제함
                  const delayBetweenTranslations = 2000; // 각 세그먼트당 2초 간격
                  
                  savedSegments.forEach((segment, index) => {
                    // 각 세그먼트별로 지연 시간을 다르게 설정하여 순차 처리
                    const delay = index * delayBetweenTranslations;
                    
                    // 실제 번역 작업을 비동기로 예약
                    safeSetTimeout(async () => {
                      try {
                        // TM 매칭 및 번역 요청 로직은 그대로 유지하되, 메모리 사용량 최적화
                        console.log(`Processing delayed translation for segment ${segment.id} (${index+1}/${savedSegments.length})`);
                        
                        // 세그먼트당 매칭 찾기 (TM 리스트에서 매칭)
                        const relevantTmMatches = tmMatches
                          .filter(tm => calculateSimilarity(segment.source, tm.source) > 0.7)
                          .slice(0, 3); // 최대 3개 매칭으로 제한
                        
                        // 최적화된 용어집 매칭
                        const relevantTerms = glossaryTerms
                          .filter(term => segment.source.toLowerCase().includes(term.source.toLowerCase()))
                          .slice(0, 5); // 최대 5개 용어로 제한
                        
                        // 컨텍스트 준비 (최적화)
                        const context = relevantTmMatches.map(match => `${match.source} => ${match.target}`);
                        
                        // 번역 실행
                        const translationResult = await translateWithGPT({
                          source: segment.source,
                          sourceLanguage: projectInfo.sourceLanguage,
                          targetLanguage: projectInfo.targetLanguage,
                          context: context.length > 0 ? context : undefined,
                          glossaryTerms: relevantTerms.length > 0
                            ? relevantTerms.map(term => ({
                                source: term.source,
                                target: term.target,
                              }))
                            : undefined,
                        });
                        
                        // 번역 결과 저장
                        await db
                          .update(schema.translationUnits)
                          .set({
                            target: translationResult.target,
                            origin: "MT",
                            updatedAt: new Date(),
                          })
                          .where(eq(schema.translationUnits.id, segment.id));
                        
                        // 10개마다 로깅
                        if (index % 10 === 0 || index === savedSegments.length - 1) {
                          console.log(`Translated segment ${index+1}/${savedSegments.length} for file ID ${file.id}`);
                        }
                      } catch (error) {
                        console.error(`Error in delayed translation for segment ${segment.id}:`, error);
                      }
                    }, delay);
                  });
                  
                  console.log(`Scheduled translations for ${savedSegments.length} segments in file ID ${file.id}`);
                  logMemoryUsage('After scheduling all translations');

                  console.log(
                    `Completed translation for all ${savedSegments.length} segments in file ID ${file.id}`,
                  );
                }
              }
            }
          }
        }

        // 외부 호출에서 사용할 프로젝트 데이터
        const projectWithFiles = { ...project, files: savedFiles };

        return res.status(201).json(projectWithFiles);
      } catch (error) {
        console.error("Project creation error:", error);
        return handleApiError(res, error);
      }
    },
  );

  app.get(`${apiPrefix}/projects/:id`, verifyToken, async (req, res) => {
    try {
      console.log("[PROJECT DETAIL]", {
        tokenAuthenticated: !!req.user,
        user: req.user,
      });

      const id = parseInt(req.params.id);

      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id),
        with: {
          files: true,
          claimer: true,
        },
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // 클레임된 프로젝트이고 현재 사용자가 클레임하지 않았다면 접근 거부
      if (project.status === "Claimed" && project.claimedBy !== req.user?.id) {
        return res
          .status(403)
          .json({
            message: "Access denied. This project is claimed by another user.",
          });
      }

      return res.json(project);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // 프로젝트 진행 상황 통계 가져오기
  app.get(`${apiPrefix}/projects/:id/stats`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // 해당 프로젝트의 파일 목록 가져오기
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id),
        with: {
          files: true,
        },
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // 프로젝트에 연결된 모든 파일의 ID 추출
      const fileIds = project.files.map((file) => file.id);

      if (fileIds.length === 0) {
        return res.json({
          totalSegments: 0,
          reviewedPercentage: 0,
          statusCounts: {
            Reviewed: 0,
            "100%": 0,
            Fuzzy: 0,
            MT: 0,
            Edited: 0,
            Rejected: 0,
          } as Record<string, number>,
        });
      }

      // 모든 파일의 번역 단위(세그먼트) 가져오기
      const allSegments = await db.query.translationUnits.findMany({
        where: inArray(schema.translationUnits.fileId, fileIds),
      });

      const totalSegments = allSegments.length;

      if (totalSegments === 0) {
        return res.json({
          totalSegments: 0,
          reviewedPercentage: 0,
          statusCounts: {
            Reviewed: 0,
            "100%": 0,
            Fuzzy: 0,
            MT: 0,
            Edited: 0,
            Rejected: 0,
          } as Record<string, number>,
        });
      }

      // 기본 상태 카운트 정의
      const defaultStatusCounts = {
        Reviewed: 0,
        "100%": 0,
        Fuzzy: 0,
        MT: 0,
        Edited: 0,
        Rejected: 0,
      };

      const statusCounts = { ...defaultStatusCounts };

      // 실제 세그먼트 상태 카운트
      allSegments.forEach((segment) => {
        if (segment.status && segment.status in statusCounts) {
          statusCounts[segment.status as keyof typeof statusCounts]++;
        }
      });

      console.log(`Project ${id} status counts:`, statusCounts);

      // 번역된 세그먼트 및 리뷰된 세그먼트 개수
      let translatedCount = 0;

      allSegments.forEach((segment) => {
        // 번역되었는지 확인 (target이 존재하고 비어있지 않은 경우)
        if (segment.target && segment.target.trim() !== "") {
          translatedCount++;
        }
      });

      // Reviewed 비율 계산
      const reviewedCount = statusCounts["Reviewed"] || 0;
      const reviewedPercentage =
        totalSegments > 0 ? (reviewedCount / totalSegments) * 100 : 0;

      return res.json({
        totalSegments,
        reviewedPercentage,
        statusCounts,
      });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // 완료된 프로젝트 목록 가져오기
  app.get(`${apiPrefix}/completed-projects`, verifyToken, async (req, res) => {
    try {
      const projects = await db.query.projects.findMany({
        where: eq(schema.projects.status, "Completed"),
        orderBy: desc(schema.projects.completedAt),
        with: {
          files: true,
          claimer: true,
        },
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
        where: eq(schema.projects.id, id),
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.status !== "Unclaimed") {
        return res.status(400).json({ message: "Project is already claimed" });
      }

      // 프로젝트 클레임 처리
      const [updatedProject] = await db
        .update(schema.projects)
        .set({
          status: "Claimed",
          claimedBy: userId,
          claimedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.projects.id, id))
        .returning();

      return res.json(updatedProject);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // 프로젝트 클레임 해제하기
  app.post(
    `${apiPrefix}/projects/:id/release`,
    verifyToken,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const userId = req.user!.id;

        // 프로젝트가 존재하고 현재 사용자가 클레임했는지 확인
        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.id, id),
        });

        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        if (project.status !== "Claimed") {
          return res
            .status(400)
            .json({ message: "Project is not in claimed status" });
        }

        if (project.claimedBy !== userId) {
          return res
            .status(403)
            .json({
              message: "You do not have permission to release this project",
            });
        }

        // 프로젝트 클레임 해제 처리
        const [updatedProject] = await db
          .update(schema.projects)
          .set({
            status: "Unclaimed",
            claimedBy: null,
            claimedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.projects.id, id))
          .returning();

        return res.json(updatedProject);
      } catch (error) {
        return handleApiError(res, error);
      }
    },
  );

  // 프로젝트 완료 처리하기
  app.post(
    `${apiPrefix}/projects/:id/complete`,
    verifyToken,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const userId = req.user!.id;

        // 프로젝트가 존재하고 현재 사용자가 클레임했는지 확인
        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.id, id),
        });

        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        if (project.status !== "Claimed") {
          return res
            .status(400)
            .json({ message: "Project is not in claimed status" });
        }

        if (project.claimedBy !== userId) {
          return res
            .status(403)
            .json({
              message: "You do not have permission to complete this project",
            });
        }

        // 프로젝트 완료 처리
        const [completedProject] = await db
          .update(schema.projects)
          .set({
            status: "Completed",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.projects.id, id))
          .returning();

        return res.json(completedProject);
      } catch (error) {
        return handleApiError(res, error);
      }
    },
  );

  // 완료된 프로젝트 재오픈하기
  app.post(
    `${apiPrefix}/projects/:id/reopen`,
    verifyToken,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const userId = req.user!.id;
        const isAdmin = req.user?.role === "admin";

        // 프로젝트가 존재하고 Completed 상태인지 확인
        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.id, id),
        });

        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        if (project.status !== "Completed") {
          return res
            .status(400)
            .json({ message: "Project is not in completed status" });
        }

        // 권한 확인: 이전 클레이머 또는 관리자만 재오픈 가능
        if (!isAdmin && project.claimedBy !== userId) {
          return res
            .status(403)
            .json({
              message: "You do not have permission to reopen this project",
            });
        }

        // 프로젝트 재오픈 처리 - 이전 클레임 사용자가 그대로 유지됨
        const [reopenedProject] = await db
          .update(schema.projects)
          .set({
            status: "Claimed",
            completedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.projects.id, id))
          .returning();

        return res.json(reopenedProject);
      } catch (error) {
        return handleApiError(res, error);
      }
    },
  );

  // 프로젝트 삭제하기
  app.delete(`${apiPrefix}/projects/:id`, verifyToken, async (req, res) => {
    try {
      // 관리자 권한 확인
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin privileges required" });
      }

      const id = parseInt(req.params.id);

      // 프로젝트가 존재하는지 확인
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id),
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // 관리자는 모든 상태의 프로젝트를 삭제할 수 있도록 수정

      // 먼저 연관된 모든 파일의 segments를 삭제
      const files = await db.query.files.findMany({
        where: eq(schema.files.projectId, id),
      });

      for (const file of files) {
        await db
          .delete(schema.translationUnits)
          .where(eq(schema.translationUnits.fileId, file.id));
      }

      // 그 다음 파일 삭제
      await db.delete(schema.files).where(eq(schema.files.projectId, id));

      // 마지막으로 프로젝트 삭제
      await db.delete(schema.projects).where(eq(schema.projects.id, id));

      return res.json({ message: "Project deleted successfully" });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Files API
  app.get(`${apiPrefix}/files/:id`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      console.log("[FILES API] Request for file ID:", id, {
        tokenAuthenticated: !!req.user,
        user: req.user,
      });

      const file = await db.query.files.findFirst({
        where: eq(schema.files.id, id),
        with: {
          segments: {
            orderBy: schema.translationUnits.id,
          },
        },
      });

      if (!file) {
        console.log(`[FILES API] File with ID ${id} not found`);
        return res.status(404).json({ message: "File not found" });
      }

      console.log(`[FILES API] Successfully fetched file ${id}:`, {
        name: file.name,
        segmentsCount: file.segments?.length || 0,
      });

      return res.json(file);
    } catch (error) {
      console.error("[FILES API] Error:", error);
      return handleApiError(res, error);
    }
  });

  // File Download API
  app.get(`${apiPrefix}/files/:id/download`, async (req, res) => {
    try {
      // 쿼리 파라미터에서 토큰을 받아서 검증
      const token =
        (req.query.token as string) || req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      try {
        // 토큰 검증
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        // req.user 설정
        req.user = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        };
      } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
      }

      const id = parseInt(req.params.id);

      const file = await db.query.files.findFirst({
        where: eq(schema.files.id, id),
      });

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Set content disposition header for download with double quotes and encoded filename
      const encodedFilename = encodeURIComponent(file.name);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      );
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");

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
      const contentLines = fileData.content
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);
      let segments: { source: string; status: string; fileId: number }[] = [];

      // Process each line
      for (const line of contentLines) {
        const sentences = segmentText(line.trim());

        // Add each sentence as a separate segment
        segments = [
          ...segments,
          ...sentences.map((sentence) => ({
            source: sentence,
            status: "MT",
            fileId: file.id,
          })),
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
        orderBy: schema.translationUnits.id,
      });

      return res.json(segments);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // 프로젝트 정보 업데이트 API
  app.patch(`${apiPrefix}/projects/:id`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { deadline, glossaryId, tmId, name, description } = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // 프로젝트가 존재하는지 확인
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id),
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // admin 권한 체크
      if (userRole !== "admin") {
        return res
          .status(403)
          .json({ message: "Only admins can edit project information" });
      }

      // 프로젝트 정보 업데이트
      const [updatedProject] = await db
        .update(schema.projects)
        .set({
          ...(deadline !== undefined && { deadline }),
          ...(glossaryId !== undefined && { glossaryId }),
          ...(tmId !== undefined && { tmId }),
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          updatedAt: new Date(),
        })
        .where(eq(schema.projects.id, id))
        .returning();

      return res.json({ success: true, project: updatedProject });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // 프로젝트 노트 저장 API
  app.post(`${apiPrefix}/projects/:id/notes`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { notes } = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // 프로젝트가 존재하는지 확인
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id),
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // admin 권한 체크
      if (userRole !== "admin") {
        return res
          .status(403)
          .json({ message: "Only admins can edit project notes" });
      }

      // 프로젝트 노트 업데이트
      const [updatedProject] = await db
        .update(schema.projects)
        .set({
          notes: notes,
          updatedAt: new Date(),
        })
        .where(eq(schema.projects.id, id))
        .returning();

      return res.json({ success: true, project: updatedProject });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // 프로젝트 참조 파일 메타데이터 저장 API (기존 호환성 유지)
  app.post(
    `${apiPrefix}/projects/:id/references`,
    verifyToken,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { files } = req.body; // 파일 메타데이터 배열
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // 프로젝트가 존재하는지 확인
        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.id, id),
        });

        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        // admin 권한 체크
        if (userRole !== "admin") {
          return res
            .status(403)
            .json({ message: "Only admins can add reference files" });
        }

        // 현재 참조 파일 메타데이터 가져오기
        let existingReferences = [];
        if (project.references) {
          try {
            existingReferences = JSON.parse(project.references);
          } catch (e) {
            console.warn("Failed to parse existing references:", e);
          }
        }

        // 새 참조 파일 메타데이터 추가
        const updatedReferences = [
          ...existingReferences,
          ...files.map((file: any) => ({
            name: file.name,
            size: file.size,
            type: file.type,
            addedAt: new Date().toISOString(),
          })),
        ];

        // 프로젝트 업데이트
        const [updatedProject] = await db
          .update(schema.projects)
          .set({
            references: JSON.stringify(updatedReferences),
            updatedAt: new Date(),
          })
          .where(eq(schema.projects.id, id))
          .returning();

        // 추가된 참조 파일의 배열만 반환합니다 (클라이언트가 기대하는 형식)
        const newReferences = files.map((file: any) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          addedAt: new Date().toISOString(),
        }));

        return res.json(newReferences);
      } catch (error) {
        return handleApiError(res, error);
      }
    },
  );

  // 실제 파일을 업로드하는 API 엔드포인트
  app.post(
    `${apiPrefix}/projects/:id/references/upload`,
    verifyToken,
    referenceUpload.array("files"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // 업로드된 파일 확인
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ message: "No files uploaded" });
        }

        // 프로젝트가 존재하는지 확인
        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.id, id),
        });

        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        // admin 권한 체크
        if (userRole !== "admin") {
          // 업로드된 파일 삭제
          for (const file of files) {
            try {
              fs.unlinkSync(file.path);
            } catch (err) {
              console.error(
                `Failed to delete unauthorized upload: ${file.path}`,
                err,
              );
            }
          }
          return res
            .status(403)
            .json({ message: "Only admins can add reference files" });
        }

        // 현재 참조 파일 메타데이터 가져오기
        let existingReferences = [];
        if (project.references) {
          try {
            existingReferences = JSON.parse(project.references);
          } catch (e) {
            console.warn("Failed to parse existing references:", e);
          }
        }

        // 파일에서 메타데이터 추출
        const fileMetadata = files.map((file) => ({
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          filename: file.filename, // 저장된 실제 파일명 포함
          path: file.path, // 실제 저장 경로 (관리용, 클라이언트에게는 반환되지 않음)
          addedAt: new Date().toISOString(),
        }));

        // 참조 파일 메타데이터 업데이트
        const updatedReferences = [...existingReferences, ...fileMetadata];

        // 프로젝트 업데이트
        const [updatedProject] = await db
          .update(schema.projects)
          .set({
            references: JSON.stringify(updatedReferences),
            updatedAt: new Date(),
          })
          .where(eq(schema.projects.id, id))
          .returning();

        // 클라이언트에게 필요한 정보만 반환
        const clientMetadata = fileMetadata.map(
          ({ name, size, type, addedAt }) => ({
            name,
            size,
            type,
            addedAt,
          }),
        );

        return res.status(200).json(clientMetadata);
      } catch (error) {
        return handleApiError(res, error);
      }
    },
  );

  // 프로젝트 참조 파일 삭제 API
  app.delete(
    `${apiPrefix}/projects/:id/references/:index`,
    verifyToken,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const index = parseInt(req.params.index);
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // 프로젝트가 존재하는지 확인
        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.id, id),
        });

        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        // admin 권한 체크
        if (userRole !== "admin") {
          return res
            .status(403)
            .json({ message: "Only admins can delete reference files" });
        }

        // 현재 참조 파일 메타데이터 가져오기
        let references = [];
        if (project.references) {
          try {
            references = JSON.parse(project.references);
          } catch (e) {
            console.warn("Failed to parse existing references:", e);
            return res.status(400).json({ message: "Invalid references data" });
          }
        }

        // 인덱스가 유효한지 확인
        if (index < 0 || index >= references.length) {
          return res.status(404).json({ message: "Reference file not found" });
        }

        // 삭제할 파일의 메타데이터 저장
        const fileToDelete = references[index];

        // 실제 파일이 있는 경우 (filename 필드가 존재) 삭제
        if (fileToDelete.filename) {
          const filePath =
            fileToDelete.path ||
            path.join(
              REPO_ROOT,
              "uploads",
              "references",
              fileToDelete.filename,
            );
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`실제 파일 삭제 완료: ${filePath}`);
            } else {
              console.warn(`삭제할 파일을 찾지 못함: ${filePath}`);
            }
          } catch (err) {
            console.error("파일 삭제 중 오류 발생:", err);
          }
        }

        // 참조 파일 메타데이터에서 제거
        references.splice(index, 1);

        // 프로젝트 업데이트
        const [updatedProject] = await db
          .update(schema.projects)
          .set({
            references: JSON.stringify(references),
            updatedAt: new Date(),
          })
          .where(eq(schema.projects.id, id))
          .returning();

        return res.json({ success: true, references });
      } catch (error) {
        return handleApiError(res, error);
      }
    },
  );

  // 프로젝트 참조 파일 다운로드 API (인증 불필요)
  app.get(
    `${apiPrefix}/projects/:id/references/:index/download`,
    optionalToken,
    async (req, res) => {
      console.log("다운로드 요청 받음:", req.params.id, req.params.index);
      try {
        const id = parseInt(req.params.id);
        const index = parseInt(req.params.index);

        // 인증 정보 로깅 (디버깅용)
        console.log(
          "Auth header:",
          req.headers.authorization ? "존재함" : "존재하지 않음",
        );
        console.log("User 객체:", req.user ? "존재함" : "존재하지 않음");

        // 프로젝트가 존재하는지 확인
        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.id, id),
        });

        if (!project) {
          console.log("프로젝트를 찾을 수 없음:", id);
          return res.status(404).json({ message: "Project not found" });
        }

        // 참조 파일 메타데이터 가져오기
        let references = [];
        if (project.references) {
          try {
            references = JSON.parse(project.references);
            console.log("파싱된 참조 파일 개수:", references.length);
          } catch (e) {
            console.warn("Failed to parse references:", e);
            return res.status(400).json({ message: "Invalid references data" });
          }
        }

        // 인덱스가 유효한지 확인
        if (index < 0 || index >= references.length) {
          console.log(
            "유효하지 않은 인덱스:",
            index,
            "전체 참조 파일 개수:",
            references.length,
          );
          return res.status(404).json({ message: "Reference file not found" });
        }

        const file = references[index];
        console.log("다운로드할 파일 정보:", file);

        // 파일 유형에 따른 처리
        const fileType = file.type || "application/octet-stream";
        const fileName = encodeURIComponent(file.name);

        // Content-Type 및 Content-Disposition 헤더 설정
        res.setHeader("Content-Type", fileType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName}"`,
        );

        // CORS 헤더 추가
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization",
        );

        // 실제 파일이 존재하는지 확인 (filename 필드가 있는 경우)
        if (file.filename) {
          // 이전에 저장된 실제 파일 경로 확인
          const filePath =
            file.path ||
            path.join(REPO_ROOT, "uploads", "references", file.filename);

          console.log("실제 파일 다운로드 시도:", filePath);

          // 파일이 실제로 존재하는지 확인
          if (fs.existsSync(filePath)) {
            console.log("파일 존재함, 스트림으로 전송");
            // 파일 스트림 생성하여 응답으로 전송
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            return;
          } else {
            console.log("파일을 찾을 수 없음:", filePath);
            // 파일이 없는 경우 에러 메시지 반환
            return res
              .status(404)
              .json({ message: "File not found on server" });
          }
        } else {
          console.log("파일 경로 정보 없음, 가상 콘텐츠 생성");

          // 이전 버전과의 호환성을 위해 더미 데이터 생성 로직 유지
          let fileContent;

          if (fileType.startsWith("image/")) {
            // 이미지 파일인 경우 간단한 이미지 데이터 생성 (1x1 픽셀 투명 PNG)
            if (fileType === "image/png") {
              // 1x1 투명 PNG 파일 (Base64)
              const transparentPngBase64 =
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
              fileContent = Buffer.from(transparentPngBase64, "base64");
            } else if (fileType === "image/jpeg" || fileType === "image/jpg") {
              // 1x1 흰색 JPEG 파일 (Base64)
              const whiteJpegBase64 =
                "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==";
              fileContent = Buffer.from(whiteJpegBase64, "base64");
            } else if (fileType === "image/gif") {
              // 1x1 투명 GIF 파일 (Base64)
              const transparentGifBase64 =
                "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
              fileContent = Buffer.from(transparentGifBase64, "base64");
            } else {
              // 기타 이미지 형식은 PNG로 대체
              const transparentPngBase64 =
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
              fileContent = Buffer.from(transparentPngBase64, "base64");
            }
          } else if (fileType === "text/html") {
            // HTML 파일인 경우
            fileContent = `<!DOCTYPE html>
<html>
<head>
  <title>${file.name}</title>
</head>
<body>
  <h1>샘플 HTML 파일</h1>
  <p>이 파일은 ${file.name} 입니다.</p>
  <p>크기: ${file.size || "N/A"}</p>
  <p>추가된 날짜: ${file.addedAt || "N/A"}</p>
  <p>참고: 이 파일은 참조용 메타데이터만 있는 더미 파일입니다.</p>
</body>
</html>`;
          } else if (fileType === "application/pdf") {
            // PDF 파일을 위한 간단한 데이터 생성
            // 매우 기본적인 PDF 구조 (실제 PDF 문서처럼 보이지 않을 수 있음)
            const pdfData =
              "%PDF-1.4\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>>\nendobj\n4 0 obj\n<</Length 90>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(This is a dummy PDF file for preview) Tj\n(File name: " +
              file.name +
              ") '\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000198 00000 n\ntrailer\n<</Size 5 /Root 1 0 R>>\nstartxref\n288\n%%EOF";
            fileContent = Buffer.from(pdfData);
          } else if (
            fileType === "text/plain" ||
            fileType.startsWith("text/")
          ) {
            // 텍스트 파일인 경우
            fileContent =
              `이 파일은 ${file.name}입니다.\n` +
              `크기: ${file.size || "N/A"}\n` +
              `추가된 날짜: ${file.addedAt || "N/A"}\n\n` +
              `참고: 이 파일은 참조용 메타데이터만 있는 더미 파일입니다.`;
          } else if (fileType === "application/json") {
            // JSON 파일인 경우
            const jsonData = {
              fileName: file.name,
              fileSize: file.size || "N/A",
              addedAt: file.addedAt || "N/A",
              description:
                "이 파일은 참조용 메타데이터만 있는 더미 파일입니다.",
            };
            fileContent = JSON.stringify(jsonData, null, 2);
          } else {
            // 기타 모든 파일 형식에 대한 기본 텍스트 내용
            fileContent =
              `이 파일은 ${file.name}입니다.\n` +
              `크기: ${file.size || "N/A"}\n` +
              `추가된 날짜: ${file.addedAt || "N/A"}\n\n` +
              `참고: 이 파일은 참조용 메타데이터만 있는 더미 파일입니다.`;
          }

          console.log("가상 콘텐츠 생성 완료, 타입:", fileType);
          return res.send(fileContent);
        }
      } catch (error) {
        console.error("다운로드 처리 중 오류 발생:", error);
        return handleApiError(res, error);
      }
    },
  );

  // 아래는 원래 코드를 보존한 것이지만 실제로는 사용되지 않음 (위의 라우트가 먼저 매칭됨)
  app.get(
    `${apiPrefix}/projects/:id/references-old/:index/download`,
    verifyToken,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const index = parseInt(req.params.index);

        // 프로젝트가 존재하는지 확인
        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.id, id),
        });

        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        // 현재 참조 파일 메타데이터 가져오기
        let references = [];
        if (project.references) {
          try {
            references = JSON.parse(project.references);
          } catch (e) {
            console.warn("Failed to parse existing references:", e);
            return res.status(400).json({ message: "Invalid references data" });
          }
        }

        // 인덱스가 유효한지 확인
        if (index < 0 || index >= references.length) {
          return res.status(404).json({ message: "Reference file not found" });
        }

        const fileRef = references[index];
        const filePath = path.join(
          REPO_ROOT,
          "uploads",
          "references",
          `${id}_${fileRef.name}`,
        );

        // 파일이 존재하는지 확인
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ message: "File not found on server" });
        }

        // 파일 전송
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(fileRef.name)}"`,
        );
        res.setHeader(
          "Content-Type",
          fileRef.type || "application/octet-stream",
        );

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      } catch (error) {
        return handleApiError(res, error);
      }
    },
  );

  app.patch(`${apiPrefix}/segments/:id`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateSchema = z.object({
        target: z.string().optional(),
        status: z.string().optional(),
        comment: z.string().optional(),
        origin: z.string().optional(), // Add origin field to the schema
      });

      const data = updateSchema.parse(req.body);
      console.log(`Updating segment ${id} with data:`, data); // Add logging for debugging
      const [updatedSegment] = await db
        .update(schema.translationUnits)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.translationUnits.id, id))
        .returning();

      if (!updatedSegment) {
        return res.status(404).json({ message: "Segment not found" });
      }

      // If the status is Reviewed, save to TM
      if (data.status === "Reviewed" && updatedSegment.target) {
        const file = await db.query.files.findFirst({
          where: eq(schema.files.id, updatedSegment.fileId),
          with: {
            project: true,
          },
        });

        if (file && file.project) {
          await db.insert(schema.translationMemory).values({
            source: updatedSegment.source,
            target: updatedSegment.target,
            status: "Reviewed",
            sourceLanguage: file.project.sourceLanguage,
            targetLanguage: file.project.targetLanguage,
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
        targetLanguage: z.string(),
      });

      const { source, sourceLanguage, targetLanguage } = translateSchema.parse(
        req.body,
      );

      // Search for matches in TM
      const tmMatches = await db.query.translationMemory.findMany({
        where: and(
          eq(schema.translationMemory.sourceLanguage, sourceLanguage),
          eq(schema.translationMemory.targetLanguage, targetLanguage),
          eq(schema.translationMemory.status, "Reviewed"), // Only use Reviewed TM entries
          like(schema.translationMemory.source, `%${source}%`),
        ),
        orderBy: [
          // Prioritize human translations (HT) over automatic ones
          desc(schema.translationMemory.origin),
          // Then sort by recency
          desc(schema.translationMemory.updatedAt),
        ],
        limit: 5,
      });

      // Find relevant glossary terms for this source text
      const glossaryTerms = await db.query.glossary.findMany({
        where: and(
          eq(schema.glossary.sourceLanguage, sourceLanguage),
          eq(schema.glossary.targetLanguage, targetLanguage),
        ),
      });

      // Filter terms that are present in the source text
      const relevantTerms = glossaryTerms.filter((term) =>
        source.toLowerCase().includes(term.source.toLowerCase()),
      );

      try {
        // Extract context from TM matches to help with translation
        const context = tmMatches.map(
          (match) => `${match.source} => ${match.target}`,
        );

        // Use OpenAI API for translation
        const translationResult = await translateWithGPT({
          source,
          sourceLanguage,
          targetLanguage,
          context: context.length > 0 ? context : undefined,
          glossaryTerms:
            relevantTerms.length > 0
              ? relevantTerms.map((term) => ({
                  source: term.source,
                  target: term.target,
                }))
              : undefined,
        });

        return res.json({
          source,
          target: translationResult.target,
          alternatives: translationResult.alternatives,
          status: "MT",
          tmMatches,
          glossaryTerms: relevantTerms.length > 0 ? relevantTerms : undefined,
        });
      } catch (translationError) {
        console.error("Error using GPT for translation:", translationError);

        // Fallback to TM if available
        let fallbackTranslation = "";
        if (tmMatches.length > 0) {
          fallbackTranslation = tmMatches[0].target;
        } else {
          fallbackTranslation = `[Translation failed] ${source}`;
        }

        return res.json({
          source,
          target: fallbackTranslation,
          alternatives: [], // Empty alternatives when translation fails
          status: "MT",
          tmMatches,
          glossaryTerms: relevantTerms.length > 0 ? relevantTerms : undefined,
          error: "Translation service unavailable, using fallback",
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
        limit: z.number().optional(),
        includeAllStatuses: z.boolean().optional().default(false), // Optional flag to include all statuses
      });

      const {
        source,
        sourceLanguage,
        targetLanguage,
        limit = 5,
        includeAllStatuses,
      } = searchSchema.parse(req.body);

      // Build the where clause
      let whereConditions = [
        eq(schema.translationMemory.sourceLanguage, sourceLanguage),
        eq(schema.translationMemory.targetLanguage, targetLanguage),
        like(schema.translationMemory.source, `%${source}%`),
      ];

      // Only include 'Reviewed' status entries by default (unless includeAllStatuses is true)
      if (!includeAllStatuses) {
        whereConditions.push(eq(schema.translationMemory.status, "Reviewed"));
      }

      const tmMatches = await db.query.translationMemory.findMany({
        where: and(...whereConditions),
        orderBy: [
          // If we're including all statuses, prioritize Reviewed ones
          desc(schema.translationMemory.status),
          // Then prioritize human translations (HT) over automatic ones
          desc(schema.translationMemory.origin),
          // Finally, sort by recency
          desc(schema.translationMemory.updatedAt),
        ],        limit,
      });

      // Calculate similarity scores and sort by similarity (descending)
      const scoredMatches = tmMatches
        .map((match) => ({
          ...match,
          similarity: calculateSimilarity(source, match.source),
        }))
        .sort((a, b) => b.similarity - a.similarity);

      return res.json(scoredMatches);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  app.post(`${apiPrefix}/update_tm`, verifyToken, async (req, res) => {
    try {
      const data = z
        .object({
          source: z.string().min(1, "Source text is required"),
          target: z.string().min(1, "Target text is required"),
          status: z.enum(["Draft", "Reviewed", "Rejected"]).default("Reviewed"),
          origin: z.enum(["MT", "Fuzzy", "100%", "HT"]).default("HT"),
          sourceLanguage: z.string().min(2),
          targetLanguage: z.string().min(2),
          context: z.string().optional(),
          resourceId: z.number().default(1),
        })
        .parse(req.body);

      // Only store segments with 'Reviewed' status
      if (data.status !== "Reviewed") {
        return res.status(200).json({
          message: "Only Reviewed segments are stored in TM",
          stored: false,
        });
      }

      // Check if a duplicate (same source + target) exists
      const existingEntry = await db.query.translationMemory.findFirst({
        where: and(
          eq(schema.translationMemory.source, data.source),
          eq(schema.translationMemory.target, data.target),
          eq(schema.translationMemory.sourceLanguage, data.sourceLanguage),
          eq(schema.translationMemory.targetLanguage, data.targetLanguage),
        ),
      });

      let tmEntry;

      if (existingEntry) {
        // Update existing entry
        const [updatedEntry] = await db
          .update(schema.translationMemory)
          .set({
            status: data.status,
            origin: data.origin,
            context: data.context,
            resourceId: data.resourceId,
            updatedAt: new Date(),
          })
          .where(eq(schema.translationMemory.id, existingEntry.id))
          .returning();

        tmEntry = updatedEntry;

        return res.status(200).json({
          ...tmEntry,
          message: "Updated existing TM entry",
          updated: true,
        });
      } else {
        // Insert new entry
        const [newEntry] = await db
          .insert(schema.translationMemory)
          .values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        tmEntry = newEntry;

        return res.status(201).json({
          ...tmEntry,
          message: "Created new TM entry",
          created: true,
        });
      }
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
        return res
          .status(400)
          .json({ message: "Source and target languages are required" });
      }

      const terms = await db.query.glossary.findMany({
        where: and(
          eq(schema.glossary.sourceLanguage, sourceLanguage),
          eq(schema.glossary.targetLanguage, targetLanguage),
        ),
      });

      return res.json(terms);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Search glossary with term matching
  app.get(`${apiPrefix}/glossary/search`, verifyToken, async (req, res) => {
    try {
      const sourceLanguage = req.query.sourceLanguage as string;
      const targetLanguage = req.query.targetLanguage as string;
      const query = req.query.query as string;

      if (!sourceLanguage || !targetLanguage) {
        return res
          .status(400)
          .json({ message: "Source and target languages are required" });
      }

      if (!query || query.length < 2) {
        return res
          .status(400)
          .json({ message: "Search query must be at least 2 characters long" });
      }

      // Use SQL ILIKE for case-insensitive pattern matching
      const terms = await db.query.glossary.findMany({
        where: and(
          eq(schema.glossary.sourceLanguage, sourceLanguage),
          eq(schema.glossary.targetLanguage, targetLanguage),
          or(
            sql`${schema.glossary.source} ILIKE ${`%${query}%`}`,
            sql`${schema.glossary.target} ILIKE ${`%${query}%`}`,
          ),
        ),
        limit: 20,
      });

      return res.json(terms);
    } catch (error) {
      console.error("Error searching glossary:", error);
      return handleApiError(res, error);
    }
  });

  // Get all Glossary resources
  app.get(`${apiPrefix}/glossary/resources`, verifyToken, async (req, res) => {
    try {
      const glossaryResources = await db.query.tbResources.findMany({
        orderBy: desc(schema.tbResources.createdAt),
      });

      return res.json(glossaryResources);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Add new Glossary resource
  app.post(`${apiPrefix}/glossary/resource`, verifyToken, async (req, res) => {
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

      const [resource] = await db
        .insert(schema.tbResources)
        .values({
          name: data.name,
          description: data.description || "",
          defaultSourceLanguage: data.defaultSourceLanguage,
          defaultTargetLanguage: data.defaultTargetLanguage,
          domain: data.domain || "",
          isActive: data.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return res.status(201).json(resource);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Delete Glossary resource
  app.delete(
    `${apiPrefix}/glossary/resource/:id`,
    verifyToken,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);

        // Check if resource exists
        const resource = await db.query.tbResources.findFirst({
          where: eq(schema.tbResources.id, id),
        });

        if (!resource) {
          return res
            .status(404)
            .json({ message: "Glossary resource not found" });
        }

        // Delete the resource
        await db
          .delete(schema.tbResources)
          .where(eq(schema.tbResources.id, id));

        return res.json({ message: "Glossary resource deleted successfully" });
      } catch (error) {
        return handleApiError(res, error);
      }
    },
  );

  // Get all glossary terms (for management page) with optional resourceId filter
  app.get(`${apiPrefix}/glossary/all`, verifyToken, async (req, res) => {
    try {
      const resourceId = req.query.resourceId
        ? parseInt(req.query.resourceId as string)
        : undefined;

      let terms;
      if (resourceId) {
        terms = await db.query.glossary.findMany({
          where: eq(schema.glossary.resourceId, resourceId),
          orderBy: desc(schema.glossary.createdAt),
        });
      } else {
        terms = await db.query.glossary.findMany({
          orderBy: desc(schema.glossary.createdAt),
        });
      }

      return res.json(terms);
    } catch (error) {
      console.error("Error fetching glossary terms:", error);
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
        where: eq(schema.glossary.id, id),
      });

      if (!term) {
        return res.status(404).json({ message: "Glossary term not found" });
      }

      // Delete the term
      await db.delete(schema.glossary).where(eq(schema.glossary.id, id));

      return res.json({ message: "Glossary term deleted successfully" });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Search glossary terms
  app.post(`${apiPrefix}/glossary/search`, verifyToken, async (req, res) => {
    try {
      const searchSchema = z.object({
        text: z.string(),
        sourceLanguage: z.string(),
        targetLanguage: z.string(),
      });

      const { text, sourceLanguage, targetLanguage } = searchSchema.parse(
        req.body,
      );

      // Split the input text into words for matching
      const words = text.split(/\s+/);

      // Get all glossary terms for the specified language pair
      const allTerms = await db.query.glossary.findMany({
        where: and(
          eq(schema.glossary.sourceLanguage, sourceLanguage),
          eq(schema.glossary.targetLanguage, targetLanguage),
        ),
      });

      // Find matches in the text
      const matches = allTerms.filter((term) => {
        // Check if any word in the text matches the source term
        return words.some(
          (word) =>
            word.toLowerCase() === term.source.toLowerCase() ||
            text.toLowerCase().includes(term.source.toLowerCase()),
        );
      });

      return res.json(matches);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Translation Memory API
  // Get all TMs
  app.get(`${apiPrefix}/tm/resources`, verifyToken, async (req, res) => {
    try {
      const tmResources = await db.query.tmResources.findMany({
        orderBy: desc(schema.tmResources.createdAt),
      });

      return res.json(tmResources);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Add new TM
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

      const [resource] = await db
        .insert(schema.tmResources)
        .values({
          name: data.name,
          description: data.description || "",
          defaultSourceLanguage: data.defaultSourceLanguage,
          defaultTargetLanguage: data.defaultTargetLanguage,
          isActive: data.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return res.status(201).json(resource);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get all TM entries (with optional resourceId filter)
  app.get(`${apiPrefix}/tm/all`, verifyToken, async (req, res) => {
    try {
      const resourceId = req.query.resourceId
        ? parseInt(req.query.resourceId as string)
        : undefined;
      const showAllStatuses = req.query.showAllStatuses === "true";

      // Build where conditions based on parameters
      let whereConditions = [];

      // Filter by resource ID if provided
      if (resourceId) {
        whereConditions.push(
          eq(schema.translationMemory.resourceId, resourceId),
        );
      }

      // Only include 'Reviewed' status entries by default
      if (!showAllStatuses) {
        whereConditions.push(eq(schema.translationMemory.status, "Reviewed"));
      }

      // Execute query with appropriate conditions
      let tmEntries;
      if (whereConditions.length > 0) {
        tmEntries = await db.query.translationMemory.findMany({
          where: and(...whereConditions),
          orderBy: [
            // If showing all statuses, prioritize Reviewed ones
            desc(schema.translationMemory.status),
            // Then prioritize human translations (HT) over automatic ones
            desc(schema.translationMemory.origin),
            // Then sort by creation date
            desc(schema.translationMemory.createdAt),
          ],
        });
      } else {
        // No filters, but still apply the sort order
        tmEntries = await db.query.translationMemory.findMany({
          orderBy: [
            desc(schema.translationMemory.status),
            desc(schema.translationMemory.origin),
            desc(schema.translationMemory.createdAt),
          ],
        });
      }

      return res.json(tmEntries);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get a specific TM and its entries
  app.get(`${apiPrefix}/tm/resource/:id`, verifyToken, async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);

      const resource = await db.query.tmResources.findFirst({
        where: eq(schema.tmResources.id, resourceId),
      });

      if (!resource) {
        return res.status(404).json({ message: "TM not found" });
      }

      const showAllStatuses = req.query.showAllStatuses === "true";

      // Build where conditions
      let whereConditions = [
        eq(schema.translationMemory.resourceId, resourceId),
      ];

      // Only include 'Reviewed' status entries by default
      if (!showAllStatuses) {
        whereConditions.push(eq(schema.translationMemory.status, "Reviewed"));
      }

      const entries = await db.query.translationMemory.findMany({
        where: and(...whereConditions),
        orderBy: [
          desc(schema.translationMemory.status),
          desc(schema.translationMemory.origin),
          desc(schema.translationMemory.createdAt),
        ],
      });

      return res.json({
        resource,
        entries,
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
      const showAllStatuses = req.query.showAllStatuses === "true";

      if (!sourceLanguage || !targetLanguage) {
        return res
          .status(400)
          .json({ message: "Source and target languages are required" });
      }

      // Build where conditions
      let whereConditions = [
        eq(schema.translationMemory.sourceLanguage, sourceLanguage),
        eq(schema.translationMemory.targetLanguage, targetLanguage),
      ];

      // Only include 'Reviewed' status entries by default
      if (!showAllStatuses) {
        whereConditions.push(eq(schema.translationMemory.status, "Reviewed"));
      }

      const tmEntries = await db.query.translationMemory.findMany({
        where: and(...whereConditions),
        orderBy: [
          // If showing all statuses, prioritize Reviewed ones
          desc(schema.translationMemory.status),
          // Then prioritize human translations (HT) over automatic ones
          desc(schema.translationMemory.origin),
          // Then by recency
          desc(schema.translationMemory.updatedAt),
        ],
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
        threshold: z.number().optional().default(0.7),
        showAllStatuses: z.boolean().optional().default(false),
      });

      const {
        text,
        sourceLanguage,
        targetLanguage,
        threshold,
        showAllStatuses,
      } = searchSchema.parse(req.body);

      // Build where conditions
      let whereConditions = [
        eq(schema.translationMemory.sourceLanguage, sourceLanguage),
        eq(schema.translationMemory.targetLanguage, targetLanguage),
      ];

      // Only include 'Reviewed' status entries by default
      if (!showAllStatuses) {
        whereConditions.push(eq(schema.translationMemory.status, "Reviewed"));
      }

      // Get filtered TM entries for the language pair
      const allEntries = await db.query.translationMemory.findMany({
        where: and(...whereConditions),
        orderBy: [
          desc(schema.translationMemory.status),
          desc(schema.translationMemory.origin),
        ],
      });

      // Find fuzzy matches based on similarity
      const matches = allEntries
        .map((entry) => {
          const similarity = calculateSimilarity(text, entry.source);
          return {
            ...entry,
            similarity,
          };
        })
        .filter((entry) => entry.similarity >= threshold)
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
      const [entry] = await db
        .insert(schema.translationMemory)
        .values(data)
        .returning();

      return res.status(201).json(entry);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Delete TM entry by ID
  app.delete(`${apiPrefix}/tm/:id`, verifyToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      // Check if entry exists
      const entry = await db.query.translationMemory.findFirst({
        where: eq(schema.translationMemory.id, id),
      });

      if (!entry) {
        return res
          .status(404)
          .json({ message: "Translation memory entry not found" });
      }

      // Delete the entry
      await db
        .delete(schema.translationMemory)
        .where(eq(schema.translationMemory.id, id));

      return res.json({
        message: "Translation memory entry deleted successfully",
      });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server setup
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' // Using a distinct path to avoid conflict with Vite's HMR websocket
  });

  // Connected clients storage with project ID mapping
  const clients = new Map<WebSocket, {
    userId?: number;
    username?: string;
    projectId?: number;
    fileId?: number;
  }>();

  // Create reverse lookup for broadcasting to specific projects/files
  const getProjectClients = (projectId: number): WebSocket[] => {
    return Array.from(clients.entries())
      .filter(([_, data]) => data.projectId === projectId)
      .map(([client, _]) => client);
  };

  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    // Add client to the connected clients map
    clients.set(ws, {});

    // Handle client messages (JSON format expected)
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data);

        // Handle client registration (associate user with the connection)
        if (data.type === 'register') {
          const clientData = clients.get(ws);
          if (clientData) {
            clientData.userId = data.userId;
            clientData.username = data.username;
            clientData.projectId = data.projectId;
            clientData.fileId = data.fileId;
            clients.set(ws, clientData);

            // Send confirmation
            ws.send(JSON.stringify({
              type: 'registered',
              success: true
            }));

            // Notify other clients in the same project about new user
            if (data.projectId) {
              broadcastToProject(data.projectId, {
                type: 'user_joined',
                userId: data.userId,
                username: data.username,
                projectId: data.projectId
              }, ws); // Exclude the sender
            }
          }
        }
        // Handle segment update notification
        else if (data.type === 'segment_update') {
          // Broadcast the segment update to all clients working on the same project
          if (data.projectId) {
            broadcastToProject(data.projectId, {
              type: 'segment_updated',
              segmentId: data.segmentId,
              userId: data.userId,
              username: data.username,
              status: data.status,
              target: data.target,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    // Handle client disconnection
    ws.on('close', () => {
      const clientData = clients.get(ws);
      
      // Notify other clients about user leaving
      if (clientData?.projectId && clientData?.userId) {
        broadcastToProject(clientData.projectId, {
          type: 'user_left',
          userId: clientData.userId,
          username: clientData.username,
          projectId: clientData.projectId
        });
      }
      
      // Remove client from the map
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Broadcast to all clients working on a specific project
  function broadcastToProject(projectId: number, data: any, excludeClient?: WebSocket) {
    const projectClients = getProjectClients(projectId);
    const message = JSON.stringify(data);
    
    projectClients.forEach(client => {
      // Check if client is still connected
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  return httpServer;
}