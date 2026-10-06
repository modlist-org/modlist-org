export interface DiscordUserResponse {
  id: string
  username: string
  global_name?: string | null
  avatar?: string | null
  discriminator?: string
}

export function discordAvatarUrl(discordUser: DiscordUserResponse) {
  return discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`
}
