interface Person {
  _id: string
  username: string
  globalName?: string
  avatar?: string
  isVerifiedDeveloper?: boolean
}

interface Credited {
  authorId?: Person | null
  collaboratorIds?: Person[]
  organization?: { memberIds?: string[] } | null
}

// People shown next to a mod. An organization-owned mod is credited to the organization (like GitHub),
// so the original author is dropped and only collaborators outside the organization remain.
export function creditedPeople(mod: Credited): Person[] {
  if (!mod.organization) return [...(mod.authorId ? [mod.authorId] : []), ...(mod.collaboratorIds ?? [])]
  const members = mod.organization.memberIds ?? []
  return (mod.collaboratorIds ?? []).filter((c) => !members.includes(c._id))
}
