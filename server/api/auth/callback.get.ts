import { setCookie, sendRedirect, getCookie, deleteCookie } from 'h3'
import { eq } from 'drizzle-orm'
import { signJwt } from '../../utils/jwt'
import { useDb, newId } from '../../utils/db'
import { users } from '../../db/schema'
import { discordAvatarUrl } from '../../utils/discord'
import type { DiscordUserResponse } from '../../utils/discord'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const state = query.state
  const expectedState = getCookie(event, 'oauth_state')
  deleteCookie(event, 'oauth_state', { path: '/api/auth' })

  if (typeof state !== 'string' || !expectedState || state !== expectedState) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid OAuth state. Please try logging in again.'
    })
  }

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing authorization code from Discord callback'
    })
  }

  const config = useRuntimeConfig(event)
  const db = useDb(event)

  try {
    // 1. Exchange code for access token
    const tokenResponse = await $fetch<{ access_token: string }>('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: config.discordClientId,
        client_secret: config.discordClientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.discordRedirectUri
      }).toString()
    })

    const accessToken = tokenResponse.access_token

    // 2. Fetch user profile from Discord
    const discordUser = await $fetch<DiscordUserResponse>('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    // 3. Upsert user in database
    const adminIds = (config.adminDiscordIds || '').split(',').map((id: string) => id.trim()).filter(Boolean)
    const isAdmin = adminIds.includes(discordUser.id)

    const profile = {
      username: discordUser.username,
      globalName: discordUser.global_name || discordUser.username,
      avatar: discordAvatarUrl(discordUser),
      lastSyncedAt: new Date(),
      discordAccessToken: accessToken
    }

    let user = await db.query.users.findFirst({ where: eq(users.discordId, discordUser.id) })
    if (!user) {
      ;[user] = await db.insert(users).values({
        id: newId(),
        discordId: discordUser.id,
        ...profile,
        isAdmin,
        isVerifiedDeveloper: isAdmin, // admins are auto-verified developers too
        createdAt: new Date()
      }).returning()
    } else {
      ;[user] = await db.update(users).set({
        ...profile,
        // Ensure admin status is updated if config changed
        ...(isAdmin ? { isAdmin: true, isVerifiedDeveloper: true } : {})
      }).where(eq(users.id, user.id)).returning()
    }

    if (!user) throw new Error('User upsert failed')

    // 4. Create JWT session token
    const token = await signJwt({
      id: user.id,
      discordId: user.discordId,
      username: user.username
    }, config.jwtSecret)

    // 5. Set session cookie
    setCookie(event, 'token', token, {
      httpOnly: true,
      secure: !import.meta.dev,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600 // 7 days
    })

    // 6. Redirect back to homepage
    return sendRedirect(event, '/')
  } catch (error) {
    console.error('Discord login callback error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Authentication failed.'
    })
  }
})
