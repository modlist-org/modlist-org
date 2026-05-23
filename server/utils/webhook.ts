import type mongoose from 'mongoose'

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
  }[]
}

export async function sendDiscordWebhook(mod: WebhookMod) {
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
  const latestVerObj = mod.versions?.[0]
  const versionStr = latestVerObj?.version || '1.0.0'
  const downloadUrl = latestVerObj?.downloadUrl || ''

  // Build Discord Embed
  const embed: any = {
    title: `🆕 New Mod: ${mod.name}`,
    url: modUrl,
    description: mod.summary,
    color: 7108863, // #6c78ff
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
        value: `v${versionStr}`,
        inline: true
      }
    ],
    author: {
      name: `Submitted by ${authorName}`,
      icon_url: authorIconUrl || undefined
    },
    footer: {
      text: 'Modlist'
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

  try {
    const payload = {
      embeds: [embed]
    }

    await $fetch(webhookUrl, {
      method: 'POST',
      body: payload
    })
    console.log(`Successfully sent Discord webhook notification for mod: ${mod.name}`)
  } catch (err) {
    console.error('Failed to send Discord webhook:', err)
  }
}
