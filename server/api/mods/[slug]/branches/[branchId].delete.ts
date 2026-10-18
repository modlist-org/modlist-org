import { and, eq } from 'drizzle-orm'
import { mods, modBranches, modVersions } from '../../../../db/schema'
import { requireManagedMod } from '../../../../utils/branch'
import { findBranch } from '../../../../utils/mod-repo'

export default defineEventHandler(async (event) => {
  const { db, mod, currentUser } = await requireManagedMod(event)
  const branchId = getRouterParam(event, 'branchId') ?? ''
  const branch = await findBranch(db, mod.id, branchId)
  if (!branch) {
    throw createError({ statusCode: 404, statusMessage: 'Branch not found.' })
  }
  if (branch.id === mod.defaultBranchId) {
    throw createError({ statusCode: 400, statusMessage: 'The default branch cannot be deleted. Make another branch the default first.' })
  }

  // Same rule as single versions: only admins can delete approved releases
  const approved = await db.query.modVersions.findFirst({
    where: and(eq(modVersions.branchId, branch.id), eq(modVersions.isApproved, true))
  })
  if (approved && !currentUser.isAdmin) {
    throw createError({ statusCode: 400, statusMessage: 'Branches with approved versions can only be deleted by an administrator.' })
  }

  await db.batch([
    db.delete(modVersions).where(eq(modVersions.branchId, branch.id)),
    db.delete(modBranches).where(eq(modBranches.id, branch.id)),
    db.update(mods).set({
      updatedAt: new Date(),
      ...(mod.betaBranchId === branch.id ? { betaBranchId: null } : {})
    }).where(eq(mods.id, mod.id))
  ])
  return { success: true }
})
