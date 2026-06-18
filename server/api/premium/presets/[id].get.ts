import { ModPreset } from '../../../models/ModPreset'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing preset ID.'
    })
  }

  try {
    const preset = await ModPreset.findById(id).populate('ownerId', 'username globalName')

    if (!preset) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Preset not found.'
      })
    }

    return {
      success: true,
      preset: {
        id: preset._id,
        name: preset.name,
        game: preset.game,
        mods: preset.mods,
        owner: preset.ownerId,
        createdAt: preset.createdAt
      }
    }
  } catch (error) {
    console.error('Fetch preset error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve preset details.'
    })
  }
})
