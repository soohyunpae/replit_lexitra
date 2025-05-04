import { pgTable, text, serial, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// File model
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
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
  status: text("status").notNull().default("MT"),
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

// Translation Memory model
export const translationMemory = pgTable("translation_memory", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  target: text("target").notNull(),
  status: text("status").notNull().default("MT"),
  context: text("context"),
  sourceLanguage: text("source_language").notNull(),
  targetLanguage: text("target_language").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTranslationMemorySchema = createInsertSchema(translationMemory, {
  source: (schema) => schema.min(1, "Source text is required"),
  target: (schema) => schema.min(1, "Target text is required"),
});

export type InsertTranslationMemory = z.infer<typeof insertTranslationMemorySchema>;
export type TranslationMemory = typeof translationMemory.$inferSelect;

// Glossary model
export const glossary = pgTable("glossary", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  target: text("target").notNull(),
  sourceLanguage: text("source_language").notNull(),
  targetLanguage: text("target_language").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGlossarySchema = createInsertSchema(glossary, {
  source: (schema) => schema.min(1, "Source term is required"),
  target: (schema) => schema.min(1, "Target term is required"),
});

export type InsertGlossary = z.infer<typeof insertGlossarySchema>;
export type Glossary = typeof glossary.$inferSelect;

// Status Types Enum 
export const StatusTypes = z.enum(['MT', 'Fuzzy', '100%', 'Reviewed']);
export type StatusType = z.infer<typeof StatusTypes>;

// Project Status Types Enum
export const ProjectStatusTypes = z.enum(['Unclaimed', 'Claimed', 'Completed']);
export type ProjectStatusType = z.infer<typeof ProjectStatusTypes>;
