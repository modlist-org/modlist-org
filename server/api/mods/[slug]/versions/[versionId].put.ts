import { and, eq } from 'drizzle-orm'
import { mods, modVersions } from '../../../../db/schema'
import { useDb } from '../../../../utils/db'
import { normalizeVersionString, parseVersionInput } from '../../../../utils/mod-platform'
import { canManageMod, findModBySlug } from '../../../../utils/mod-repo'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const versionId = getRouterParam(event, 'versionId')
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to edit a version.'
    })
  }

  if (!slug || !versionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug or versionId parameter.'
    })
  }

  const input = parseVersionInput(await readBody(event))

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
        statusMessage: 'You do not have permission to edit versions of this mod.'
      })
    }

    const versions = await db.select().from(modVersions).where(eq(modVersions.modId, mod.id))
    const target = versions.find((v) => v.id === versionId)
    if (!target) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Version not found.'
      })
    }

    const normalized = normalizeVersionString(input.version)
    if (versions.some((v) => v.id !== target.id && normalizeVersionString(v.version) === normalized)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Version ${input.version} already exists for this mod.`
      })
    }

    const changed = target.version !== input.version
      || target.downloadUrl !== input.downloadUrl
      || JSON.stringify(target.platformDownloads ?? {}) !== JSON.stringify(input.platformDownloads)
      || target.changelog !== input.changelog
      || target.gameVersion !== input.gameVersion
      || target.isBeta !== input.isBeta

    if (!changed) {
      return { success: true, version: { ...target, _id: target.id }, requiresReview: !target.isApproved }
    }

    // Same rule as submissions: trusted editors apply immediately, everyone else goes back to review
    const isTrusted = currentUser.isVerifiedDeveloper || currentUser.isAdmin

    const [saved] = await db.batch([
      db.update(modVersions).set({
        ...input,
        isApproved: isTrusted,
        rejectionReason: ''
      }).where(and(eq(modVersions.id, target.id), eq(modVersions.modId, mod.id))).returning(),
      db.update(mods).set({ updatedAt: new Date() }).where(eq(mods.id, mod.id))
    ])

    const savedVersion = saved[0]!
    return {
      success: true,
      version: { ...savedVersion, _id: savedVersion.id },
      requiresReview: !isTrusted
    }
  } catch (error) {
    console.error('Edit version error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to edit version.'
    })
  }
})
