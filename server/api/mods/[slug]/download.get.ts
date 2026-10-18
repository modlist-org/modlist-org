import { and, desc, eq, sql } from 'drizzle-orm'
import { mods, modBranches, modVersions } from '../../../db/schema'
import { useDb } from '../../../utils/db'
import { detectPlatform, normalizeLoader, normalizePlatform, resolveDownloadUrl } from '../../../utils/mod-platform'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const query = getQuery(event)
  const versionStr = query.version as string
  const isBeta = query.beta === 'true'
  const platformQuery = query.platform as string | undefined
  const platform = platformQuery
    ? normalizePlatform(platformQuery)
    : detectPlatform(getRequestHeader(event, 'user-agent') || '')

  const loaderQuery = query.loader as string | undefined
  const loader = normalizeLoader(loaderQuery)
  const branchQuery = typeof query.branch === 'string' ? query.branch : undefined

  if (loaderQuery && !loader) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid loader. Supported loaders: melonloader, umm, bepinex.'
    })
  }

  if (platformQuery && !platform) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid platform. Supported platforms: windows, macos, linux.'
    })
  }

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug parameter.'
    })
  }

  try {
    const db = useDb(event)
    const mod = await db.query.mods.findFirst({
      where: and(eq(mods.slug, slug), eq(mods.isApproved, true)),
      columns: { id: true, defaultBranchId: true, betaBranchId: true }
    })

    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found or not approved.'
      })
    }

    const approvedVersions = await db.select().from(modVersions)
      .where(and(eq(modVersions.modId, mod.id), eq(modVersions.isApproved, true)))
      .orderBy(desc(modVersions.createdAt))

    // `branch` takes a branch id or name; otherwise `beta=true` picks the default beta branch
    let branchId = isBeta ? mod.betaBranchId : mod.defaultBranchId
    if (branchQuery) {
      const branches = await db.select({ id: modBranches.id, name: modBranches.name }).from(modBranches).where(eq(modBranches.modId, mod.id))
      const branch = branches.find((b) => b.id === branchQuery) ?? branches.find((b) => b.name.toLowerCase() === branchQuery.toLowerCase())
      if (!branch) {
        throw createError({ statusCode: 404, statusMessage: 'Branch not found.' })
      }
      branchId = branch.id
    }
    const inBranch = (v: typeof approvedVersions[number]) => (v.branchId ?? mod.defaultBranchId) === branchId

    const targetVersion = versionStr
      ? approvedVersions.find((v) => v.version === versionStr && inBranch(v))
        ?? (branchQuery ? undefined : approvedVersions.find((v) => v.version === versionStr))
      : approvedVersions.find(inBranch)

    const targetDownloadUrl = targetVersion
      ? resolveDownloadUrl(targetVersion, platform, loader)
      : undefined

    if (!targetVersion || !targetDownloadUrl) {
      throw createError({
        statusCode: 404,
        statusMessage: platform || loader
          ? `Requested version has no ${[loader, platform].filter(Boolean).join(' ')} download link.`
          : 'Requested version not found or download link is missing.'
      })
    }

    await db.update(mods).set({ downloads: sql`${mods.downloads} + 1` }).where(eq(mods.id, mod.id))

    return sendRedirect(event, targetDownloadUrl, 302)
  } catch (error) {
    console.error('Redirect and increment download count error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process download redirection.'
    })
  }
})
