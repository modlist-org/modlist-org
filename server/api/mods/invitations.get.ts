import { and, desc, eq, inArray } from 'drizzle-orm'
import { mods, modCollaborators, organizationMembers, organizations } from '../../db/schema'
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

    const transferRows = await db.select().from(mods)
      .where(eq(mods.transferToUserId, currentUser.id))
      .orderBy(desc(mods.updatedAt))

    // Invitees are not collaborators yet: don't leak download URLs or pending edits
    const strip = (list: Awaited<ReturnType<typeof hydrateMods>>) => list.map(({ versions: _, pendingEdit: __, ...mod }) => mod)
    const orgRows = await db.select({ _id: organizations.id, name: organizations.name, slug: organizations.slug })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(and(eq(organizationMembers.userId, currentUser.id), eq(organizationMembers.status, 'pending')))
    return {
      mods: strip(await hydrateMods(db, rows)),
      transfers: strip(await hydrateMods(db, transferRows)),
      organizations: orgRows
    }
  } catch (error) {
    console.error('Fetch invitations error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve collaborator invitations'
    })
  }
})
