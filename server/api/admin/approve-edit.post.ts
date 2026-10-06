import { eq } from 'drizzle-orm'
import { mods, modDependencies } from '../../db/schema'
import { useDb } from '../../utils/db'
import { requireAdmin, rethrowOr500 } from '../../utils/admin'
import { dependencyRows, findModById, getDependencyIds, modGames, validateDependencyIds } from '../../utils/mod-repo'

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

    const edit = mod.pendingEdit
    if (!edit) {
      throw createError({ statusCode: 400, statusMessage: 'Mod does not have a pending edit to approve.' })
    }

    const games = edit.games?.length ? edit.games : edit.game ? [edit.game] : modGames(mod)
    const updates: Partial<typeof mods.$inferInsert> = {
      pendingEdit: null,
      editRejectionReason: '',
      updatedAt: new Date()
    }
    if (edit.name) updates.name = edit.name
    if (edit.summary) updates.summary = edit.summary
    if (edit.description !== undefined) updates.description = edit.description
    if (edit.translations !== undefined) updates.translations = edit.translations
    if (edit.games?.length || edit.game) {
      updates.game = games[0]
      updates.games = games
    }
    if (edit.logo !== undefined) updates.logo = edit.logo
    if (edit.sourceUrl !== undefined) updates.sourceUrl = edit.sourceUrl
    if (edit.communityUrl !== undefined) updates.communityUrl = edit.communityUrl
    if (edit.categories && edit.categories.length > 0) updates.categories = edit.categories

    const statements = []
    const gamesChanged = !!(edit.games?.length || edit.game)
    if (edit.dependencies !== undefined || gamesChanged) {
      // Dependencies may have been deleted since the edit was proposed, or no longer share a game
      const depIds = await validateDependencyIds(db, edit.dependencies ?? await getDependencyIds(db, mod.id), games, mod.id)
      statements.push(db.delete(modDependencies).where(eq(modDependencies.modId, mod.id)))
      if (depIds.length > 0) statements.push(db.insert(modDependencies).values(dependencyRows(mod.id, depIds)))
    }

    await db.batch([db.update(mods).set(updates).where(eq(mods.id, mod.id)), ...statements])

    return { success: true, message: 'Mod edits approved and applied successfully.' }
  } catch (error) {
    rethrowOr500(error, 'Approve mod edits error', 'Failed to approve mod edits.')
  }
})
