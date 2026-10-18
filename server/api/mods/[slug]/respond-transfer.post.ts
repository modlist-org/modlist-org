import { eq } from 'drizzle-orm'
import { mods } from '../../../db/schema'
import { useDb } from '../../../utils/db'
import { applyUserTransfer, findModBySlug } from '../../../utils/mod-repo'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in.' })
  }
  const { action } = await readBody(event) ?? {}
  if (!['accept', 'reject'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid action. Must be "accept" or "reject".' })
  }
  const db = useDb(event)
  const mod = slug ? await findModBySlug(db, slug) : undefined
  if (!mod || mod.transferToUserId !== currentUser.id) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have a pending transfer for this mod.' })
  }
  if (action === 'accept') await applyUserTransfer(db, mod.id, currentUser.id)
  else await db.update(mods).set({ transferToUserId: null }).where(eq(mods.id, mod.id))
  return { success: true }
})
