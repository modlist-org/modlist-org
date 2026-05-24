import { Mod } from '../../../models/Mod'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const query = getQuery(event)
  const versionStr = query.version as string
  const isBeta = query.beta === 'true'

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug parameter.'
    })
  }

  try {
    const mod = await Mod.findOneAndUpdate(
      { slug, isApproved: true },
      { $inc: { downloads: 1 } },
      { new: true }
    )

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

    if (!targetVersion || !targetVersion.downloadUrl) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Requested version not found or download link is missing.'
      })
    }

    // Redirect to the actual download URL
    return sendRedirect(event, targetVersion.downloadUrl, 302)
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
