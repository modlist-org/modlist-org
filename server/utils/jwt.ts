const encoder = new TextEncoder()

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64UrlDecode(str: string): Uint8Array<ArrayBuffer> {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// Refuse to run on a missing or well-known secret (tokens would be forgeable)
function isUsableSecret(secret: string): boolean {
  return !!secret && secret !== 'dev-jwt-secret-replace-in-production'
}

function importKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export interface IJwtPayload {
  id: string
  discordId: string
  username: string
  accessToken?: string
  exp?: number
}

export async function signJwt(payload: Omit<IJwtPayload, 'exp'>, secret: string, expiresInSeconds: number = 7 * 24 * 3600): Promise<string> {
  if (!isUsableSecret(secret)) throw new Error('JWT_SECRET is not configured.')
  const header = { alg: 'HS256', typ: 'JWT' }
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds

  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)))
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify({ ...payload, exp })))

  const signature = await crypto.subtle.sign('HMAC', await importKey(secret), encoder.encode(`${encodedHeader}.${encodedPayload}`))
  return `${encodedHeader}.${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function verifyJwt(token: string, secret: string): Promise<IJwtPayload | null> {
  if (!isUsableSecret(secret)) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null
  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await importKey(secret),
      base64UrlDecode(encodedSignature),
      encoder.encode(`${encodedHeader}.${encodedPayload}`)
    )
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null // Expired
    }
    return payload
  } catch {
    return null
  }
}
