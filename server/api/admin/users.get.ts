import { User } from '../../models/User'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user

  if (!currentUser || !currentUser.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Administrator privileges required.'
    })
  }

  const query = getQuery(event)
  const search = query.search as string
  const filter: Record<string, unknown> = {}

  if (search && search.trim().length > 0) {
    const searchRegex = { $regex: search, $options: 'i' }
    filter.$or = [
      { username: searchRegex },
      { globalName: searchRegex },
      { discordId: searchRegex }
    ]
  }

  // Pagination parameters
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(query.limit as string) || 20))

  try {
    const total = await User.countDocuments(filter)
    const totalPages = Math.ceil(total / limit)

    const users = await User.find(filter)
      .sort({ username: 1 })
      .skip((page - 1) * limit)
      .limit(limit)

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    }
  } catch (error) {
    console.error('Fetch users error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve users list.'
    })
  }
})
