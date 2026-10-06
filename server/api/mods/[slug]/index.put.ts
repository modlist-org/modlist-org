import { eq } from 'drizzle-orm'
import { mods, modCollaborators, modDependencies, CATEGORIES, normalizeGames, normalizeTranslations } from '../../../db/schema'
import type { Category, PendingModEdit } from '../../../db/schema'
import { useDb } from '../../../utils/db'
import { isHttpUrl } from '../../../utils/mod-platform'
import {
  canManageMod,
  collaboratorRows,
  dependencyRows,
  findModBySlug,
  getCollaboratorIds,
  getDependencyIds,
  modGames,
  validateDependencyIds,
  validateUserIds
} from '../../../utils/mod-repo'
import { storeLogo } from '../../../utils/logo'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to edit a mod.'
    })
  }

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug parameter.'
    })
  }

  const body = await readBody(event)
  const { name, summary, description, translations, game, games, categories, collaboratorIds, logo, sourceUrl, communityUrl, dependencies } = body

  if (sourceUrl && !isHttpUrl(sourceUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Source code link must be a valid HTTP/HTTPS URL.'
    })
  }

  if (communityUrl && !isHttpUrl(communityUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Community link must be a valid HTTP/HTTPS URL.'
    })
  }

  if (categories !== undefined && (!Array.isArray(categories) || categories.length === 0 || categories.some((cat) => !(CATEGORIES as readonly string[]).includes(cat)))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or empty categories selected.'
    })
  }

  const db = useDb(event)

  try {
    const mod = await findModBySlug(db, slug)
    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    const isOwner = mod.authorId === currentUser.id
    const isAdmin = currentUser.isAdmin
    if (!await canManageMod(db, mod, currentUser)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to edit this mod.'
      })
    }

    // Only touch games when the client sent them (legacy clients send a single `game`)
    const requestedGames = games !== undefined || game !== undefined ? normalizeGames(games, game) : undefined
    if (requestedGames && requestedGames.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Select at least one target game.' })
    }
    const currentGames = modGames(mod)
    const targetGames = requestedGames ?? currentGames
    const gamesChanged = !!requestedGames && (requestedGames.length !== currentGames.length || requestedGames.some((g, i) => g !== currentGames[i]))
    const storedLogo = logo !== undefined ? await storeLogo(event, logo) : undefined
    // Re-check dependencies when games change so every dependency still shares a game
    const newDepIds = dependencies !== undefined || gamesChanged
      ? await validateDependencyIds(db, dependencies ?? await getDependencyIds(db, mod.id), targetGames, mod.id)
      : undefined

    const newTranslations = translations !== undefined ? normalizeTranslations(translations) : undefined
    const updates: Partial<typeof mods.$inferInsert> = {}
    const statements: Parameters<typeof db.batch>[0][number][] = []

    if (isAdmin || !mod.isApproved) {
      // Admins and unapproved mods edit in place
      if (name) updates.name = name
      if (summary) updates.summary = summary
      if (description !== undefined) updates.description = description
      if (newTranslations !== undefined) updates.translations = newTranslations
      if (requestedGames) {
        updates.game = requestedGames[0]
        updates.games = requestedGames
      }
      if (storedLogo !== undefined) updates.logo = storedLogo
      if (sourceUrl !== undefined) updates.sourceUrl = sourceUrl
      if (communityUrl !== undefined) updates.communityUrl = communityUrl
      if (categories !== undefined) updates.categories = categories
      if (newDepIds !== undefined) {
        statements.push(db.delete(modDependencies).where(eq(modDependencies.modId, mod.id)))
        if (newDepIds.length > 0) statements.push(db.insert(modDependencies).values(dependencyRows(mod.id, newDepIds)))
      }
      if (!mod.isApproved) updates.rejectionReason = ''
      updates.pendingEdit = null
    } else {
      // Approved mods keep their live details; changes are staged for admin review
      const proposedEdit: PendingModEdit = {}

      if (name && name !== mod.name) proposedEdit.name = name
      if (summary && summary !== mod.summary) proposedEdit.summary = summary
      if (description !== undefined && description !== mod.description) proposedEdit.description = description
      if (newTranslations !== undefined && JSON.stringify(newTranslations) !== JSON.stringify(mod.translations ?? {})) {
        proposedEdit.translations = newTranslations
      }
      if (gamesChanged && requestedGames) {
        proposedEdit.games = requestedGames
        proposedEdit.game = requestedGames[0]
      }
      if (storedLogo !== undefined && storedLogo !== mod.logo) proposedEdit.logo = storedLogo
      if (sourceUrl !== undefined && sourceUrl !== mod.sourceUrl) proposedEdit.sourceUrl = sourceUrl
      if (communityUrl !== undefined && communityUrl !== mod.communityUrl) proposedEdit.communityUrl = communityUrl
      if (categories !== undefined) {
        const changed = categories.length !== mod.categories.length || categories.some((cat: string) => !mod.categories.includes(cat as Category))
        if (changed) proposedEdit.categories = categories
      }
      if (newDepIds !== undefined) {
        const currentDepIds = await getDependencyIds(db, mod.id)
        const changed = currentDepIds.length !== newDepIds.length || newDepIds.some((id) => !currentDepIds.includes(id))
        if (changed) proposedEdit.dependencies = newDepIds
      }

      if (Object.keys(proposedEdit).length > 0) {
        updates.pendingEdit = {
          ...(mod.pendingEdit || {}),
          ...proposedEdit,
          createdAt: new Date().toISOString()
        }
        updates.editRejectionReason = ''
      }
    }

    // Only the author or an admin can manage collaborators; new collaborators must accept an invitation
    if (collaboratorIds !== undefined && (isOwner || isAdmin)) {
      const requested = await validateUserIds(db, collaboratorIds, mod.authorId)
      const accepted = await getCollaboratorIds(db, mod.id, 'accepted')
      const nextAccepted = requested.filter((id) => accepted.includes(id))
      const nextPending = requested.filter((id) => !accepted.includes(id))
      statements.push(db.delete(modCollaborators).where(eq(modCollaborators.modId, mod.id)))
      const rows = collaboratorRows(mod.id, nextAccepted, nextPending)
      if (rows.length > 0) statements.push(db.insert(modCollaborators).values(rows))
    }

    updates.updatedAt = new Date()
    const [updated] = await db.batch([
      db.update(mods).set(updates).where(eq(mods.id, mod.id)).returning(),
      ...statements
    ])

    const updatedMod = updated[0] ?? mod
    return {
      success: true,
      mod: {
        name: updatedMod.name,
        slug: updatedMod.slug,
        summary: updatedMod.summary,
        game: updatedMod.game,
        games: modGames(updatedMod),
        categories: updatedMod.categories,
        collaboratorIds: await getCollaboratorIds(db, mod.id, 'accepted')
      }
    }
  } catch (error) {
    console.error('Update mod error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update mod.'
    })
  }
})
