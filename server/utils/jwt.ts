import crypto from 'node:crypto'

function base64UrlEncode(str: string | Buffer): string {
  const base64 = typeof str === 'string' ? Buffer.from(str).toString('base64') : str.toString('base64')
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  return Buffer.from(base64, 'base64').toString('utf8')
}

export interface IJwtPayload {
  id: string
  discordId: string
  username: string
  accessToken?: string
  exp?: number
}

export function signJwt(payload: Omit<IJwtPayload, 'exp'>, secret: string, expiresInSeconds: number = 7 * 24 * 3600): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  const fullPayload = { ...payload, exp }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest()
  const encodedSignature = base64UrlEncode(signature)

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}

export function verifyJwt(token: string, secret: string): IJwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null
  try {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest()
    const expectedSignature = base64UrlEncode(signature)

    if (encodedSignature !== expectedSignature) return null

    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null // Expired
    }
    return payload
  } catch {
    return null
  }
}
