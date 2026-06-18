<template>
  <div class="admin-page-container">
    <div v-if="authLoading || loadingData" class="admin-loading-state">
      <div class="spinner" />
      <p>{{ t('loading') }}</p>
    </div>

    <div v-else-if="user && user.isAdmin" class="admin-layout">
      <h1 class="main-title" style="margin-bottom: 24px;">{{ t('admin.title') }}</h1>

      <!-- Admin Tabs -->
      <div class="admin-tabs card">
        <button
          class="admin-tab-btn"
          :class="{ active: activeTab === 'mods' }"
          @click="activeTab = 'mods'"
        >
          {{ t('admin.pending_mods') }}
          <span v-if="pendingMods.length > 0" class="tab-count-badge">{{ pendingMods.length }}</span>
        </button>
        <button
          class="admin-tab-btn"
          :class="{ active: activeTab === 'updates' }"
          @click="activeTab = 'updates'"
        >
          {{ t('admin.pending_updates') }}
          <span v-if="pendingVersions.length > 0" class="tab-count-badge">{{ pendingVersions.length }}</span>
        </button>
        <button
          class="admin-tab-btn"
          :class="{ active: activeTab === 'edits' }"
          @click="activeTab = 'edits'"
        >
          {{ t('admin.pending_edits') }}
          <span v-if="pendingEdits.length > 0" class="tab-count-badge">{{ pendingEdits.length }}</span>
        </button>
        <button
          class="admin-tab-btn"
          :class="{ active: activeTab === 'users' }"
          @click="activeTab = 'users'"
        >
          {{ t('admin.users') }}
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="admin-tab-content">
        <!-- PENDING MODS TAB -->
        <div v-if="activeTab === 'mods'" class="tab-pane">
          <div v-if="pendingMods.length > 0" class="table-list">
            <div v-for="mod in pendingMods" :key="mod._id" class="card list-item-card">
              <div class="list-item-main">
                <div class="list-item-meta">
                  <span class="badge badge-game">{{ getGameLabel(mod.game) }}</span>
                  <span class="list-item-date">{{ formatDate(mod.createdAt) }}</span>
                </div>
                <h3 class="list-item-title">{{ mod.name }} ({{ mod.slug }})</h3>
                <p class="list-item-summary">{{ mod.summary }}</p>

                <!-- Initial version detail -->
                <div v-if="mod.versions?.[0]" class="initial-version-box">
                  <strong>Initial Release (v{{ mod.versions[0].version }}):</strong>
                  <a :href="mod.versions[0].downloadUrl" target="_blank" class="download-link-text">
                    {{ mod.versions[0].downloadUrl }}
                  </a>
                  <p v-if="mod.versions[0].changelog" class="changelog-preview">
                    Changelog: {{ mod.versions[0].changelog }}
                  </p>
                </div>

                <div class="author-info" style="margin-top: 12px;">
                  <span class="submitted-by-label">Submitted by:</span>
                  <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="Avatar" class="avatar-img-tiny">
                  <span class="author-name-text" style="display: inline-flex; align-items: center; gap: 4px;">
                    {{ mod.authorId?.globalName || mod.authorId?.username }}
                    <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 1px 3px; font-size: 8px; border-radius: 3px; line-height: 1;">✓</span>
                  </span>
                </div>
              </div>

              <div class="list-item-actions" style="display: flex; gap: 10px;">
                <UIButton
                  :label="t('admin.approve')"
                  class="success-btn"
                  @click="approveMod(mod._id)"
                />
                <UIButton
                  :label="t('admin.reject')"
                  class="danger-btn"
                  @click="rejectMod(mod._id)"
                />
              </div>
            </div>
          </div>
          <div v-else class="card empty-pane-card">
            <p>{{ t('admin.no_pending') }}</p>
          </div>
        </div>

        <!-- PENDING UPDATES TAB -->
        <div v-if="activeTab === 'updates'" class="tab-pane">
          <div v-if="pendingVersions.length > 0" class="table-list">
            <div v-for="ver in pendingVersions" :key="ver.versionId" class="card list-item-card">
              <div class="list-item-main">
                <div class="list-item-meta">
                  <span class="badge badge-game">{{ getGameLabel(ver.game) }}</span>
                  <span class="list-item-date">{{ formatDate(ver.createdAt) }}</span>
                </div>
                <h3 class="list-item-title">
                  <NuxtLink :to="`/mods/${ver.modSlug}`" class="mod-link">
                    {{ ver.modName }}
                  </NuxtLink>
                  <span class="update-version-label">Update v{{ ver.version }}</span>
                </h3>

                <div class="initial-version-box" style="margin-top: 10px;">
                  <strong>Download Link:</strong>
                  <a :href="ver.downloadUrl" target="_blank" class="download-link-text">{{ ver.downloadUrl }}</a>
                  <p v-if="ver.changelog" class="changelog-preview">
                    Changelog: {{ ver.changelog }}
                  </p>
                </div>

                <div class="author-info" style="margin-top: 12px;">
                  <span class="submitted-by-label">Submitted by:</span>
                  <img :src="ver.submittedBy?.avatar || '/images/default_avatar.png'" alt="Avatar" class="avatar-img-tiny">
                  <span class="author-name-text" style="display: inline-flex; align-items: center; gap: 4px;">
                    {{ ver.submittedBy?.globalName || ver.submittedBy?.username || 'Unknown' }}
                    <span v-if="ver.submittedBy?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 1px 3px; font-size: 8px; border-radius: 3px; line-height: 1;">✓</span>
                  </span>
                </div>
              </div>

              <div class="list-item-actions" style="display: flex; gap: 10px;">
                <UIButton
                  :label="t('admin.approve')"
                  class="success-btn"
                  @click="approveVersion(ver.modId, ver.versionId)"
                />
                <UIButton
                  :label="t('admin.reject')"
                  class="danger-btn"
                  @click="rejectVersion(ver.modId, ver.versionId)"
                />
              </div>
            </div>
          </div>
          <div v-else class="card empty-pane-card">
            <p>{{ t('admin.no_pending') }}</p>
          </div>
        </div>

        <!-- PENDING EDITS TAB -->
        <div v-if="activeTab === 'edits'" class="tab-pane">
          <div v-if="pendingEdits.length > 0" class="table-list">
            <div v-for="mod in pendingEdits" :key="mod._id" class="card list-item-card" style="display: flex; flex-direction: column; align-items: stretch; gap: 16px; padding: 24px 32px;">
              
              <!-- Meta Header -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 12px; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="badge badge-game">{{ getGameLabel(mod.game) }}</span>
                  <h3 style="font-size: 20px; font-weight: 600; margin: 0; color: #ffffff;">
                    <NuxtLink :to="`/mods/${mod.slug}`" class="mod-link" target="_blank">{{ mod.name }}</NuxtLink>
                  </h3>
                </div>
                <div class="author-info">
                  <span class="submitted-by-label">Proposed by:</span>
                  <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="Avatar" class="avatar-img-tiny">
                  <span class="author-name-text" style="display: inline-flex; align-items: center; gap: 4px;">
                    {{ mod.authorId?.globalName || mod.authorId?.username }}
                    <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 1px 3px; font-size: 8px; border-radius: 3px; line-height: 1;">✓</span>
                  </span>
                </div>
              </div>

              <!-- Changes Comparison Grid -->
              <div class="comparison-grid">
                
                <!-- Name Change -->
                <div v-if="mod.pendingEdit?.name && mod.pendingEdit.name !== mod.name" class="comparison-row">
                  <span class="comparison-row-label">Name</span>
                  <span class="comparison-row-old">{{ mod.name }}</span>
                  <span class="comparison-row-new">&rarr; {{ mod.pendingEdit.name }}</span>
                </div>
 
                <!-- Logo Change -->
                <div v-if="mod.pendingEdit?.logo !== undefined && mod.pendingEdit.logo !== mod.logo" class="comparison-row">
                  <span class="comparison-row-label">Logo</span>
                  <div class="comparison-logo-box">
                    <img v-if="mod.logo" :src="mod.logo" alt="Current Logo" class="comparison-logo-img">
                    <span v-else class="comparison-none-label">None</span>
                  </div>
                  <div class="comparison-logo-box">
                    <span class="comparison-arrow-inline">&rarr;</span>
                    <img v-if="mod.pendingEdit.logo" :src="mod.pendingEdit.logo" alt="New Logo" class="comparison-logo-img nested-logo-img">
                    <span v-else class="comparison-removed-label">Removed</span>
                  </div>
                </div>
 
                <!-- Source URL Change -->
                <div v-if="mod.pendingEdit?.sourceUrl !== undefined && mod.pendingEdit.sourceUrl !== mod.sourceUrl" class="comparison-row">
                  <span class="comparison-row-label">Source Link</span>
                  <span class="comparison-row-old comparison-url-text">{{ mod.sourceUrl || 'None' }}</span>
                  <span class="comparison-row-new comparison-url-text">&rarr; {{ mod.pendingEdit.sourceUrl || 'Removed' }}</span>
                </div>

                <!-- Community URL Change -->
                <div v-if="mod.pendingEdit?.communityUrl !== undefined && mod.pendingEdit.communityUrl !== mod.communityUrl" class="comparison-row">
                  <span class="comparison-row-label">Community Link</span>
                  <span class="comparison-row-old comparison-url-text">{{ mod.communityUrl || 'None' }}</span>
                  <span class="comparison-row-new comparison-url-text">&rarr; {{ mod.pendingEdit.communityUrl || 'Removed' }}</span>
                </div>
 
                <!-- Game Change -->
                <div v-if="mod.pendingEdit?.game && mod.pendingEdit.game !== mod.game" class="comparison-row">
                  <span class="comparison-row-label">Game</span>
                  <span class="comparison-row-old">{{ getGameLabel(mod.game) }}</span>
                  <span class="comparison-row-new">&rarr; {{ getGameLabel(mod.pendingEdit.game) }}</span>
                </div>
 
                <!-- Categories Change -->
                <div v-if="mod.pendingEdit?.categories && mod.pendingEdit.categories.length > 0 && JSON.stringify(mod.pendingEdit.categories) !== JSON.stringify(mod.categories)" class="comparison-row">
                  <span class="comparison-row-label">Categories</span>
                  <span class="comparison-row-old">{{ mod.categories.map(getCategoryLabelOnly).join(', ') }}</span>
                  <span class="comparison-row-new">&rarr; {{ mod.pendingEdit.categories.map(getCategoryLabelOnly).join(', ') }}</span>
                </div>
 
                <!-- Dependencies Change -->
                <div v-if="mod.pendingEdit?.dependencies !== undefined && JSON.stringify(mod.pendingEdit.dependencies) !== JSON.stringify(mod.dependencies || [])" class="comparison-row">
                  <span class="comparison-row-label">Dependencies</span>
                  <span class="comparison-row-old">{{ mod.dependencies?.join(', ') || 'None' }}</span>
                  <span class="comparison-row-new">&rarr; {{ mod.pendingEdit.dependencies?.join(', ') || 'None' }}</span>
                </div>
 
                <!-- Summary Change -->
                <div v-if="mod.pendingEdit?.summary && mod.pendingEdit.summary !== mod.summary" class="comparison-row">
                  <span class="comparison-row-label">Summary</span>
                  <span class="comparison-row-old-noline">{{ mod.summary }}</span>
                  <span class="comparison-row-new">&rarr; {{ mod.pendingEdit.summary }}</span>
                </div>
 
                <!-- Description Change -->
                <div v-if="mod.pendingEdit?.description && mod.pendingEdit.description !== mod.description" class="desc-comparison-row">
                  <span class="comparison-row-label">Description Change</span>
                  <div class="desc-comparison-grid">
                    <div class="desc-comparison-box desc-comparison-old">{{ mod.description }}</div>
                    <div class="desc-comparison-box desc-comparison-new">{{ mod.pendingEdit.description }}</div>
                  </div>
                </div>
 
              </div>

              <!-- Actions row -->
              <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 14px; margin-top: 8px;">
                <UIButton
                  :label="t('admin.approve_edit')"
                  class="success-btn"
                  @click="approveEdit(mod._id)"
                />
                <UIButton
                  :label="t('admin.reject_edit')"
                  class="danger-btn"
                  @click="rejectEdit(mod._id)"
                />
              </div>

            </div>
          </div>
          <div v-else class="card empty-pane-card">
            <p>{{ t('admin.no_pending') }}</p>
          </div>
        </div>

        <!-- MANAGE USERS TAB -->
        <div v-if="activeTab === 'users'" class="tab-pane">
          <div class="card search-users-bar" style="margin-bottom: 20px;">
            <input
              v-model="userSearchQuery"
              type="text"
              :placeholder="t('admin.search_users')"
              class="search-input"
              style="width: 100%; box-sizing: border-box;"
              @input="debouncedUserSearch"
            >
          </div>

          <div class="users-list-grid">
            <div v-for="u in users" :key="u._id" class="card user-row-card">
              <div class="user-card-left">
                <img :src="u.avatar || '/images/default_avatar.png'" alt="Avatar" class="user-avatar-medium">
                <div class="user-card-names">
                  <span class="user-card-global">{{ u.globalName || u.username }}</span>
                  <span class="user-card-username">@{{ u.username }}</span>
                  <span class="user-card-id">ID: {{ u.discordId }}</span>
                </div>
              </div>

              <div class="user-card-roles">
                <div style="display: flex; gap: 4px; margin-bottom: 10px;">
                  <span v-if="u.isAdmin" class="badge badge-admin">{{ t('profile.role_admin') }}</span>
                  <span v-if="u.isVerifiedDeveloper" class="badge badge-verified">{{ t('profile.role_verified_dev') }}</span>
                </div>

                <div class="user-actions-btns">
                  <UIButton
                    :label="u.isVerifiedDeveloper ? t('admin.remove_dev') : t('admin.make_dev')"
                    :class="{ 'danger-btn': u.isVerifiedDeveloper }"
                    style="font-size: 12px; padding: 6px 12px;"
                    @click="toggleRole(u._id, 'developer')"
                  />
                  <UIButton
                    v-if="u._id !== user.id"
                    :label="u.isAdmin ? t('admin.remove_admin') : t('admin.make_admin')"
                    :class="{ 'danger-btn': u.isAdmin }"
                    style="font-size: 12px; padding: 6px 12px;"
                    @click="toggleRole(u._id, 'admin')"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <!-- Pagination for Users -->
          <div v-if="userTotalPages > 1" class="pagination-container" style="margin-top: 24px;">
            <button
              class="pagination-btn"
              :disabled="userCurrentPage === 1"
              @click="changeUserPage(userCurrentPage - 1)"
            >
              {{ t('pagination.prev') }}
            </button>
            <div class="pagination-pages">
              <button
                v-for="p in visibleUserPages"
                :key="p"
                class="pagination-page-btn"
                :class="{ active: p === userCurrentPage }"
                @click="changeUserPage(p)"
              >
                {{ p }}
              </button>
            </div>
            <button
              class="pagination-btn"
              :disabled="userCurrentPage === userTotalPages"
              @click="changeUserPage(userCurrentPage + 1)"
            >
              {{ t('pagination.next') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="card error-unauthorized-card">
      <h2>Access Denied</h2>
      <p>You do not have permission to view the administrator panel.</p>
      <NuxtLink to="/">
        <UIButton label="Return to Home" />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n, navigateTo, useSeoMeta } from '#imports'
import { UIButton } from 'overlayer-ui'
import { useAuth } from '../composables/useAuth'

const { t } = useI18n()
const { user, loading: authLoading } = useAuth()

useSeoMeta({
  title: () => t('admin.title'),
  ogTitle: () => t('admin.title'),
  description: () => t('seo.description'),
  ogDescription: () => t('seo.description'),
  ogImage: '/favicon.svg',
  twitterCard: 'summary',
  robots: 'noindex, nofollow'
})

const activeTab = ref('mods')
const loadingData = ref(true)

// Tab Data
interface CreatorUser {
  _id: string
  username: string
  globalName?: string
  avatar?: string
  isVerifiedDeveloper?: boolean
}

interface PendingVersion {
  modId: string
  modName: string
  modSlug: string
  game: string
  versionId: string
  version: string
  downloadUrl: string
  changelog: string
  submittedBy?: {
    username: string
    globalName?: string
    avatar?: string
    isVerifiedDeveloper?: boolean
  }
  createdAt: string
}

interface ModVersion {
  _id?: string
  version: string
  downloadUrl: string
  changelog: string
  isApproved: boolean
  createdAt: string
  submittedBy?: {
    username: string
    globalName?: string
  }
}

interface PendingEdit {
  name?: string
  summary?: string
  description?: string
  game?: 'adofai' | 'rhythm-doctor' | 'dancing-line'
  categories?: Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
  logo?: string
  sourceUrl?: string
  communityUrl?: string
  dependencies?: string[]
  createdAt: string
}

interface ModItem {
  _id: string
  name: string
  slug: string
  summary: string
  description?: string
  game: 'adofai' | 'rhythm-doctor' | 'dancing-line'
  categories: Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
  authorId: CreatorUser
  isApproved: boolean
  createdAt: string
  versions: ModVersion[]
  pendingEdit?: PendingEdit | null
  logo?: string
  sourceUrl?: string
  communityUrl?: string
  dependencies?: string[]
}

interface UserItem {
  _id: string
  discordId: string
  username: string
  globalName?: string
  avatar?: string
  isVerifiedDeveloper: boolean
  isAdmin: boolean
}

// Tab Data
const pendingMods = ref<ModItem[]>([])
const pendingVersions = ref<PendingVersion[]>([])
const pendingEdits = ref<ModItem[]>([])
const users = ref<UserItem[]>([])
const userSearchQuery = ref('')

// Pagination states for users
const userCurrentPage = ref(1)
const userTotalPages = ref(1)
const totalUsers = ref(0)

const fetchData = async () => {
  if (!user.value || !user.value.isAdmin) return
  loadingData.value = true
  try {
    // Fetch pending list
    const pendingRes = await $fetch<{ pendingMods: ModItem[]; pendingVersions: PendingVersion[]; pendingEdits: ModItem[] }>('/api/admin/pending')
    pendingMods.value = pendingRes.pendingMods || []
    pendingVersions.value = pendingRes.pendingVersions || []
    pendingEdits.value = pendingRes.pendingEdits || []

    // Fetch users
    await fetchUsersList()
  } catch (e) {
    console.error('Failed to load admin panel data:', e)
  } finally {
    loadingData.value = false
  }
}

const fetchUsersList = async () => {
  try {
    const params: Record<string, string> = {
      page: String(userCurrentPage.value),
      limit: '20'
    }
    if (userSearchQuery.value.trim().length > 0) {
      params.search = userSearchQuery.value
    }
    const userRes = await $fetch<{ users: UserItem[]; pagination?: { total: number; page: number; limit: number; totalPages: number } }>('/api/admin/users', { params })
    users.value = userRes.users || []
    if (userRes.pagination) {
      totalUsers.value = userRes.pagination.total
      userTotalPages.value = userRes.pagination.totalPages
      userCurrentPage.value = userRes.pagination.page
    } else {
      totalUsers.value = users.value.length
      userTotalPages.value = 1
    }
  } catch (e) {
    console.error('Failed to fetch users:', e)
  }
}

const changeUserPage = (page: number) => {
  if (page < 1 || page > userTotalPages.value) return
  userCurrentPage.value = page
  fetchUsersList()
}

const visibleUserPages = computed(() => {
  const range = []
  const maxVisible = 5
  let start = Math.max(1, userCurrentPage.value - Math.floor(maxVisible / 2))
  const end = Math.min(userTotalPages.value, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    range.push(i)
  }
  return range
})

let userSearchTimeout: ReturnType<typeof setTimeout> | null = null
const debouncedUserSearch = () => {
  clearTimeout(userSearchTimeout || undefined)
  userSearchTimeout = setTimeout(() => {
    userCurrentPage.value = 1
    fetchUsersList()
  }, 300)
}

const approveMod = async (modId: string) => {
  try {
    await $fetch('/api/admin/approve-mod', {
      method: 'POST',
      body: { modId }
    })
    // Reload data
    await fetchData()
  } catch (e) {
    console.error('Failed to approve mod:', e)
    alert('Approval failed.')
  }
}

const rejectMod = async (modId: string) => {
  const reason = prompt(t('admin.reject_reason_prompt') || 'Please enter the rejection reason:')
  if (reason === null) return // Canceled
  try {
    await $fetch('/api/admin/reject-mod', {
      method: 'POST',
      body: { modId, reason }
    })
    // Reload data
    await fetchData()
  } catch (e) {
    console.error('Failed to reject mod:', e)
    alert('Rejection failed.')
  }
}

const approveVersion = async (modId: string, versionId: string) => {
  try {
    await $fetch('/api/admin/approve-version', {
      method: 'POST',
      body: { modId, versionId }
    })
    // Reload data
    await fetchData()
  } catch (e) {
    console.error('Failed to approve update:', e)
    alert('Approval failed.')
  }
}

const rejectVersion = async (modId: string, versionId: string) => {
  const reason = prompt(t('admin.reject_reason_prompt') || 'Please enter the rejection reason:')
  if (reason === null) return // Canceled
  try {
    await $fetch('/api/admin/reject-version', {
      method: 'POST',
      body: { modId, versionId, reason }
    })
    // Reload data
    await fetchData()
  } catch (e) {
    console.error('Failed to reject version:', e)
    alert('Rejection failed.')
  }
}

const toggleRole = async (targetUserId: string, role: 'developer' | 'admin') => {
  try {
    await $fetch('/api/admin/toggle-developer', {
      method: 'POST',
      body: { targetUserId, role }
    })
    // Update local user record
    const localUserIndex = users.value.findIndex((u) => u._id === targetUserId)
    if (localUserIndex > -1) {
      const u = users.value[localUserIndex]
      if (u) {
        if (role === 'developer') {
          u.isVerifiedDeveloper = !u.isVerifiedDeveloper
          if (u.isAdmin) u.isVerifiedDeveloper = true
        } else {
          u.isAdmin = !u.isAdmin
          if (u.isAdmin) u.isVerifiedDeveloper = true
        }
      }
    }
  } catch (err: unknown) {
    console.error(err)
    const error = err as { data?: { statusMessage?: string } }
    alert(error.data?.statusMessage || 'Failed to toggle role.')
  }
}

const approveEdit = async (modId: string) => {
  try {
    await $fetch('/api/admin/approve-edit', {
      method: 'POST',
      body: { modId }
    })
    await fetchData()
  } catch (e) {
    console.error('Failed to approve edits:', e)
    alert('Approval failed.')
  }
}

const rejectEdit = async (modId: string) => {
  const reason = prompt(t('admin.reject_reason_prompt') || 'Please enter the rejection reason:')
  if (reason === null) return // Canceled
  try {
    await $fetch('/api/admin/reject-edit', {
      method: 'POST',
      body: { modId, reason }
    })
    await fetchData()
  } catch (e) {
    console.error('Failed to reject edits:', e)
    alert('Rejection failed.')
  }
}

const getCategoryLabelOnly = (val: string) => {
  if (val === 'ui') return t('categories.ui')
  if (val === 'gameplay') return t('categories.gameplay')
  if (val === 'utility') return t('categories.utility')
  if (val === 'visuals') return t('categories.visuals')
  if (val === 'library') return t('categories.library')
  return val
}

const getGameLabel = (val: string) => {
  if (val === 'adofai') return t('games.adofai')
  if (val === 'rhythm-doctor') return t('games.rhythm_doctor')
  if (val === 'dancing-line') return t('games.dancing_line')
  return val
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString()
}

onMounted(async () => {
  // Wait for auth loading
  if (!authLoading.value) {
    if (!user.value || !user.value.isAdmin) {
      navigateTo('/')
    } else {
      await fetchData()
    }
  }
})
</script>

<style scoped>
.admin-page-container {
  margin-top: 10px;
}

.admin-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 0;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(145, 154, 255, 0.2);
  border-top-color: #919AFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.admin-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Tabs */
.admin-tabs {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
}

.admin-tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6);
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-tab-btn:hover {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.07);
}

