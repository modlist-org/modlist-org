import { desc, eq, inArray } from 'drizzle-orm'
import { mods, users } from '../../../db/schema'
import { hydrateMods, latestVersions, stripDownloadUrls, toPublicUser } from '../../../utils/mod-repo'
import { loadOrg } from '../../../utils/org'

export default defineEventHandler(async (event) => {
  const { db, org, members, membership, user } = await loadOrg(event)
  const isMember = membership?.status === 'accepted'
  const canSeePending = isMember || !!user?.isAdmin

  const visibleMembers = members.filter((m) => m.status === 'accepted' || canSeePending)
  const [userRows, modRows] = await Promise.all([
    visibleMembers.length > 0
      ? db.select().from(users).where(inArray(users.id, visibleMembers.map((m) => m.userId)))
      : Promise.resolve([]),
    db.select().from(mods).where(eq(mods.organizationId, org.id)).orderBy(desc(mods.downloads))
  ])
  const userMap = new Map(userRows.map((u) => [u.id, toPublicUser(u)]))

  // Members see the organization's unapproved mods too, like collaborators do
  const hydrated = await hydrateMods(db, modRows.filter((m) => m.isApproved || canSeePending))
  const orgMods = hydrated.map(({ pendingEdit: _, versions, ...mod }) => {
    const visible = versions.filter((v) => v.isApproved)
    const latest = latestVersions(mod as typeof hydrated[number], visible).latestVersion
    return { ...mod, versions: [], latestVersion: latest ? stripDownloadUrls(latest) : null }
  })

  return {
    organization: {
      _id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      logo: org.logo,
      createdAt: org.createdAt.toISOString(),
      members: visibleMembers
        .map((m) => ({ user: userMap.get(m.userId), role: m.role, status: m.status }))
        .filter((m) => !!m.user)
    },
    mods: orgMods,
    myRole: isMember ? membership.role : null,
    isInvited: membership?.status === 'pending'
  }
})
