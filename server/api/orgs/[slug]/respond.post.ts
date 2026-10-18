import { and, eq, inArray } from 'drizzle-orm'
import { modCollaborators, mods, organizationMembers } from '../../../db/schema'
import { loadOrg } from '../../../utils/org'

// accept / reject a pending invitation, or leave as an accepted member
export default defineEventHandler(async (event) => {
  const { db, org, members, membership, user } = await loadOrg(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in.' })
  }
  const { action } = await readBody(event) ?? {}
  if (!['accept', 'reject', 'leave'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid action. Must be "accept", "reject" or "leave".' })
  }
  const expected = action === 'leave' ? 'accepted' : 'pending'
  if (membership?.status !== expected) {
    throw createError({ statusCode: 403, statusMessage: action === 'leave' ? 'You are not a member of this organization.' : 'You do not have a pending invitation.' })
  }
  if (action === 'leave' && membership.role === 'owner' && !members.some((m) => m.userId !== user.id && m.role === 'owner' && m.status === 'accepted')) {
    throw createError({ statusCode: 400, statusMessage: 'Add another owner before leaving, or delete the organization.' })
  }

  const where = and(eq(organizationMembers.organizationId, org.id), eq(organizationMembers.userId, user.id))
  if (action === 'accept') {
    // A new member reaches the organization's mods through it, so their collaborator rows there go away
    const orgMods = db.select({ id: mods.id }).from(mods).where(eq(mods.organizationId, org.id))
    await db.batch([
      db.update(organizationMembers).set({ status: 'accepted' }).where(where),
      db.delete(modCollaborators).where(and(eq(modCollaborators.userId, user.id), inArray(modCollaborators.modId, orgMods)))
    ])
  } else {
    await db.delete(organizationMembers).where(where)
  }
  return { success: true }
})
