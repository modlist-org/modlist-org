import { eq } from 'drizzle-orm'
import { mods, modVersions } from '../../../db/schema'
import { useDb, newId } from '../../../utils/db'
import { normalizeVersionString, parseVersionInput } from '../../../utils/mod-platform'
import { canManageMod, findBranch, findModBySlug, hydrateMods } from '../../../utils/mod-repo'
import type { ModDto } from '../../../utils/mod-repo'
import { runInBackground, sendAdminPendingWebhook, sendDiscordWebhook } from '../../../utils/webhook'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to submit a mod update.'
    })
  }

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug parameter.'
    })
  }

  const input = parseVersionInput(await readBody(event))
  const { version, downloadUrl: normalizedDownloadUrl, platformDownloads: normalizedPlatformDownloads, loaderDownloads, changelog, gameVersion } = input

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
        statusMessage: 'You do not have permission to submit updates to this mod.'
      })
    }

    // Auto-approve version if submitted by verified developer or admin
    const isAutoApproved = currentUser.isVerifiedDeveloper || currentUser.isAdmin

    // Older clients send isBeta instead of a branch
    const branchId = input.branchId ?? (input.isBeta && mod.betaBranchId ? mod.betaBranchId : mod.defaultBranchId)
    if (!branchId || !await findBranch(db, mod.id, branchId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Branch not found for this mod.'
      })
    }
    const isBeta = branchId === mod.betaBranchId

    // Version numbers are unique per branch
    const existingVersions = await db.select().from(modVersions).where(eq(modVersions.modId, mod.id))
    const normalizedNewVersion = normalizeVersionString(version)
    const existingVer = existingVersions.find((v) => (v.branchId ?? mod.defaultBranchId) === branchId && normalizeVersionString(v.version) === normalizedNewVersion)

    if (existingVer?.isApproved) {
      throw createError({
        statusCode: 400,
        statusMessage: `Version ${version} is already approved and active.`
      })
    }

    const now = new Date()
    const fields = {
      branchId,
      downloadUrl: normalizedDownloadUrl,
      platformDownloads: normalizedPlatformDownloads,
      loaderDownloads,
      changelog: changelog || '',
      gameVersion: gameVersion || '',
      isApproved: isAutoApproved,
      isBeta,
      rejectionReason: '',
      submittedBy: currentUser.id,
      createdAt: now
    }

    // Resubmitting an unapproved/rejected version replaces it in place
    const [saved] = await db.batch([
      existingVer
        ? db.update(modVersions).set(fields).where(eq(modVersions.id, existingVer.id)).returning()
        : db.insert(modVersions).values({ id: newId(), modId: mod.id, version, ...fields }).returning(),
      db.update(mods).set({ updatedAt: now }).where(eq(mods.id, mod.id))
    ])

    if (isAutoApproved) {
      const [hydrated] = await hydrateMods(db, [mod])
      if (hydrated) {
        runInBackground(event, sendDiscordWebhook(
          event,
          hydrated as ModDto,
          { version, downloadUrl: normalizedDownloadUrl, changelog: changelog || '', gameVersion: gameVersion || '', isBeta },
          true
        ), 'Discord webhook on version update')
      }
    } else if (mod.isApproved) {
      // Versions of unapproved mods are reviewed together with the mod itself
      const branch = await findBranch(db, mod.id, branchId)
      runInBackground(event, sendAdminPendingWebhook(event, 'version', mod, `v${version} (${branch?.name ?? 'main'})`), 'Admin webhook on pending version')
    }

    const savedVersion = saved[0]!
    return {
      success: true,
      version: { ...savedVersion, _id: savedVersion.id }
    }
  } catch (error) {
    console.error('Submit version update error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to submit version update.'
    })
  }
})
