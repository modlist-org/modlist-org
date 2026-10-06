import { eq } from 'drizzle-orm'
import { mods, modCollaborators, modDependencies, CATEGORIES, GAMES } from '../../../db/schema'
import type { Category, Game, PendingModEdit } from '../../../db/schema'
import { useDb } from '../../../utils/db'
import { isHttpUrl } from '../../../utils/mod-platform'
import {
  canManageMod,
  collaboratorRows,
  dependencyRows,
  findModBySlug,
  getCollaboratorIds,
  getDependencyIds,
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
  const { name, summary, description, game, categories, collaboratorIds, logo, sourceUrl, communityUrl, dependencies } = body

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

    const validGame: Game | undefined = game && (GAMES as readonly string[]).includes(game) ? game : undefined
    const targetGame = validGame || mod.game
    const storedLogo = logo !== undefined ? await storeLogo(event, logo) : undefined
    const newDepIds = dependencies !== undefined ? await validateDependencyIds(db, dependencies, targetGame, mod.id) : undefined

    const updates: Partial<typeof mods.$inferInsert> = {}
    const statements: Parameters<typeof db.batch>[0][number][] = []

    if (isAdmin || !mod.isApproved) {
      // Admins and unapproved mods edit in place
      if (name) updates.name = name
      if (summary) updates.summary = summary
      if (description !== undefined) updates.description = description
      if (validGame) updates.game = validGame
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
      if (validGame && validGame !== mod.game) proposedEdit.game = validGame
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
