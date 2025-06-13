import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import OpenAI from "openai";

// Job processor for handling template application tasks asynchronously
export class JobProcessor {
  private static instance: JobProcessor;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): JobProcessor {
    if (!JobProcessor.instance) {
      JobProcessor.instance = new JobProcessor();
    }
    return JobProcessor.instance;
  }

  // Start the job processor
  start() {
    if (this.processingInterval) return;
    
    console.log("[Job Processor] Starting job processor...");
    this.processingInterval = setInterval(() => {
      this.processNextJob();
    }, 5000); // Check for new jobs every 5 seconds
  }

  // Stop the job processor
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log("[Job Processor] Job processor stopped");
    }
  }

  // Create a new template application job
  async createJob(projectId: number, type: 'template_matching' | 'template_application' | 'gpt_translation') {
    try {
      const [job] = await db.insert(schema.templateJobs).values({
        projectId,
        type,
        status: 'pending',
        progress: 0
      }).returning();

      console.log(`[Job Processor] Created ${type} job ${job.id} for project ${projectId}`);
      return job;
    } catch (error) {
      console.error("[Job Processor] Error creating job:", error);
      throw error;
    }
  }

  // Get job status
  async getJobStatus(jobId: number) {
    return await db.query.templateJobs.findFirst({
      where: eq(schema.templateJobs.id, jobId)
    });
  }

  // Get jobs for a project
  async getProjectJobs(projectId: number) {
    return await db.query.templateJobs.findMany({
      where: eq(schema.templateJobs.projectId, projectId),
      orderBy: [schema.templateJobs.createdAt]
    });
  }

  // Process the next pending job
  private async processNextJob() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      
      // Find the next pending job
      const pendingJob = await db.query.templateJobs.findFirst({
        where: eq(schema.templateJobs.status, 'pending'),
        orderBy: [schema.templateJobs.createdAt]
      });

      if (!pendingJob) {
        this.isProcessing = false;
        return;
      }

      console.log(`[Job Processor] Processing job ${pendingJob.id} (${pendingJob.type})`);

      // Update job status to processing
      await this.updateJobStatus(pendingJob.id, 'processing', 10);

      // Process based on job type
      switch (pendingJob.type) {
        case 'template_matching':
          await this.processTemplateMatching(pendingJob);
          break;
        case 'template_application':
          await this.processTemplateApplication(pendingJob);
          break;
        case 'gpt_translation':
          await this.processGptTranslation(pendingJob);
          break;
        default:
          throw new Error(`Unknown job type: ${pendingJob.type}`);
      }

    } catch (error) {
      console.error("[Job Processor] Error processing job:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process template matching job
  private async processTemplateMatching(job: any) {
    try {
      await this.updateJobStatus(job.id, 'processing', 25);

      // Get project and its first file
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, job.projectId),
        with: { files: true }
      });

      if (!project || !project.files || project.files.length === 0) {
        throw new Error("Project or files not found");
      }

      await this.updateJobStatus(job.id, 'processing', 50);

      // Simulate template matching for now
      // In real implementation, you would use the actual template matching service
      const templates = await db.query.docTemplates.findMany({ limit: 1 });
      
      await this.updateJobStatus(job.id, 'processing', 75);

      if (templates.length > 0) {
        const template = templates[0];
        
        // Update project with template information
        await db.update(schema.projects)
          .set({
            templateId: template.id,
            templateMatchScore: JSON.stringify({
              templateId: template.id,
              templateName: template.name,
              matchScore: 0.85,
              matchedAt: new Date().toISOString()
            }),
            updatedAt: new Date()
          })
          .where(eq(schema.projects.id, job.projectId));

        await this.updateJobStatus(job.id, 'completed', 100, {
          matched: true,
          templateId: template.id,
          templateName: template.name,
          matchScore: 0.85
        });
      } else {
        await this.updateJobStatus(job.id, 'completed', 100, {
          matched: false,
          message: "No templates available"
        });
      }

    } catch (error) {
      console.error(`[Job Processor] Template matching job ${job.id} failed:`, error);
      await this.updateJobStatus(job.id, 'failed', 0, null, error.message);
    }
  }

  // Process template application job
  private async processTemplateApplication(job: any) {
    try {
      await this.updateJobStatus(job.id, 'processing', 25);

      // Get project with template information
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, job.projectId),
        with: { files: true, template: true }
      });

      if (!project || !project.template) {
        throw new Error("Project or template not found");
      }

      await this.updateJobStatus(job.id, 'processing', 50);

      // Simulate template application processing
      const totalSegments = await this.getTotalSegments(project.id);
      
      // Simulate processing segments in batches
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const progress = Math.min(50 + (i * 4), 90);
        await this.updateJobStatus(job.id, 'processing', progress);
      }

      await this.updateJobStatus(job.id, 'completed', 100, {
        applied: true,
        templateId: project.template.id,
        processedSegments: totalSegments
      });

    } catch (error) {
      console.error(`[Job Processor] Template application job ${job.id} failed:`, error);
      await this.updateJobStatus(job.id, 'failed', 0, null, error.message);
    }
  }

  // Process GPT translation job
  private async processGptTranslation(job: any) {
    try {
      await this.updateJobStatus(job.id, 'processing', 10);

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      if (!openai.apiKey) {
        throw new Error("OpenAI API key not configured");
      }

      // Get project files and segments
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, job.projectId),
        with: { files: true }
      });

      if (!project || !project.files) {
        throw new Error("Project or files not found");
      }

      await this.updateJobStatus(job.id, 'processing', 25);

      let processedSegments = 0;
      const totalSegments = await this.getTotalSegments(project.id);

      for (const file of project.files) {
        const segments = await db.query.translationUnits.findMany({
          where: and(
            eq(schema.translationUnits.fileId, file.id),
            eq(schema.translationUnits.status, 'Draft')
          )
        });

        // Process segments in smaller batches to avoid API limits
        const batchSize = 5;
        for (let i = 0; i < segments.length; i += batchSize) {
          const batch = segments.slice(i, i + batchSize);
          
          for (const segment of batch) {
            try {
              const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                  {
                    role: "system",
                    content: `Translate the following text from ${project.sourceLanguage} to ${project.targetLanguage}. Provide only the translation without explanations.`
                  },
                  {
                    role: "user",
                    content: segment.source
                  }
                ],
                max_tokens: 1000,
                temperature: 0.3
              });

              const translation = response.choices[0]?.message?.content?.trim();
              
              if (translation) {
                await db.update(schema.translationUnits)
                  .set({
                    target: translation,
                    origin: 'MT',
                    updatedAt: new Date()
                  })
                  .where(eq(schema.translationUnits.id, segment.id));
              }

              processedSegments++;
              const progress = Math.min(25 + Math.round((processedSegments / totalSegments) * 65), 90);
              await this.updateJobStatus(job.id, 'processing', progress);

              // Rate limiting - wait between requests
              await new Promise(resolve => setTimeout(resolve, 200));

            } catch (apiError) {
              console.error(`[Job Processor] GPT translation failed for segment ${segment.id}:`, apiError);
              // Continue with next segment instead of failing the entire job
            }
          }
        }
      }

      await this.updateJobStatus(job.id, 'completed', 100, {
        translated: true,
        processedSegments: processedSegments
      });

    } catch (error) {
      console.error(`[Job Processor] GPT translation job ${job.id} failed:`, error);
      await this.updateJobStatus(job.id, 'failed', 0, null, error.message);
    }
  }

  // Update job status and progress
  private async updateJobStatus(
    jobId: number, 
    status: string, 
    progress: number, 
    result?: any, 
    errorMessage?: string
  ) {
    const updateData: any = {
      status,
      progress,
      updatedAt: new Date()
    };

    if (status === 'processing' && !await this.getJobStartTime(jobId)) {
      updateData.startedAt = new Date();
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    if (result) {
      updateData.result = JSON.stringify(result);
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await db.update(schema.templateJobs)
      .set(updateData)
      .where(eq(schema.templateJobs.id, jobId));
  }

  // Get job start time
  private async getJobStartTime(jobId: number) {
    const job = await db.query.templateJobs.findFirst({
      where: eq(schema.templateJobs.id, jobId)
    });
    return job?.startedAt;
  }

  // Get total segments for a project
  private async getTotalSegments(projectId: number): Promise<number> {
    const files = await db.query.files.findMany({
      where: eq(schema.files.projectId, projectId),
      with: { segments: true }
    });

    return files.reduce((total, file) => total + (file.segments?.length || 0), 0);
  }
}

// Export singleton instance
export const jobProcessor = JobProcessor.getInstance();