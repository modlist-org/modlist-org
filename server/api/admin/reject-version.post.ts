import { and, eq } from 'drizzle-orm'
import { mods, modVersions } from '../../db/schema'
import { useDb } from '../../utils/db'
import { requireAdmin, rethrowOr500 } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { modId, versionId, reason } = await readBody(event)
  if (!modId || !versionId) {
    throw createError({ statusCode: 400, statusMessage: 'Required parameters: modId and versionId.' })
  }

  try {
    const db = useDb(event)
    const [updated] = await db.update(modVersions)
      .set({ isApproved: false, rejectionReason: reason || 'No reason provided.' })
      .where(and(eq(modVersions.id, versionId), eq(modVersions.modId, modId)))
      .returning({ id: modVersions.id })
    if (!updated) {
      throw createError({ statusCode: 404, statusMessage: 'Version not found.' })
    }
    await db.update(mods).set({ updatedAt: new Date() }).where(eq(mods.id, modId))

    return { success: true, message: 'Version rejected successfully.' }
  } catch (error) {
    rethrowOr500(error, 'Reject version error', 'Failed to reject version.')
  }
})
