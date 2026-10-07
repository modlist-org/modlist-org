import type { H3Event } from 'h3'

interface WebhookUser {
  username: string
  globalName?: string
  avatar?: string
}

interface WebhookMod {
  name: string
  slug: string
  game: string
  games?: string[]
  categories: string[]
  summary: string
  logo?: string
  sourceUrl?: string
  communityUrl?: string
  authorId?: WebhookUser | null
  versions?: {
    version: string
    downloadUrl: string
    changelog?: string
    gameVersion?: string
    submittedBy?: WebhookUser | null
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
  thumbnail?: {
    url: string
  }
}

const GAME_LABELS: Record<string, string> = {
  'adofai': 'A Dance of Fire and Ice',
  'rhythm-doctor': 'Rhythm Doctor',
  'dancing-line': 'Dancing Line'
}

function gameLabel(game: string) {
  return GAME_LABELS[game] || game
}

function gamesOf(mod: WebhookMod): string[] {
  return mod.games?.length ? mod.games : [mod.game]
}

function gameRoles(config: ReturnType<typeof useRuntimeConfig>, game: string) {
  if (game === 'adofai') return { ping: config.discordModPingRoleIdAdofai, all: config.discordModAllRoleIdAdofai }
  if (game === 'rhythm-doctor') return { ping: config.discordModPingRoleIdRhythmDoctor, all: config.discordModAllRoleIdRhythmDoctor }
  if (game === 'dancing-line') return { ping: config.discordModPingRoleIdDancingLine, all: config.discordModAllRoleIdDancingLine }
  return { ping: '', all: '' }
}

function logoThumbnail(baseUrl: string, logo?: string) {
  if (!logo) return undefined
  if (logo.startsWith('/logos/')) return { url: `${baseUrl}${logo}` }
  if (/^https:\/\//.test(logo)) return { url: logo }
  return undefined
}

// Keep untrusted URLs from breaking out of Discord's [text](url) markdown
function mdUrl(url: string): string {
  return url.replace(/[()<>\s]/g, (c) => encodeURIComponent(c))
}

export async function sendDiscordWebhook(
  event: H3Event,
  mod: WebhookMod,
  specificVersion?: { version: string; downloadUrl: string; changelog?: string; gameVersion?: string; isBeta?: boolean },
  isUpdate: boolean = false
) {
  const config = useRuntimeConfig(event)
  const webhookUrl = config.discordWebhookUrl
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL is not set. Skipping Discord notification.')
    return
  }

  // Get App Base URL from environment or default to localhost
  const baseUrl = config.siteUrl || 'http://localhost:3000'
  const modUrl = `${baseUrl}/mods/${mod.slug}`

  // Format Game Name
  const gameName = gamesOf(mod).map(gameLabel).join(', ')

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

  // Get Version Info
  const latestVerObj = specificVersion || mod.versions?.[0]
  const versionStr = latestVerObj?.version || '1.0.0'
  const downloadUrl = latestVerObj?.downloadUrl || ''
  const changelogText = latestVerObj?.changelog || ''
  const gameVersionStr = latestVerObj?.gameVersion || ''
  const isBeta = (latestVerObj as { isBeta?: boolean })?.isBeta || false

  // Credit whoever uploaded this version (may be a collaborator), not the mod owner.
  // Version numbers are unique per mod, so match the hydrated version by number.
  const uploader = mod.versions?.find((v) => v.version === versionStr)?.submittedBy || mod.authorId
  const authorName = uploader ? (uploader.globalName || uploader.username || 'Unknown') : 'Unknown'
  const authorIconUrl = uploader?.avatar && /^https?:\/\//.test(uploader.avatar) ? uploader.avatar : ''

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
        name: gamesOf(mod).length > 1 ? '🎮 Games' : '🎮 Game',
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
    },
    thumbnail: logoThumbnail(baseUrl, mod.logo)
  }

  // Add optional source link
  if (mod.sourceUrl) {
    embed.fields.push({
      name: '🔗 Source Code',
      value: `[Repository Link](${mdUrl(mod.sourceUrl)})`,
      inline: false
    })
  }

  // Add optional community link
  if (mod.communityUrl) {
    embed.fields.push({
      name: '💬 Community Link',
      value: `[Join Community](${mdUrl(mod.communityUrl)})`,
      inline: false
    })
  }

  // Add download link if available
  if (downloadUrl) {
    embed.fields.push({
      name: '📥 Download Link',
      value: `[Direct Download](${mdUrl(downloadUrl)})`,
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

  // Beta releases only ping the "all updates" roles; stable releases ping both, for every target game
  const pings = new Set<string>()
  for (const game of gamesOf(mod)) {
    const roles = gameRoles(config, game)
    if (!isBeta && roles.ping) pings.add(`<@&${roles.ping}>`)
    if (roles.all) pings.add(`<@&${roles.all}>`)
  }
  const content = pings.size > 0 ? [...pings].join(' ') : undefined

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
  event: H3Event,
  mod: WebhookMod,
  isFeatured: boolean
) {
  const config = useRuntimeConfig(event)
  const webhookUrl = config.discordWebhookUrl
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL is not set. Skipping Discord notification.')
    return
  }

  const baseUrl = config.siteUrl || 'http://localhost:3000'
  const modUrl = `${baseUrl}/mods/${mod.slug}`

  const gameName = gamesOf(mod).map(gameLabel).join(', ')

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
        name: gamesOf(mod).length > 1 ? '🎮 Games' : '🎮 Game',
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
    },
    thumbnail: logoThumbnail(baseUrl, mod.logo)
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

// Workers drop un-awaited promises once the response is sent; keep notifications alive with waitUntil
export function runInBackground(event: H3Event, task: Promise<unknown>, label: string) {
  event.waitUntil(task.catch((err) => {
    console.error(`${label} failed:`, err)
  }))
}
