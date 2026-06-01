import mongoose from 'mongoose'
import { Mod } from '../../models/Mod'
import { User } from '../../models/User'

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
    changelog,
    gameVersion,
    collaboratorIds,
    logo,
    sourceUrl,
    communityUrl,
    isBeta
  } = body

  // 1. Validations
  if (!name || !slug || !game || !categories || !summary || !version || !downloadUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Required fields: name, slug, game, categories, summary, version, and downloadUrl.'
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

  // Check downloadUrl format
  if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Download link must be a valid direct HTTP/HTTPS URL (e.g. GitHub release).'
    })
  }

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
      downloads: 0,
      versions: [
        {
          version,
          downloadUrl,
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
          { version, downloadUrl, changelog: changelog || 'Initial release', gameVersion: gameVersion || '', isBeta: !!isBeta }
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
