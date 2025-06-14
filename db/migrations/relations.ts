import { relations } from "drizzle-orm/relations";
import { tmResources, translationMemory, tbResources, glossary, files, translationUnits, users, projects, docTemplates, templateFields } from "./schema";

export const translationMemoryRelations = relations(translationMemory, ({one}) => ({
	tmResource: one(tmResources, {
		fields: [translationMemory.resourceId],
		references: [tmResources.id]
	}),
}));

export const tmResourcesRelations = relations(tmResources, ({many}) => ({
	translationMemories: many(translationMemory),
}));

export const glossaryRelations = relations(glossary, ({one}) => ({
	tbResource: one(tbResources, {
		fields: [glossary.resourceId],
		references: [tbResources.id]
	}),
}));

export const tbResourcesRelations = relations(tbResources, ({many}) => ({
	glossaries: many(glossary),
}));

export const translationUnitsRelations = relations(translationUnits, ({one}) => ({
	file: one(files, {
		fields: [translationUnits.fileId],
		references: [files.id]
	}),
}));

export const filesRelations = relations(files, ({one, many}) => ({
	translationUnits: many(translationUnits),
	project: one(projects, {
		fields: [files.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	user_userId: one(users, {
		fields: [projects.userId],
		references: [users.id],
		relationName: "projects_userId_users_id"
	}),
	user_claimedBy: one(users, {
		fields: [projects.claimedBy],
		references: [users.id],
		relationName: "projects_claimedBy_users_id"
	}),
	docTemplate: one(docTemplates, {
		fields: [projects.templateId],
		references: [docTemplates.id]
	}),
	files: many(files),
}));

export const usersRelations = relations(users, ({many}) => ({
	projects_userId: many(projects, {
		relationName: "projects_userId_users_id"
	}),
	projects_claimedBy: many(projects, {
		relationName: "projects_claimedBy_users_id"
	}),
	docTemplates: many(docTemplates),
}));

export const docTemplatesRelations = relations(docTemplates, ({one, many}) => ({
	projects: many(projects),
	user: one(users, {
		fields: [docTemplates.createdBy],
		references: [users.id]
	}),
	templateFields: many(templateFields),
}));

export const templateFieldsRelations = relations(templateFields, ({one}) => ({
	docTemplate: one(docTemplates, {
		fields: [templateFields.templateId],
		references: [docTemplates.id]
	}),
}));