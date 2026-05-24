import mongoose from 'mongoose'
import { Mod } from '../../models/Mod'
import type { IMod } from '../../models/Mod'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const game = query.game as string // 'adofai' | 'rhythm-doctor'
  const categories = query.categories as string
  const search = query.search as string
  const currentUser = event.context.user

  const filter: import('mongoose').FilterQuery<IMod> = {}

  // Filter by game
  if (game && game !== 'all') {
    const games = game.split(',').filter(Boolean)
    const validGames = games.filter((g) => ['adofai', 'rhythm-doctor'].includes(g))
    if (validGames.length > 0) {
      filter.game = { $in: validGames }
    }
  }

  // Filter by categories
  if (categories && categories !== 'all') {
    const cats = categories.split(',').filter(Boolean)
    const validCats = cats.filter((cat) => ['ui', 'gameplay', 'utility', 'visuals', 'library'].includes(cat))
    if (validCats.length > 0) {
      filter.categories = { $in: validCats }
    }
  }

  // Filter by search query
  if (search && search.trim().length > 0) {
    const searchRegex = { $regex: search, $options: 'i' }
    filter.$or = [
      { name: searchRegex },
      { summary: searchRegex },
      { slug: searchRegex }
    ]
  }

  const pending = query.pending === 'true'

  if (pending) {
    if (!currentUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'You must be logged in to view pending mods.'
      })
    }
    filter.isApproved = false
    const originalOr = filter.$or
    const pendingScoping = [
      { authorId: new mongoose.Types.ObjectId(currentUser.id) },
      { collaboratorIds: new mongoose.Types.ObjectId(currentUser.id) }
    ]
    if (originalOr && originalOr.length > 0) {
      delete filter.$or
      filter.$and = [
        { $or: originalOr },
        { $or: pendingScoping }
      ]
    } else {
      filter.$or = pendingScoping
    }
  } else {
    // Normal query: only show approved mods to everyone
    filter.isApproved = true
  }

  // Pagination parameters
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(query.limit as string) || 12))

  // Sort parameters
  const sortBy = query.sortBy as string || 'downloads_desc'
  const sortCriteria: Record<string, 1 | -1> = { isFeatured: -1 }

  if (sortBy === 'downloads_desc' || sortBy === 'downloads') {
    sortCriteria.downloads = -1
  } else if (sortBy === 'downloads_asc') {
    sortCriteria.downloads = 1
  } else if (sortBy === 'name_asc') {
    sortCriteria.name = 1
  } else if (sortBy === 'name_desc') {
    sortCriteria.name = -1
  } else if (sortBy === 'created') {
    sortCriteria.createdAt = -1
  } else {
    sortCriteria.updatedAt = -1 // Default: recently updated
  }

  try {
    const total = await Mod.countDocuments(filter)
    const totalPages = Math.ceil(total / limit)

    const queryChain = Mod.find(filter)
      .populate('authorId', 'username globalName avatar isVerifiedDeveloper')
      .populate('collaboratorIds', 'username globalName avatar isVerifiedDeveloper')
      .sort(sortCriteria)
      .skip((page - 1) * limit)
      .limit(limit)

    // Apply collation for case-insensitive alphabetical sorting if name sorting is selected
    if (sortBy === 'name_asc' || sortBy === 'name_desc') {
      queryChain.collation({ locale: 'en', strength: 2 })
    }

    const mods = await queryChain

    // Return the mods. For frontend display, we only return approved versions unless
    // the user is authorized. We'll map versions count or latest version.
    const sanitizedMods = mods.map((mod: import('mongoose').HydratedDocument<IMod>) => {
      const modObj = mod.toObject() as unknown as Omit<IMod, 'authorId' | 'collaboratorIds' | 'versions'> & {
        authorId: { _id: { toString(): string }; username: string; globalName?: string; avatar?: string; isVerifiedDeveloper: boolean }
        collaboratorIds: { _id: { toString(): string }; username: string; globalName?: string; avatar?: string; isVerifiedDeveloper: boolean }[]
        versions: { isApproved: boolean; isBeta?: boolean; createdAt: Date | string; version: string; downloadUrl: string; changelog: string }[]
      }
      
      // Filter approved versions for regular users
      let approvedVersions = modObj.versions || []
      const isOwnerOrAdmin = currentUser && (
        currentUser.isAdmin ||
        modObj.authorId?._id.toString() === currentUser.id ||
        (modObj.collaboratorIds || []).some((c: { _id: { toString(): string } }) => c._id.toString() === currentUser.id)
      )

      if (!isOwnerOrAdmin) {
        approvedVersions = approvedVersions.filter((v: { isApproved: boolean }) => v.isApproved)
      }

      const sortedVersions = approvedVersions.sort(
        (a: { createdAt: Date | string }, b: { createdAt: Date | string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const latestVersion = sortedVersions.find((v: { isBeta?: boolean }) => !v.isBeta) || sortedVersions[0] || null

      const cleanVersions = approvedVersions.map((v: any) => {
        const { downloadUrl, ...rest } = v
        return rest
      })
      const cleanLatest = latestVersion ? { ...latestVersion } as any : null
      if (cleanLatest) {
        delete cleanLatest.downloadUrl
      }

      return {
        ...modObj,
        versions: cleanVersions,
        latestVersion: cleanLatest
      }
    })

    return {
      mods: sanitizedMods,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    }
  } catch (error) {
    console.error('Fetch mods error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve mods'
    })
  }
})
