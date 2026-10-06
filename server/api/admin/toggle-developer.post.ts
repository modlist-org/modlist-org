import { eq } from 'drizzle-orm'
import { users } from '../../db/schema'
import { useDb } from '../../utils/db'
import { requireAdmin, rethrowOr500 } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  const currentUser = requireAdmin(event)

  const { targetUserId, role } = await readBody(event) // role: 'developer' | 'admin'
  if (!targetUserId || !role || !['developer', 'admin'].includes(role)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Required parameters: targetUserId and role ("developer" or "admin").'
    })
  }

  // Prevent self lockout
  if (targetUserId === currentUser.id && role === 'admin') {
    throw createError({ statusCode: 400, statusMessage: 'You cannot revoke your own administrator privileges.' })
  }

  try {
    const db = useDb(event)
    const user = await db.query.users.findFirst({ where: eq(users.id, targetUserId) })
    if (!user) {
      throw createError({ statusCode: 404, statusMessage: 'User not found.' })
    }

    let { isVerifiedDeveloper, isAdmin } = user
    if (role === 'developer') {
      isVerifiedDeveloper = !isVerifiedDeveloper
    } else {
      isAdmin = !isAdmin
    }
    // Admins are always verified developers
    if (isAdmin) isVerifiedDeveloper = true

    await db.update(users).set({ isVerifiedDeveloper, isAdmin }).where(eq(users.id, user.id))

    return {
      success: true,
      user: { id: user.id, username: user.username, isVerifiedDeveloper, isAdmin }
    }
  } catch (error) {
    rethrowOr500(error, 'Toggle role error', 'Failed to update user roles.')
  }
})
