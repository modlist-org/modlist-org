export default defineEventHandler((event) => {
  const user = event.context.user
  if (!user) return { user: null }
  // Never expose the Discord OAuth token to the client
  const { accessToken: _, ...safeUser } = user
  return { user: safeUser }
})
