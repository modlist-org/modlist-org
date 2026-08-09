import mongoose from 'mongoose'
import { Mod } from '../../../models/Mod'
import { getAvailablePlatforms, isHttpUrl, normalizePlatformDownloads } from '../../../utils/mod-platform'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to submit a mod update.'
    })
  }

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug parameter.'
    })
  }

  const body = await readBody(event)
  const { version, downloadUrl, platformDownloads, changelog, gameVersion, isBeta } = body

  const normalizedPlatformDownloads = normalizePlatformDownloads(platformDownloads)
  const availablePlatforms = getAvailablePlatforms(normalizedPlatformDownloads)
  const normalizedDownloadUrl = downloadUrl?.trim() || normalizedPlatformDownloads[availablePlatforms[0] as keyof typeof normalizedPlatformDownloads]

  // Validations
  if (!version || (!normalizedDownloadUrl && availablePlatforms.length === 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Version string and at least one platform download link are required.'
    })
  }

  if (downloadUrl && !isHttpUrl(downloadUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Download link must be a valid direct HTTP/HTTPS URL.'
    })
  }

  for (const platform of availablePlatforms) {
    if (!isHttpUrl(normalizedPlatformDownloads[platform])) {
      throw createError({
        statusCode: 400,
        statusMessage: `${platform} download link must be a valid direct HTTP/HTTPS URL.`
      })
    }
  }

  try {
    const mod = await Mod.findOne({ slug })
    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    // Check permissions: author, collaborator, or admin
    const isOwner = mod.authorId.toString() === currentUser.id
    const isCollab = mod.collaboratorIds.some((id) => id.toString() === currentUser.id)
    const isAdmin = currentUser.isAdmin

    if (!isOwner && !isCollab && !isAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to submit updates to this mod.'
      })
    }

    // Auto-approve version if submitted by verified developer or admin
    const isAutoApproved = currentUser.isVerifiedDeveloper || currentUser.isAdmin

    // Check if version already exists
    const normalizedNewVersion = version.trim().replace(/^v/i, '')
    const existingVersionIndex = mod.versions.findIndex((v) => v.version.trim().replace(/^v/i, '') === normalizedNewVersion)

    if (existingVersionIndex > -1) {
      const existingVer = mod.versions[existingVersionIndex]
      if (!existingVer) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to access version document'
        })
      }
      if (existingVer.isApproved) {
        throw createError({
          statusCode: 400,
          statusMessage: `Version ${version} is already approved and active.`
        })
      }

      // Update existing unapproved/rejected version in-place
      existingVer.downloadUrl = normalizedDownloadUrl as string
      existingVer.platformDownloads = normalizedPlatformDownloads
      existingVer.changelog = changelog || ''
      existingVer.gameVersion = gameVersion || ''
      existingVer.isApproved = isAutoApproved
      existingVer.isBeta = !!isBeta
      existingVer.rejectionReason = ''
      existingVer.createdAt = new Date()
      existingVer.submittedBy = new mongoose.Types.ObjectId(currentUser.id)

      mod.updatedAt = new Date()
      await mod.save()

      if (isAutoApproved) {
        const populatedMod = await Mod.findById(mod._id).populate('authorId')
        if (populatedMod) {
          sendDiscordWebhook(
            populatedMod as unknown as Parameters<typeof sendDiscordWebhook>[0],
            { version, downloadUrl: normalizedDownloadUrl as string, changelog: changelog || '', gameVersion: gameVersion || '', isBeta: !!isBeta },
            true
          ).catch((err) => {
            console.error('Failed to send Discord webhook on version update:', err)
          })
        }
      }

      return {
        success: true,
        version: existingVer
      }
    }

    // Construct version object
    const newVersion = {
      version,
      downloadUrl: normalizedDownloadUrl as string,
      platformDownloads: normalizedPlatformDownloads,
      changelog: changelog || '',
      gameVersion: gameVersion || '',
      isApproved: isAutoApproved,
      isBeta: !!isBeta,
      submittedBy: new mongoose.Types.ObjectId(currentUser.id),
      createdAt: new Date()
    }

    // Push version
    mod.versions.push(newVersion)
    mod.updatedAt = new Date()
    await mod.save()

    if (isAutoApproved) {
      const populatedMod = await Mod.findById(mod._id).populate('authorId')
      if (populatedMod) {
        sendDiscordWebhook(
          populatedMod as unknown as Parameters<typeof sendDiscordWebhook>[0],
          { version, downloadUrl: normalizedDownloadUrl as string, changelog: changelog || '', gameVersion: gameVersion || '', isBeta: !!isBeta },
          true
        ).catch((err) => {
          console.error('Failed to send Discord webhook on version update:', err)
        })
      }
    }

    return {
      success: true,
      version: newVersion
    }
  } catch (error) {
    console.error('Submit version update error:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to submit version update: ${err.message || String(error)}`
    })
  }
})
