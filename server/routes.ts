import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, like } from "drizzle-orm";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";

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
      
      // Parse content into segments
      const segments = fileData.content
        .split(/\r?\n/)
        .filter(segment => segment.trim().length > 0)
        .map(segment => ({
          source: segment.trim(),
          status: 'MT',
          fileId: file.id
        }));
      
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
      
      // In a real implementation, this would use OpenAI API
      // For now, we'll simulate by returning a basic translation
      // with TM context if available
      let translation = `Translated: ${source}`;
      
      // Simulate GPT response with TM context
      if (tmMatches.length > 0) {
        // Use the best match as our simulated "GPT" output
        translation = tmMatches[0].target;
      }
      
      return res.json({
        source,
        target: translation,
        status: 'MT',
        tmMatches
      });
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
  
  // Glossary API
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
  
  const httpServer = createServer(app);
  return httpServer;
}
