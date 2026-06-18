import { ModPreset } from '../../../models/ModPreset'
import { Mod } from '../../../models/Mod'
import { CloudSaveFile } from '../../../models/CloudSaveFile'
import { User } from '../../../models/User'
import { checkUserPremium } from '../../../utils/premium'
import { copyR2Object } from '../../../utils/r2'
import crypto from 'crypto'

function generateShortId(): string {
  return crypto.randomBytes(4).toString('hex') // 8 chars
}

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to access premium features.'
    })
  }

  const isPremium = await checkUserPremium(event, currentUser.id, currentUser.discordId, currentUser.accessToken || '')
  if (!isPremium) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Premium Discord Role required.'
    })
  }

  const body = await readBody(event)
  const { name, game, mods, fileKey } = body

  if (!name || !game || !Array.isArray(mods) || mods.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing name, game, or mods in request body.'
    })
  }

  if (!['adofai', 'rhythm-doctor', 'dancing-line'].includes(game)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid game parameter.'
    })
  }

  // 1. Filter out mods not registered on modlist.org
  const approvedMods = await Mod.find({ game, isApproved: true }, 'slug')
  const approvedSlugs = new Set(approvedMods.map(m => m.slug.toLowerCase()))
  const filteredMods = mods.filter(m => m && m.slug && approvedSlugs.has(m.slug.toLowerCase()))

  if (filteredMods.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'None of the mods in the preset are registered or approved on modlist.org.'
    })
  }

  let presetFileKey: string | undefined = undefined
  let sourceFileKey: string | undefined = undefined
  let fileSize = 0

  // 2. Validate fileKey if attached
  if (fileKey) {
    const cloudFile = await CloudSaveFile.findOne({ fileKey, userId: currentUser.id })
    if (!cloudFile) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Attached configuration file not found or permission denied.'
      })
    }
    sourceFileKey = fileKey
    fileSize = cloudFile.fileSize || 0
  }

  // Validate storage quota and update user's storage usage atomically if save is attached
  if (sourceFileKey && fileSize > 0) {
    const maxBytes = 10 * 1024 * 1024 * 1024 // 10 GB
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: currentUser.id,
        $or: [
          { premiumSavingUsedBytes: { $exists: false } },
          { premiumSavingUsedBytes: { $lte: maxBytes - fileSize } }
        ]
      },
      { $inc: { premiumSavingUsedBytes: fileSize } },
      { new: true }
    )

    if (!updatedUser) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Storage quota exceeded. Cannot attach this backup to the preset.'
      })
    }
  }

  try {
    let presetId = generateShortId()
    let attempts = 0
    while (await ModPreset.findById(presetId) && attempts < 5) {
      presetId = generateShortId()
      attempts++
    }

    if (sourceFileKey) {
      presetFileKey = `presets/${presetId}/save.zip`
      try {
        await copyR2Object(event, sourceFileKey, presetFileKey)
      } catch (copyErr) {
        // Revert user storage usage
        if (fileSize > 0) {
          await User.updateOne(
            { _id: currentUser.id },
            { $inc: { premiumSavingUsedBytes: -fileSize } }
          )
        }
        throw copyErr
      }
    }

    const preset = new ModPreset({
      _id: presetId,
      ownerId: currentUser.id,
      name,
      game,
      mods: filteredMods,
      fileKey: presetFileKey,
      sourceFileKey,
      fileSize: fileSize > 0 ? fileSize : undefined
    })

    await preset.save()

    const config = useRuntimeConfig(event)
    return {
      success: true,
      presetId,
      shareUrl: `${config.appBaseUrl || 'https://modlist.org'}/presets/${presetId}`
    }
  } catch (error) {
    console.error('Create preset error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create shared preset.'
    })
  }
})
