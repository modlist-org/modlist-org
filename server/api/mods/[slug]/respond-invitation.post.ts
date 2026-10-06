import { and, eq } from 'drizzle-orm'
import { modCollaborators } from '../../../db/schema'
import { useDb } from '../../../utils/db'
import { findModBySlug, getCollaboratorIds } from '../../../utils/mod-repo'

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
    const db = useDb(event)
    const mod = await findModBySlug(db, slug)
    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    const pending = await getCollaboratorIds(db, mod.id, 'pending')
    if (!pending.includes(currentUser.id)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have a pending invitation for this mod.'
      })
    }

    const invitation = and(eq(modCollaborators.modId, mod.id), eq(modCollaborators.userId, currentUser.id))
    if (action === 'accept') {
      const accepted = await getCollaboratorIds(db, mod.id, 'accepted')
      await db.update(modCollaborators)
        .set({ status: 'accepted', position: accepted.length })
        .where(invitation)
    } else {
      await db.delete(modCollaborators).where(invitation)
    }

    return { success: true }
  } catch (error) {
    console.error('Respond to invitation error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to respond to invitation.'
    })
  }
})
