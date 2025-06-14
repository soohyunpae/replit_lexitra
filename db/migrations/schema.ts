import { pgTable, foreignKey, serial, text, timestamp, integer, unique, jsonb, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const translationMemory = pgTable("translation_memory", {
	id: serial().primaryKey().notNull(),
	source: text().notNull(),
	target: text().notNull(),
	status: text().default('Draft').notNull(),
	context: text(),
	sourceLanguage: text("source_language").notNull(),
	targetLanguage: text("target_language").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	resourceId: integer("resource_id").default(1).notNull(),
	origin: text().default('100%').notNull(),
}, (table) => {
	return {
		translationMemoryResourceIdTmResourcesIdFk: foreignKey({
			columns: [table.resourceId],
			foreignColumns: [tmResources.id],
			name: "translation_memory_resource_id_tm_resources_id_fk"
		}),
	}
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	role: text().default('user').notNull(),
}, (table) => {
	return {
		usersUsernameUnique: unique("users_username_unique").on(table.username),
	}
});

export const glossary = pgTable("glossary", {
	id: serial().primaryKey().notNull(),
	source: text().notNull(),
	target: text().notNull(),
	sourceLanguage: text("source_language").notNull(),
	targetLanguage: text("target_language").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	resourceId: integer("resource_id").default(1).notNull(),
	domain: text(),
	notes: text(),
}, (table) => {
	return {
		glossaryResourceIdTbResourcesIdFk: foreignKey({
			columns: [table.resourceId],
			foreignColumns: [tbResources.id],
			name: "glossary_resource_id_tb_resources_id_fk"
		}),
	}
});

export const translationUnits = pgTable("translation_units", {
	id: serial().primaryKey().notNull(),
	source: text().notNull(),
	target: text(),
	status: text().default('Draft').notNull(),
	comment: text(),
	fileId: integer("file_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	origin: text().default('MT').notNull(),
}, (table) => {
	return {
		translationUnitsFileIdFilesIdFk: foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "translation_units_file_id_files_id_fk"
		}),
	}
});

export const projects = pgTable("projects", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	sourceLanguage: text("source_language").notNull(),
	targetLanguage: text("target_language").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	userId: integer("user_id"),
	status: text().default('Unclaimed').notNull(),
	claimedBy: integer("claimed_by"),
	claimedAt: timestamp("claimed_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	deadline: timestamp({ mode: 'string' }),
	notes: text(),
	references: text(),
	templateId: integer("template_id"),
	templateMatchScore: jsonb("template_match_score"),
}, (table) => {
	return {
		projectsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "projects_user_id_users_id_fk"
		}),
		projectsClaimedByUsersIdFk: foreignKey({
			columns: [table.claimedBy],
			foreignColumns: [users.id],
			name: "projects_claimed_by_users_id_fk"
		}),
		projectsTemplateIdDocTemplatesIdFk: foreignKey({
			columns: [table.templateId],
			foreignColumns: [docTemplates.id],
			name: "projects_template_id_doc_templates_id_fk"
		}),
	}
});

export const files = pgTable("files", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	content: text().notNull(),
	projectId: integer("project_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	type: text().default('work'),
	processingStatus: text("processing_status").default('pending').notNull(),
	errorMessage: text("error_message"),
	processingProgress: integer("processing_progress").default(0),
}, (table) => {
	return {
		filesProjectIdProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "files_project_id_projects_id_fk"
		}),
	}
});

export const tbResources = pgTable("tb_resources", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	domain: text(),
	defaultSourceLanguage: text("default_source_language"),
	defaultTargetLanguage: text("default_target_language"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const tmResources = pgTable("tm_resources", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	defaultSourceLanguage: text("default_source_language"),
	defaultTargetLanguage: text("default_target_language"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const docTemplates = pgTable("doc_templates", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	docxFilePath: text("docx_file_path").notNull(),
	placeholderData: jsonb("placeholder_data"),
	useCount: integer("use_count").default(0).notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		docTemplatesCreatedByUsersIdFk: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "doc_templates_created_by_users_id_fk"
		}),
	}
});

export const templateFields = pgTable("template_fields", {
	id: serial().primaryKey().notNull(),
	templateId: integer("template_id").notNull(),
	placeholder: text().notNull(),
	fieldType: text("field_type").default('text').notNull(),
	description: text(),
	isRequired: boolean("is_required").default(true).notNull(),
	isTranslatable: boolean("is_translatable").default(true).notNull(),
	orderIndex: integer("order_index").default(0).notNull(),
	sampleContent: text("sample_content"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		templateFieldsTemplateIdDocTemplatesIdFk: foreignKey({
			columns: [table.templateId],
			foreignColumns: [docTemplates.id],
			name: "template_fields_template_id_doc_templates_id_fk"
		}),
	}
});
