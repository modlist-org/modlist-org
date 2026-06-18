import { ModPreset } from '../../../models/ModPreset'
import { checkUserPremium } from '../../../utils/premium'
import { deleteR2Object } from '../../../utils/r2'

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

    if (preset.fileKey) {
      try {
        await deleteR2Object(event, preset.fileKey)
      } catch (err) {
        console.error('Failed to delete preset R2 save file:', err)
      }
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
