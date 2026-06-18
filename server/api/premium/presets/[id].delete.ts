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

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing preset ID.'
    })
  }

  try {
    const preset = await ModPreset.findById(id)
    if (!preset) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Preset not found.'
      })
    }

    if (preset.ownerId.toString() !== currentUser.id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied. You do not own this preset.'
      })
    }

    await ModPreset.findByIdAndDelete(id)

    return {
      success: true,
      message: 'Preset deleted successfully.'
    }
  } catch (error) {
    console.error('Delete preset error:', error)
    const err = error as { statusCode?: number; statusMessage?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete preset.'
    })
  }
})
