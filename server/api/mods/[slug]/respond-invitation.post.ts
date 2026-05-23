import mongoose from 'mongoose'
import { Mod } from '../../../models/Mod'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to respond to collaborator invitations.'
    })
  }

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug parameter.'
    })
  }

  const body = await readBody(event)
  const { action } = body

  if (!action || !['accept', 'reject'].includes(action)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid action. Must be "accept" or "reject".'
    })
  }

  try {
    const mod = await Mod.findOne({ slug })
    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    const userId = new mongoose.Types.ObjectId(currentUser.id)

    // Check if the current user is in pendingCollaboratorIds
    const isPending = mod.pendingCollaboratorIds.some((id) => id.toString() === currentUser.id)
    if (!isPending) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have a pending invitation for this mod.'
      })
    }

    // Process invitation action
    if (action === 'accept') {
      mod.pendingCollaboratorIds = mod.pendingCollaboratorIds.filter((id) => id.toString() !== currentUser.id)
      if (!mod.collaboratorIds.some((id) => id.toString() === currentUser.id)) {
        mod.collaboratorIds.push(userId)
      }
    } else {
      mod.pendingCollaboratorIds = mod.pendingCollaboratorIds.filter((id) => id.toString() !== currentUser.id)
    }

    await mod.save()

    return { success: true }
  } catch (error) {
    console.error('Respond to invitation error:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to respond to invitation: ${err.message || String(error)}`
    })
  }
})
