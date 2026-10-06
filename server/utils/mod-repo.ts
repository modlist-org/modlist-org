import { and, asc, eq, inArray, or, sql } from 'drizzle-orm'
import { mods, modCollaborators, modDependencies, modVersions, users } from '../db/schema'
import type { ModRow, ModVersionRow, PendingModEdit, UserRow, Category, Game, ModTranslations } from '../db/schema'
import type { Db } from './db'
import { inChunks } from './db'
import { getAvailablePlatforms } from './mod-platform'
import type { PlatformDownloads } from './mod-platform'

export interface PublicUser {
  _id: string
  username: string
  globalName?: string
  avatar?: string
  isVerifiedDeveloper: boolean
}

export interface VersionDto {
  _id: string
  version: string
  downloadUrl: string
  platformDownloads: PlatformDownloads
  changelog: string
  gameVersion: string
  isApproved: boolean
  isBeta: boolean
  rejectionReason: string
  submittedBy: PublicUser | null
  createdAt: string
}

export interface ModDto {
  _id: string
  name: string
  slug: string
  summary: string
  description: string
  translations: ModTranslations
  game: Game
  games: Game[]
  categories: Category[]
  authorId: PublicUser | null
  collaboratorIds: PublicUser[]
  pendingCollaboratorIds: PublicUser[]
  pendingEdit?: (Omit<PendingModEdit, 'dependencies'> & { dependencies?: string[] }) | null
  isApproved: boolean
  rejectionReason: string
  editRejectionReason: string
  logo: string
  sourceUrl: string
  communityUrl: string
  downloads: number
  isFeatured: boolean
  versions: VersionDto[]
  dependencies: string[]
  createdAt: string
  updatedAt: string
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    _id: user.id,
    username: user.username,
    globalName: user.globalName ?? undefined,
    avatar: user.avatar ?? undefined,
    isVerifiedDeveloper: user.isVerifiedDeveloper
  }
}

export function byNewest<T extends { createdAt: string | Date }>(a: T, b: T) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

// Bind a list of ids as one JSON parameter (D1 caps bound parameters per statement at 100)
function idList(ids: string[]) {
  return sql`(select value from json_each(${JSON.stringify(ids)}))`
}

// Rebuild the document shape the API exposed under MongoDB (populated users, nested versions, dependency slugs)
export async function hydrateMods(db: Db, rows: ModRow[]): Promise<ModDto[]> {
  if (rows.length === 0) return []
  const modIds = idList(rows.map((m) => m.id))
  const pendingDepIds = rows.flatMap((m) => m.pendingEdit?.dependencies ?? [])

  const [versionRows, collabRows, depRows, userRows, pendingDepRows] = await db.batch([
    db.select().from(modVersions).where(inArray(modVersions.modId, modIds)),
    db.select().from(modCollaborators).where(inArray(modCollaborators.modId, modIds)).orderBy(asc(modCollaborators.position)),
    db.select({ modId: modDependencies.modId, slug: mods.slug })
      .from(modDependencies)
      .innerJoin(mods, eq(mods.id, modDependencies.dependencyId))
      .where(inArray(modDependencies.modId, modIds))
      .orderBy(asc(modDependencies.position)),
    db.select().from(users).where(or(
      inArray(users.id, idList(rows.map((m) => m.authorId))),
      inArray(users.id, db.select({ id: modCollaborators.userId }).from(modCollaborators).where(inArray(modCollaborators.modId, modIds))),
      inArray(users.id, db.select({ id: modVersions.submittedBy }).from(modVersions).where(inArray(modVersions.modId, modIds)))
    )),
    db.select({ id: mods.id, slug: mods.slug }).from(mods).where(inArray(mods.id, idList(pendingDepIds)))
  ])

  const userMap = new Map(userRows.map((u) => [u.id, toPublicUser(u)]))
  const slugMap = new Map(pendingDepRows.map((m) => [m.id, m.slug]))

  return rows.map((mod) => {
    const collabs = collabRows.filter((c) => c.modId === mod.id)
    const pick = (status: 'accepted' | 'pending') => collabs
      .filter((c) => c.status === status)
      .map((c) => userMap.get(c.userId))
      .filter((u): u is PublicUser => !!u)

    const versions = versionRows
      .filter((v) => v.modId === mod.id)
      .map((v) => toVersionDto(v, userMap))
      .sort(byNewest)

    const pendingEdit = mod.pendingEdit
      ? {
          ...mod.pendingEdit,
          dependencies: mod.pendingEdit.dependencies?.map((id) => slugMap.get(id)).filter((s): s is string => !!s)
        }
      : null

    return {
      _id: mod.id,
      name: mod.name,
      slug: mod.slug,
      summary: mod.summary,
      description: mod.description,
      translations: mod.translations ?? {},
      game: mod.game,
      games: modGames(mod),
      categories: mod.categories,
      authorId: userMap.get(mod.authorId) ?? null,
      collaboratorIds: pick('accepted'),
      pendingCollaboratorIds: pick('pending'),
      pendingEdit,
      isApproved: mod.isApproved,
      rejectionReason: mod.rejectionReason,
      editRejectionReason: mod.editRejectionReason,
      logo: mod.logo,
      sourceUrl: mod.sourceUrl,
      communityUrl: mod.communityUrl,
      downloads: mod.downloads,
      isFeatured: mod.isFeatured,
      versions,
      dependencies: depRows.filter((d) => d.modId === mod.id).map((d) => d.slug),
      createdAt: mod.createdAt.toISOString(),
      updatedAt: mod.updatedAt.toISOString()
    }
  })
}

