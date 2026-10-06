import { useCloudflareEnv } from '../../utils/db'
import { logoContentType } from '../../utils/logo'

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key') || ''
  if (!/^[0-9a-f]{64}\.[a-z]+$/.test(key)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const object = await useCloudflareEnv(event).LOGOS.get(key)
  if (!object) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  setResponseHeaders(event, {
    'Content-Type': logoContentType(key),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    // SVG logos are served same-origin; never let them run scripts
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:"
  })
  return object.body
})
