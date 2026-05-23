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

    mod.isApproved = false
    mod.updatedAt = new Date()
    await mod.save()

    return {
      success: true,
      message: 'Mod unapproved successfully.'
    }
  } catch (error) {
    console.error('Unapprove mod error:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to unapprove mod: ${err.message || String(error)}`
    })
  }
})
