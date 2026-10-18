import { eq } from 'drizzle-orm'
import { mods } from '../../../db/schema'
import { useDb } from '../../../utils/db'
import { applyUserTransfer, findModBySlug, isOrgMember, validateUserIds } from '../../../utils/mod-repo'

// GitHub-style transfer. Body: { toUserId } offers the mod to a user (they accept; admins transfer at once),
// { organizationId } moves it into an organization you belong to (null moves it out), { cancel: true } withdraws an offer.
// Allowed for the author, admins and owners of the organization that currently owns the mod.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in to transfer a mod.' })
  }
  const db = useDb(event)
  const mod = slug ? await findModBySlug(db, slug) : undefined
  if (!mod) {
    throw createError({ statusCode: 404, statusMessage: 'Mod not found.' })
  }

  const canTransfer = currentUser.isAdmin || mod.authorId === currentUser.id
    || (!!mod.organizationId && await isOrgMember(db, mod.organizationId, currentUser.id, 'owner'))
  if (!canTransfer) {
    throw createError({ statusCode: 403, statusMessage: 'Only the mod owner can transfer this mod.' })
  }

  const body = await readBody(event) ?? {}
  const now = new Date()

  if (body.cancel === true) {
    await db.update(mods).set({ transferToUserId: null, updatedAt: now }).where(eq(mods.id, mod.id))
    return { success: true }
  }

  if (body.organizationId !== undefined) {
    const organizationId = body.organizationId || null
    if (organizationId && (typeof organizationId !== 'string' || (!await isOrgMember(db, organizationId, currentUser.id) && !currentUser.isAdmin))) {
      throw createError({ statusCode: 403, statusMessage: 'You can only transfer mods to organizations you are a member of.' })
    }
    if (organizationId && !await db.query.organizations.findFirst({ where: (o, { eq }) => eq(o.id, organizationId) })) {
      throw createError({ statusCode: 404, statusMessage: 'Organization not found.' })
    }
    await db.update(mods).set({ organizationId, updatedAt: now }).where(eq(mods.id, mod.id))
    return { success: true, transferred: true }
  }

  const [toUserId] = await validateUserIds(db, [body.toUserId], mod.authorId)
  if (!toUserId) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid user other than the current owner.' })
  }

  if (currentUser.isAdmin) {
    await applyUserTransfer(db, mod.id, toUserId)
    return { success: true, transferred: true }
  }
  await db.update(mods).set({ transferToUserId: toUserId, updatedAt: now }).where(eq(mods.id, mod.id))
  return { success: true, transferred: false }
})
