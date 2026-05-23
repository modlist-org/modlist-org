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

  try {
    const users = await User.find(filter)
      .sort({ username: 1 })
      .limit(100) // Caps user lists to 100 for safety

    return { users }
  } catch (error) {
    console.error('Fetch users error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve users list.'
    })
  }
})
