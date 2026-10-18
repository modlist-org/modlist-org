// Mirrors MOD_LOADERS in server/utils/mod-platform.ts
export const MOD_LOADER_OPTIONS = [
  { id: 'melonloader', label: 'MelonLoader' },
  { id: 'umm', label: 'Unity Mod Manager' },
  { id: 'bepinex', label: 'BepInEx' }
] as const

export type ModLoaderId = typeof MOD_LOADER_OPTIONS[number]['id']

export function loaderLabel(id: string) {
  return MOD_LOADER_OPTIONS.find((l) => l.id === id)?.label ?? id
}

export type DownloadMode = 'unified' | 'platform' | 'loader'
export type LoaderDownloadLinks = Record<ModLoaderId, string>

export const emptyLoaderLinks = (): LoaderDownloadLinks => ({ melonloader: '', umm: '', bepinex: '' })

// API shape -> one URL per loader (older loader entries with per-OS links use their first link)
export function loaderLinksFromApi(value: Partial<Record<string, { downloadUrl?: string; platformDownloads?: Record<string, string | undefined> }>> | undefined): LoaderDownloadLinks {
  const links = emptyLoaderLinks()
  for (const { id } of MOD_LOADER_OPTIONS) {
    const entry = value?.[id]
    links[id] = entry?.downloadUrl || Object.values(entry?.platformDownloads ?? {}).find((url) => !!url) || ''
  }
  return links
}

export function loaderLinksToBody(links: LoaderDownloadLinks) {
  return Object.fromEntries(Object.entries(links)
    .filter(([, url]) => url.trim())
    .map(([id, url]) => [id, { downloadUrl: url.trim(), platformDownloads: {} }]))
}

// Request fields for the chosen mode; links of the other modes are not sent
export function downloadBody(form: { downloadMode: DownloadMode; downloadUrl: string; platformDownloads: Record<string, string>; loaderDownloads: LoaderDownloadLinks }) {
  if (form.downloadMode === 'loader') {
    return { downloadUrl: '', platformDownloads: {}, loaderDownloads: loaderLinksToBody(form.loaderDownloads) }
  }
  const platformDownloads = form.downloadMode === 'platform'
    ? Object.fromEntries(Object.entries(form.platformDownloads).filter(([, url]) => url.trim()))
    : {}
  return {
    downloadUrl: form.downloadMode === 'unified'
      ? form.downloadUrl.trim()
      : Object.values(form.platformDownloads).find((url) => url.trim()) || '',
    platformDownloads,
    loaderDownloads: {}
  }
}

export function hasDownloadLink(form: { downloadMode: DownloadMode; downloadUrl: string; platformDownloads: Record<string, string>; loaderDownloads: LoaderDownloadLinks }) {
  if (form.downloadMode === 'unified') return !!form.downloadUrl.trim()
  const urls = Object.values(form.downloadMode === 'loader' ? form.loaderDownloads : form.platformDownloads)
  return urls.some((url) => !!url.trim())
}
