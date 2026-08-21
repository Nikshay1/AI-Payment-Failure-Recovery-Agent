CREATE TABLE `recovery_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`case_id` text NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recovery_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`customer` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text NOT NULL,
	`rail` text NOT NULL,
	`category` text NOT NULL,
	`reason` text NOT NULL,
	`status` text NOT NULL,
	`score` integer NOT NULL,
	`proposed_action` text NOT NULL,
	`detail` text NOT NULL,
	`plan` text NOT NULL,
	`ai_mode` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recovery_inbox` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`case_id` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
