import { pgTable, serial, text, timestamp, unique, foreignKey, integer, index, varchar, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



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

export const glossary = pgTable("glossary", {
        id: serial().primaryKey().notNull(),
        source: text().notNull(),
        target: text().notNull(),
        sourceLanguage: text("source_language").notNull(),
        targetLanguage: text("target_language").notNull(),
        resourceId: integer("resource_id").references(() => tbResources.id).notNull().default(1),
        domain: text("domain"),
        notes: text("notes"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
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

export const translationMemory = pgTable("translation_memory", {
        id: serial().primaryKey().notNull(),
        source: text().notNull(),
        target: text().notNull(),
        status: text().default('MT').notNull(),
        context: text(),
        sourceLanguage: text("source_language").notNull(),
        targetLanguage: text("target_language").notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
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
}, (table) => {
        return {
                filesProjectIdProjectsIdFk: foreignKey({
                        columns: [table.projectId],
                        foreignColumns: [projects.id],
                        name: "files_project_id_projects_id_fk"
                }),
        }
});

export const translationUnits = pgTable("translation_units", {
        id: serial().primaryKey().notNull(),
        source: text().notNull(),
        target: text(),
        status: text().default('MT').notNull(),
        comment: text(),
        fileId: integer("file_id").notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
        return {
                translationUnitsFileIdFilesIdFk: foreignKey({
                        columns: [table.fileId],
                        foreignColumns: [files.id],
                        name: "translation_units_file_id_files_id_fk"
                }),
        }
});

export const session = pgTable("session", {
        sid: varchar().primaryKey().notNull(),
        sess: json().notNull(),
        expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => {
        return {
                idxSessionExpire: index("IDX_session_expire").using("btree", table.expire.asc().nullsLast()),
        }
});
