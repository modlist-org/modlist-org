import { setCookie, sendRedirect } from 'h3'
import { User } from '../../models/User'
import { signJwt } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing authorization code from Discord callback'
    })
  }

  const config = useRuntimeConfig(event)
  const clientId = config.discordClientId
  const clientSecret = config.discordClientSecret
  const redirectUri = config.discordRedirectUri
  const jwtSecret = config.jwtSecret

  try {
    // 1. Exchange code for access token
    interface DiscordTokenResponse {
      access_token: string
    }
    const tokenResponse = await $fetch<DiscordTokenResponse>('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }).toString()
    })

    const accessToken = tokenResponse.access_token

    // 2. Fetch user profile from Discord
    interface DiscordUserResponse {
      id: string
      username: string
      global_name?: string | null
      avatar?: string | null
      discriminator?: string
    }
    const discordUser = await $fetch<DiscordUserResponse>('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    // 3. Upsert user in database
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`

    // Determine admin status
    let isAdmin = false
    if (config.adminDiscordIds) {
      const adminIds = config.adminDiscordIds.split(',').map((id: string) => id.trim())
      if (adminIds.includes(discordUser.id)) {
        isAdmin = true
      }
    }

    // Fallback: If this is the absolute first user in the DB, make them Admin.
    const userCount = await User.countDocuments()
    if (userCount === 0) {
      isAdmin = true
    }

    let user = await User.findOne({ discordId: discordUser.id })
    if (!user) {
      user = new User({
        discordId: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name || discordUser.username,
        avatar: avatarUrl,
        isAdmin,
        isVerifiedDeveloper: isAdmin, // admins are auto-verified developers too
        lastSyncedAt: new Date()
      })
      await user.save()
    } else {
      // Update avatar and username if changed
      user.username = discordUser.username
      user.globalName = discordUser.global_name || discordUser.username
      user.avatar = avatarUrl
      user.lastSyncedAt = new Date()
      // Ensure admin status is updated if config changed
      if (isAdmin) {
        user.isAdmin = true
        user.isVerifiedDeveloper = true
      }
      await user.save()
    }

    // 4. Create JWT session token
    const tokenPayload = {
      id: user._id.toString(),
      discordId: user.discordId,
      username: user.username,
      accessToken: accessToken
    }
    const token = signJwt(tokenPayload, jwtSecret)

    // 5. Set session cookie
    setCookie(event, 'token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600 // 7 days
    })

    // 6. Redirect back to homepage
    return sendRedirect(event, '/')
  } catch (error) {
    console.error('Discord login callback error:', error)
    const err = error as { message?: string }
    throw createError({
      statusCode: 500,
      statusMessage: `Authentication failed: ${err.message || String(error)}`
    })
  }
})
