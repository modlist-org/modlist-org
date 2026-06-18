import { ModPreset } from '../../../models/ModPreset'
import { checkUserPremium } from '../../../utils/premium'

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

  try {
    const presets = await ModPreset.find({ ownerId: currentUser.id }).sort({ createdAt: -1 })
    
    return {
      success: true,
      presets: presets.map(p => ({
        id: p._id,
        name: p.name,
        game: p.game,
        modsCount: p.mods.length,
        fileKey: p.fileKey,
        sourceFileKey: p.sourceFileKey,
        createdAt: p.createdAt
      }))
    }
  } catch (error) {
    console.error('Fetch my presets error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve your presets.'
    })
  }
})
