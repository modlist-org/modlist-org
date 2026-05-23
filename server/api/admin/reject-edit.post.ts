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
  const { modId, reason } = body

  if (!modId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing modId parameter.'
    })
  }

  const rejectionReason = reason || 'No reason provided.'

  try {
    const mod = await Mod.findById(modId)

    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    // Save rejection reason and clear pending edits
    mod.editRejectionReason = rejectionReason
    mod.pendingEdit = null
    mod.updatedAt = new Date()
    await mod.save()

    return {
      success: true,
      message: 'Mod edits rejected successfully.'
    }
  } catch (error) {
    console.error('Reject mod edits error:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to reject mod edits: ${err.message || String(error)}`
    })
  }
})
