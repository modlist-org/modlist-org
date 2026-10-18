import { eq } from 'drizzle-orm'
import { mods, modBranches, modVersions } from '../../../../db/schema'
import { requireManagedMod, validateBranchName } from '../../../../utils/branch'
import { findBranch } from '../../../../utils/mod-repo'

// Rename a branch, or make it the mod's default / default beta branch
export default defineEventHandler(async (event) => {
  const { db, mod } = await requireManagedMod(event)
  const branchId = getRouterParam(event, 'branchId') ?? ''
  const branch = await findBranch(db, mod.id, branchId)
  if (!branch) {
    throw createError({ statusCode: 404, statusMessage: 'Branch not found.' })
  }

  const body = await readBody(event) ?? {}
  const branchUpdates: Partial<typeof modBranches.$inferInsert> = {}
  if (body.name !== undefined) branchUpdates.name = (await validateBranchName(db, mod, body.name, branch.id)).name
  if (typeof body.description === 'string') branchUpdates.description = body.description.trim().slice(0, 300)

  const modUpdates: Partial<typeof mods.$inferInsert> = {}
  if (body.isDefault === true) {
    modUpdates.defaultBranchId = branch.id
    if (mod.betaBranchId === branch.id) modUpdates.betaBranchId = null
  }
  if (body.isBeta === true && mod.defaultBranchId !== branch.id && body.isDefault !== true) modUpdates.betaBranchId = branch.id
  if (body.isBeta === false && mod.betaBranchId === branch.id) modUpdates.betaBranchId = null

  const statements: Parameters<typeof db.batch>[0][number][] = []
  if (Object.keys(branchUpdates).length > 0) statements.push(db.update(modBranches).set(branchUpdates).where(eq(modBranches.id, branch.id)))
  if (modUpdates.betaBranchId !== undefined) {
    // Keep the legacy isBeta column in step with the beta branch for older readers
    statements.push(db.update(modVersions).set({ isBeta: false }).where(eq(modVersions.modId, mod.id)))
    if (modUpdates.betaBranchId) statements.push(db.update(modVersions).set({ isBeta: true }).where(eq(modVersions.branchId, modUpdates.betaBranchId)))
  }
  await db.batch([
    db.update(mods).set({ ...modUpdates, updatedAt: new Date() }).where(eq(mods.id, mod.id)),
    ...statements
  ])
  return { success: true }
})
