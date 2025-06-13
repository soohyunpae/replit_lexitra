import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { translateBatchWithGPT, translateWithGPT } from "../openai";

export interface TranslationJob {
  fileId: number;
  totalSegments: number;
  completedSegments: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

// Simple in-memory queue for tracking translation jobs
class TranslationQueue {
  private static processing: Set<number> = new Set();
  private static jobs: Map<number, TranslationJob> = new Map();

  static async startTranslation(fileId: number): Promise<{ jobId: number; status: string; message?: string }> {
    // Prevent duplicate processing
    if (this.processing.has(fileId)) {
      return {
        jobId: fileId,
        status: 'already_processing',
        message: '이미 번역이 진행 중입니다.'
      };
    }

    try {
      // Get segments for this file
      const segments = await db.query.translationUnits.findMany({
        where: eq(schema.translationUnits.fileId, fileId)
      });

      if (segments.length === 0) {
        return {
          jobId: fileId,
          status: 'no_segments',
          message: '번역할 세그먼트가 없습니다.'
        };
      }

      // Initialize progress tracking
      const progressData = {
        fileId,
        totalSegments: segments.length,
        completedSegments: 0,
        status: 'processing' as const,
        startedAt: new Date(),
        errorMessage: null
      };

      // Upsert progress record
      await db.insert(schema.translationProgress)
        .values(progressData)
        .onConflictDoUpdate({
          target: schema.translationProgress.fileId,
          set: {
            totalSegments: progressData.totalSegments,
            completedSegments: 0,
            status: 'processing',
            startedAt: new Date(),
            errorMessage: null,
            updatedAt: new Date()
          }
        });

      // Mark as processing
      this.processing.add(fileId);
      
      // Create job tracking
      const job: TranslationJob = {
        fileId,
        totalSegments: segments.length,
        completedSegments: 0,
        status: 'processing',
        startedAt: new Date()
      };
      this.jobs.set(fileId, job);

      // Start background processing
      this.processTranslationJob(fileId, segments).catch(error => {
        console.error(`Translation job ${fileId} failed:`, error);
      }).finally(() => {
        this.processing.delete(fileId);
      });

      // Update file status
      await db.update(schema.files)
        .set({
          processingStatus: 'translating',
          updatedAt: new Date()
        })
        .where(eq(schema.files.id, fileId));

      return { jobId: fileId, status: 'started' };
    } catch (error) {
      console.error('Failed to start translation:', error);
      return {
        jobId: fileId,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async processTranslationJob(fileId: number, segments: any[]): Promise<void> {
    const CHUNK_SIZE = 15;
    const MAX_RETRY_COUNT = 3;
    const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

    try {
      // Process segments in chunks
      for (let i = 0; i < segments.length; i += CHUNK_SIZE) {
        const chunk = segments.slice(i, i + CHUNK_SIZE);
        
        try {
          // Get project info for language settings
          const fileInfo = await db.query.files.findFirst({
            where: eq(schema.files.id, fileId),
            with: { project: true }
          });

          if (!fileInfo?.project) {
            throw new Error('File or project not found');
          }

          // Prepare segments for GPT translation
          const sources = chunk.map(segment => segment.source);
          const translations = await translateBatchWithGPT(
            sources,
            fileInfo.project.sourceLanguage,
            fileInfo.project.targetLanguage
          );

          // Update segments with translations
          for (let j = 0; j < chunk.length; j++) {
            const segment = chunk[j];
            const translation = translations[j] || '';

            await db.update(schema.translationUnits)
              .set({
                target: translation,
                status: translation ? 'MT' : 'Draft',
                retryCount: 0,
                errorMessage: null,
                updatedAt: new Date()
              })
              .where(eq(schema.translationUnits.id, segment.id));
          }

          // Update progress
          const completedSegments = Math.min(i + chunk.length, segments.length);
          await this.updateProgress(fileId, completedSegments);

          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (chunkError) {
          console.error(`Chunk translation failed for file ${fileId}:`, chunkError);
          
          // Handle failed segments individually with retry logic
          for (const segment of chunk) {
            await this.retrySegmentTranslation(segment);
          }
        }
      }

      // Mark translation as completed
      await this.completeTranslation(fileId);

    } catch (error) {
      console.error(`Translation job ${fileId} failed:`, error);
      await this.markTranslationError(fileId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  static async retrySegmentTranslation(segment: any): Promise<void> {
    const MAX_RETRY_COUNT = 3;
    const RETRY_DELAYS = [1000, 5000, 15000];

    try {
      if (segment.retryCount >= MAX_RETRY_COUNT) {
        // Mark as manual translation needed
        await db.update(schema.translationUnits)
          .set({
            status: 'Manual',
            errorMessage: 'Max retry count exceeded',
            updatedAt: new Date()
          })
          .where(eq(schema.translationUnits.id, segment.id));
        return;
      }

      // Apply retry delay
      const delay = RETRY_DELAYS[segment.retryCount] || 15000;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Get project info for single segment translation
      const fileInfo = await db.query.files.findFirst({
        where: eq(schema.files.id, segment.fileId),
        with: { project: true }
      });

      if (!fileInfo?.project) {
        throw new Error('File or project not found for retry');
      }

      // Attempt single segment translation
      const translations = await translateBatchWithGPT(
        [segment.source],
        fileInfo.project.sourceLanguage,
        fileInfo.project.targetLanguage
      );
      const translation = translations[0] || '';

      await db.update(schema.translationUnits)
        .set({
          target: translation,
          status: translation ? 'MT' : 'Draft',
          retryCount: 0,
          errorMessage: null,
          updatedAt: new Date()
        })
        .where(eq(schema.translationUnits.id, segment.id));

    } catch (error) {
      // Increment retry count and record error
      await db.update(schema.translationUnits)
        .set({
          retryCount: segment.retryCount + 1,
          lastErrorAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(schema.translationUnits.id, segment.id));
    }
  }

  static async updateProgress(fileId: number, completedSegments: number): Promise<void> {
    await db.update(schema.translationProgress)
      .set({
        completedSegments,
        updatedAt: new Date()
      })
      .where(eq(schema.translationProgress.fileId, fileId));

    // Update job tracking
    const job = this.jobs.get(fileId);
    if (job) {
      job.completedSegments = completedSegments;
    }
  }

  static async completeTranslation(fileId: number): Promise<void> {
    const completedAt = new Date();

    // Update progress
    await db.update(schema.translationProgress)
      .set({
        status: 'completed',
        completedAt,
        updatedAt: completedAt
      })
      .where(eq(schema.translationProgress.fileId, fileId));

    // Update file status
    await db.update(schema.files)
      .set({
        processingStatus: 'ready',
        updatedAt: completedAt
      })
      .where(eq(schema.files.id, fileId));

    // Update job tracking
    const job = this.jobs.get(fileId);
    if (job) {
      job.status = 'completed';
      job.completedAt = completedAt;
    }

    console.log(`Translation completed for file ${fileId}`);
  }

  static async markTranslationError(fileId: number, errorMessage: string): Promise<void> {
    const errorTime = new Date();

    // Update progress
    await db.update(schema.translationProgress)
      .set({
        status: 'error',
        errorMessage,
        updatedAt: errorTime
      })
      .where(eq(schema.translationProgress.fileId, fileId));

    // Update file status
    await db.update(schema.files)
      .set({
        processingStatus: 'error',
        errorMessage,
        updatedAt: errorTime
      })
      .where(eq(schema.files.id, fileId));

    // Update job tracking
    const job = this.jobs.get(fileId);
    if (job) {
      job.status = 'error';
      job.errorMessage = errorMessage;
    }
  }

  static getProgress(fileId: number): TranslationJob | null {
    return this.jobs.get(fileId) || null;
  }

  static async getProgressFromDB(fileId: number): Promise<any> {
    const progress = await db.query.translationProgress.findFirst({
      where: eq(schema.translationProgress.fileId, fileId)
    });

    if (!progress) {
      return { status: 'not_found' };
    }

    const percentage = progress.totalSegments > 0 
      ? Math.round((progress.completedSegments / progress.totalSegments) * 100)
      : 0;

    return {
      ...progress,
      percentage
    };
  }
}

export default TranslationQueue;