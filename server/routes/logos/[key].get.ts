import { useCloudflareEnv } from '../../utils/db'
import { logoContentType } from '../../utils/logo'

const LOGO_HEADERS = (key: string) => ({
  'Content-Type': logoContentType(key),
  'Cache-Control': 'public, max-age=31536000, immutable',
  'X-Content-Type-Options': 'nosniff',
  // SVG logos are served same-origin; never let them run scripts
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:"
})

interface EdgeCache {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key') || ''
  if (!/^[0-9a-f]{64}\.[a-z]+$/.test(key)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  // Keys are content hashes, so cached copies never go stale. Worker responses
  // aren't cached by Cloudflare automatically; use the edge cache explicitly.
  const edgeCache = (globalThis as { caches?: { default?: EdgeCache } }).caches?.default
  const cacheKey = new Request(new URL(`/logos/${key}`, getRequestURL(event).origin).toString())
  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey)
    if (cached) return cached
  }

  const object = await useCloudflareEnv(event).LOGOS.get(key)
  if (!object) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const response = new Response(object.body as unknown as ReadableStream, { headers: LOGO_HEADERS(key) })
  if (edgeCache) {
    event.waitUntil(edgeCache.put(cacheKey, response.clone()))
  }
  return response
})
