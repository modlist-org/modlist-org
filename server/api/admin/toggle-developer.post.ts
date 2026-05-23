import { User } from '../../models/User'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user

  if (!currentUser || !currentUser.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Administrator privileges required.'
    })
  }

  const body = await readBody(event)
  const { targetUserId, role } = body // role can be 'developer' or 'admin'

  if (!targetUserId || !role || !['developer', 'admin'].includes(role)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Required parameters: targetUserId and role ("developer" or "admin").'
    })
  }

  // Prevent self lockout
  if (targetUserId === currentUser.id && role === 'admin') {
    throw createError({
      statusCode: 400,
      statusMessage: 'You cannot revoke your own administrator privileges.'
    })
  }

  try {
    const user = await User.findById(targetUserId)
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found.'
      })
    }

    if (role === 'developer') {
      user.isVerifiedDeveloper = !user.isVerifiedDeveloper
      // Admins should always remain verified developers
      if (user.isAdmin) {
        user.isVerifiedDeveloper = true
      }
    } else if (role === 'admin') {
      user.isAdmin = !user.isAdmin
      // If someone becomes admin, also make them a verified developer
      if (user.isAdmin) {
        user.isVerifiedDeveloper = true
      }
    }

    await user.save()

    return {
      success: true,
      user: {
        id: user._id,
        username: user.username,
        isVerifiedDeveloper: user.isVerifiedDeveloper,
        isAdmin: user.isAdmin
      }
    }
  } catch (error) {
    console.error('Toggle role error:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update user roles: ${err.message || String(error)}`
    })
  }
})
