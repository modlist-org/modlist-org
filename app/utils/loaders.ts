// Mirrors MOD_LOADERS / MOD_PLATFORMS in server/utils/mod-platform.ts
export const MOD_LOADER_OPTIONS = [
  { id: 'melonloader', label: 'MelonLoader' },
  { id: 'umm', label: 'Unity Mod Manager' },
  { id: 'bepinex', label: 'BepInEx' }
] as const

export const PLATFORM_OPTIONS = [
  { id: 'windows', label: 'Windows' },
  { id: 'macos', label: 'macOS' },
  { id: 'linux', label: 'Linux' }
] as const

export type ModLoaderId = typeof MOD_LOADER_OPTIONS[number]['id']

export function loaderLabel(id: string) {
  return MOD_LOADER_OPTIONS.find((l) => l.id === id)?.label ?? id
}

export function platformLabel(id: string) {
  return PLATFORM_OPTIONS.find((p) => p.id === id)?.label ?? id
}

// One download file of a version; empty loader / platform / gameVersion means "any"
export interface FileRow {
  loader: string
  platform: string
  gameVersion: string
  url: string
}

export const emptyFileRow = (): FileRow => ({ loader: '', platform: '', gameVersion: '', url: '' })

export function filesFromApi(files: Partial<FileRow>[] | undefined): FileRow[] {
  const rows = (files ?? []).map((f) => ({ ...emptyFileRow(), ...f }))
  return rows.length > 0 ? rows : [emptyFileRow()]
}

export function filesToBody(rows: FileRow[]) {
  return rows
    .filter((r) => r.url.trim())
    .map((r) => ({ url: r.url.trim(), loader: r.loader || undefined, platform: r.platform || undefined, gameVersion: r.gameVersion.trim() || undefined }))
}

export const hasFile = (rows: FileRow[]) => rows.some((r) => !!r.url.trim())
