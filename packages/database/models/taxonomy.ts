/**
 * BIS organisational taxonomy — sectional committees and technical departments.
 * Harvested from technical-committee/getwebsiteAllSectionalCommittees and
 * master-service/fetchDepartmentList.
 */
import { pgTable, integer, varchar, text } from "drizzle-orm/pg-core";

export const departmentsTable = pgTable("departments", {
  id: integer("id").primaryKey(), // BIS `departmentId`
  name: text("name").notNull(),
  aliasName: varchar("alias_name", { length: 16 }), // "CED"
  scope: text("scope"),
});

export type SelectDepartment = typeof departmentsTable.$inferSelect;
export type InsertDepartment = typeof departmentsTable.$inferInsert;

export const committeesTable = pgTable("committees", {
  id: integer("id").primaryKey(), // BIS `committeeId`
  number: varchar("number", { length: 16 }).notNull(), // "2", "32"
  name: text("name").notNull(),
  aliasName: varchar("alias_name", { length: 16 }), // "CED"
  departmentId: integer("department_id"),
  convertedName: text("converted_name"), // "CED 02 - Cement And Concrete"
});

export type SelectCommittee = typeof committeesTable.$inferSelect;
export type InsertCommittee = typeof committeesTable.$inferInsert;
