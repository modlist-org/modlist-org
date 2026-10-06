import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { mods, modVersions } from '../../db/schema'
import { useDb } from '../../utils/db'
import { requireAdmin, rethrowOr500 } from '../../utils/admin'
import { byNewest, hydrateMods } from '../../utils/mod-repo'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  try {
    const db = useDb(event)

    const pendingVersionModIds = db.selectDistinct({ id: modVersions.modId }).from(modVersions)
      .where(and(eq(modVersions.isApproved, false), eq(modVersions.rejectionReason, '')))

    const [pendingModRows, versionModRows, pendingEditRows] = await Promise.all([
      // 1. Unapproved mods that haven't been rejected
      db.select().from(mods)
        .where(and(eq(mods.isApproved, false), eq(mods.rejectionReason, '')))
        .orderBy(desc(mods.createdAt)),
      // 2. Approved mods with versions awaiting review
      db.select().from(mods)
        .where(and(eq(mods.isApproved, true), inArray(mods.id, pendingVersionModIds))),
      // 3. Mods with staged metadata edits
      db.select().from(mods)
        .where(and(isNotNull(mods.pendingEdit), sql`${mods.pendingEdit} != 'null'`))
        .orderBy(desc(mods.updatedAt))
    ])

    const [pendingMods, versionMods, pendingEdits] = await Promise.all([
      hydrateMods(db, pendingModRows),
      hydrateMods(db, versionModRows),
      hydrateMods(db, pendingEditRows)
    ])

    const pendingVersions = versionMods.flatMap((mod) => mod.versions
      .filter((ver) => !ver.isApproved && !ver.rejectionReason)
      .map((ver) => ({
        modId: mod._id,
        modName: mod.name,
        modSlug: mod.slug,
        game: mod.game,
        games: mod.games,
        versionId: ver._id,
        version: ver.version,
        downloadUrl: ver.downloadUrl,
        changelog: ver.changelog,
        submittedBy: ver.submittedBy,
        createdAt: ver.createdAt
      }))
    ).sort(byNewest)

    return {
      pendingMods,
      pendingVersions,
      pendingEdits
    }
  } catch (error) {
    rethrowOr500(error, 'Fetch pending submissions error', 'Failed to retrieve pending submissions')
  }
})
