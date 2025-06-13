import { db } from "@db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from 'fs';
import * as path from 'path';

export interface TemplateMatchResult {
  templateId: number;
  templateName: string;
  matchScore: number;
  confidence: 'high' | 'medium' | 'low';
  matchedFields: string[];
}

export async function matchTemplateToDocument(
  projectId: number,
  documentContent: string
): Promise<TemplateMatchResult | null> {
  try {
    // Get available templates
    const templates = await db.query.docTemplates.findMany({
      with: { fields: true }
    });

    if (templates.length === 0) {
      return null;
    }

    // Simple template matching logic based on field names and content analysis
    let bestMatch: TemplateMatchResult | null = null;
    let bestScore = 0;

    for (const template of templates) {
      if (!template.fields || template.fields.length === 0) continue;

      let matchedFieldsCount = 0;
      const matchedFields: string[] = [];

      // Check how many template fields can be found in the document
      for (const field of template.fields) {
        const fieldName = field.placeholder.toLowerCase();
        const contentLower = documentContent.toLowerCase();

        // Simple keyword matching - can be enhanced with more sophisticated NLP
        if (contentLower.includes(fieldName) || 
            contentLower.includes(fieldName.replace('_', ' ')) ||
            contentLower.includes(fieldName.replace('-', ' '))) {
          matchedFieldsCount++;
          matchedFields.push(field.placeholder);
        }
      }

      const matchScore = matchedFieldsCount / template.fields.length;

      if (matchScore > bestScore) {
        bestScore = matchScore;
        
        let confidence: 'high' | 'medium' | 'low' = 'low';
        if (matchScore >= 0.7) confidence = 'high';
        else if (matchScore >= 0.4) confidence = 'medium';

        bestMatch = {
          templateId: template.id,
          templateName: template.name,
          matchScore,
          confidence,
          matchedFields
        };
      }
    }

    return bestMatch && bestScore > 0.2 ? bestMatch : null;

  } catch (error) {
    console.error("Template matching error:", error);
    throw error;
  }
}

export async function applyTemplateToProject(
  projectId: number,
  templateId: number
): Promise<{ success: boolean; appliedFields: number }> {
  try {
    // Get template with fields
    const template = await db.query.docTemplates.findFirst({
      where: eq(schema.docTemplates.id, templateId),
      with: { fields: true }
    });

    if (!template) {
      throw new Error("Template not found");
    }

    // Update project with template information
    await db.update(schema.projects)
      .set({
        templateId: template.id,
        updatedAt: new Date()
      })
      .where(eq(schema.projects.id, projectId));

    // For now, we simulate applying template fields
    // In a real implementation, this would map template fields to document segments
    const appliedFields = template.fields?.length || 0;

    return {
      success: true,
      appliedFields
    };

  } catch (error) {
    console.error("Template application error:", error);
    throw error;
  }
}