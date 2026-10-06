import { eq } from 'drizzle-orm'
import { mods } from '../../db/schema'
import { useDb } from '../../utils/db'
import { requireAdmin, rethrowOr500 } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { modId } = await readBody(event)
  if (!modId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing modId parameter.' })
  }

  try {
    const [updated] = await useDb(event).update(mods)
      .set({ isApproved: false, updatedAt: new Date() })
      .where(eq(mods.id, modId))
      .returning({ id: mods.id })
    if (!updated) {
      throw createError({ statusCode: 404, statusMessage: 'Mod not found.' })
    }

    return { success: true, message: 'Mod unapproved successfully.' }
  } catch (error) {
    rethrowOr500(error, 'Unapprove mod error', 'Failed to unapprove mod.')
  }
})
