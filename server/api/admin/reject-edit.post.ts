import { eq } from 'drizzle-orm'
import { mods } from '../../db/schema'
import { useDb } from '../../utils/db'
import { requireAdmin, rethrowOr500 } from '../../utils/admin'
import { findModById } from '../../utils/mod-repo'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { modId, reason } = await readBody(event)
  if (!modId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing modId parameter.' })
  }

  try {
    const db = useDb(event)
    const mod = await findModById(db, modId)
    if (!mod) {
      throw createError({ statusCode: 404, statusMessage: 'Mod not found.' })
    }

    await db.update(mods).set({
      editRejectionReason: reason || 'No reason provided.',
      pendingEdit: null,
      updatedAt: new Date()
    }).where(eq(mods.id, mod.id))

    return { success: true, message: 'Mod edits rejected successfully.' }
  } catch (error) {
    rethrowOr500(error, 'Reject mod edits error', 'Failed to reject mod edits.')
  }
})
