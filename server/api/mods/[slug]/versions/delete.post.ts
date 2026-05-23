import type mongoose from 'mongoose'
import { Mod } from '../../../../models/Mod'
import type { IModVersion } from '../../../../models/Mod'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to delete a version submission.'
    })
  }

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug parameter.'
    })
  }

  const body = await readBody(event)
  const { versionId } = body

  if (!versionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing versionId parameter.'
    })
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
        statusMessage: 'You do not have permission to manage this mod.'
      })
    }

    const versions = mod.versions as unknown as mongoose.Types.DocumentArray<IModVersion>
    // Find the version to delete
    const version = versions.id(versionId)
    if (!version) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Version submission not found.'
      })
    }

    // Can only delete unapproved versions (unless admin)
    if (version.isApproved && !isAdmin) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Approved versions can only be deleted by an administrator.'
      })
    }

    // Pull/remove the version
    versions.pull(versionId)
    mod.updatedAt = new Date()
    await mod.save()

    return {
      success: true,
      message: 'Version submission deleted successfully.'
    }
  } catch (error) {
    console.error('Delete version submission error:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to delete version submission: ${err.message || String(error)}`
    })
  }
})
