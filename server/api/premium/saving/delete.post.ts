import { deleteR2Object } from '../../../utils/r2'
import { checkUserPremium } from '../../../utils/premium'
import { User } from '../../../models/User'
import { CloudSaveFile } from '../../../models/CloudSaveFile'

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
  const { fileKey } = body

  if (!fileKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing fileKey in request body.'
    })
  }

  try {
    const file = await CloudSaveFile.findOne({ fileKey, userId: currentUser.id })
    if (!file) {
      throw createError({
        statusCode: 404,
        statusMessage: 'File not found or permission denied.'
      })
    }

    // Delete from R2 storage
    await deleteR2Object(event, fileKey)

    // Update User storage usage
    const user = await User.findById(currentUser.id)
    if (user) {
      user.premiumSavingUsedBytes = Math.max(0, (user.premiumSavingUsedBytes || 0) - file.fileSize)
      await user.save()
    }

    // Delete record from DB
    await file.deleteOne()

    return {
      success: true,
      message: 'Cloud save file deleted successfully.'
    }
  } catch (error) {
    console.error('Delete cloud save error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete cloud save file.'
    })
  }
})
