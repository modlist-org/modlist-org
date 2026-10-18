CREATE TABLE `mod_branches` (
	`id` text PRIMARY KEY NOT NULL,
	`mod_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`mod_id`) REFERENCES `mods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mod_branches_mod_idx` ON `mod_branches` (`mod_id`);--> statement-breakpoint
CREATE TABLE `organization_members` (
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`organization_id`, `user_id`),
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `organization_members_user_idx` ON `organization_members` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
ALTER TABLE `mod_versions` ADD `branch_id` text REFERENCES mod_branches(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `mod_versions` ADD `loader_downloads` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `mods` ADD `organization_id` text REFERENCES organizations(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `mods` ADD `default_branch_id` text;--> statement-breakpoint
ALTER TABLE `mods` ADD `beta_branch_id` text;--> statement-breakpoint
-- Every existing mod gets a default "main" branch holding its stable versions
INSERT INTO `mod_branches` (`id`, `mod_id`, `name`, `description`, `position`, `created_at`)
SELECT lower(hex(randomblob(12))), `id`, 'main', '', 0, `created_at` FROM `mods`;--> statement-breakpoint
UPDATE `mods` SET `default_branch_id` = (SELECT `b`.`id` FROM `mod_branches` `b` WHERE `b`.`mod_id` = `mods`.`id` AND `b`.`name` = 'main');--> statement-breakpoint
-- Mods with beta versions also get a "beta" branch, set as their default beta branch
INSERT INTO `mod_branches` (`id`, `mod_id`, `name`, `description`, `position`, `created_at`)
SELECT lower(hex(randomblob(12))), `m`.`id`, 'beta', '', 1, `m`.`created_at` FROM `mods` `m`
WHERE EXISTS (SELECT 1 FROM `mod_versions` `v` WHERE `v`.`mod_id` = `m`.`id` AND `v`.`is_beta` = 1);--> statement-breakpoint
UPDATE `mods` SET `beta_branch_id` = (SELECT `b`.`id` FROM `mod_branches` `b` WHERE `b`.`mod_id` = `mods`.`id` AND `b`.`name` = 'beta');--> statement-breakpoint
UPDATE `mod_versions` SET `branch_id` = (
  SELECT CASE WHEN `mod_versions`.`is_beta` = 1 AND `m`.`beta_branch_id` IS NOT NULL THEN `m`.`beta_branch_id` ELSE `m`.`default_branch_id` END
  FROM `mods` `m` WHERE `m`.`id` = `mod_versions`.`mod_id`
);