function toVersionDto(v: ModVersionRow, userMap: Map<string, PublicUser>): VersionDto {
  return {
    _id: v.id,
    version: v.version,
    downloadUrl: v.downloadUrl,
    platformDownloads: v.platformDownloads,
    changelog: v.changelog,
    gameVersion: v.gameVersion,
    isApproved: v.isApproved,
    isBeta: v.isBeta,
    rejectionReason: v.rejectionReason,
    submittedBy: userMap.get(v.submittedBy) ?? null,
    createdAt: v.createdAt.toISOString()
  }
}

// Public version shape: never expose raw download URLs, only which platforms exist
export function stripDownloadUrls(version: VersionDto) {
  const { downloadUrl: _, platformDownloads, ...rest } = version
  return { ...rest, availablePlatforms: getAvailablePlatforms(platformDownloads) }
}

export async function findModBySlug(db: Db, slug: string) {
  return db.query.mods.findFirst({ where: eq(mods.slug, slug) })
}

export async function findModById(db: Db, id: string) {
  return db.query.mods.findFirst({ where: eq(mods.id, id) })
}

export async function getCollaboratorIds(db: Db, modId: string, status: 'accepted' | 'pending') {
  const rows = await db.select({ userId: modCollaborators.userId }).from(modCollaborators)
    .where(and(eq(modCollaborators.modId, modId), eq(modCollaborators.status, status)))
    .orderBy(asc(modCollaborators.position))
  return rows.map((r) => r.userId)
}

export async function getDependencyIds(db: Db, modId: string) {
  const rows = await db.select({ id: modDependencies.dependencyId }).from(modDependencies)
    .where(eq(modDependencies.modId, modId))
    .orderBy(asc(modDependencies.position))
  return rows.map((r) => r.id)
}

export async function canManageMod(db: Db, mod: ModRow, user: { id: string; isAdmin: boolean }) {
  if (user.isAdmin || mod.authorId === user.id) return true
  const accepted = await getCollaboratorIds(db, mod.id, 'accepted')
  return accepted.includes(user.id)
}

export function collaboratorRows(modId: string, accepted: string[], pending: string[]) {
  return [
    ...accepted.map((userId, position) => ({ modId, userId, status: 'accepted' as const, position })),
    ...pending.map((userId, position) => ({ modId, userId, status: 'pending' as const, position }))
  ]
}

export function dependencyRows(modId: string, dependencyIds: string[]) {
  return dependencyIds.map((dependencyId, position) => ({ modId, dependencyId, position }))
}

export function modGames(mod: Pick<ModRow, 'game' | 'games'>): Game[] {
  return mod.games?.length ? mod.games : [mod.game]
}

// Keep only existing mods that share at least one game (dependency ids come from the client)
export async function validateDependencyIds(db: Db, ids: unknown, games: Game[], selfId?: string): Promise<string[]> {
  if (!Array.isArray(ids)) return []
  const candidates = [...new Set(ids.filter((id): id is string => typeof id === 'string' && /^[0-9a-f]{24}$/.test(id)))]
    .filter((id) => id !== selfId)
  if (candidates.length === 0) return []
  const rows = await inChunks(candidates, (chunk) =>
    db.select({ id: mods.id, game: mods.game, games: mods.games }).from(mods).where(inArray(mods.id, chunk))
  )
  const valid = new Set(rows.filter((r) => modGames(r).some((g) => games.includes(g))).map((r) => r.id))
  return candidates.filter((id) => valid.has(id))
}

export async function validateUserIds(db: Db, ids: unknown, excludeId?: string): Promise<string[]> {
  if (!Array.isArray(ids)) return []
  const candidates = [...new Set(ids.filter((id): id is string => typeof id === 'string' && /^[0-9a-f]{24}$/.test(id)))]
    .filter((id) => id !== excludeId)
  if (candidates.length === 0) return []
  const rows = await inChunks(candidates, (chunk) =>
    db.select({ id: users.id }).from(users).where(inArray(users.id, chunk))
  )
  const valid = new Set(rows.map((r) => r.id))
  return candidates.filter((id) => valid.has(id))
}
