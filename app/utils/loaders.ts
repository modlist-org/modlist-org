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

type PlatformLinks = Record<'windows' | 'macos' | 'linux', string>

export interface LoaderLinkForm {
  mode: 'unified' | 'platform'
  downloadUrl: string
  platformDownloads: PlatformLinks
}

export type LoaderLinksForm = Partial<Record<ModLoaderId, LoaderLinkForm>>

interface StoredLinks {
  downloadUrl?: string
  platformDownloads?: Partial<PlatformLinks>
}

// API shape -> form state (edit an existing version)
export function loaderLinksToForm(value: Partial<Record<string, StoredLinks>> | undefined): LoaderLinksForm {
  const form: LoaderLinksForm = {}
  for (const { id } of MOD_LOADER_OPTIONS) {
    const entry = value?.[id]
    if (!entry) continue
    const platforms = entry.platformDownloads || {}
    const hasPlatform = Object.values(platforms).some((url) => !!url)
    form[id] = {
      mode: hasPlatform ? 'platform' : 'unified',
      downloadUrl: hasPlatform ? '' : entry.downloadUrl || '',
      platformDownloads: { windows: platforms.windows || '', macos: platforms.macos || '', linux: platforms.linux || '' }
    }
  }
  return form
}

// Form state -> request body; only the active mode's links are sent
export function loaderLinksToBody(form: LoaderLinksForm) {
  const body: Record<string, { downloadUrl: string; platformDownloads: Partial<PlatformLinks> }> = {}
  for (const [id, entry] of Object.entries(form)) {
    if (!entry) continue
    body[id] = entry.mode === 'unified'
      ? { downloadUrl: entry.downloadUrl.trim(), platformDownloads: {} }
      : { downloadUrl: '', platformDownloads: entry.platformDownloads }
  }
  return body
}

export function hasLoaderLink(form: LoaderLinksForm) {
  return Object.values(form).some((entry) => !!entry && (entry.mode === 'unified'
    ? !!entry.downloadUrl.trim()
    : Object.values(entry.platformDownloads).some((url) => !!url.trim())))
}
