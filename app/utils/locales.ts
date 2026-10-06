// Languages a mod can provide translated summaries/descriptions for (keep in sync with LOCALES in server/db/schema.ts)
export const SITE_LOCALES = [
  { id: 'en-US', label: 'English' },
  { id: 'ko-KR', label: '한국어' },
  { id: 'zh-CN', label: '简体中文' }
] as const

export interface ModTranslation {
  summary?: string
  description?: string
}

export type ModTranslations = Record<string, ModTranslation | undefined>

// Pick the translation for `locale`, falling back to the mod's default text
export function localizedText(
  mod: { summary?: string; description?: string; translations?: ModTranslations | null } | null | undefined,
  locale: string
) {
  const entry = mod?.translations?.[locale]
  return {
    summary: entry?.summary?.trim() || mod?.summary || '',
    description: entry?.description?.trim() || mod?.description || ''
  }
}
