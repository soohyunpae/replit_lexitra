import { relations } from "drizzle-orm/relations";
import { users, projects, files, translationUnits } from "./schema";

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
	files: many(files),
}));

export const usersRelations = relations(users, ({many}) => ({
	projects_userId: many(projects, {
		relationName: "projects_userId_users_id"
	}),
	projects_claimedBy: many(projects, {
		relationName: "projects_claimedBy_users_id"
	}),
}));

export const filesRelations = relations(files, ({one, many}) => ({
	project: one(projects, {
		fields: [files.projectId],
		references: [projects.id]
	}),
	translationUnits: many(translationUnits),
}));

export const translationUnitsRelations = relations(translationUnits, ({one}) => ({
	file: one(files, {
		fields: [translationUnits.fileId],
		references: [files.id]
	}),
}));