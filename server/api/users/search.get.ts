import { User } from '../../models/User'

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

  if (!q || q.trim().length === 0) {
    return { users: [] }
  }

  try {
    // Search by username or globalName (case-insensitive)
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { globalName: { $regex: q, $options: 'i' } }
      ]
    })
      .limit(10)
      .select('_id username globalName avatar')

    return { users }
  } catch (error) {
    console.error('User search error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to search users'
    })
  }
})
