import type { H3Event } from 'h3'

interface DiscordMemberResponse {
  roles: string[]
}

// In-memory cache for premium check results (cache for 5 minutes)
const premiumCache = new Map<string, { isPremium: boolean; cachedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function checkUserPremium(event: H3Event, userId: string, discordId: string, accessToken: string): Promise<boolean> {
  const config = useRuntimeConfig(event)
  const guildId = config.discordGuildId
  const premiumRoleId = config.discordPremiumRoleId

  if (!guildId || !premiumRoleId) {
    // Premium features are disabled if not configured.
    return false
  }

  // 1. Check cache
  const cached = premiumCache.get(userId)
  const now = Date.now()
  if (cached && (now - cached.cachedAt) < CACHE_TTL_MS) {
    return cached.isPremium
  }

  try {
    // 2. Fetch guild member directly from Discord using User's OAuth Access Token
    const memberData = await $fetch<DiscordMemberResponse>(
      `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    )

    const isPremium = Array.isArray(memberData?.roles) && memberData.roles.includes(premiumRoleId)

    // 3. Cache the result
    premiumCache.set(userId, { isPremium, cachedAt: now })
    return isPremium
  } catch (error) {
    console.error(`Error checking Discord premium status for user ${userId} (${discordId}):`, error)
    
    // On API failure (e.g. rate limit or token expiry), fallback to expired cache if available.
    if (cached) {
      return cached.isPremium
    }
    return false
  }
}
