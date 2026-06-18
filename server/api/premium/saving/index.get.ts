import { CloudSaveFile } from '../../../models/CloudSaveFile'
import { checkUserPremium } from '../../../utils/premium'
import { User } from '../../../models/User'

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
    const user = await User.findById(currentUser.id)
    const files = await CloudSaveFile.find({ userId: currentUser.id }).sort({ updatedAt: -1 })

    return {
      success: true,
      usedBytes: user?.premiumSavingUsedBytes || 0,
      maxBytes: 10 * 1024 * 1024 * 1024, // 10 GB
      files: files.map(f => ({
        id: f._id.toString(),
        game: f.game,
        fileKey: f.fileKey,
        fileName: f.fileName,
        fileSize: f.fileSize,
        updatedAt: f.updatedAt
      }))
    }
  } catch (error) {
    console.error('Fetch premium saving error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch cloud saving details.'
    })
  }
})
