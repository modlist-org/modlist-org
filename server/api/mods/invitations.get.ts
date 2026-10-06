import { and, desc, eq, inArray } from 'drizzle-orm'
import { mods, modCollaborators } from '../../db/schema'
import { useDb } from '../../utils/db'
import { hydrateMods } from '../../utils/mod-repo'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to view collaborator invitations.'
    })
  }

  try {
    const db = useDb(event)
    const invitedModIds = db.select({ id: modCollaborators.modId }).from(modCollaborators)
      .where(and(eq(modCollaborators.userId, currentUser.id), eq(modCollaborators.status, 'pending')))
    const rows = await db.select().from(mods)
      .where(inArray(mods.id, invitedModIds))
      .orderBy(desc(mods.updatedAt))

    const hydrated = await hydrateMods(db, rows)
    // Invitees are not collaborators yet: don't leak download URLs or pending edits
    const result = hydrated.map(({ versions: _, pendingEdit: __, ...mod }) => mod)
    return { mods: result }
  } catch (error) {
    console.error('Fetch invitations error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve collaborator invitations'
    })
  }
})
