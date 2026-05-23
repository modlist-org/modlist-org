interface WebhookMod {
  name: string
  slug: string
  game: string
  categories: string[]
  summary: string
  sourceUrl?: string
  authorId?: {
    username: string
    globalName?: string
    avatar?: string
  }
  versions?: {
    version: string
    downloadUrl: string
    changelog?: string
    gameVersion?: string
  }[]
}

interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

interface DiscordEmbed {
  title?: string
  url?: string
  description?: string
  color?: number
  timestamp?: string
  fields: DiscordEmbedField[]
  author?: {
    name: string
    icon_url?: string
  }
  footer?: {
    text: string
  }
}

export async function sendDiscordWebhook(
  mod: WebhookMod,
  specificVersion?: { version: string; downloadUrl: string; changelog?: string; gameVersion?: string; isBeta?: boolean },
  isUpdate: boolean = false
) {
  const config = useRuntimeConfig()
  const webhookUrl = config.discordWebhookUrl
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL is not set. Skipping Discord notification.')
    return
  }

  // Get App Base URL from environment or default to localhost
  const baseUrl = config.appBaseUrl || 'http://localhost:3000'
  const modUrl = `${baseUrl}/mods/${mod.slug}`

  // Format Game Name
  const gameName = mod.game === 'adofai'
    ? 'A Dance of Fire and Ice'
    : mod.game === 'rhythm-doctor'
      ? 'Rhythm Doctor'
      : mod.game

  // Format Categories
  const categoryNames = Array.isArray(mod.categories)
    ? mod.categories.map((cat: string) => {
      const labels: Record<string, string> = {
        ui: 'UI',
        gameplay: 'Gameplay',
        utility: 'Utility',
        visuals: 'Visuals',
        library: 'Library'
      }
      return labels[cat] || cat
    }).join(', ')
    : ''

  // Get Author Info
  let authorName = 'Unknown'
  let authorIconUrl = ''
  if (mod.authorId) {
    authorName = mod.authorId.globalName || mod.authorId.username || 'Unknown'
    if (mod.authorId.avatar) {
      authorIconUrl = mod.authorId.avatar
    }
  }

  // Get Version Info
  const latestVerObj = specificVersion || mod.versions?.[0]
  const versionStr = latestVerObj?.version || '1.0.0'
  const downloadUrl = latestVerObj?.downloadUrl || ''
  const changelogText = latestVerObj?.changelog || ''
  const gameVersionStr = latestVerObj?.gameVersion || ''
  const isBeta = (latestVerObj as { isBeta?: boolean })?.isBeta || false

  // Determine Title and Color
  let embedTitle = isUpdate ? `🚀 Mod Updated: ${mod.name}` : `🆕 New Mod: ${mod.name}`
  let embedColor = isUpdate ? 6276001 : 7108863 // #5fc391 (greenish) for update, #6c78ff for new

  if (isBeta) {
    embedTitle = isUpdate ? `🧪 Beta Update: ${mod.name}` : `🧪 New Beta Mod: ${mod.name}`
    embedColor = 15773006 // #f0ad4e (amber/orange) for beta
  }

  // Build Discord Embed
  const embed: DiscordEmbed = {
    title: embedTitle,
    url: modUrl,
    description: mod.summary,
    color: embedColor,
    timestamp: new Date().toISOString(),
    fields: [
      {
        name: '🎮 Game',
        value: gameName,
        inline: true
      },
      {
        name: '🏷️ Categories',
        value: categoryNames || 'None',
        inline: true
      },
      {
        name: '📦 Version',
        value: gameVersionStr ? `v${versionStr} (for ${gameVersionStr})` : `v${versionStr}`,
        inline: true
      }
    ],
    author: {
      name: isUpdate ? `Updated by ${authorName}` : `Submitted by ${authorName}`,
      icon_url: authorIconUrl || undefined
    },
    footer: {
      text: 'modlist.org'
    }
  }

  // Add optional source link
  if (mod.sourceUrl) {
    embed.fields.push({
      name: '🔗 Source Code',
      value: `[Repository Link](${mod.sourceUrl})`,
      inline: false
    })
  }

  // Add download link if available
  if (downloadUrl) {
    embed.fields.push({
      name: '📥 Download Link',
      value: `[Direct Download](${downloadUrl})`,
      inline: false
    })
  }

  // Add optional changelog for updates
  if (isUpdate && changelogText) {
    const truncatedChangelog = changelogText.length > 800
      ? changelogText.slice(0, 800) + '\n\n*(Truncated due to length)*'
      : changelogText

    embed.fields.push({
      name: '📝 Changelog',
      value: truncatedChangelog,
      inline: false
    })
  }

  const pingRoleId = isBeta ? config.discordModAllRoleId : config.discordModPingRoleId
  const content = pingRoleId ? `<@&${pingRoleId}>` : undefined

  try {
    const payload = {
      content,
      embeds: [embed]
    }

    await $fetch(webhookUrl, {
      method: 'POST',
      body: payload
    })
    console.log(`Successfully sent Discord webhook notification for mod ${isUpdate ? 'update' : 'creation'}: ${mod.name}`)
  } catch (err) {
    console.error('Failed to send Discord webhook:', err)
  }
}

export async function sendFeaturedWebhook(
  mod: WebhookMod,
  isFeatured: boolean
) {
  const config = useRuntimeConfig()
  const webhookUrl = config.discordWebhookUrl
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL is not set. Skipping Discord notification.')
    return
  }

  const baseUrl = config.appBaseUrl || 'http://localhost:3000'
  const modUrl = `${baseUrl}/mods/${mod.slug}`

  const gameName = mod.game === 'adofai'
    ? 'A Dance of Fire and Ice'
    : mod.game === 'rhythm-doctor'
      ? 'Rhythm Doctor'
      : mod.game

  let authorName = 'Unknown'
  if (mod.authorId) {
    authorName = mod.authorId.globalName || mod.authorId.username || 'Unknown'
  }

  const embed: DiscordEmbed = {
    title: isFeatured ? `⭐ Featured Mod: ${mod.name}` : `⚠️ Unfeatured Mod: ${mod.name}`,
    url: modUrl,
    description: isFeatured
      ? `This mod has been featured by an administrator! 🚀\n\n**Description:**\n${mod.summary}`
      : `This mod is no longer featured.`,
    color: isFeatured ? 16766720 : 10066329, // Gold color #FFD700 for featured, Grey #999999 for unfeatured
    timestamp: new Date().toISOString(),
    fields: [
      {
        name: '🎮 Game',
        value: gameName,
        inline: true
      },
      {
        name: '👤 Creator',
        value: authorName,
        inline: true
      }
    ],
    footer: {
      text: 'modlist.org'
    }
  }

  const content = undefined

  try {
    const payload = {
      content,
      embeds: [embed]
    }

    await $fetch(webhookUrl, {
      method: 'POST',
      body: payload
    })
    console.log(`Successfully sent Discord webhook notification for mod featured status change: ${mod.name}`)
  } catch (err) {
    console.error('Failed to send Discord webhook for featured mod:', err)
  }
}
