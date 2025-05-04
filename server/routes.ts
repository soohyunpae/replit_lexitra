import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, like } from "drizzle-orm";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";
import { translateWithGPT } from "./openai";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api
  const apiPrefix = "/api";
  
  // Projects API
  app.get(`${apiPrefix}/projects`, async (req, res) => {
    try {
      const projects = await db.query.projects.findMany({
        orderBy: desc(schema.projects.createdAt)
      });
      
      return res.json(projects);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  app.post(`${apiPrefix}/projects`, async (req, res) => {
    try {
      const data = schema.insertProjectSchema.parse(req.body);
      const [project] = await db.insert(schema.projects).values(data).returning();
      
      return res.status(201).json(project);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  app.get(`${apiPrefix}/projects/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id),
        with: {
          files: true
        }
      });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      return res.json(project);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Files API
  app.get(`${apiPrefix}/files/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const file = await db.query.files.findFirst({
        where: eq(schema.files.id, id),
        with: {
          segments: {
            orderBy: schema.translationUnits.id
          }
        }
      });
      
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      return res.json(file);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  app.post(`${apiPrefix}/files`, async (req, res) => {
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
  app.get(`${apiPrefix}/segments/:fileId`, async (req, res) => {
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
  
  app.patch(`${apiPrefix}/segments/:id`, async (req, res) => {
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
  app.post(`${apiPrefix}/translate`, async (req, res) => {
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
  app.post(`${apiPrefix}/search_tm`, async (req, res) => {
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
  
  app.post(`${apiPrefix}/update_tm`, async (req, res) => {
    try {
      const data = schema.insertTranslationMemorySchema.parse(req.body);
      const [tmEntry] = await db.insert(schema.translationMemory).values(data).returning();
      
      return res.status(201).json(tmEntry);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Glossary API (Terminology Base)
  app.get(`${apiPrefix}/glossary`, async (req, res) => {
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

  // Get all glossary terms (for management page)
  app.get(`${apiPrefix}/glossary/all`, async (req, res) => {
    try {
      const terms = await db.query.glossary.findMany({
        orderBy: desc(schema.glossary.createdAt)
      });
      
      return res.json(terms);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Add new glossary term
  app.post(`${apiPrefix}/glossary`, async (req, res) => {
    try {
      const data = schema.insertGlossarySchema.parse(req.body);
      const [term] = await db.insert(schema.glossary).values(data).returning();
      
      return res.status(201).json(term);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Delete glossary term
  app.delete(`${apiPrefix}/glossary/:id`, async (req, res) => {
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
  app.post(`${apiPrefix}/glossary/search`, async (req, res) => {
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
  // Get all TM entries
  app.get(`${apiPrefix}/tm/all`, async (req, res) => {
    try {
      const tmEntries = await db.query.translationMemory.findMany({
        orderBy: desc(schema.translationMemory.createdAt)
      });
      
      return res.json(tmEntries);
    } catch (error) {
      return handleApiError(res, error);
    }
  });
  
  // Get TM entries by language pair
  app.get(`${apiPrefix}/tm`, async (req, res) => {
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
  app.post(`${apiPrefix}/tm/search`, async (req, res) => {
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
  app.post(`${apiPrefix}/tm`, async (req, res) => {
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
