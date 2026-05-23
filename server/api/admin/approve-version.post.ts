import { Mod } from '../../models/Mod'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user

  if (!currentUser || !currentUser.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Administrator privileges required.'
    })
  }

  const body = await readBody(event)
  const { modId, versionId } = body

  if (!modId || !versionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Required parameters: modId and versionId.'
    })
  }

  try {
    const mod = await Mod.findById(modId)

    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    // Find the version in the array
    const ver = mod.versions.find((v) => v._id?.toString() === versionId)
    if (!ver) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Version not found.'
      })
    }

    ver.isApproved = true
    ver.rejectionReason = ''
    mod.updatedAt = new Date()
    await mod.save()

    return {
      success: true,
      message: 'Version approved successfully.'
    }
  } catch (error) {
    console.error('Approve version error:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to approve version: ${err.message || String(error)}`
    })
  }
})
