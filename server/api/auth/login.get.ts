import { sendRedirect } from 'h3'

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

  const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=identify`

  return sendRedirect(event, oauthUrl)
})
