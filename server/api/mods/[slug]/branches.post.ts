import { eq } from 'drizzle-orm'
import { mods, modBranches } from '../../../db/schema'
import { newId } from '../../../utils/db'
import { requireManagedMod, validateBranchName } from '../../../utils/branch'

// Branches are created without review; versions inside them still go through the normal approval flow
export default defineEventHandler(async (event) => {
  const { db, mod } = await requireManagedMod(event)
  const body = await readBody(event)
  const { name, count } = await validateBranchName(db, mod, body?.name)
  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 300) : ''

  const now = new Date()
  const [[branch]] = await db.batch([
    db.insert(modBranches).values({ id: newId(), modId: mod.id, name, description, position: count, createdAt: now }).returning(),
    db.update(mods).set({ updatedAt: now }).where(eq(mods.id, mod.id))
  ])
  return { success: true, branch: { ...branch!, _id: branch!.id } }
})
