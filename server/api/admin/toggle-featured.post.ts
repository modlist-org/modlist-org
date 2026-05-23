import { Mod } from '../../models/Mod'
import { sendFeaturedWebhook } from '../../utils/webhook'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user

  if (!currentUser || !currentUser.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Administrator privileges required.'
    })
  }

  const body = await readBody(event)
  const { modId } = body

  if (!modId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Required parameter: modId.'
    })
  }

  try {
    const mod = await Mod.findById(modId)
      .populate('authorId', 'username globalName avatar')
    
    if (!mod) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mod not found.'
      })
    }

    mod.isFeatured = !mod.isFeatured
    await mod.save()

    // Trigger webhook notification to Discord
    // We pass categories as strings, mapping the populated author details
    await sendFeaturedWebhook({
      name: mod.name,
      slug: mod.slug,
      game: mod.game,
      categories: mod.categories || [],
      summary: mod.summary,
      sourceUrl: mod.sourceUrl,
      authorId: mod.authorId ? {
        username: (mod.authorId as any).username,
        globalName: (mod.authorId as any).globalName,
        avatar: (mod.authorId as any).avatar
      } : undefined
    }, mod.isFeatured)

    return {
      success: true,
      modId: mod._id,
      isFeatured: mod.isFeatured
    }
  } catch (error) {
    console.error('Toggle featured status error:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update featured status: ${err.message || String(error)}`
    })
  }
})
