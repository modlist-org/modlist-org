import { and, eq } from 'drizzle-orm'
import { organizationMembers, organizations } from '../../../db/schema'
import { validateUserIds } from '../../../utils/mod-repo'
import { loadOrg, parseOrgName, requireOrgOwner } from '../../../utils/org'
import { storeLogo } from '../../../utils/logo'
import type { OrgRole } from '../../../utils/org'

// Owners edit details and the member list; new members get a pending invitation they must accept
export default defineEventHandler(async (event) => {
  const ctx = await loadOrg(event)
  requireOrgOwner(ctx)
  const { db, org, members } = ctx

  const body = await readBody(event) ?? {}
  const updates: Partial<typeof organizations.$inferInsert> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = parseOrgName(body.name)
  if (typeof body.description === 'string') updates.description = body.description.slice(0, 2000)
  if (body.logo !== undefined) updates.logo = await storeLogo(event, body.logo)

  const statements: Parameters<typeof db.batch>[0][number][] = []
  if (Array.isArray(body.members)) {
    const requested = (body.members as { userId?: unknown; role?: unknown }[]).filter((m) => m && typeof m === 'object')
    const validIds = await validateUserIds(db, requested.map((m) => m.userId))
    const roles = new Map<string, OrgRole>()
    for (const m of requested) {
      if (typeof m.userId === 'string' && validIds.includes(m.userId)) roles.set(m.userId, m.role === 'owner' ? 'owner' : 'member')
    }

    const keepsOwner = members.some((m) => m.status === 'accepted' && roles.get(m.userId) === 'owner')
    if (!keepsOwner) {
      throw createError({ statusCode: 400, statusMessage: 'An organization needs at least one owner who has accepted.' })
    }

    const now = new Date()
    for (const m of members) {
      const where = and(eq(organizationMembers.organizationId, org.id), eq(organizationMembers.userId, m.userId))
      const role = roles.get(m.userId)
      if (!role) statements.push(db.delete(organizationMembers).where(where))
      else if (role !== m.role) statements.push(db.update(organizationMembers).set({ role }).where(where))
    }
    const newRows = [...roles].filter(([id]) => !members.some((m) => m.userId === id))
      .map(([userId, role]) => ({ organizationId: org.id, userId, role, status: 'pending' as const, createdAt: now }))
    if (newRows.length > 0) statements.push(db.insert(organizationMembers).values(newRows))
  }

  await db.batch([
    db.update(organizations).set(updates).where(eq(organizations.id, org.id)),
    ...statements
  ])
  return { success: true }
})
