export const MOD_PLATFORMS = ['windows', 'macos', 'linux'] as const

export type ModPlatform = typeof MOD_PLATFORMS[number]
export type PlatformDownloads = Partial<Record<ModPlatform, string>>

export function normalizePlatform(value: unknown): ModPlatform | undefined {
  return typeof value === 'string' && (MOD_PLATFORMS as readonly string[]).includes(value)
    ? value as ModPlatform
    : undefined
}

export function detectPlatform(userAgent = ''): ModPlatform | undefined {
  if (/windows/i.test(userAgent)) return 'windows'
  if (/macintosh|mac os/i.test(userAgent)) return 'macos'
  if (/linux/i.test(userAgent) && !/android/i.test(userAgent)) return 'linux'
  return undefined
}

export function normalizePlatformDownloads(value: unknown): PlatformDownloads {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const source = value as Record<string, unknown>
  const downloads: PlatformDownloads = {}
  for (const platform of MOD_PLATFORMS) {
    const url = source[platform]
    if (typeof url === 'string' && url.trim()) {
      downloads[platform] = url.trim()
    }
  }
  return downloads
}

export function getAvailablePlatforms(value: unknown): ModPlatform[] {
  const downloads = normalizePlatformDownloads(value)
  return MOD_PLATFORMS.filter((platform) => Boolean(downloads[platform]))
}

export function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

export function getVersionDownloadUrl(
  version: { downloadUrl?: string; platformDownloads?: unknown },
  platform?: ModPlatform
): string | undefined {
  const downloads = normalizePlatformDownloads(version.platformDownloads)
  const hasPlatformDownloads = getAvailablePlatforms(downloads).length > 0

  if (hasPlatformDownloads) {
    return platform ? downloads[platform] : undefined
  }

  return version.downloadUrl
}
