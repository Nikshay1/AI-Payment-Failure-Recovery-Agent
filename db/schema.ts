import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const recoveryCases = sqliteTable("recovery_cases", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  customer: text("customer").notNull(),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  rail: text("rail").notNull(),
  category: text("category").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull(),
  score: integer("score").notNull(),
  proposedAction: text("proposed_action").notNull(),
  detail: text("detail").notNull(),
  plan: text("plan").notNull(),
  aiMode: text("ai_mode").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_cases_session_updated").on(table.sessionId, table.updatedAt)]);

export const recoveryAudit = sqliteTable("recovery_audit", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  caseId: text("case_id").notNull(),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  actor: text("actor").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_audit_session_created").on(table.sessionId, table.createdAt)]);

export const recoveryInbox = sqliteTable("recovery_inbox", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  caseId: text("case_id").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_inbox_session_created").on(table.sessionId, table.createdAt)]);
