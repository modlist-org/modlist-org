import { and, asc, eq, inArray, or, sql } from 'drizzle-orm'
import { mods, modBranches, modCollaborators, modDependencies, modVersions, organizationMembers, organizations, users } from '../db/schema'
import type { ModBranchRow, ModRow, ModVersionRow, PendingModEdit, UserRow, Category, Game, ModTranslations } from '../db/schema'
import type { Db } from './db'
import { inChunks } from './db'
import { MOD_PLATFORMS, getAvailableLoaders, getAvailablePlatforms } from './mod-platform'
import type { LoaderDownloads, PlatformDownloads } from './mod-platform'

export interface PublicUser {
  _id: string
  username: string
  globalName?: string
  avatar?: string
  isVerifiedDeveloper: boolean
}

export interface VersionDto {
  _id: string
  branchId: string
  version: string
  downloadUrl: string
  platformDownloads: PlatformDownloads
  loaderDownloads: LoaderDownloads
  changelog: string
  gameVersion: string
  isApproved: boolean
  isBeta: boolean
  rejectionReason: string
  submittedBy: PublicUser | null
  createdAt: string
}

export interface BranchDto {
  _id: string
  name: string
  description: string
  isDefault: boolean
  isBeta: boolean
  position: number
}

export interface OrganizationRef {
  _id: string
  name: string
  slug: string
  logo: string
  memberIds: string[]
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
  organization: OrganizationRef | null
  transferToUserId: string | null
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
  branches: BranchDto[]
  defaultBranchId: string
  betaBranchId: string | null
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

  const orgIds = [...new Set(rows.map((m) => m.organizationId).filter((id): id is string => !!id))]

  const [versionRows, collabRows, depRows, userRows, pendingDepRows, branchRows, orgRows, orgMemberRows] = await db.batch([
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
    db.select({ id: mods.id, slug: mods.slug }).from(mods).where(inArray(mods.id, idList(pendingDepIds))),
    db.select().from(modBranches).where(inArray(modBranches.modId, modIds)).orderBy(asc(modBranches.position), asc(modBranches.createdAt)),
    db.select().from(organizations).where(inArray(organizations.id, idList(orgIds))),
    db.select({ organizationId: organizationMembers.organizationId, userId: organizationMembers.userId }).from(organizationMembers)
      .where(and(inArray(organizationMembers.organizationId, idList(orgIds)), eq(organizationMembers.status, 'accepted')))
  ])

  const userMap = new Map(userRows.map((u) => [u.id, toPublicUser(u)]))
  const slugMap = new Map(pendingDepRows.map((m) => [m.id, m.slug]))

  return rows.map((mod) => {
    const collabs = collabRows.filter((c) => c.modId === mod.id)
    const pick = (status: 'accepted' | 'pending') => collabs
      .filter((c) => c.status === status)
      .map((c) => userMap.get(c.userId))
      .filter((u): u is PublicUser => !!u)

    const defaultBranchId = mod.defaultBranchId ?? ''
    const versions = versionRows
      .filter((v) => v.modId === mod.id)
      .map((v) => toVersionDto(v, userMap, defaultBranchId, mod.betaBranchId))
      .sort(byNewest)
    const branches = branchRows.filter((b) => b.modId === mod.id).map((b) => toBranchDto(b, mod))
    const org = orgRows.find((o) => o.id === mod.organizationId)

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
      organization: org
        ? { _id: org.id, name: org.name, slug: org.slug, logo: org.logo, memberIds: orgMemberRows.filter((m) => m.organizationId === org.id).map((m) => m.userId) }
        : null,
      transferToUserId: mod.transferToUserId,
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
      branches,
      defaultBranchId,
      betaBranchId: mod.betaBranchId,
      versions,
      dependencies: depRows.filter((d) => d.modId === mod.id).map((d) => d.slug),
      createdAt: mod.createdAt.toISOString(),
      updatedAt: mod.updatedAt.toISOString()
    }
  })
}

