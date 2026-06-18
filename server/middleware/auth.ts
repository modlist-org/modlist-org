import { getCookie, getHeader } from 'h3'
import { verifyJwt } from '../utils/jwt'
import { User } from '../models/User'
import { checkUserPremium } from '../utils/premium'

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
      accessToken?: string
      isPremium?: boolean
      premiumSavingUsedBytes?: number
    } | null
  }
}

export default defineEventHandler(async (event) => {
  event.context.user = null

  let token = getCookie(event, 'token')
  if (!token) {
    const authHeader = getHeader(event, 'authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

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
        isAdmin: userObj.isAdmin,
        accessToken: decoded.accessToken,
        isPremium: userObj.isPremium || false,
        premiumSavingUsedBytes: userObj.premiumSavingUsedBytes || 0
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

      // Automatically sync premium status from Discord in background (once every 6 hours)
      const checkPremiumInterval = 6 * 3600 * 1000
      const lastPremiumChecked = userObj.premiumLastCheckedAt
      if (decoded.accessToken && (!lastPremiumChecked || (Date.now() - new Date(lastPremiumChecked).getTime()) > checkPremiumInterval)) {
        const premiumPromise = (async () => {
          try {
            const isPremium = await checkUserPremium(event, userObj._id.toString(), userObj.discordId, decoded.accessToken || '')
            await User.updateOne(
              { _id: userObj._id },
              {
                $set: {
                  isPremium,
                  premiumLastCheckedAt: new Date()
                }
              }
            )
          } catch (e) {
            console.error('Background Discord premium check failed:', e)
            await User.updateOne(
              { _id: userObj._id },
              { $set: { premiumLastCheckedAt: new Date() } }
            ).catch(() => {})
          }
        })()

        if (typeof event.waitUntil === 'function') {
          event.waitUntil(premiumPromise)
        }
      }
    }
  } catch {
    // Ignore error, fallback to null
  }
})
