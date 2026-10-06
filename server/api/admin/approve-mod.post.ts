import { eq } from 'drizzle-orm'
import { mods, modVersions } from '../../db/schema'
import { useDb } from '../../utils/db'
import { requireAdmin, rethrowOr500 } from '../../utils/admin'
import { findModById, hydrateMods } from '../../utils/mod-repo'
import { runInBackground, sendDiscordWebhook } from '../../utils/webhook'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { modId } = await readBody(event)
  if (!modId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing modId parameter.' })
  }

  try {
    const db = useDb(event)
    const mod = await findModById(db, modId)
    if (!mod) {
      throw createError({ statusCode: 404, statusMessage: 'Mod not found.' })
    }

    // Approving the mod also approves its submitted versions (covers the initial release)
    await db.batch([
      db.update(mods).set({ isApproved: true, rejectionReason: '', updatedAt: new Date() }).where(eq(mods.id, mod.id)),
      db.update(modVersions).set({ isApproved: true, rejectionReason: '' }).where(eq(modVersions.modId, mod.id))
    ])

    if (!mod.isApproved) {
      const [hydrated] = await hydrateMods(db, [{ ...mod, isApproved: true }])
      if (hydrated) {
        runInBackground(event, sendDiscordWebhook(event, hydrated), 'Discord webhook on approval')
      }
    }

    return { success: true, message: 'Mod approved successfully.' }
  } catch (error) {
    rethrowOr500(error, 'Approve mod error', 'Failed to approve mod.')
  }
})
