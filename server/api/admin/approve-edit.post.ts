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

    if (!mod.pendingEdit) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Mod does not have a pending edit to approve.'
      })
    }

    // Apply pendingEdit changes to root document
    const edit = mod.pendingEdit
    if (edit.name) mod.name = edit.name
    if (edit.summary) mod.summary = edit.summary
    if (edit.description !== undefined) mod.description = edit.description
    if (edit.game) mod.game = edit.game
    if (edit.logo !== undefined) mod.logo = edit.logo
    if (edit.sourceUrl !== undefined) mod.sourceUrl = edit.sourceUrl
    if (edit.communityUrl !== undefined) mod.communityUrl = edit.communityUrl
    if (edit.categories && edit.categories.length > 0) {
      mod.categories = edit.categories
    }
    if (edit.dependencies !== undefined) {
      mod.dependencies = edit.dependencies
    }

    mod.pendingEdit = null
    mod.editRejectionReason = ''
    mod.updatedAt = new Date()
    await mod.save()

    return {
      success: true,
      message: 'Mod edits approved and applied successfully.'
    }
  } catch (error) {
    console.error('Approve mod edits error:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to approve mod edits: ${err.message || String(error)}`
    })
  }
})
