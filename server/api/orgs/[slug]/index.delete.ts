import { eq } from 'drizzle-orm'
import { mods, organizationMembers, organizations } from '../../../db/schema'
import { loadOrg, requireOrgOwner } from '../../../utils/org'

// Mods owned by the organization stay with their authors
export default defineEventHandler(async (event) => {
  const ctx = await loadOrg(event)
  requireOrgOwner(ctx)
  const { db, org } = ctx
  await db.batch([
    db.update(mods).set({ organizationId: null }).where(eq(mods.organizationId, org.id)),
    db.delete(organizationMembers).where(eq(organizationMembers.organizationId, org.id)),
    db.delete(organizations).where(eq(organizations.id, org.id))
  ])
  return { success: true }
})
