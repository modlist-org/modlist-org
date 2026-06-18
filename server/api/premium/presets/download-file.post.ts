import { ModPreset } from '../../../models/ModPreset'
import { getDownloadPresignedUrl } from '../../../utils/r2'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { presetId } = body

  if (!presetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing presetId in request body.'
    })
  }

  try {
    const preset = await ModPreset.findById(presetId)
    if (!preset) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Preset not found.'
      })
    }

    if (!preset.fileKey) {
      throw createError({
        statusCode: 400,
        statusMessage: 'This preset does not have any attached configuration/save files.'
      })
    }

    const downloadUrl = await getDownloadPresignedUrl(event, preset.fileKey)

    return {
      success: true,
      downloadUrl
    }
  } catch (error) {
    console.error('Preset file download error:', error)
    const err = error as { statusCode?: number; statusMessage?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate download link for preset.'
    })
  }
})
