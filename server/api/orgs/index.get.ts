import { count, desc, eq, sql } from 'drizzle-orm'
import { mods, organizationMembers, organizations } from '../../db/schema'
import { useDb } from '../../utils/db'

// Public directory: every organization with its member and approved mod counts
export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const modCount = db.select({ organizationId: mods.organizationId, n: count().as('mod_n') })
    .from(mods).where(eq(mods.isApproved, true)).groupBy(mods.organizationId).as('mc')
  const memberCount = db.select({ organizationId: organizationMembers.organizationId, n: count().as('member_n') })
    .from(organizationMembers).where(eq(organizationMembers.status, 'accepted')).groupBy(organizationMembers.organizationId).as('oc')

  const rows = await db.select({
    _id: organizations.id,
    name: organizations.name,
    slug: organizations.slug,
    description: organizations.description,
    logo: organizations.logo,
    modCount: sql<number>`coalesce(${modCount.n}, 0)`,
    memberCount: sql<number>`coalesce(${memberCount.n}, 0)`
  })
    .from(organizations)
    .leftJoin(modCount, eq(modCount.organizationId, organizations.id))
    .leftJoin(memberCount, eq(memberCount.organizationId, organizations.id))
    .orderBy(desc(sql`coalesce(${modCount.n}, 0)`), organizations.name)
    .limit(200)

  return { organizations: rows }
})
