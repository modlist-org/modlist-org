#!/usr/bin/env bun
// One-shot data migration: move each version's single game version onto its download files.
// Writes the `files` column for every version (from the legacy link columns when empty), tags files that
// have no game version with the version's old game_version, and refreshes the derived columns.
//   bun scripts/version-files-game-version.ts --local|--remote   -> prints SQL; pipe into a file and run
//   wrangler d1 execute modlist --local|--remote --file <file>
import { execFileSync } from 'node:child_process'
import { applyGameVersion, legacyLinkColumns, versionFiles } from '../server/utils/mod-platform'

const target = process.argv[2]
if (target !== '--local' && target !== '--remote') {
  console.error('usage: bun scripts/version-files-game-version.ts --local|--remote')
  process.exit(1)
}

const out = execFileSync('bun', ['x', 'wrangler', 'd1', 'execute', 'modlist', target, '--json', '--command',
  'SELECT id, game_version, download_url, platform_downloads, loader_downloads, files FROM mod_versions'], { encoding: 'utf8' })
const rows = JSON.parse(out)[0].results as Record<string, string>[]

const q = (v: unknown) => `'${String(v).replaceAll('\'', '\'\'')}'`
for (const row of rows) {
  const base = versionFiles({
    files: JSON.parse(row.files || '[]'),
    downloadUrl: row.download_url,
    platformDownloads: JSON.parse(row.platform_downloads || '{}'),
    loaderDownloads: JSON.parse(row.loader_downloads || '{}')
  })
  const files = row.game_version ? applyGameVersion(base, row.game_version.trim().slice(0, 40)) : base
  if (files.length === 0) continue
  const legacy = legacyLinkColumns(files)
  const gameVersion = [...new Set(files.map((f) => f.gameVersion).filter(Boolean))].join(', ')
  console.log(`UPDATE mod_versions SET files = ${q(JSON.stringify(files))}, game_version = ${q(gameVersion)}, `
    + `download_url = ${q(legacy.downloadUrl)}, platform_downloads = ${q(JSON.stringify(legacy.platformDownloads))}, `
    + `loader_downloads = ${q(JSON.stringify(legacy.loaderDownloads))} WHERE id = ${q(row.id)};`)
}
