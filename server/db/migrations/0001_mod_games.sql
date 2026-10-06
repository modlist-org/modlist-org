ALTER TABLE `mods` ADD `games` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE `mods` SET `games` = json_array(`game`) WHERE `games` = '[]';
