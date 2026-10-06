import { sendRedirect, setCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const clientId = config.discordClientId
  const redirectUri = config.discordRedirectUri

  if (!clientId || !redirectUri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Discord OAuth credentials are not configured in runtimeConfig.'
    })
  }

  const stateBytes = crypto.getRandomValues(new Uint8Array(16))
  const state = Array.from(stateBytes, (b) => b.toString(16).padStart(2, '0')).join('')
  setCookie(event, 'oauth_state', state, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 600
  })

  const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=identify&state=${state}`

  return sendRedirect(event, oauthUrl)
})
