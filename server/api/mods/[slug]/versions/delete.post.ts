import { and, eq } from 'drizzle-orm'
import { mods, modVersions } from '../../../../db/schema'
import { useDb } from '../../../../utils/db'
import { canManageMod, findModBySlug } from '../../../../utils/mod-repo'

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

  if (!versionId || typeof versionId !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing versionId parameter.'
    })
  }

  try {
    const db = useDb(event)
    const mod = await findModBySlug(db, slug)
    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    if (!await canManageMod(db, mod, currentUser)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to manage this mod.'
      })
    }

    const version = await db.query.modVersions.findFirst({
      where: and(eq(modVersions.id, versionId), eq(modVersions.modId, mod.id))
    })
    if (!version) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Version submission not found.'
      })
    }

    // Only admins can delete approved versions
    if (version.isApproved && !currentUser.isAdmin) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Approved versions can only be deleted by an administrator.'
      })
    }

    await db.batch([
      db.delete(modVersions).where(eq(modVersions.id, version.id)),
      db.update(mods).set({ updatedAt: new Date() }).where(eq(mods.id, mod.id))
    ])

    return {
      success: true,
      message: 'Version submission deleted successfully.'
    }
  } catch (error) {
    console.error('Delete version submission error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete version submission.'
    })
  }
})
