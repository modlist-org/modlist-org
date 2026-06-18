import { HeadObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client, deleteR2Object } from '../../../utils/r2'
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
  const { game, fileName, fileKey, fileSize } = body

  if (!game || !fileName || !fileKey || typeof fileSize !== 'number') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing game, fileName, fileKey, or fileSize in request body.'
    })
  }

  try {
    const user = await User.findById(currentUser.id)
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found.'
      })
    }

    // Query R2 to get the actual uploaded file size
    const r2Client = getR2Client(event)
    const config = useRuntimeConfig(event)
    const headRes = await r2Client.send(new HeadObjectCommand({
      Bucket: config.r2BucketName,
      Key: fileKey
    }))

    const actualFileSize = headRes.ContentLength
    if (typeof actualFileSize !== 'number') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to verify file size from storage.'
      })
    }

    const existingFile = await CloudSaveFile.findOne({ fileKey })
    const oldSize = existingFile ? existingFile.fileSize : 0
    const sizeDiff = actualFileSize - oldSize

    const maxBytes = 10 * 1024 * 1024 * 1024 // 10 GB
    let updatedUser;
    if (sizeDiff <= 0) {
      updatedUser = await User.findOneAndUpdate(
        { _id: user._id },
        { $inc: { premiumSavingUsedBytes: sizeDiff } },
        { new: true }
      )
      if (updatedUser && (updatedUser.premiumSavingUsedBytes || 0) < 0) {
        updatedUser.premiumSavingUsedBytes = 0
        await updatedUser.save()
      }
    } else {
      updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          $or: [
            { premiumSavingUsedBytes: { $exists: false } },
            { premiumSavingUsedBytes: { $lte: maxBytes - sizeDiff } }
          ]
        },
        { $inc: { premiumSavingUsedBytes: sizeDiff } },
        { new: true }
      )
    }

    if (!updatedUser) {
      // Revert/Delete the uploaded file from R2 if it causes storage quota overflow
      await deleteR2Object(event, fileKey)
      throw createError({
        statusCode: 400,
        statusMessage: 'Storage quota exceeded. Uploaded file rejected.'
      })
    }

    // Create or update file metadata record using verified file size
    if (existingFile) {
      existingFile.fileSize = actualFileSize
      existingFile.updatedAt = new Date()
      await existingFile.save()
    } else {
      const newFile = new CloudSaveFile({
        userId: user._id,
        game,
        fileKey,
        fileName,
        fileSize: actualFileSize,
        updatedAt: new Date()
      })
      await newFile.save()
    }

    return {
      success: true,
      usedBytes: updatedUser.premiumSavingUsedBytes,
      maxBytes: 10 * 1024 * 1024 * 1024
    }
  } catch (error) {
    console.error('Confirm upload error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to confirm file upload.'
    })
  }
})
