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
  const { modId } = body

  if (!modId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing modId parameter.'
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

    mod.isApproved = true
    mod.rejectionReason = ''
    // Also approve all of its versions (since the initial mod approval covers the initial release version)
    for (const ver of mod.versions) {
      ver.isApproved = true
      ver.rejectionReason = ''
    }

    mod.updatedAt = new Date()
    await mod.save()

    return {
      success: true,
      message: 'Mod approved successfully.'
    }
  } catch (error) {
    console.error('Approve mod error:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to approve mod: ${err.message || String(error)}`
    })
  }
})
