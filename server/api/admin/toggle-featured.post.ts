import { eq } from 'drizzle-orm'
import { mods } from '../../db/schema'
import { useDb } from '../../utils/db'
import { requireAdmin, rethrowOr500 } from '../../utils/admin'
import { findModById, hydrateMods } from '../../utils/mod-repo'
import { runInBackground, sendFeaturedWebhook } from '../../utils/webhook'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { modId } = await readBody(event)
  if (!modId) {
    throw createError({ statusCode: 400, statusMessage: 'Required parameter: modId.' })
  }

  try {
    const db = useDb(event)
    const mod = await findModById(db, modId)
    if (!mod) {
      throw createError({ statusCode: 404, statusMessage: 'Mod not found.' })
    }

    const isFeatured = !mod.isFeatured
    await db.update(mods).set({ isFeatured }).where(eq(mods.id, mod.id))

    const [hydrated] = await hydrateMods(db, [mod])
    if (hydrated) {
      runInBackground(event, sendFeaturedWebhook(event, hydrated, isFeatured), 'Discord webhook for featured mod')
    }

    return { success: true, modId: mod.id, isFeatured }
  } catch (error) {
    rethrowOr500(error, 'Toggle featured status error', 'Failed to update featured status.')
  }
})
