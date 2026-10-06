import { and, eq } from 'drizzle-orm'
import { mods, modVersions } from '../../db/schema'
import { useDb } from '../../utils/db'
import { requireAdmin, rethrowOr500 } from '../../utils/admin'
import { findModById, hydrateMods } from '../../utils/mod-repo'
import { runInBackground, sendDiscordWebhook } from '../../utils/webhook'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { modId, versionId } = await readBody(event)
  if (!modId || !versionId) {
    throw createError({ statusCode: 400, statusMessage: 'Required parameters: modId and versionId.' })
  }

  try {
    const db = useDb(event)
    const mod = await findModById(db, modId)
    if (!mod) {
      throw createError({ statusCode: 404, statusMessage: 'Mod not found.' })
    }

    const ver = await db.query.modVersions.findFirst({
      where: and(eq(modVersions.id, versionId), eq(modVersions.modId, mod.id))
    })
    if (!ver) {
      throw createError({ statusCode: 404, statusMessage: 'Version not found.' })
    }

    await db.batch([
      db.update(modVersions).set({ isApproved: true, rejectionReason: '' }).where(eq(modVersions.id, ver.id)),
      db.update(mods).set({ updatedAt: new Date() }).where(eq(mods.id, mod.id))
    ])

    if (!ver.isApproved) {
      const [hydrated] = await hydrateMods(db, [mod])
      if (hydrated) {
        runInBackground(event, sendDiscordWebhook(
          event,
          hydrated,
          { version: ver.version, downloadUrl: ver.downloadUrl, changelog: ver.changelog, gameVersion: ver.gameVersion, isBeta: ver.isBeta },
          true
        ), 'Discord webhook on version approval')
      }
    }

    return { success: true, message: 'Version approved successfully.' }
  } catch (error) {
    rethrowOr500(error, 'Approve version error', 'Failed to approve version.')
  }
})
