import { or, sql } from 'drizzle-orm'
import { users } from '../../db/schema'
import { useDb, likePattern } from '../../utils/db'

export default defineEventHandler(async (event) => {
  // Require login to search users
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const query = getQuery(event)
  const q = query.q as string

  if (typeof q !== 'string' || q.trim().length === 0) {
    return { users: [] }
  }

  try {
    const pattern = likePattern(q.trim())
    const rows = await useDb(event)
      .select({ _id: users.id, username: users.username, globalName: users.globalName, avatar: users.avatar })
      .from(users)
      .where(or(
        sql`${users.username} like ${pattern} escape '\\'`,
        sql`${users.globalName} like ${pattern} escape '\\'`
      ))
      .limit(10)

    return { users: rows }
  } catch (error) {
    console.error('User search error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to search users'
    })
  }
})
