import { eq } from 'drizzle-orm'
import { organizationMembers, organizations } from '../../db/schema'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in.' })
  }

  const rows = await useDb(event)
    .select({ org: organizations, role: organizationMembers.role, status: organizationMembers.status })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, currentUser.id))
    .orderBy(organizations.name)

  const toDto = (r: typeof rows[number]) => ({
    _id: r.org.id,
    name: r.org.name,
    slug: r.org.slug,
    description: r.org.description,
    role: r.role
  })
  return {
    organizations: rows.filter((r) => r.status === 'accepted').map(toDto),
    invitations: rows.filter((r) => r.status === 'pending').map(toDto)
  }
})
