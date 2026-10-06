import { getCookie, getHeader } from 'h3'
import { eq } from 'drizzle-orm'
import { verifyJwt } from '../utils/jwt'
import { useDb } from '../utils/db'
import { users } from '../db/schema'
import { discordAvatarUrl } from '../utils/discord'
import type { DiscordUserResponse } from '../utils/discord'

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
    } | null
  }
}

export default defineEventHandler(async (event) => {
  event.context.user = null

  if (!event.path.startsWith('/api/')) return

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
  const decoded = await verifyJwt(token, config.jwtSecret)
  if (!decoded || !decoded.id) {
    return
  }

  try {
    const db = useDb(event)
    const userObj = await db.query.users.findFirst({ where: eq(users.id, decoded.id) })
    if (!userObj) return

    // Legacy sessions carried the Discord token inside the JWT
    const accessToken = userObj.discordAccessToken || decoded.accessToken
    event.context.user = {
      id: userObj.id,
      discordId: userObj.discordId,
      username: userObj.username,
      globalName: userObj.globalName ?? undefined,
      avatar: userObj.avatar ?? undefined,
      isVerifiedDeveloper: userObj.isVerifiedDeveloper,
      isAdmin: userObj.isAdmin,
      accessToken
    }

    // Sync avatar/username from Discord in the background, at most once a day per user
    const oneDayAgo = Date.now() - 24 * 3600 * 1000
    if (accessToken && (!userObj.lastSyncedAt || userObj.lastSyncedAt.getTime() < oneDayAgo)) {
      event.waitUntil((async () => {
        try {
          const discordUser = await $fetch<DiscordUserResponse>('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
          await db.update(users).set({
            username: discordUser.username,
            globalName: discordUser.global_name || discordUser.username,
            avatar: discordAvatarUrl(discordUser),
            lastSyncedAt: new Date()
          }).where(eq(users.id, userObj.id))
        } catch (e) {
          console.error('Background Discord profile sync failed:', e)
          // Record the attempt even on failure (expired/revoked token) to avoid retrying every request
          await db.update(users).set({ lastSyncedAt: new Date() }).where(eq(users.id, userObj.id)).catch(() => {})
        }
      })())
    }
  } catch (e) {
    console.error('Auth middleware error:', e)
  }
})
