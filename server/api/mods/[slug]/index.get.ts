import { Mod } from '../../../models/Mod'
import type { IMod } from '../../../models/Mod'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { User } from '../../../models/User'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const currentUser = event.context.user

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug parameter.'
    })
  }

  try {
    const mod = await Mod.findOne({ slug })
      .populate('authorId', 'username globalName avatar isVerifiedDeveloper')
      .populate('collaboratorIds', 'username globalName avatar isVerifiedDeveloper')
      .populate('pendingCollaboratorIds', 'username globalName avatar isVerifiedDeveloper')
      .populate('versions.submittedBy', 'username globalName avatar isVerifiedDeveloper')

    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    const modObj = mod.toObject() as unknown as Omit<IMod, 'authorId' | 'collaboratorIds' | 'pendingCollaboratorIds' | 'versions'> & {
      authorId: { _id: { toString(): string }; username: string; globalName?: string; avatar?: string; isVerifiedDeveloper: boolean }
      collaboratorIds: { _id: { toString(): string }; username: string; globalName?: string; avatar?: string; isVerifiedDeveloper: boolean }[]
      pendingCollaboratorIds: { _id: { toString(): string }; username: string; globalName?: string; avatar?: string; isVerifiedDeveloper: boolean }[]
      versions: { isApproved: boolean; isBeta?: boolean; createdAt: Date | string; version: string; downloadUrl?: string; changelog: string; submittedBy?: { username: string; globalName?: string; avatar?: string; isVerifiedDeveloper: boolean } }[]
    }
    const isOwnerOrAdmin = currentUser && (
      currentUser.isAdmin ||
      modObj.authorId._id.toString() === currentUser.id ||
      modObj.collaboratorIds.some((c: { _id: { toString(): string } }) => c._id.toString() === currentUser.id)
    )

    // If mod is not approved, only owners and admin can see it
    if (!mod.isApproved && !isOwnerOrAdmin) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    // Filter versions
    if (!isOwnerOrAdmin) {
      modObj.versions = modObj.versions.filter((v: { isApproved: boolean }) => v.isApproved)
    }

    // Sort versions by date descending
    modObj.versions.sort(
      (a: { createdAt: Date | string }, b: { createdAt: Date | string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Compute latest versions
    const approvedVersions = modObj.versions.filter((v: { isApproved: boolean }) => v.isApproved)
    const latestVersion = approvedVersions.find((v: { isBeta?: boolean }) => !v.isBeta) || null
    const latestBeta = approvedVersions.find((v: { isBeta?: boolean }) => v.isBeta) || null

    let latestBetaVersion = null
    if (latestBeta) {
      if (!latestVersion || new Date(latestBeta.createdAt).getTime() > new Date(latestVersion.createdAt).getTime()) {
        latestBetaVersion = latestBeta
      }
    }

    if (!isOwnerOrAdmin) {
      delete modObj.pendingEdit
    }

    // Strip downloadUrl from all versions for safety & size
    const cleanVersions = modObj.versions.map((v) => {
      const { downloadUrl: _, ...rest } = v
      return rest
    })
    modObj.versions = cleanVersions

    let cleanLatest = null
    if (latestVersion) {
      const { downloadUrl: _, ...rest } = latestVersion
      cleanLatest = rest
    }

    let cleanLatestBeta = null
    if (latestBetaVersion) {
      const { downloadUrl: _, ...rest } = latestBetaVersion
      cleanLatestBeta = rest
    }

    return {
      mod: modObj,
      latestVersion: cleanLatest,
      latestBetaVersion: cleanLatestBeta,
      isEditable: !!isOwnerOrAdmin
    }
  } catch (error) {
    console.error('Fetch mod details error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve mod details'
    })
  }
})
