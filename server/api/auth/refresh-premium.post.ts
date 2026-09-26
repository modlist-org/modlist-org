import { User } from '../../models/User'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser || !currentUser.accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Invalid session'
    })
  }

  const config = useRuntimeConfig(event)
  const guildId = config.discordGuildId
  const premiumRoleId = config.discordPremiumRoleId

  let memberData: { roles?: string[] } | null = null
  try {
    memberData = await $fetch<{ roles?: string[] }>(
      `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
      {
        headers: {
          Authorization: `Bearer ${currentUser.accessToken}`
        }
      }
    )
  } catch (apiError) {
    const err = apiError as { data?: unknown; message?: string }
    console.error('[Premium Check] Failed to fetch member from Discord API:', err?.data || err?.message || apiError)
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to fetch Discord server member data. Check if you are in the Discord server.'
    })
  }

  const roles = Array.isArray(memberData?.roles) ? memberData.roles : []
  const isPremium = roles.includes(premiumRoleId)

  await User.updateOne(
    { _id: currentUser.id },
    {
      $set: {
        isPremium,
        premiumLastCheckedAt: new Date()
      }
    }
  )

  return {
    success: true,
    isPremium,
    roles
  }
})
