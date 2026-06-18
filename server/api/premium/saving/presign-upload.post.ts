import { getUploadPresignedUrl } from '../../../utils/r2'
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
  const { game, fileName, fileSize } = body

  if (!game || !fileName || typeof fileSize !== 'number' || fileSize <= 0 || !Number.isInteger(fileSize)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or missing fileSize. It must be a positive integer.'
    })
  }

  const maxBytes = 10 * 1024 * 1024 * 1024 // 10 GB
  if (fileSize > maxBytes) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File size exceeds the maximum storage quota of 10 GB.'
    })
  }

  if (!['adofai', 'rhythm-doctor', 'dancing-line'].includes(game)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid game parameter.'
    })
  }

  try {
    const user = await User.findById(currentUser.id)
    const usedBytes = user?.premiumSavingUsedBytes || 0

    // Check if the file is already uploaded, to calculate size diff
    const fileKey = `users/${currentUser.id}/${game}/${fileName}`
    const existingFile = await CloudSaveFile.findOne({ fileKey })
    const oldSize = existingFile ? existingFile.fileSize : 0
    const sizeDiff = fileSize - oldSize

    if (usedBytes + sizeDiff > maxBytes) {
      throw createError({
        statusCode: 400,
        statusMessage: `Insufficient storage space. Required size diff: ${sizeDiff} bytes, Available: ${maxBytes - usedBytes} bytes.`
      })
    }

    const uploadUrl = await getUploadPresignedUrl(event, fileKey, fileSize)

    return {
      success: true,
      uploadUrl,
      fileKey
    }
  } catch (error) {
    console.error('Presign upload error:', error)
    const err = error as { statusCode?: number; statusMessage?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate upload link.'
    })
  }
})
