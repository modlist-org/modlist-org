import { ModPreset } from '../../../models/ModPreset'
import { Mod } from '../../../models/Mod'
import { CloudSaveFile } from '../../../models/CloudSaveFile'
import { checkUserPremium } from '../../../utils/premium'
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

  // 2. Validate fileKey if attached
  if (fileKey) {
    const cloudFile = await CloudSaveFile.findOne({ fileKey, userId: currentUser.id })
    if (!cloudFile) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Attached configuration file not found or permission denied.'
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

    const preset = new ModPreset({
      _id: presetId,
      ownerId: currentUser.id,
      name,
      game,
      mods: filteredMods,
      fileKey
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
