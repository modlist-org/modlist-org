export const MOD_PLATFORMS = ['windows', 'macos', 'linux'] as const

export type ModPlatform = typeof MOD_PLATFORMS[number]
export type PlatformDownloads = Partial<Record<ModPlatform, string>>

export const MOD_LOADERS = ['melonloader', 'umm', 'bepinex'] as const

export type ModLoader = typeof MOD_LOADERS[number]
export interface LoaderDownload {
  downloadUrl: string
  platformDownloads: PlatformDownloads
}
export type LoaderDownloads = Partial<Record<ModLoader, LoaderDownload>>

export function normalizeLoader(value: unknown): ModLoader | undefined {
  return typeof value === 'string' && (MOD_LOADERS as readonly string[]).includes(value)
    ? value as ModLoader
    : undefined
}

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

// Loaders that have at least one link, in MOD_LOADERS order
export function getAvailableLoaders(value: unknown): ModLoader[] {
  const downloads = (value && typeof value === 'object' ? value : {}) as Record<string, Partial<LoaderDownload> | undefined>
  return MOD_LOADERS.filter((loader) => {
    const entry = downloads[loader]
    return !!entry && (!!entry.downloadUrl || getAvailablePlatforms(entry.platformDownloads).length > 0)
  })
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

  return version.downloadUrl || undefined
}

// Requested loader's own file first, then the generic link; without a loader, generic then the first loader file
export function resolveDownloadUrl(
  version: { downloadUrl?: string; platformDownloads?: unknown; loaderDownloads?: LoaderDownloads | null },
  platform?: ModPlatform,
  loader?: ModLoader
): string | undefined {
  const loaders = version.loaderDownloads ?? {}
  if (loader && loaders[loader]) {
    const url = getVersionDownloadUrl(loaders[loader], platform)
    if (url) return url
  }
  const generic = getVersionDownloadUrl(version, platform)
  if (generic || loader) return generic
  for (const l of getAvailableLoaders(loaders)) {
    const url = getVersionDownloadUrl(loaders[l]!, platform)
    if (url) return url
  }
  return undefined
}

export function normalizeVersionString(version: string) {
  return version.trim().replace(/^v/i, '')
}

function parseLinks(downloadUrl: unknown, platformDownloads: unknown, label: string): LoaderDownload {
  const normalizedPlatformDownloads = normalizePlatformDownloads(platformDownloads)
  const availablePlatforms = getAvailablePlatforms(normalizedPlatformDownloads)
  const trimmedDownloadUrl = typeof downloadUrl === 'string' ? downloadUrl.trim() : ''

  if (trimmedDownloadUrl && !isHttpUrl(trimmedDownloadUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label} download link must be a valid direct HTTP/HTTPS URL.`
    })
  }

  for (const platform of availablePlatforms) {
    if (!isHttpUrl(normalizedPlatformDownloads[platform])) {
      throw createError({
        statusCode: 400,
        statusMessage: `${label} ${platform} download link must be a valid direct HTTP/HTTPS URL.`
      })
    }
  }

  return {
    downloadUrl: trimmedDownloadUrl || normalizedPlatformDownloads[availablePlatforms[0]!] || '',
    platformDownloads: normalizedPlatformDownloads
  }
}

export function parseLoaderDownloads(value: unknown): LoaderDownloads {
  const source = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, Record<string, unknown> | undefined>
  const result: LoaderDownloads = {}
  for (const loader of MOD_LOADERS) {
    const entry = source[loader]
    if (!entry || typeof entry !== 'object') continue
    const links = parseLinks(entry.downloadUrl, entry.platformDownloads, loader)
    if (links.downloadUrl) result[loader] = links
  }
  return result
}

// Validate the version + download link fields shared by version create/edit requests
export function parseVersionInput(body: Record<string, unknown>) {
  const { version, downloadUrl, platformDownloads, loaderDownloads, changelog, gameVersion, isBeta, branchId } = body

  const generic = parseLinks(downloadUrl, platformDownloads, 'Generic')
  const loaders = parseLoaderDownloads(loaderDownloads)

  if (typeof version !== 'string' || !version.trim() || (!generic.downloadUrl && Object.keys(loaders).length === 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Version string and at least one download link are required.'
    })
  }

  return {
    version: version.trim(),
    downloadUrl: generic.downloadUrl,
    platformDownloads: generic.platformDownloads,
    loaderDownloads: loaders,
    changelog: typeof changelog === 'string' ? changelog : '',
    gameVersion: typeof gameVersion === 'string' ? gameVersion.trim() : '',
    isBeta: !!isBeta,
    branchId: typeof branchId === 'string' && branchId ? branchId : undefined
  }
}
