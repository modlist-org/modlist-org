import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { organizationMembers, organizations } from '../db/schema'
import { useDb } from './db'

export type OrgRole = 'owner' | 'member'

export function formatOrgSlug(slug: unknown) {
  return String(slug ?? '').toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 40)
}

export function parseOrgName(name: unknown) {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed || trimmed.length > 60) {
    throw createError({ statusCode: 400, statusMessage: 'Organization name must be 1-60 characters.' })
  }
  return trimmed
}

// Organization from the route plus the current user's membership row (if any)
export async function loadOrg(event: H3Event) {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug parameter.' })
  }
  const db = useDb(event)
  const org = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) })
  if (!org) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found.' })
  }
  const members = await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, org.id))
  const user = event.context.user
  const membership = user ? members.find((m) => m.userId === user.id) : undefined
  return { db, org, members, membership, user }
}

export function requireOrgOwner(ctx: Awaited<ReturnType<typeof loadOrg>>) {
  if (!ctx.user) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in.' })
  }
  const isOwner = ctx.membership?.status === 'accepted' && ctx.membership.role === 'owner'
  if (!isOwner && !ctx.user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Only organization owners can do this.' })
  }
  return ctx.user
}
