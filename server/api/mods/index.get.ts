import { and, asc, count, desc, eq, exists, inArray, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { mods, modCollaborators, CATEGORIES, GAMES } from '../../db/schema'
import { useDb, likePattern } from '../../utils/db'
import { hydrateMods, stripDownloadUrls } from '../../utils/mod-repo'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const game = query.game as string
  const categories = query.categories as string
  const search = query.search as string
  const slugs = query.slugs as string
  const currentUser = event.context.user
  const db = useDb(event)

  const conditions: SQL[] = []

  if (slugs) {
    const slugList = slugs.split(',').filter(Boolean).slice(0, 90)
    if (slugList.length > 0) conditions.push(inArray(mods.slug, slugList))
  }

  if (game && game !== 'all') {
    const validGames = game.split(',').filter((g): g is typeof GAMES[number] => (GAMES as readonly string[]).includes(g))
    if (validGames.length > 0) conditions.push(inArray(mods.game, validGames))
  }

  if (categories && categories !== 'all') {
    const validCats = categories.split(',').filter((c) => (CATEGORIES as readonly string[]).includes(c))
    if (validCats.length > 0) {
      conditions.push(sql`exists (select 1 from json_each(${mods.categories}) where json_each.value in (${sql.join(validCats.map((c) => sql`${c}`), sql`, `)}))`)
    }
  }

  if (typeof search === 'string' && search.trim().length > 0) {
    const pattern = likePattern(search.trim())
    conditions.push(or(
      sql`${mods.name} like ${pattern} escape '\\'`,
      sql`${mods.summary} like ${pattern} escape '\\'`,
      sql`${mods.slug} like ${pattern} escape '\\'`
    )!)
  }

  if (query.pending === 'true') {
    if (!currentUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'You must be logged in to view pending mods.'
      })
    }
    conditions.push(eq(mods.isApproved, false))
    conditions.push(or(
      eq(mods.authorId, currentUser.id),
      exists(db.select({ one: sql`1` }).from(modCollaborators).where(and(
        eq(modCollaborators.modId, mods.id),
        eq(modCollaborators.userId, currentUser.id),
        eq(modCollaborators.status, 'accepted')
      )))
    )!)
  } else {
    conditions.push(eq(mods.isApproved, true))
  }

  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(query.limit as string) || 12))

  const sortBy = query.sortBy as string || 'downloads_desc'
  const orderBy: SQL[] = [desc(mods.isFeatured)]
  if (sortBy === 'downloads_desc' || sortBy === 'downloads') {
    orderBy.push(desc(mods.downloads))
  } else if (sortBy === 'downloads_asc') {
    orderBy.push(asc(mods.downloads))
  } else if (sortBy === 'name_asc') {
    orderBy.push(sql`${mods.name} collate nocase asc`)
  } else if (sortBy === 'name_desc') {
    orderBy.push(sql`${mods.name} collate nocase desc`)
  } else if (sortBy === 'created') {
    orderBy.push(desc(mods.createdAt))
  } else {
    orderBy.push(desc(mods.updatedAt))
  }
  orderBy.push(asc(mods.id))

  try {
    const where = and(...conditions)
    const [totalRow] = await db.select({ total: count() }).from(mods).where(where)
    const total = totalRow?.total ?? 0

    const rows = await db.select().from(mods).where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset((page - 1) * limit)

    const hydrated = await hydrateMods(db, rows)

    const sanitizedMods = hydrated.map((mod) => {
      const isOwnerOrAdmin = currentUser && (
        currentUser.isAdmin ||
        mod.authorId?._id === currentUser.id ||
        mod.collaboratorIds.some((c) => c._id === currentUser.id)
      )

      // Only owners/admins see unapproved versions
      const visibleVersions = isOwnerOrAdmin ? mod.versions : mod.versions.filter((v) => v.isApproved)
      const latestVersion = visibleVersions.find((v) => !v.isBeta) || visibleVersions[0] || null

      return {
        ...mod,
        pendingEdit: isOwnerOrAdmin ? mod.pendingEdit : undefined,
        versions: visibleVersions.map(stripDownloadUrls),
        latestVersion: latestVersion ? stripDownloadUrls(latestVersion) : null
      }
    })

    return {
      mods: sanitizedMods,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error('Fetch mods error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve mods'
    })
  }
})
