#!/usr/bin/env node
// One-shot MongoDB -> D1 migration.
//
// 1. Dump Mongo as canonical EJSON:
//    mongosh "$MONGODB_URI" --quiet --eval 'print(EJSON.stringify({users: db.users.find().toArray(), mods: db.mods.find().toArray()}, {relaxed: false}))' > dump.json
// 2. node scripts/mongo-to-d1.mjs dump.json out/
//    -> out/data.sql (run with `wrangler d1 execute modlist --remote --file out/data.sql`)
//    -> out/logos/<sha256>.<ext> (upload with `wrangler r2 object put modlist-logos/<file> --file ... --remote`)
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [dumpPath, outDir] = process.argv.slice(2)
if (!dumpPath || !outDir) {
  console.error('usage: node scripts/mongo-to-d1.mjs <dump.json> <outDir>')
  process.exit(1)
}

const dump = JSON.parse(readFileSync(dumpPath, 'utf8'))
mkdirSync(join(outDir, 'logos'), { recursive: true })

const IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg'
}
const GAMES = ['adofai', 'rhythm-doctor', 'dancing-line']

// Canonical EJSON helpers
const oid = (v) => (v && typeof v === 'object' && '$oid' in v ? v.$oid : v == null ? null : String(v))
const num = (v) => {
  if (v == null) return 0
  if (typeof v === 'number') return v
  return Number(v.$numberInt ?? v.$numberLong ?? v.$numberDouble ?? v.$numberDecimal ?? 0)
}
const date = (v) => {
  if (v == null) return null
  const d = v.$date
  if (d == null) return new Date(v).getTime()
  if (typeof d === 'object') return Number(d.$numberLong)
  return new Date(d).getTime()
}

const sqlValue = (v) => {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? '1' : '0'
  if (typeof v === 'number') return Number.isFinite(v) ? String(Math.trunc(v)) : 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}
const insert = (table, row) => {
  const cols = Object.keys(row)
  return `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => sqlValue(row[c])).join(', ')});`
}

const logoFiles = []
function migrateLogo(value, label) {
  if (!value) return ''
  if (value.startsWith('/logos/') || /^https?:\/\//i.test(value)) return value
  const match = /^data:([a-z0-9.+/-]+);base64,(.+)$/is.exec(value)
  const ext = match && IMAGE_TYPES[match[1].toLowerCase()]
  if (!ext) {
    console.warn(`! ${label}: unrecognised logo format, dropping`)
    return ''
  }
  const bytes = Buffer.from(match[2], 'base64')
  const key = `${createHash('sha256').update(bytes).digest('hex')}.${ext}`
  writeFileSync(join(outDir, 'logos', key), bytes)
  logoFiles.push(key)
  return `/logos/${key}`
}

const statements = []
const userIds = new Set()

for (const u of dump.users) {
  const id = oid(u._id)
  userIds.add(id)
  statements.push(insert('users', {
    id,
    discord_id: u.discordId,
    username: u.username,
    global_name: u.globalName ?? null,
    avatar: u.avatar ?? null,
    is_verified_developer: !!u.isVerifiedDeveloper,
    is_admin: !!u.isAdmin,
    last_synced_at: date(u.lastSyncedAt),
    discord_access_token: u.discordAccessToken ?? null,
    created_at: date(u.createdAt) ?? Date.now()
  }))
}

const modIds = new Set(dump.mods.map((m) => oid(m._id)))
const childStatements = []

for (const m of dump.mods) {
  const id = oid(m._id)
  const authorId = oid(m.authorId)
  if (!userIds.has(authorId)) console.warn(`! ${m.slug}: author ${authorId} not found in users`)
  if (!GAMES.includes(m.game)) throw new Error(`${m.slug}: unknown game ${m.game}`)

  let pendingEdit = null
  if (m.pendingEdit) {
    const pe = m.pendingEdit
    pendingEdit = {}
    for (const key of ['name', 'summary', 'description', 'game', 'sourceUrl', 'communityUrl']) {
      if (pe[key] !== undefined && pe[key] !== null) pendingEdit[key] = pe[key]
    }
    if (Array.isArray(pe.categories) && pe.categories.length > 0) pendingEdit.categories = pe.categories
    if (pe.logo !== undefined && pe.logo !== null) pendingEdit.logo = migrateLogo(pe.logo, `${m.slug} pendingEdit`)
    if (Array.isArray(pe.dependencies)) pendingEdit.dependencies = pe.dependencies.map(oid).filter((d) => modIds.has(d))
    if (pe.createdAt) pendingEdit.createdAt = new Date(date(pe.createdAt)).toISOString()
  }

  const createdAt = date(m.createdAt) ?? Date.now()
  statements.push(insert('mods', {
    id,
    name: m.name,
    slug: m.slug,
    summary: m.summary,
    description: m.description ?? '',
    game: m.game,
    categories: JSON.stringify(m.categories?.length ? m.categories : ['ui']),
    author_id: authorId,
    pending_edit: pendingEdit ? JSON.stringify(pendingEdit) : null,
    is_approved: !!m.isApproved,
    rejection_reason: m.rejectionReason ?? '',
    edit_rejection_reason: m.editRejectionReason ?? '',
    logo: migrateLogo(m.logo, m.slug),
    source_url: m.sourceUrl ?? '',
    community_url: m.communityUrl ?? '',
    downloads: num(m.downloads),
    is_featured: !!m.isFeatured,
    created_at: createdAt,
    updated_at: date(m.updatedAt) ?? createdAt
  }))

  for (const v of m.versions ?? []) {
    const platformDownloads = {}
    for (const p of ['windows', 'macos', 'linux']) {
      const url = v.platformDownloads?.[p]
      if (typeof url === 'string' && url.trim()) platformDownloads[p] = url.trim()
    }
    childStatements.push(insert('mod_versions', {
      id: oid(v._id),
      mod_id: id,
      version: v.version,
      download_url: v.downloadUrl ?? '',
      platform_downloads: JSON.stringify(platformDownloads),
      changelog: v.changelog ?? '',
      game_version: v.gameVersion ?? '',
      is_approved: !!v.isApproved,
      is_beta: !!v.isBeta,
      rejection_reason: v.rejectionReason ?? '',
      submitted_by: oid(v.submittedBy) ?? authorId,
      created_at: date(v.createdAt) ?? createdAt
    }))
  }

  const seenCollabs = new Set([authorId])
  const collabs = [
    ...(m.collaboratorIds ?? []).map((u) => ['accepted', oid(u)]),
    ...(m.pendingCollaboratorIds ?? []).map((u) => ['pending', oid(u)])
  ]
  const positions = { accepted: 0, pending: 0 }
  for (const [status, userId] of collabs) {
    if (seenCollabs.has(userId) || !userIds.has(userId)) continue
    seenCollabs.add(userId)
    childStatements.push(insert('mod_collaborators', { mod_id: id, user_id: userId, status, position: positions[status]++ }))
  }

  let depPosition = 0
  for (const dep of new Set((m.dependencies ?? []).map(oid))) {
    if (!modIds.has(dep) || dep === id) continue
    childStatements.push(insert('mod_dependencies', { mod_id: id, dependency_id: dep, position: depPosition++ }))
  }
}

writeFileSync(join(outDir, 'data.sql'), [...statements, ...childStatements].join('\n') + '\n')
writeFileSync(join(outDir, 'logos.txt'), logoFiles.join('\n') + '\n')
console.log(`users=${dump.users.length} mods=${dump.mods.length} statements=${statements.length + childStatements.length} logos=${logoFiles.length}`)
