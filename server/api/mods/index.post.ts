import { mods, modVersions, modCollaborators, modDependencies, CATEGORIES, normalizeGames } from '../../db/schema'
import { useDb, newId } from '../../utils/db'
import { getAvailablePlatforms, isHttpUrl, normalizePlatformDownloads } from '../../utils/mod-platform'
import { collaboratorRows, dependencyRows, findModBySlug, hydrateMods, validateDependencyIds, validateUserIds } from '../../utils/mod-repo'
import { storeLogo } from '../../utils/logo'
import { runInBackground, sendDiscordWebhook } from '../../utils/webhook'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to submit a mod.'
    })
  }

  const body = await readBody(event)
  const {
    name,
    slug,
    game,
    games,
    categories,
    summary,
    description,
    version,
    downloadUrl,
    platformDownloads,
    changelog,
    gameVersion,
    collaboratorIds,
    logo,
    sourceUrl,
    communityUrl,
    dependencies,
    isBeta
  } = body

  // 1. Validations
  const normalizedPlatformDownloads = normalizePlatformDownloads(platformDownloads)
  const availablePlatforms = getAvailablePlatforms(normalizedPlatformDownloads)

  const targetGames = normalizeGames(games, game)

  if (!name || !slug || targetGames.length === 0 || !categories || !summary || !version || (!downloadUrl && availablePlatforms.length === 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Required fields: name, slug, game, categories, summary, version, and at least one platform download link.'
    })
  }

  if (sourceUrl && !isHttpUrl(sourceUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Source code link must be a valid HTTP/HTTPS URL.'
    })
  }

  if (communityUrl && !isHttpUrl(communityUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Community link must be a valid HTTP/HTTPS URL.'
    })
  }


  if (!Array.isArray(categories) || categories.length === 0 || categories.some((cat) => !(CATEGORIES as readonly string[]).includes(cat))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or empty categories selected.'
    })
  }

  const db = useDb(event)

  // Ensure slug format is lowercase URL friendly
  const formattedSlug = String(slug).toLowerCase().replace(/[^a-z0-9-_]/g, '')
  if (formattedSlug.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid slug. Must contain only alphanumeric characters, dashes, and underscores.'
    })
  }

  // Check slug uniqueness
  const existingMod = await findModBySlug(db, formattedSlug)
  if (existingMod) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A mod with this slug already exists. Please choose a different slug.'
    })
  }

  if (downloadUrl && !isHttpUrl(downloadUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Download link must be a valid direct HTTP/HTTPS URL (e.g. GitHub release).'
    })
  }

  for (const platform of availablePlatforms) {
    if (!isHttpUrl(normalizedPlatformDownloads[platform])) {
      throw createError({
        statusCode: 400,
        statusMessage: `${platform} download link must be a valid direct HTTP/HTTPS URL.`
      })
    }
  }

  const normalizedDownloadUrl = downloadUrl?.trim() || normalizedPlatformDownloads[availablePlatforms[0] as keyof typeof normalizedPlatformDownloads]

  const validatedCollabIds = await validateUserIds(db, collaboratorIds, currentUser.id)
  const validatedDepIds = await validateDependencyIds(db, dependencies, targetGames)
  const storedLogo = await storeLogo(event, logo)

  // 2. Determine approval status
  // Mod approval bypass is allowed only for verified developers or admins.
  const isAutoApproved = currentUser.isVerifiedDeveloper || currentUser.isAdmin

  try {
    const modId = newId()
    const now = new Date()
    const initialChangelog = changelog || 'Initial release'

    await db.batch([
      db.insert(mods).values({
        id: modId,
        name,
        slug: formattedSlug,
        game: targetGames[0]!,
        games: targetGames,
        categories,
        summary,
        description: description || '',
        authorId: currentUser.id,
        isApproved: isAutoApproved,
        logo: storedLogo,
        sourceUrl: sourceUrl || '',
        communityUrl: communityUrl || '',
        downloads: 0,
        createdAt: now,
        updatedAt: now
      }),
      db.insert(modVersions).values({
        id: newId(),
        modId,
        version,
        downloadUrl: normalizedDownloadUrl!,
        platformDownloads: normalizedPlatformDownloads,
        changelog: initialChangelog,
        gameVersion: gameVersion || '',
        isApproved: isAutoApproved,
        isBeta: !!isBeta,
        submittedBy: currentUser.id,
        createdAt: now
      }),
      ...(validatedCollabIds.length > 0 ? [db.insert(modCollaborators).values(collaboratorRows(modId, [], validatedCollabIds))] : []),
      ...(validatedDepIds.length > 0 ? [db.insert(modDependencies).values(dependencyRows(modId, validatedDepIds))] : [])
    ])

    if (isAutoApproved) {
      const created = await findModBySlug(db, formattedSlug)
      const [hydrated] = created ? await hydrateMods(db, [created]) : []
      if (hydrated) {
        runInBackground(event, sendDiscordWebhook(
          event,
          hydrated,
          { version, downloadUrl: normalizedDownloadUrl!, changelog: initialChangelog, gameVersion: gameVersion || '', isBeta: !!isBeta }
        ), 'Discord webhook on creation')
      }
    }

    return {
      success: true,
      mod: {
        id: modId,
        slug: formattedSlug,
        isApproved: isAutoApproved
      }
    }
  } catch (error) {
    console.error('Error creating mod:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create mod.'
    })
  }
})
