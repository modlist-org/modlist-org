import { getCookie } from 'h3'
import { verifyJwt } from '../utils/jwt'
import { User } from '../models/User'

declare module 'h3' {
  interface H3EventContext {
    user: {
      id: string
      discordId: string
      username: string
      globalName?: string
      avatar?: string
      isVerifiedDeveloper: boolean
      isAdmin: boolean
    } | null
  }
}

export default defineEventHandler(async (event) => {
  event.context.user = null

  const token = getCookie(event, 'token')
  if (!token) {
    return
  }

  const config = useRuntimeConfig(event)
  const decoded = verifyJwt(token, config.jwtSecret)
  if (!decoded || !decoded.id) {
    return
  }

  try {
    const userObj = await User.findById(decoded.id)
    if (userObj) {
      event.context.user = {
        id: userObj._id.toString(),
        discordId: userObj.discordId,
        username: userObj.username,
        globalName: userObj.globalName,
        avatar: userObj.avatar,
        isVerifiedDeveloper: userObj.isVerifiedDeveloper,
        isAdmin: userObj.isAdmin
      }

      // Automatically sync profile (avatar, username) from Discord in background
      // Throttle to run at most once every 24 hours per user
      const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000)
      if (decoded.accessToken && (!userObj.lastSyncedAt || userObj.lastSyncedAt < oneDayAgo)) {
        const syncPromise = (async () => {
          try {
            interface DiscordUserResponse {
              id: string
              username: string
              global_name?: string | null
              avatar?: string | null
              discriminator?: string
            }
            const discordUser = await $fetch<DiscordUserResponse>('https://discord.com/api/users/@me', {
              headers: {
                Authorization: `Bearer ${decoded.accessToken}`
              }
            })

            const avatarUrl = discordUser.avatar
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
              : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`

            await User.updateOne(
              { _id: userObj._id },
              {
                $set: {
                  username: discordUser.username,
                  globalName: discordUser.global_name || discordUser.username,
                  avatar: avatarUrl,
                  lastSyncedAt: new Date()
                }
              }
            )
          } catch (e) {
            console.error('Background Discord profile sync failed:', e)
            // Save lastSyncedAt even on error (e.g. token expired/revoked) to prevent constant retries
            await User.updateOne(
              { _id: userObj._id },
              { $set: { lastSyncedAt: new Date() } }
            ).catch(() => {})
          }
        })()

        // Nitro/H3 context helper to run async tasks in background without blocking response
        if (typeof event.waitUntil === 'function') {
          event.waitUntil(syncPromise)
        }
      }
    }
  } catch {
    // Ignore error, fallback to null
  }
})
