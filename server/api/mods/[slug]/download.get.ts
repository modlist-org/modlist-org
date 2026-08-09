import { Mod } from '../../../models/Mod'
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
    const mod = await Mod.findOne({ slug, isApproved: true })

    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found or not approved.'
      })
    }

    let targetVersion = null
    if (versionStr) {
      targetVersion = mod.versions.find(v => v.version === versionStr && v.isApproved)
    } else {
      const approvedVersions = mod.versions
        .filter(v => v.isApproved)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      if (isBeta) {
        targetVersion = approvedVersions.find(v => v.isBeta) || null
      } else {
        targetVersion = approvedVersions.find(v => !v.isBeta) || null
      }
    }

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

    await Mod.updateOne({ _id: mod._id }, { $inc: { downloads: 1 } })

    // Redirect to the actual download URL
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
