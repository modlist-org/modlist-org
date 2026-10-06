// Supported games (keep in sync with GAMES in server/db/schema.ts). The label comes from i18n key `games.<labelKey>`.
export const GAME_OPTIONS = [
  { id: 'adofai', labelKey: 'adofai' },
  { id: 'rhythm-doctor', labelKey: 'rhythm_doctor' },
  { id: 'dancing-line', labelKey: 'dancing_line' }
] as const

export const GAME_IDS: string[] = GAME_OPTIONS.map((g) => g.id)

export function gameLabelKey(id: string): string {
  const option = GAME_OPTIONS.find((g) => g.id === id)
  return option ? `games.${option.labelKey}` : id
}
