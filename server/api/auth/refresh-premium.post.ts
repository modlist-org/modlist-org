import { checkUserPremium } from '../../utils/premium'
import { User } from '../../models/User'
import { getCookie } from 'h3'
import { verifyJwt } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'token')
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - No token cookie found'
    })
  }

  const config = useRuntimeConfig(event)
  const decoded = verifyJwt(token, config.jwtSecret)
  if (!decoded || !decoded.id || !decoded.accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Invalid session'
    })
  }

  const userObj = await User.findById(decoded.id)
  if (!userObj) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  console.log(`[Premium Check] Initiating manual premium status refresh for user: ${userObj.username} (${userObj.discordId})`)

  try {
    // 1. Fetch guild member directly from Discord using User's OAuth Access Token
    const guildId = config.discordGuildId
    const premiumRoleId = config.discordPremiumRoleId

    console.log(`[Premium Check] Checking Guild ID: ${guildId}, Premium Role ID: ${premiumRoleId}`)

    let memberData: any = null
    try {
      memberData = await $fetch<any>(
        `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
        {
          headers: {
            Authorization: `Bearer ${decoded.accessToken}`
          }
        }
      )
      console.log(`[Premium Check] Discord Member roles returned:`, memberData?.roles)
    } catch (apiError: any) {
      console.error(`[Premium Check] Failed to fetch member from Discord API:`, apiError?.data || apiError?.message || apiError)
      throw createError({
        statusCode: 502,
        statusMessage: `Failed to fetch Discord server member data: ${apiError?.message || 'Check if you are in the Discord server.'}`
      })
    }

    const isPremium = Array.isArray(memberData?.roles) && memberData.roles.includes(premiumRoleId)
    console.log(`[Premium Check] Result: isPremium = ${isPremium}`)

    // 2. Update DB
    await User.updateOne(
      { _id: userObj._id },
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
      roles: memberData?.roles || []
    }
  } catch (error: any) {
    console.error(`[Premium Check] Error refreshing premium status:`, error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || String(error)
    })
  }
})
