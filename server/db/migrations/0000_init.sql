CREATE TABLE `mod_collaborators` (
	`mod_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`mod_id`, `user_id`),
	FOREIGN KEY (`mod_id`) REFERENCES `mods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mod_collaborators_user_idx` ON `mod_collaborators` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `mod_dependencies` (
	`mod_id` text NOT NULL,
	`dependency_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`mod_id`, `dependency_id`),
	FOREIGN KEY (`mod_id`) REFERENCES `mods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`dependency_id`) REFERENCES `mods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mod_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`mod_id` text NOT NULL,
	`version` text NOT NULL,
	`download_url` text NOT NULL,
	`platform_downloads` text NOT NULL,
	`changelog` text DEFAULT '' NOT NULL,
	`game_version` text DEFAULT '' NOT NULL,
	`is_approved` integer DEFAULT false NOT NULL,
	`is_beta` integer DEFAULT false NOT NULL,
	`rejection_reason` text DEFAULT '' NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`mod_id`) REFERENCES `mods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mod_versions_mod_idx` ON `mod_versions` (`mod_id`);--> statement-breakpoint
CREATE INDEX `mod_versions_pending_idx` ON `mod_versions` (`is_approved`);--> statement-breakpoint
CREATE TABLE `mods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`game` text NOT NULL,
	`categories` text NOT NULL,
	`author_id` text NOT NULL,
	`pending_edit` text,
	`is_approved` integer DEFAULT false NOT NULL,
	`rejection_reason` text DEFAULT '' NOT NULL,
	`edit_rejection_reason` text DEFAULT '' NOT NULL,
	`logo` text DEFAULT '' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`community_url` text DEFAULT '' NOT NULL,
	`downloads` integer DEFAULT 0 NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mods_slug_unique` ON `mods` (`slug`);--> statement-breakpoint
CREATE INDEX `mods_game_idx` ON `mods` (`game`);--> statement-breakpoint
CREATE INDEX `mods_approved_idx` ON `mods` (`is_approved`);--> statement-breakpoint
CREATE INDEX `mods_author_idx` ON `mods` (`author_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_id` text NOT NULL,
	`username` text NOT NULL,
	`global_name` text,
	`avatar` text,
	`is_verified_developer` integer DEFAULT false NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`last_synced_at` integer,
	`discord_access_token` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_discord_id_unique` ON `users` (`discord_id`);--> statement-breakpoint
CREATE INDEX `users_username_idx` ON `users` (`username`);