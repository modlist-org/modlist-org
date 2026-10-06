import { and, desc, eq, sql } from 'drizzle-orm'
import { mods, modVersions } from '../../../db/schema'
import { useDb } from '../../../utils/db'
import { detectPlatform, getVersionDownloadUrl, normalizePlatform } from '../../../utils/mod-platform'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const query = getQuery(event)
  const versionStr = query.version as string
  const isBeta = query.beta === 'true'
  const platformQuery = query.platform as string | undefined
  const platform = platformQuery
    ? normalizePlatform(platformQuery)
    : detectPlatform(getRequestHeader(event, 'user-agent') || '')

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
      columns: { id: true }
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

    const targetVersion = versionStr
      ? approvedVersions.find((v) => v.version === versionStr)
      : approvedVersions.find((v) => v.isBeta === isBeta)

    const targetDownloadUrl = targetVersion
      ? getVersionDownloadUrl(targetVersion, platform)
      : undefined

    if (!targetVersion || !targetDownloadUrl) {
      throw createError({
        statusCode: 404,
        statusMessage: platform
          ? `Requested version has no ${platform} download link.`
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
