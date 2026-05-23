import { Mod } from '../../models/Mod'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { User } from '../../models/User'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user

  if (!currentUser || !currentUser.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Administrator privileges required.'
    })
  }

  try {
    // 1. Fetch pending mods (where isApproved is false and not rejected)
    const pendingMods = await Mod.find({
      isApproved: false,
      $or: [
        { rejectionReason: '' },
        { rejectionReason: { $exists: false } },
        { rejectionReason: null }
      ]
    })
      .populate('authorId', 'username globalName avatar isVerifiedDeveloper')
      .sort({ createdAt: -1 })

    // 2. Fetch mods that have pending versions (even if the mod itself is approved)
    const modsWithPendingVersions = await Mod.find({
      isApproved: true,
      'versions.isApproved': false
    })
      .populate('authorId', 'username globalName avatar')
      .populate('versions.submittedBy', 'username globalName avatar isVerifiedDeveloper')

    // Extract individual pending versions
    interface IPendingVersion {
      modId: unknown
      modName: string
      modSlug: string
      game: string
      versionId: unknown
      version: string
      downloadUrl: string
      changelog: string
      createdAt: Date
      submittedBy: unknown
    }
    const pendingVersions: IPendingVersion[] = []
    for (const mod of modsWithPendingVersions) {
      for (const ver of mod.versions) {
        if (!ver.isApproved && !ver.rejectionReason) {
          pendingVersions.push({
            modId: mod._id,
            modName: mod.name,
            modSlug: mod.slug,
            game: mod.game,
            versionId: ver._id,
            version: ver.version,
            downloadUrl: ver.downloadUrl,
            changelog: ver.changelog,
            submittedBy: ver.submittedBy,
            createdAt: ver.createdAt
          })
        }
      }
    }

    // Sort pending versions by creation date descending
    pendingVersions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // 3. Fetch mods that have pending edits
    const pendingEdits = await Mod.find({
      pendingEdit: { $ne: null }
    })
      .populate('authorId', 'username globalName avatar isVerifiedDeveloper')
      .sort({ updatedAt: -1 })

    return {
      pendingMods,
      pendingVersions,
      pendingEdits
    }
  } catch (error) {
    console.error('Fetch pending submissions error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve pending submissions'
    })
  }
})
