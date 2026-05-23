import { Mod } from '../../../models/Mod'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug parameter.'
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

    return {
      success: true,
      downloads: mod.downloads
    }
  } catch (error) {
    console.error('Increment download count error:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to record download.'
    })
  }
})
