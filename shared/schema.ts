import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // 'user' 또는 'admin' 값을 가짐
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Project model
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sourceLanguage: text("source_language").notNull(),
  targetLanguage: text("target_language").notNull(),
  status: text("status").notNull().default("Unclaimed"),
  claimedBy: integer("claimed_by").references(() => users.id),
  claimedAt: timestamp("claimed_at"),
  completedAt: timestamp("completed_at"),
  deadline: timestamp("deadline"),
  notes: text("notes"),
  references: text("references"), // JSON-encoded string for reference file metadata
  templateId: integer("template_id").references(() => docTemplates.id),
  templateMatchScore: integer("template_match_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  claimer: one(users, { fields: [projects.claimedBy], references: [users.id] }),
  files: many(files),
}));

export const insertProjectSchema = createInsertSchema(projects, {
  name: (schema) => schema.min(3, "Project name must be at least 3 characters"),
  deadline: (schema) => schema.optional(),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// File model
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  type: text("type").default("work"),  // 'work' 또는 'reference' 값을 가짐
  processingStatus: text("processing_status").default("processing").notNull(), // 'processing', 'ready', 'error' 값을 가짐
  errorMessage: text("error_message"), // 오류 발생 시 오류 메시지 저장
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const filesRelations = relations(files, ({ one, many }) => ({
  project: one(projects, { fields: [files.projectId], references: [projects.id] }),
  segments: many(translationUnits),
}));

export const insertFileSchema = createInsertSchema(files, {
  name: (schema) => schema.min(1, "File name is required"),
  content: (schema) => schema.min(1, "File content is required"),
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// Translation Unit model
export const translationUnits = pgTable("translation_units", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  target: text("target"),
  status: text("status").notNull().default("Draft"),
  origin: text("origin").notNull().default("MT"),
  comment: text("comment"),
  fileId: integer("file_id").references(() => files.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const translationUnitsRelations = relations(translationUnits, ({ one }) => ({
  file: one(files, { fields: [translationUnits.fileId], references: [files.id] }),
}));

export const insertTranslationUnitSchema = createInsertSchema(translationUnits, {
  source: (schema) => schema.min(1, "Source text is required"),
});

export type InsertTranslationUnit = z.infer<typeof insertTranslationUnitSchema>;
export type TranslationUnit = typeof translationUnits.$inferSelect;

// Translation Memories model
export const tmResources = pgTable("tm_resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  defaultSourceLanguage: text("default_source_language"),
  defaultTargetLanguage: text("default_target_language"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTmResourceSchema = createInsertSchema(tmResources, {
  name: (schema) => schema.min(1, "TM name is required"),
});

export type InsertTmResource = z.infer<typeof insertTmResourceSchema>;
export type TmResource = typeof tmResources.$inferSelect;

// Translation Memory model
export const translationMemory = pgTable("translation_memory", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  target: text("target").notNull(),
  status: text("status").notNull().default("Draft"),
  origin: text("origin").notNull().default("100%"),
  context: text("context"),
  sourceLanguage: text("source_language").notNull(),
  targetLanguage: text("target_language").notNull(),
  resourceId: integer("resource_id").references(() => tmResources.id).notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tmRelations = relations(translationMemory, ({ one }) => ({
  resource: one(tmResources, { fields: [translationMemory.resourceId], references: [tmResources.id] }),
}));

export const insertTranslationMemorySchema = createInsertSchema(translationMemory, {
  source: (schema) => schema.min(1, "Source text is required"),
  target: (schema) => schema.min(1, "Target text is required"),
});

export type InsertTranslationMemory = z.infer<typeof insertTranslationMemorySchema>;
export type TranslationMemory = typeof translationMemory.$inferSelect;

// Terminology Base Resources model
export const tbResources = pgTable("tb_resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  domain: text("domain"),  // e.g., 'Legal', 'Medical', 'Technical'
  defaultSourceLanguage: text("default_source_language"),
  defaultTargetLanguage: text("default_target_language"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTbResourceSchema = createInsertSchema(tbResources, {
  name: (schema) => schema.min(1, "TB Resource name is required"),
});

export type InsertTbResource = z.infer<typeof insertTbResourceSchema>;
export type TbResource = typeof tbResources.$inferSelect;

// Glossary model
export const glossary = pgTable("glossary", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  target: text("target").notNull(),
  sourceLanguage: text("source_language").notNull(),
  targetLanguage: text("target_language").notNull(),
  resourceId: integer("resource_id").references(() => tbResources.id).notNull().default(1),
  domain: text("domain"),  // 세부 도메인 태그 (예: 'Patent Law', 'Electronics')
  notes: text("notes"),     // 사용 노트, 컨텍스트 등
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const glossaryRelations = relations(glossary, ({ one }) => ({
  resource: one(tbResources, { fields: [glossary.resourceId], references: [tbResources.id] }),
}));

export const insertGlossarySchema = createInsertSchema(glossary, {
  source: (schema) => schema.min(1, "Source term is required"),
  target: (schema) => schema.min(1, "Target term is required"),
  resourceId: (schema) => schema.optional(),
});

export type InsertGlossary = z.infer<typeof insertGlossarySchema>;
export type Glossary = typeof glossary.$inferSelect;

// Document Template model - docx-templater 기반으로 개선
export const docTemplates = pgTable("doc_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  docxFilePath: text("docx_file_path").notNull(),
  useCount: integer("use_count").default(0).notNull(),
  placeholderData: jsonb("placeholder_data"), // {{field}} placeholders와 메타데이터
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
});

export const docTemplatesRelations = relations(docTemplates, ({ one, many }) => ({
  creator: one(users, { fields: [docTemplates.createdBy], references: [users.id] }),
  fields: many(templateFields),
}));

export const insertDocTemplateSchema = createInsertSchema(docTemplates, {
  name: (schema) => schema.min(3, "Template name must be at least 3 characters"),
});

export type InsertDocTemplate = z.infer<typeof insertDocTemplateSchema>;
export type DocTemplate = typeof docTemplates.$inferSelect;

// Template Fields model - docx-templater placeholder 기반
export const templateFields = pgTable("template_fields", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => docTemplates.id).notNull(),
  placeholder: text("placeholder").notNull(), // {{fieldName}} 형태의 필드명
  fieldType: text("field_type").notNull().default("text"), // 'text', 'table', 'list' 등
  description: text("description"), // 필드 설명
  isRequired: boolean("is_required").notNull().default(true),
  isTranslatable: boolean("is_translatable").notNull().default(true),
  orderIndex: integer("order_index").notNull().default(0), // 문서 내 순서
  sampleContent: text("sample_content"), // 예시 내용
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const templateFieldsRelations = relations(templateFields, ({ one }) => ({
  template: one(docTemplates, { fields: [templateFields.templateId], references: [docTemplates.id] }),
}));

export const insertTemplateFieldSchema = createInsertSchema(templateFields, {
  placeholder: (schema) => schema.min(1, "Placeholder is required"),
});

export type InsertTemplateField = z.infer<typeof insertTemplateFieldSchema>;
export type TemplateField = typeof templateFields.$inferSelect;

// Status Types Enum - For Translation Memory entries
export const StatusTypes = z.enum(['MT', '100%', 'Fuzzy', 'Edited', 'Reviewed', 'Rejected']);
export type StatusType = z.infer<typeof StatusTypes>;

// Origin Types Enum - Source of the translation
export const OriginTypes = z.enum(['MT', 'Fuzzy', '100%', 'HT']);
export type OriginType = z.infer<typeof OriginTypes>;

// Project Status Types Enum - 프로젝트 실제 상태값
export const ProjectStatusTypes = z.enum(['Unclaimed', 'Claimed', 'Completed']);
export type ProjectStatusType = z.infer<typeof ProjectStatusTypes>;

// Project Display Status Types Enum - 사용자에게 보여지는 상태값
export const ProjectDisplayStatusTypes = z.enum(['Unclaimed', 'In Progress', 'Claimed', 'Completed']);
export type ProjectDisplayStatusType = z.infer<typeof ProjectDisplayStatusTypes>;

// User Roles Enum
export const UserRoleTypes = z.enum(['user', 'admin']);
export type UserRoleType = z.infer<typeof UserRoleTypes>;