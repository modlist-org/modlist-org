import { useDb } from '../../../utils/db'
import { findModBySlug, hydrateMods, stripDownloadUrls } from '../../../utils/mod-repo'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const currentUser = event.context.user

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug parameter.'
    })
  }

  try {
    const db = useDb(event)
    const row = await findModBySlug(db, slug)
    const [mod] = row ? await hydrateMods(db, [row]) : []

    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    const isOwnerOrAdmin = !!currentUser && (
      currentUser.isAdmin ||
      mod.authorId?._id === currentUser.id ||
      mod.collaboratorIds.some((c) => c._id === currentUser.id)
    )

    // Unapproved mods are only visible to owners and admins
    if (!mod.isApproved && !isOwnerOrAdmin) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    const versions = isOwnerOrAdmin ? mod.versions : mod.versions.filter((v) => v.isApproved)

    const approvedVersions = versions.filter((v) => v.isApproved)
    const latestVersion = approvedVersions.find((v) => !v.isBeta) || null
    const latestBeta = approvedVersions.find((v) => v.isBeta) || null
    const latestBetaVersion = latestBeta && (!latestVersion || new Date(latestBeta.createdAt) > new Date(latestVersion.createdAt))
      ? latestBeta
      : null

    return {
      mod: {
        ...mod,
        pendingEdit: isOwnerOrAdmin ? mod.pendingEdit : undefined,
        versions: versions.map(stripDownloadUrls)
      },
      latestVersion: latestVersion ? stripDownloadUrls(latestVersion) : null,
      latestBetaVersion: latestBetaVersion ? stripDownloadUrls(latestBetaVersion) : null,
      isEditable: isOwnerOrAdmin
    }
  } catch (error) {
    console.error('Fetch mod details error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve mod details'
    })
  }
})
