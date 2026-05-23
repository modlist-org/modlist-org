import mongoose from 'mongoose'
import { Mod } from '../../models/Mod'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to view collaborator invitations.'
    })
  }

  try {
    const mods = await Mod.find({
      pendingCollaboratorIds: new mongoose.Types.ObjectId(currentUser.id)
    })
      .populate('authorId', 'username globalName avatar')
      .sort({ updatedAt: -1 })

    return { mods }
  } catch (error) {
    console.error('Fetch invitations error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve collaborator invitations'
    })
  }
})
