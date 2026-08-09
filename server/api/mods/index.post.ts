import mongoose from 'mongoose'
import { Mod } from '../../models/Mod'
import { User } from '../../models/User'
import { getAvailablePlatforms, isHttpUrl, normalizePlatformDownloads } from '../../utils/mod-platform'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to submit a mod.'
    })
  }

  const body = await readBody(event)
  const {
    name,
    slug,
    game,
    categories,
    summary,
    description,
    version,
    downloadUrl,
    platformDownloads,
    changelog,
    gameVersion,
    collaboratorIds,
    logo,
    sourceUrl,
    communityUrl,
    dependencies,
    isBeta
  } = body

  // 1. Validations
  const normalizedPlatformDownloads = normalizePlatformDownloads(platformDownloads)
  const availablePlatforms = getAvailablePlatforms(normalizedPlatformDownloads)

  if (!name || !slug || !game || !categories || !summary || !version || (!downloadUrl && availablePlatforms.length === 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Required fields: name, slug, game, categories, summary, version, and at least one platform download link.'
    })
  }

  if (logo && typeof logo === 'string' && logo.length > 1500000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Logo size must be smaller than 1MB.'
    })
  }

  if (sourceUrl && typeof sourceUrl === 'string') {
    if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Source code link must be a valid HTTP/HTTPS URL.'
      })
    }
  }

  if (communityUrl && typeof communityUrl === 'string') {
    if (!communityUrl.startsWith('http://') && !communityUrl.startsWith('https://')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Community link must be a valid HTTP/HTTPS URL.'
      })
    }
  }

  if (!['adofai', 'rhythm-doctor', 'dancing-line'].includes(game)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid game selected.'
    })
  }

  if (!Array.isArray(categories) || categories.length === 0 || categories.some((cat) => !['ui', 'gameplay', 'utility', 'visuals', 'library'].includes(cat))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or empty categories selected.'
    })
  }

  // Ensure slug format is lowercase URL friendly
  const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '')
  if (formattedSlug.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid slug. Must contain only alphanumeric characters, dashes, and underscores.'
    })
  }

  // Check slug uniqueness
  const existingMod = await Mod.findOne({ slug: formattedSlug })
  if (existingMod) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A mod with this slug already exists. Please choose a different slug.'
    })
  }

  if (downloadUrl && !isHttpUrl(downloadUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Download link must be a valid direct HTTP/HTTPS URL (e.g. GitHub release).'
    })
  }

  for (const platform of availablePlatforms) {
    if (!isHttpUrl(normalizedPlatformDownloads[platform])) {
      throw createError({
        statusCode: 400,
        statusMessage: `${platform} download link must be a valid direct HTTP/HTTPS URL.`
      })
    }
  }

  const normalizedDownloadUrl = downloadUrl?.trim() || normalizedPlatformDownloads[availablePlatforms[0] as keyof typeof normalizedPlatformDownloads]

  // Validate collaborators
  const validatedCollabIds: mongoose.Types.ObjectId[] = []
  if (Array.isArray(collaboratorIds) && collaboratorIds.length > 0) {
    for (const collabId of collaboratorIds) {
      if (collabId === currentUser.id) continue // Author is already the owner
      const collabUser = await User.findById(collabId)
      if (collabUser) {
        validatedCollabIds.push(new mongoose.Types.ObjectId(collabUser._id))
      }
    }
  }

  // Validate dependencies
  const validatedDepIds: mongoose.Types.ObjectId[] = []
  if (Array.isArray(dependencies) && dependencies.length > 0) {
    for (const depId of dependencies) {
      if (!mongoose.Types.ObjectId.isValid(depId)) continue
      const depMod = await Mod.findById(depId)
      if (depMod && depMod.game === game) {
        validatedDepIds.push(new mongoose.Types.ObjectId(depMod._id))
      }
    }
  }

  // 2. Determine approval status
  // Mod approval bypass is allowed only for verified developers or admins.
  const isAutoApproved = currentUser.isVerifiedDeveloper || currentUser.isAdmin

  try {
    const mod = new Mod({
      name,
      slug: formattedSlug,
      game,
      categories,
      summary,
      description: description || '',
      authorId: new mongoose.Types.ObjectId(currentUser.id),
      collaboratorIds: [],
      pendingCollaboratorIds: validatedCollabIds,
      isApproved: isAutoApproved,
      logo: logo || '',
      sourceUrl: sourceUrl || '',
      communityUrl: communityUrl || '',
      dependencies: validatedDepIds,
      downloads: 0,
      versions: [
        {
          version,
          downloadUrl: normalizedDownloadUrl,
          platformDownloads: normalizedPlatformDownloads,
          changelog: changelog || 'Initial release',
          gameVersion: gameVersion || '',
          isApproved: isAutoApproved,
          isBeta: !!isBeta,
          submittedBy: new mongoose.Types.ObjectId(currentUser.id),
          createdAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await mod.save()

    if (mod.isApproved) {
      const populatedMod = await Mod.findById(mod._id).populate('authorId')
      if (populatedMod) {
        sendDiscordWebhook(
          populatedMod as unknown as Parameters<typeof sendDiscordWebhook>[0],
          { version, downloadUrl: normalizedDownloadUrl, changelog: changelog || 'Initial release', gameVersion: gameVersion || '', isBeta: !!isBeta }
        ).catch((err) => {
          console.error('Failed to send Discord webhook on creation:', err)
        })
      }
    }

    return {
      success: true,
      mod: {
        id: mod._id,
        slug: mod.slug,
        isApproved: mod.isApproved
      }
    }
  } catch (error) {
    console.error('Error creating mod:', error)
    const err = error as { message?: string }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create mod: ${err.message || String(error)}`
    })
  }
})