.admin-tab-btn.active {
  color: #919AFF;
  background-color: rgba(145, 154, 255, 0.12);
  border-color: rgba(145, 154, 255, 0.25);
}

.tab-count-badge {
  background-color: var(--danger-red);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 20px;
}

/* Pending items table lists */
.table-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.list-item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 24px 32px;
}

@media (max-width: 768px) {
  .list-item-card {
    flex-direction: column;
    align-items: stretch;
  }
}

.list-item-main {
  flex-grow: 1;
}

.list-item-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.list-item-date {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
}

.list-item-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0 !important;
  border-left: none !important;
  padding-left: 0 !important;
}

.mod-link {
  color: #ffffff;
  text-decoration: none;
}

.mod-link:hover {
  color: #919AFF;
  text-decoration: underline;
}

.update-version-label {
  font-size: 15px;
  font-weight: 600;
  color: #919AFF;
  background-color: rgba(145, 154, 255, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  margin-left: 10px;
}

.list-item-summary {
  font-size: 14px;
  color: rgba(255,255,255,0.6);
  margin: 0 0 12px 0;
}

.initial-version-box {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 14px;
}

.download-link-text {
  color: #6C78FF;
  text-decoration: none;
  word-break: break-all;
  display: inline-block;
  margin-left: 6px;
}

.download-link-text:hover {
  text-decoration: underline;
}

.changelog-preview {
  margin: 8px 0 0 0;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
}

.avatar-img-tiny {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.author-name-text {
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  font-weight: 500;
}

.list-item-actions {
  display: flex;
  align-items: center;
}

.empty-pane-card {
  padding: 40px;
  text-align: center;
  color: rgba(255,255,255,0.4);
}

/* Manage users grid */
.users-list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.user-row-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
}

.user-card-left {
  display: flex;
  gap: 16px;
  align-items: center;
}

.user-avatar-medium {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
}

.user-card-names {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-card-global {
  font-size: 16px;
  font-weight: 600;
}

.user-card-username {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
}

.user-card-id {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
}

.user-card-roles {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 12px;
}

.user-actions-btns {
  display: flex;
  gap: 8px;
}

/* Error page */
.error-unauthorized-card {
  max-width: 500px;
  text-align: center;
  padding: 40px;
  margin: 40px auto;
}

/* Comparison grid classes */
.comparison-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.comparison-row {
  display: grid;
  grid-template-columns: 120px 1fr 1fr;
  gap: 16px;
  font-size: 14px;
  align-items: center;
}

.comparison-row-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
}

.comparison-row-old {
  color: #E2676D;
  text-decoration: line-through;
}

.comparison-row-old-noline {
  color: #E2676D;
}

.comparison-row-new {
  color: #5FC391;
  font-weight: 500;
}

.comparison-logo-box {
  display: flex;
  align-items: center;
}

.comparison-logo-img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  object-fit: cover;
}

