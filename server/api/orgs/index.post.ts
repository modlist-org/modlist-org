import { organizationMembers, organizations } from '../../db/schema'
import { newId, useDb } from '../../utils/db'
import { formatOrgSlug, parseOrgName } from '../../utils/org'
import { storeLogo } from '../../utils/logo'

// Any logged-in user can create an organization and becomes its first owner
export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in to create an organization.' })
  }

  const body = await readBody(event) ?? {}
  const name = parseOrgName(body.name)
  const slug = formatOrgSlug(body.slug || name)
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slug. Must contain only alphanumeric characters, dashes, and underscores.' })
  }

  const db = useDb(event)
  const existing = await db.query.organizations.findFirst({ where: (o, { eq }) => eq(o.slug, slug) })
  if (existing) {
    throw createError({ statusCode: 400, statusMessage: 'An organization with this slug already exists.' })
  }

  const id = newId()
  const now = new Date()
  await db.batch([
    db.insert(organizations).values({
      id,
      name,
      slug,
      description: typeof body.description === 'string' ? body.description.slice(0, 2000) : '',
      logo: await storeLogo(event, body.logo),
      createdAt: now,
      updatedAt: now
    }),
    db.insert(organizationMembers).values({ organizationId: id, userId: currentUser.id, role: 'owner', status: 'accepted', createdAt: now })
  ])
  return { success: true, organization: { _id: id, slug, name } }
})
