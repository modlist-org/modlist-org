import { signJwt } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to generate an integration token.'
    })
  }

  const config = useRuntimeConfig(event)
  const jwtSecret = config.jwtSecret

  try {
    const tokenPayload = {
      id: currentUser.id,
      discordId: currentUser.discordId,
      username: currentUser.username,
      accessToken: currentUser.accessToken
    }

    // 1 Year expiry for desktop convenience
    const expiresInSeconds = 365 * 24 * 3600
    const token = signJwt(tokenPayload, jwtSecret, expiresInSeconds)

    return {
      success: true,
      token
    }
  } catch (error) {
    console.error('Generate integration token error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate integration token.'
    })
  }
})
