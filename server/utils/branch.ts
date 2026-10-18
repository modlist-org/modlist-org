import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { modBranches } from '../db/schema'
import type { ModRow } from '../db/schema'
import { useDb } from './db'
import { canManageMod, findModBySlug } from './mod-repo'
import type { Db } from './db'

// Load the mod from the route and require the current user to manage it
export async function requireManagedMod(event: H3Event) {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in to manage branches.' })
  }
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug parameter.' })
  }
  const db = useDb(event)
  const mod = await findModBySlug(db, slug)
  if (!mod) {
    throw createError({ statusCode: 404, statusMessage: 'Mod not found.' })
  }
  if (!await canManageMod(db, mod, currentUser)) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have permission to manage this mod.' })
  }
  return { db, mod, currentUser }
}

// Trimmed 1-40 char name, unique per mod ignoring case
export async function validateBranchName(db: Db, mod: ModRow, name: unknown, selfId?: string) {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed || trimmed.length > 40) {
    throw createError({ statusCode: 400, statusMessage: 'Branch name must be 1-40 characters.' })
  }
  const existing = await db.select({ id: modBranches.id, name: modBranches.name }).from(modBranches).where(eq(modBranches.modId, mod.id))
  if (existing.some((b) => b.id !== selfId && b.name.toLowerCase() === trimmed.toLowerCase())) {
    throw createError({ statusCode: 400, statusMessage: 'A branch with this name already exists.' })
  }
  return { name: trimmed, count: existing.length }
}
