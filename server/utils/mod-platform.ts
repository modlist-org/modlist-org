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

export function normalizeVersionString(version: string) {
  return version.trim().replace(/^v/i, '')
}

// Validate the version + download link fields shared by version create/edit requests
export function parseVersionInput(body: Record<string, unknown>) {
  const { version, downloadUrl, platformDownloads, changelog, gameVersion, isBeta } = body

  const normalizedPlatformDownloads = normalizePlatformDownloads(platformDownloads)
  const availablePlatforms = getAvailablePlatforms(normalizedPlatformDownloads)
  const trimmedDownloadUrl = typeof downloadUrl === 'string' ? downloadUrl.trim() : ''
  const normalizedDownloadUrl = trimmedDownloadUrl || normalizedPlatformDownloads[availablePlatforms[0]!]

  if (typeof version !== 'string' || !version.trim() || !normalizedDownloadUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Version string and at least one platform download link are required.'
    })
  }

  if (trimmedDownloadUrl && !isHttpUrl(trimmedDownloadUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Download link must be a valid direct HTTP/HTTPS URL.'
    })
  }

  for (const platform of availablePlatforms) {
    if (!isHttpUrl(normalizedPlatformDownloads[platform])) {
      throw createError({
        statusCode: 400,
        statusMessage: `${platform} download link must be a valid direct HTTP/HTTPS URL.`
      })
    }
  }

  return {
    version: version.trim(),
    downloadUrl: normalizedDownloadUrl,
    platformDownloads: normalizedPlatformDownloads,
    changelog: typeof changelog === 'string' ? changelog : '',
    gameVersion: typeof gameVersion === 'string' ? gameVersion.trim() : '',
    isBeta: !!isBeta
  }
}
