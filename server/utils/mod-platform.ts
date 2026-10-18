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

export interface VersionFile {
  url: string
  // Unset dimension = works for any loader / OS / game version
  loader?: ModLoader
  platform?: ModPlatform
  gameVersion?: string
}

// Rows written before the files column existed only have the legacy link columns
export function versionFiles(version: { files?: VersionFile[] | null; downloadUrl?: string; platformDownloads?: unknown; loaderDownloads?: LoaderDownloads | null }): VersionFile[] {
  if (version.files?.length) return version.files
  const files: VersionFile[] = []
  const add = (entry: { downloadUrl?: string; platformDownloads?: unknown }, loader?: ModLoader) => {
    const links = normalizePlatformDownloads(entry.platformDownloads)
    const platforms = getAvailablePlatforms(links)
    if (platforms.length > 0) platforms.forEach((platform) => files.push({ url: links[platform]!, platform, ...(loader ? { loader } : {}) }))
    else if (entry.downloadUrl) files.push({ url: entry.downloadUrl, ...(loader ? { loader } : {}) })
  }
  add(version)
  const loaders = version.loaderDownloads ?? {}
  for (const loader of getAvailableLoaders(loaders)) add(loaders[loader]!, loader)
  return files
}

const sameGameVersion = (a?: string, b?: string) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()

// Best file for the request. Per dimension: an exact match beats a file that works for anything, which beats
// a file specific to something the client did not ask about; a file specific to something else never matches.
// Dimensions rank loader > game version > OS. Without a loader, MelonLoader files win (older apps only install those).
export function pickVersionFile(
  files: VersionFile[],
  want: { platform?: ModPlatform; loader?: ModLoader; gameVersion?: string }
): VersionFile | undefined {
  const dimScore = (have: string | undefined, req: string | undefined, equal: boolean) =>
    !have ? 2 : !req ? 1 : equal ? 3 : -Infinity
  let best: VersionFile | undefined
  let bestScore = -Infinity
  for (const file of files) {
    const loader = dimScore(file.loader, want.loader, file.loader === want.loader)
      + (!want.loader && file.loader === MOD_LOADERS[0] ? 0.5 : 0)
    const game = dimScore(file.gameVersion || undefined, want.gameVersion || undefined, sameGameVersion(file.gameVersion, want.gameVersion))
    const platform = dimScore(file.platform, want.platform, file.platform === want.platform)
    const score = loader * 100 + game * 10 + platform
    if (score > bestScore) {
      best = file
      bestScore = score
    }
  }
  return best
}

// Fill the legacy columns from the file list so older readers keep working
export function legacyLinkColumns(files: VersionFile[]) {
  const plain = files.filter((f) => !f.gameVersion)
  const linksOf = (list: VersionFile[]): LoaderDownload => {
    const platformDownloads: PlatformDownloads = {}
    for (const f of list) if (f.platform && !platformDownloads[f.platform]) platformDownloads[f.platform] = f.url
    return { downloadUrl: list.find((f) => !f.platform)?.url ?? Object.values(platformDownloads)[0] ?? '', platformDownloads }
  }
  const generic = linksOf(plain.filter((f) => !f.loader))
  const loaderDownloads: LoaderDownloads = {}
  for (const loader of MOD_LOADERS) {
    const list = plain.filter((f) => f.loader === loader)
    if (list.length > 0) loaderDownloads[loader] = linksOf(list)
  }
  return { downloadUrl: generic.downloadUrl, platformDownloads: generic.platformDownloads, loaderDownloads }
}

export function parseVersionFiles(value: unknown): VersionFile[] {
  if (!Array.isArray(value)) return []
  if (value.length > 30) {
    throw createError({ statusCode: 400, statusMessage: 'A version can have at most 30 files.' })
  }
  const files: VersionFile[] = []
  for (const raw of value as Record<string, unknown>[]) {
    if (!raw || typeof raw !== 'object') continue
    const url = typeof raw.url === 'string' ? raw.url.trim() : ''
    if (!url) continue
    if (!isHttpUrl(url)) {
      throw createError({ statusCode: 400, statusMessage: 'Download links must be valid direct HTTP/HTTPS URLs.' })
    }
    const loader = raw.loader ? normalizeLoader(raw.loader) : undefined
    const platform = raw.platform ? normalizePlatform(raw.platform) : undefined
    if ((raw.loader && !loader) || (raw.platform && !platform)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid mod loader or OS for a download file.' })
    }
    const gameVersion = typeof raw.gameVersion === 'string' ? raw.gameVersion.trim().slice(0, 40) : ''
    const file: VersionFile = { url, ...(loader ? { loader } : {}), ...(platform ? { platform } : {}), ...(gameVersion ? { gameVersion } : {}) }
    if (files.some((f) => f.loader === file.loader && f.platform === file.platform && sameGameVersion(f.gameVersion, file.gameVersion))) {
      throw createError({ statusCode: 400, statusMessage: 'Two files have the same mod loader, OS and game version.' })
    }
    files.push(file)
  }
  return files
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

// Validate the version + download fields shared by version create/edit requests.
// New clients send `files`; older ones send downloadUrl / platformDownloads / loaderDownloads.
export function parseVersionInput(body: Record<string, unknown>) {
  const { version, downloadUrl, platformDownloads, loaderDownloads, changelog, gameVersion, isBeta, branchId } = body

  const files = Array.isArray(body.files)
    ? parseVersionFiles(body.files)
    : versionFiles({ ...parseLinks(downloadUrl, platformDownloads, 'Generic'), loaderDownloads: parseLoaderDownloads(loaderDownloads) })

  if (typeof version !== 'string' || !version.trim() || files.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Version string and at least one download link are required.'
    })
  }

  return {
    version: version.trim(),
    files,
    ...legacyLinkColumns(files),
    changelog: typeof changelog === 'string' ? changelog : '',
    gameVersion: typeof gameVersion === 'string' ? gameVersion.trim() : '',
    isBeta: !!isBeta,
    branchId: typeof branchId === 'string' && branchId ? branchId : undefined
  }
}
