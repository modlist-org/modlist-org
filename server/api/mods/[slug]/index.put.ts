import mongoose from 'mongoose'
import { Mod } from '../../../models/Mod'
import { User } from '../../../models/User'

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

  if (logo && typeof logo === 'string' && logo.length > 1500000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Logo size must be smaller than 1MB.'
    })
  }

  if (sourceUrl && typeof sourceUrl === 'string') {
    if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Source code link must be a valid HTTP/HTTPS URL.'
      })
    }
  }

  if (communityUrl && typeof communityUrl === 'string') {
    if (!communityUrl.startsWith('http://') && !communityUrl.startsWith('https://')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Community link must be a valid HTTP/HTTPS URL.'
      })
    }
  }

  try {
    const mod = await Mod.findOne({ slug })
    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    // Check permissions: author, collaborator, or admin
    const isOwner = mod.authorId.toString() === currentUser.id
    const isCollab = mod.collaboratorIds.some((id) => id.toString() === currentUser.id)
    const isAdmin = currentUser.isAdmin

    if (!isOwner && !isCollab && !isAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to edit this mod.'
      })
    }

    // Update basic fields
    if (isAdmin || !mod.isApproved) {
      if (name) mod.name = name
      if (summary) mod.summary = summary
      if (description !== undefined) mod.description = description
      if (game && ['adofai', 'rhythm-doctor', 'dancing-line'].includes(game)) mod.game = game
      if (logo !== undefined) mod.logo = logo
      if (sourceUrl !== undefined) mod.sourceUrl = sourceUrl
      if (communityUrl !== undefined) mod.communityUrl = communityUrl
      if (categories !== undefined) {
        if (!Array.isArray(categories) || categories.length === 0 || categories.some((cat) => !['ui', 'gameplay', 'utility', 'visuals', 'library'].includes(cat))) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Invalid or empty categories selected.'
          })
        }
        mod.categories = categories
      }
      if (dependencies !== undefined) {
        const validatedDepIds: mongoose.Types.ObjectId[] = []
        if (Array.isArray(dependencies)) {
          for (const depId of dependencies) {
            if (!mongoose.Types.ObjectId.isValid(depId)) continue
            const depMod = await Mod.findById(depId)
            if (depMod && depMod.game === (game || mod.game)) {
              validatedDepIds.push(new mongoose.Types.ObjectId(depMod._id))
            }
          }
        }
        mod.dependencies = validatedDepIds
      }
      if (!mod.isApproved) {
        mod.rejectionReason = '' // Reset rejection reason on update
      }
      mod.pendingEdit = null
    } else {
      let isChanged = false
      const proposedEdit: Partial<import('../../../models/Mod').IPendingModEdit> = {}

      if (name && name !== mod.name) {
        proposedEdit.name = name
        isChanged = true
      }
      if (summary && summary !== mod.summary) {
        proposedEdit.summary = summary
        isChanged = true
      }
      if (description !== undefined && description !== mod.description) {
        proposedEdit.description = description
        isChanged = true
      }
      if (game && game !== mod.game && ['adofai', 'rhythm-doctor', 'dancing-line'].includes(game)) {
        proposedEdit.game = game
        isChanged = true
      }
      if (logo !== undefined && logo !== mod.logo) {
        proposedEdit.logo = logo
        isChanged = true
      }
      if (sourceUrl !== undefined && sourceUrl !== mod.sourceUrl) {
        proposedEdit.sourceUrl = sourceUrl
        isChanged = true
      }
      if (communityUrl !== undefined && communityUrl !== mod.communityUrl) {
        proposedEdit.communityUrl = communityUrl
        isChanged = true
      }
      if (categories !== undefined) {
        if (!Array.isArray(categories) || categories.length === 0 || categories.some((cat) => !['ui', 'gameplay', 'utility', 'visuals', 'library'].includes(cat))) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Invalid or empty categories selected.'
          })
        }
        const categoriesChanged = categories.length !== mod.categories.length || categories.some(cat => !mod.categories.includes(cat as 'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'))
        if (categoriesChanged) {
          proposedEdit.categories = categories as Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
          isChanged = true
        }
      }
      if (dependencies !== undefined) {
        const validatedDepIds: mongoose.Types.ObjectId[] = []
        if (Array.isArray(dependencies)) {
          for (const depId of dependencies) {
            if (!mongoose.Types.ObjectId.isValid(depId)) continue
            const depMod = await Mod.findById(depId)
            if (depMod && depMod.game === (game || mod.game)) {
              validatedDepIds.push(new mongoose.Types.ObjectId(depMod._id))
            }
          }
        }
        const currentDepIds = mod.dependencies.map(id => id.toString())
        const newDepIds = validatedDepIds.map(id => id.toString())
        const depChanged = currentDepIds.length !== newDepIds.length || newDepIds.some(id => !currentDepIds.includes(id))
        if (depChanged) {
          proposedEdit.dependencies = validatedDepIds
          isChanged = true
        }
      }

      if (isChanged) {
        const prevPending = mod.pendingEdit ? {
          name: mod.pendingEdit.name,
          summary: mod.pendingEdit.summary,
          description: mod.pendingEdit.description,
          game: mod.pendingEdit.game,
          logo: mod.pendingEdit.logo,
          sourceUrl: mod.pendingEdit.sourceUrl,
          communityUrl: mod.pendingEdit.communityUrl,
          categories: mod.pendingEdit.categories ? [...mod.pendingEdit.categories] : undefined,
          dependencies: mod.pendingEdit.dependencies ? [...mod.pendingEdit.dependencies] : undefined
        } : {}
        mod.pendingEdit = {
          ...prevPending,
          ...proposedEdit,
          createdAt: new Date()
        }
        mod.editRejectionReason = '' // Reset rejection reason when proposing new edits
      }
    }

    // Update collaborators (only author or admin can manage collaborators)
    if (collaboratorIds !== undefined && (isOwner || isAdmin)) {
      const newPendingCollabIds: mongoose.Types.ObjectId[] = []
      const newAcceptedCollabIds: mongoose.Types.ObjectId[] = []

      if (Array.isArray(collaboratorIds)) {
        for (const collabId of collaboratorIds) {
          if (collabId === mod.authorId.toString()) continue // Already the author
          const collabUser = await User.findById(collabId)
          if (collabUser) {
            const objectId = new mongoose.Types.ObjectId(collabUser._id)
            // If already accepted, keep in accepted
            if (mod.collaboratorIds && mod.collaboratorIds.some((id) => id.toString() === collabId)) {
              newAcceptedCollabIds.push(objectId)
            } 
            // If already pending, keep in pending
            else if (mod.pendingCollaboratorIds && mod.pendingCollaboratorIds.some((id) => id.toString() === collabId)) {
              newPendingCollabIds.push(objectId)
            } 
            // Otherwise, it's a new invitation -> add to pending
            else {
              newPendingCollabIds.push(objectId)
            }
          }
        }
      }
      mod.collaboratorIds = newAcceptedCollabIds
      mod.pendingCollaboratorIds = newPendingCollabIds
    }

    mod.updatedAt = new Date()
    await mod.save()

    return {
      success: true,
      mod: {
        name: mod.name,
        slug: mod.slug,
        summary: mod.summary,
        game: mod.game,
        categories: mod.categories,
        collaboratorIds: mod.collaboratorIds
      }
    }
  } catch (error) {
    console.error('Update mod error:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update mod: ${err.message || String(error)}`
    })
  }
})
