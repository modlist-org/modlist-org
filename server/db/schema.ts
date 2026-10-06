import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core'
import type { PlatformDownloads } from '../utils/mod-platform'

export const GAMES = ['adofai', 'rhythm-doctor', 'dancing-line'] as const
export const CATEGORIES = ['ui', 'gameplay', 'utility', 'visuals', 'library'] as const

export type Game = typeof GAMES[number]
export type Category = typeof CATEGORIES[number]

export interface PendingModEdit {
  name?: string
  summary?: string
  description?: string
  game?: Game
  categories?: Category[]
  logo?: string
  sourceUrl?: string
  communityUrl?: string
  dependencies?: string[]
  createdAt?: string
}

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  discordId: text('discord_id').notNull().unique(),
  username: text('username').notNull(),
  globalName: text('global_name'),
  avatar: text('avatar'),
  isVerifiedDeveloper: integer('is_verified_developer', { mode: 'boolean' }).notNull().default(false),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp_ms' }),
  discordAccessToken: text('discord_access_token'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
}, (t) => [
  index('users_username_idx').on(t.username)
])

export const mods = sqliteTable('mods', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  summary: text('summary').notNull(),
  description: text('description').notNull().default(''),
  game: text('game', { enum: GAMES }).notNull(),
  categories: text('categories', { mode: 'json' }).$type<Category[]>().notNull(),
  authorId: text('author_id').notNull(),
  pendingEdit: text('pending_edit', { mode: 'json' }).$type<PendingModEdit | null>(),
  isApproved: integer('is_approved', { mode: 'boolean' }).notNull().default(false),
  rejectionReason: text('rejection_reason').notNull().default(''),
  editRejectionReason: text('edit_rejection_reason').notNull().default(''),
  logo: text('logo').notNull().default(''),
  sourceUrl: text('source_url').notNull().default(''),
  communityUrl: text('community_url').notNull().default(''),
  downloads: integer('downloads').notNull().default(0),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
}, (t) => [
  index('mods_game_idx').on(t.game),
  index('mods_approved_idx').on(t.isApproved),
  index('mods_author_idx').on(t.authorId)
])

export const modCollaborators = sqliteTable('mod_collaborators', {
  modId: text('mod_id').notNull().references(() => mods.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  status: text('status', { enum: ['accepted', 'pending'] }).notNull(),
  position: integer('position').notNull().default(0)
}, (t) => [
  primaryKey({ columns: [t.modId, t.userId] }),
  index('mod_collaborators_user_idx').on(t.userId, t.status)
])

export const modDependencies = sqliteTable('mod_dependencies', {
  modId: text('mod_id').notNull().references(() => mods.id, { onDelete: 'cascade' }),
  dependencyId: text('dependency_id').notNull().references(() => mods.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0)
}, (t) => [
  primaryKey({ columns: [t.modId, t.dependencyId] })
])

export const modVersions = sqliteTable('mod_versions', {
  id: text('id').primaryKey(),
  modId: text('mod_id').notNull().references(() => mods.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  downloadUrl: text('download_url').notNull(),
  platformDownloads: text('platform_downloads', { mode: 'json' }).$type<PlatformDownloads>().notNull(),
  changelog: text('changelog').notNull().default(''),
  gameVersion: text('game_version').notNull().default(''),
  isApproved: integer('is_approved', { mode: 'boolean' }).notNull().default(false),
  isBeta: integer('is_beta', { mode: 'boolean' }).notNull().default(false),
  rejectionReason: text('rejection_reason').notNull().default(''),
  submittedBy: text('submitted_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
}, (t) => [
  index('mod_versions_mod_idx').on(t.modId),
  index('mod_versions_pending_idx').on(t.isApproved)
])

export type UserRow = typeof users.$inferSelect
export type ModRow = typeof mods.$inferSelect
export type ModVersionRow = typeof modVersions.$inferSelect
