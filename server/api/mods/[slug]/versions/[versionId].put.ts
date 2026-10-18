import { and, eq } from 'drizzle-orm'
import { mods, modVersions } from '../../../../db/schema'
import { useDb } from '../../../../utils/db'
import { normalizeVersionString, parseVersionInput, versionFiles } from '../../../../utils/mod-platform'
import { runInBackground, sendAdminPendingWebhook } from '../../../../utils/webhook'
import { canManageMod, findBranch, findModBySlug } from '../../../../utils/mod-repo'

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

    const { branchId: requestedBranchId, isBeta: _, ...fields } = input
    const branchId = requestedBranchId ?? target.branchId ?? mod.defaultBranchId
    if (!branchId || !await findBranch(db, mod.id, branchId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Branch not found for this mod.'
      })
    }
    const branchOf = (v: typeof target) => v.branchId ?? mod.defaultBranchId

    const normalized = normalizeVersionString(input.version)
    if (versions.some((v) => v.id !== target.id && branchOf(v) === branchId && normalizeVersionString(v.version) === normalized)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Version ${input.version} already exists in this branch.`
      })
    }

    const changed = target.version !== input.version
      || branchOf(target) !== branchId
      || JSON.stringify(versionFiles(target)) !== JSON.stringify(input.files)
      || target.changelog !== input.changelog
      || target.gameVersion !== input.gameVersion

    if (!changed) {
      return { success: true, version: { ...target, _id: target.id }, requiresReview: !target.isApproved }
    }

    // Same rule as submissions: trusted editors apply immediately, everyone else goes back to review
    const isTrusted = currentUser.isVerifiedDeveloper || currentUser.isAdmin

    const [saved] = await db.batch([
      db.update(modVersions).set({
        ...fields,
        branchId,
        isBeta: branchId === mod.betaBranchId,
        isApproved: isTrusted,
        rejectionReason: ''
      }).where(and(eq(modVersions.id, target.id), eq(modVersions.modId, mod.id))).returning(),
      db.update(mods).set({ updatedAt: new Date() }).where(eq(mods.id, mod.id))
    ])

    const savedVersion = saved[0]!
    if (!isTrusted && mod.isApproved) {
      runInBackground(event, sendAdminPendingWebhook(event, 'version', mod, `v${savedVersion.version} (edited)`), 'Admin webhook on edited version')
    }
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