function toBranchDto(b: ModBranchRow, mod: Pick<ModRow, 'defaultBranchId' | 'betaBranchId'>): BranchDto {
  return {
    _id: b.id,
    name: b.name,
    description: b.description,
    isDefault: b.id === mod.defaultBranchId,
    isBeta: b.id === mod.betaBranchId,
    position: b.position
  }
}

function toVersionDto(v: ModVersionRow, userMap: Map<string, PublicUser>, defaultBranchId: string, betaBranchId: string | null): VersionDto {
  const branchId = v.branchId ?? defaultBranchId
  return {
    _id: v.id,
    branchId,
    version: v.version,
    downloadUrl: v.downloadUrl,
    platformDownloads: v.platformDownloads,
    loaderDownloads: v.loaderDownloads ?? {},
    changelog: v.changelog,
    gameVersion: v.gameVersion,
    isApproved: v.isApproved,
    // Beta now means "in the mod's default beta branch"; kept for older clients
    isBeta: !!betaBranchId && branchId === betaBranchId,
    rejectionReason: v.rejectionReason,
    submittedBy: userMap.get(v.submittedBy) ?? null,
    createdAt: v.createdAt.toISOString()
  }
}

// Public version shape: never expose raw download URLs, only which platforms exist
export function stripDownloadUrls(version: VersionDto) {
  const { downloadUrl: _, platformDownloads, loaderDownloads, ...rest } = version
  const availableLoaders = getAvailableLoaders(loaderDownloads)
  // Platforms reachable through the generic link or any loader file
  const platforms = new Set([
    ...getAvailablePlatforms(platformDownloads),
    ...availableLoaders.flatMap((l) => getAvailablePlatforms(loaderDownloads[l]?.platformDownloads))
  ])
  return {
    ...rest,
    availablePlatforms: MOD_PLATFORMS.filter((p) => platforms.has(p)),
    availableLoaders,
    hasGenericDownload: !!version.downloadUrl
  }
}

// Owners, admins, accepted collaborators and accepted members of the owning organization
export function isModManager(mod: ModDto, user: { id: string; isAdmin: boolean } | null | undefined) {
  return !!user && (
    user.isAdmin ||
    mod.authorId?._id === user.id ||
    mod.collaboratorIds.some((c) => c._id === user.id) ||
    !!mod.organization?.memberIds.includes(user.id)
  )
}

// Newest approved version of each branch; latestVersion/latestBetaVersion keep the pre-branch API shape
export function latestVersions(mod: ModDto, versions: VersionDto[]) {
  const approved = versions.filter((v) => v.isApproved)
  const latestIn = (branchId: string | null) => branchId ? approved.find((v) => v.branchId === branchId) ?? null : null
  const latestVersion = latestIn(mod.defaultBranchId)
  const latestBeta = latestIn(mod.betaBranchId)
  const latestBetaVersion = latestBeta && (!latestVersion || new Date(latestBeta.createdAt) > new Date(latestVersion.createdAt))
    ? latestBeta
    : null
  return { latestVersion, latestBetaVersion, latestIn }
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
  if (accepted.includes(user.id)) return true
  return !!mod.organizationId && await isOrgMember(db, mod.organizationId, user.id)
}

export async function isOrgMember(db: Db, organizationId: string, userId: string, role?: 'owner') {
  const row = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.status, 'accepted')
    )
  })
  return !!row && (!role || row.role === role)
}

export async function findBranch(db: Db, modId: string, branchId: string) {
  return db.query.modBranches.findFirst({ where: and(eq(modBranches.id, branchId), eq(modBranches.modId, modId)) })
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

export async function applyUserTransfer(db: Db, modId: string, toUserId: string) {
  // The new owner is the author now, so drop any collaborator row they had
  await db.batch([
    db.update(mods).set({ authorId: toUserId, transferToUserId: null, updatedAt: new Date() }).where(eq(mods.id, modId)),
    db.delete(modCollaborators).where(and(eq(modCollaborators.modId, modId), eq(modCollaborators.userId, toUserId)))
  ])
}
