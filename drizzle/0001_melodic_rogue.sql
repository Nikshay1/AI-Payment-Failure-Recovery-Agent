CREATE INDEX `idx_audit_session_created` ON `recovery_audit` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_cases_session_updated` ON `recovery_cases` (`session_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_inbox_session_created` ON `recovery_inbox` (`session_id`,`created_at`);