import type { H3Event } from 'h3'

export function requireAdmin(event: H3Event) {
  const currentUser = event.context.user
  if (!currentUser || !currentUser.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Administrator privileges required.'
    })
  }
  return currentUser
}

export function rethrowOr500(error: unknown, label: string, message: string): never {
  console.error(`${label}:`, error)
  const err = error as { statusCode?: number }
  if (err.statusCode) throw error
  throw createError({ statusCode: 500, statusMessage: message })
}
