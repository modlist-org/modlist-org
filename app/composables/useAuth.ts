import { useState, navigateTo } from '#imports'

export interface AuthUser {
  id: string
  discordId: string
  username: string
  globalName?: string
  avatar?: string
  isVerifiedDeveloper: boolean
  isAdmin: boolean
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth_user', () => null)
  const loading = useState<boolean>('auth_loading', () => true)
  const invitationsCount = useState<number>('invitations_count', () => 0)

  const fetchInvitationsCount = async () => {
    if (!user.value) {
      invitationsCount.value = 0
      return
    }
    try {
      const res = await $fetch<{ mods: any[] }>('/api/mods/invitations')
      invitationsCount.value = res.mods?.length || 0
    } catch (e) {
      console.error('Failed to fetch invitations count:', e)
    }
  }

  const fetchUser = async () => {
    loading.value = true
    try {
      const data = await $fetch<{ user: AuthUser | null }>('/api/auth/me')
      user.value = data.user
      if (user.value) {
        await fetchInvitationsCount()
      } else {
        invitationsCount.value = 0
      }
    } catch {
      user.value = null
      invitationsCount.value = 0
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      user.value = null
      invitationsCount.value = 0
      // Redirect to home page
      navigateTo('/')
    } catch (e) {
      console.error('Logout failed:', e)
    }
  }

  return {
    user,
    loading,
    fetchUser,
    logout,
    invitationsCount,
    fetchInvitationsCount
  }
}
