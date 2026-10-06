import { asc, count, or, sql } from 'drizzle-orm'
import { users } from '../../db/schema'
import { useDb, likePattern } from '../../utils/db'
import { requireAdmin, rethrowOr500 } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const search = query.search as string

  const where = typeof search === 'string' && search.trim().length > 0
    ? (() => {
        const pattern = likePattern(search.trim())
        return or(
          sql`${users.username} like ${pattern} escape '\\'`,
          sql`${users.globalName} like ${pattern} escape '\\'`,
          sql`${users.discordId} like ${pattern} escape '\\'`
        )
      })()
    : undefined

  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(query.limit as string) || 20))

  try {
    const db = useDb(event)
    const [totalRow] = await db.select({ total: count() }).from(users).where(where)
    const total = totalRow?.total ?? 0

    const rows = await db.select().from(users).where(where)
      .orderBy(asc(users.username))
      .limit(limit)
      .offset((page - 1) * limit)

    return {
      users: rows.map(({ discordAccessToken: _, id, ...user }) => ({ _id: id, ...user })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    }
  } catch (error) {
    rethrowOr500(error, 'Fetch users error', 'Failed to retrieve users list.')
  }
})
