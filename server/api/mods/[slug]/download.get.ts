import { Mod } from '../../../models/Mod'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  const query = getQuery(event)
  const url = query.url as string

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug parameter.'
    })
  }

  if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or missing target download URL.'
    })
  }

  try {
    const mod = await Mod.findOneAndUpdate(
      { slug, isApproved: true },
      { $inc: { downloads: 1 } },
      { new: true }
    )

    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found or not approved.'
      })
    }

    // Redirect to the actual download URL
    return sendRedirect(event, url, 302)
  } catch (error) {
    console.error('Redirect and increment download count error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process download redirection.'
    })
  }
})
