import { mods, modBranches, modVersions, modCollaborators, modDependencies, CATEGORIES, normalizeGames, normalizeTranslations } from '../../db/schema'
import { useDb, newId } from '../../utils/db'
import { isHttpUrl, parseVersionInput } from '../../utils/mod-platform'
import { collaboratorRows, dependencyRows, findModBySlug, hydrateMods, isOrgMember, validateDependencyIds, validateUserIds } from '../../utils/mod-repo'
import { storeLogo } from '../../utils/logo'
import { runInBackground, sendAdminPendingWebhook, sendDiscordWebhook } from '../../utils/webhook'

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
    translations,
    changelog,
    collaboratorIds,
    organizationId,
    logo,
    sourceUrl,
    communityUrl,
    dependencies
  } = body

  // 1. Validations
  const targetGames = normalizeGames(games, game)

  if (!name || !slug || targetGames.length === 0 || !categories || !summary) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Required fields: name, slug, game, categories, summary, version, and at least one platform download link.'
    })
  }

  const { version, files, downloadUrl: normalizedDownloadUrl, platformDownloads: normalizedPlatformDownloads, loaderDownloads, gameVersion, isBeta } = parseVersionInput(body)

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

  if (organizationId && (typeof organizationId !== 'string' || !await isOrgMember(db, organizationId, currentUser.id))) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You can only assign mods to organizations you are a member of.'
    })
  }

  const validatedCollabIds = await validateUserIds(db, collaboratorIds, currentUser.id)
  const validatedDepIds = await validateDependencyIds(db, dependencies, targetGames)
  const storedLogo = await storeLogo(event, logo)

  // 2. Determine approval status
  // Mod approval bypass is allowed only for verified developers or admins.
  const isAutoApproved = currentUser.isVerifiedDeveloper || currentUser.isAdmin

  try {
    const modId = newId()
    const mainBranchId = newId()
    // Beta first releases also get a beta branch, matching how migrated mods were split
    const betaBranchId = isBeta ? newId() : null
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
        translations: normalizeTranslations(translations),
        authorId: currentUser.id,
        organizationId: organizationId || null,
        defaultBranchId: mainBranchId,
        betaBranchId,
        isApproved: isAutoApproved,
        logo: storedLogo,
        sourceUrl: sourceUrl || '',
        communityUrl: communityUrl || '',
        downloads: 0,
        createdAt: now,
        updatedAt: now
      }),
      db.insert(modBranches).values([
        { id: mainBranchId, modId, name: 'main', position: 0, createdAt: now },
        ...(betaBranchId ? [{ id: betaBranchId, modId, name: 'beta', position: 1, createdAt: now }] : [])
      ]),
      db.insert(modVersions).values({
        id: newId(),
        modId,
        branchId: betaBranchId ?? mainBranchId,
        version,
        downloadUrl: normalizedDownloadUrl,
        platformDownloads: normalizedPlatformDownloads,
        loaderDownloads,
        files,
        changelog: initialChangelog,
        gameVersion: gameVersion || '',
        isApproved: isAutoApproved,
        isBeta,
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
          { version, downloadUrl: normalizedDownloadUrl || files[0]!.url, changelog: initialChangelog, gameVersion, isBeta }
        ), 'Discord webhook on creation')
      }
    } else {
      runInBackground(event, sendAdminPendingWebhook(event, 'mod', { name, slug: formattedSlug }, `v${version}`), 'Admin webhook on pending mod')
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