.nested-logo-img {
  vertical-align: middle;
}

.comparison-arrow-inline {
  color: #5FC391;
  font-weight: 500;
  margin-right: 8px;
}

.comparison-none-label {
  color: rgba(255,255,255,0.4);
}

.comparison-removed-label {
  color: #E2676D;
  vertical-align: middle;
}

.comparison-url-text {
  word-break: break-all;
}

.desc-comparison-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  border-top: 1px dashed rgba(255, 255, 255, 0.05);
  padding-top: 10px;
}

.desc-comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.desc-comparison-box {
  border-radius: 8px;
  padding: 12px;
  max-height: 150px;
  overflow-y: auto;
  font-size: 13px;
  white-space: pre-wrap;
}

.desc-comparison-old {
  background-color: rgba(226, 103, 109, 0.03);
  border: 1px solid rgba(226, 103, 109, 0.1);
  color: rgba(255, 255, 255, 0.5);
}

.desc-comparison-new {
  background-color: rgba(95, 195, 145, 0.03);
  border: 1px solid rgba(95, 195, 145, 0.1);
  color: rgba(255, 255, 255, 0.95);
}

/* Mobile Media Queries */
@media (max-width: 768px) {
  .admin-tabs {
    width: 100% !important;
    overflow-x: auto !important;
    white-space: nowrap !important;
    flex-wrap: nowrap !important;
    padding: 12px 16px !important;
    gap: 8px !important;
    /* Hide scrollbar */
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .admin-tabs::-webkit-scrollbar {
    display: none;
  }
  
  .admin-tab-btn {
    flex-shrink: 0 !important;
    padding: 8px 14px !important;
    font-size: 13px !important;
  }

  .comparison-row {
    grid-template-columns: 1fr;
    gap: 6px;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
    padding-bottom: 10px;
  }

  .desc-comparison-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
