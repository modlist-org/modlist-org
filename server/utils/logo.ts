import type { H3Event } from 'h3'
import { useCloudflareEnv } from './db'

const MAX_LOGO_BYTES = 1024 * 1024

const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg'
}

export const LOGO_PATH_PREFIX = '/logos/'

export function logoContentType(key: string): string {
  const ext = key.split('.').pop()
  const entry = Object.entries(IMAGE_TYPES).find(([, e]) => e === ext)
  return entry ? entry[0] : 'application/octet-stream'
}

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function decodeBase64(data: string): Uint8Array<ArrayBuffer> {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// Logos arrive as data URLs from the submit/edit forms; store them in R2 (content-addressed) and keep only the path
export async function storeLogo(event: H3Event, value: unknown): Promise<string> {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid logo.' })
  }

  if (value.startsWith(LOGO_PATH_PREFIX) || /^https:\/\//i.test(value)) return value

  const match = /^data:([a-z0-9.+/-]+);base64,(.+)$/i.exec(value)
  const ext = match ? IMAGE_TYPES[match[1]!.toLowerCase()] : undefined
  if (!match || !ext) {
    throw createError({ statusCode: 400, statusMessage: 'Logo must be a PNG, JPEG, GIF, WebP, AVIF or SVG image.' })
  }

  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = decodeBase64(match[2]!)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid logo encoding.' })
  }
  if (bytes.byteLength > MAX_LOGO_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Logo size must be smaller than 1MB.' })
  }

  const key = `${await sha256Hex(bytes)}.${ext}`
  const bucket = useCloudflareEnv(event).LOGOS
  if (!await bucket.head(key)) {
    await bucket.put(key, bytes, { httpMetadata: { contentType: logoContentType(key) } })
  }
  return `${LOGO_PATH_PREFIX}${key}`
}
