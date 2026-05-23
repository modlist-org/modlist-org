<template>
  <div v-if="loading" class="detail-loading-state">
    <div class="spinner" />
    <p>{{ t('loading') }}</p>
  </div>

  <div v-else-if="mod" class="detail-grid">
    <!-- Rejected Mod Banner -->
    <div v-if="!mod.isApproved && mod.rejectionReason" class="card rejection-banner" style="grid-column: 1 / -1; border-color: rgba(226, 103, 109, 0.3); background-color: rgba(226, 103, 109, 0.03); padding: 16px 20px; display: flex; align-items: center; gap: 12px; border-radius: 12px; flex-wrap: wrap;">
      <svg viewBox="0 0 24 24" fill="none" style="width: 20px; height: 20px; color: #E2676D; flex-shrink: 0;" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span style="font-size: 14px; font-weight: 500; color: #E2676D;">
        {{ t('mod.rejection_reason_banner', { reason: mod.rejectionReason }) }}
      </span>
    </div>

    <!-- Rejected Edit Banner -->
    <div v-if="mod.editRejectionReason" class="card rejection-banner" style="grid-column: 1 / -1; border-color: rgba(226, 103, 109, 0.3); background-color: rgba(226, 103, 109, 0.03); padding: 16px 20px; display: flex; align-items: center; gap: 12px; border-radius: 12px; flex-wrap: wrap;">
      <svg viewBox="0 0 24 24" fill="none" style="width: 20px; height: 20px; color: #E2676D; flex-shrink: 0;" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span style="font-size: 14px; font-weight: 500; color: #E2676D;">
        {{ t('mod.edit_rejection_reason_banner', { reason: mod.editRejectionReason }) }}
      </span>
    </div>

    <!-- Pending Edit Banner (Only for owners/collabs/admins) -->
    <div v-if="mod.pendingEdit && isEditable" class="card pending-edit-banner" style="grid-column: 1 / -1; border-color: rgba(240, 173, 78, 0.3); background-color: rgba(240, 173, 78, 0.03); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; border-radius: 12px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg viewBox="0 0 24 24" fill="none" style="width: 20px; height: 20px; color: #f0ad4e;" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-size: 14px; font-weight: 500; color: #f0ad4e;">
          {{ t('mod.details.pending_edit_banner') }}
        </span>
      </div>
      <UIToggle
        v-model="showPreviewMode"
        :default-value="false"
        :label="t('mod.details.preview_changes')"
        :font-size="13"
        class="preview-toggle-custom"
      />
    </div>

    <!-- Left Column: Detailed Info -->
    <div class="detail-main-pane">
      <div class="card detail-header-card">
        <div class="header-card-body">
          <div class="header-logo-container">
            <img v-if="activeLogo" :src="activeLogo" alt="Mod Logo" class="header-logo-img">
            <div v-else class="header-logo-fallback" :style="fallbackGradientStyle">
              <span>{{ activeName ? activeName.charAt(0).toUpperCase() : 'M' }}</span>
            </div>
          </div>
          <div class="header-info-container">
            <div class="header-text-block">
              <div class="header-badges">
                <span v-if="mod.isFeatured" class="badge badge-featured">⭐ {{ t('sort.featured', 'Featured') }}</span>
                <span class="badge badge-game">{{ getGameLabel((showPreviewMode && mod.pendingEdit?.game) ? mod.pendingEdit.game : mod.game) }}</span>
                <span v-for="cat in ((showPreviewMode && mod.pendingEdit?.categories && mod.pendingEdit.categories.length > 0) ? mod.pendingEdit.categories : mod.categories)" :key="cat" class="badge badge-category">{{ getCategoryLabel(cat) }}</span>
                <span v-if="!mod.isApproved" class="badge badge-pending">{{ t('mod.details.pending_approval') }}</span>
              </div>
              <h1 class="mod-title">{{ activeName }}</h1>
              <p class="mod-summary-text">{{ (showPreviewMode && mod.pendingEdit?.summary) ? mod.pendingEdit.summary : mod.summary }}</p>
            </div>

            <div v-if="isEditable" class="header-actions">
              <NuxtLink :to="`/edit/${mod.slug}`" class="header-edit-link">
                <UIButton :label="t('mod.details.edit')" class="header-edit-button" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- AdSense Advertisement -->
      <AdBanner
        ad-layout="in-article"
        ad-format="fluid"
        ad-slot="7347692922"
        :ad-style="{ display: 'block', textAlign: 'center' }"
      />

      <!-- Description Block -->
      <div class="card detail-desc-card">
        <h3>{{ t('mod.details.about') }}</h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="markdown-body" v-html="renderedDescription" />
      </div>

      <!-- Version History -->
      <div class="card detail-versions-card">
        <h3>{{ t('mod.details.versions') }}</h3>
        <div class="versions-list">
          <div v-for="ver in paginatedVersions" :key="ver._id" :class="{ 'pending-version': !ver.isApproved }" class="version-row">
            <div class="version-row-header">
              <div class="version-meta-left">
                <span class="version-number">v{{ ver.version }}</span>
                <span v-if="ver.isBeta" class="badge badge-beta version-beta-badge" style="font-size: 11px; padding: 2px 6px; border-radius: 6px; background-color: rgba(240, 173, 78, 0.15); color: #f0ad4e; border: 1px solid rgba(240, 173, 78, 0.3); text-transform: uppercase;">BETA</span>
                <span v-if="ver.gameVersion" class="badge badge-category version-game-version-badge" style="font-size: 11px; padding: 2px 6px; border-radius: 6px;">{{ ver.gameVersion }}</span>
                <span v-if="!ver.isApproved" class="badge badge-pending version-pending-badge">{{ t('mod.details.pending_approval') }}</span>
              </div>
              <span class="version-date">{{ formatDate(ver.createdAt) }}</span>
            </div>

            <!-- Version Rejection Reason -->
            <div v-if="!ver.isApproved && ver.rejectionReason" class="version-rejection-reason">
              <strong>{{ t('mod.details.rejection_reason_label') || 'Rejection Reason:' }}</strong> {{ ver.rejectionReason }}
            </div>

            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="ver.changelog" class="version-changelog markdown-body" v-html="renderMarkdown(ver.changelog)" />


            <div class="version-footer">
              <div class="submitted-by-label">
                {{ t('mod.details.submitted_by', { user: 'USER_PLACEHOLDER' }).split('USER_PLACEHOLDER')[0] }}<span class="version-submitter">{{ ver.submittedBy?.globalName || ver.submittedBy?.username || 'Unknown' }}<span v-if="ver.submittedBy?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified version-verified-badge">✓</span></span>{{ t('mod.details.submitted_by', { user: 'USER_PLACEHOLDER' }).split('USER_PLACEHOLDER')[1] }}
              </div>
              <div class="version-actions">
                <UIButton
                  v-if="!ver.isApproved && isEditable"
                  :label="t('mod.details.delete_version')"
                  class="danger-btn version-action-btn"
                  @click="deleteVersion(ver._id)"
                />
                <UIButton
                  :label="t('mod.details.download')"
                  class="version-action-btn"
                  @click="triggerDownload(ver.downloadUrl)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Versions Pagination -->
        <div v-if="totalVersionPages > 1" class="pagination-container" style="margin-top: 24px; margin-bottom: 0;">
          <button
            class="pagination-btn"
            :disabled="versionPage === 1"
            @click="changeVersionPage(versionPage - 1)"
          >
            {{ t('pagination.prev') }}
          </button>
          <div class="pagination-pages">
            <button
              v-for="p in visibleVersionPages"
              :key="p"
              class="pagination-page-btn"
              :class="{ active: p === versionPage }"
              @click="changeVersionPage(p)"
            >
              {{ p }}
            </button>
          </div>
          <button
            class="pagination-btn"
            :disabled="versionPage === totalVersionPages"
            @click="changeVersionPage(versionPage + 1)"
          >
            {{ t('pagination.next') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Right Column: Sidebar & Actions -->
    <div class="detail-sidebar-pane">
      <!-- Admin Controls Panel (Only Admins) -->
      <div v-if="user?.isAdmin && mod" class="card sidebar-card admin-controls-card">
        <h3 class="admin-controls-title">
          {{ t('admin.controls') }}
        </h3>
        <div class="admin-controls-buttons">
          <UIButton
            v-if="mod.isApproved"
            :label="mod.isFeatured ? t('admin.unfeature_mod', 'Unfeature Mod') : t('admin.feature_mod', 'Feature Mod')"
            :class="{ 'danger-btn': mod.isFeatured }"
            class="admin-btn"
            @click="adminToggleFeatured"
          />
          <UIButton
            v-if="!mod.isApproved"
            :label="t('admin.approve_mod')"
            class="success-btn admin-btn"
            @click="adminApprove"
          />
          <UIButton
            v-if="!mod.isApproved"
            :label="t('admin.reject_mod')"
            class="danger-btn admin-btn"
            @click="adminReject"
          />
          <UIButton
            v-if="mod.isApproved"
            :label="t('admin.unapprove_mod')"
            class="danger-btn admin-btn"
            @click="adminUnapprove"
          />
          <UIButton
            :label="t('admin.delete_mod')"
            class="danger-btn admin-btn admin-delete-btn"
            @click="adminDelete"
          />
        </div>
      </div>

      <!-- Download / Action Panel -->
      <div class="card sidebar-card action-card">
        <UIButton
          v-if="latestVersion"
          :label="`${t('mod.details.download')} (v${latestVersion.version})`"
          class="download-main-btn"
          @click="triggerDownload(latestVersion.downloadUrl)"
        />
        <UIButton
          v-if="latestBetaVersion"
          :label="`${t('mod.details.download_beta')} (v${latestBetaVersion.version})`"
          class="download-beta-btn"
          @click="triggerDownload(latestBetaVersion.downloadUrl)"
        />
        <div v-if="!latestVersion && !latestBetaVersion" class="no-download-state">
          <p>{{ t('mod.details.no_downloads') }}</p>
        </div>

        <!-- Source Code Link -->
        <UIButton
          v-if="activeSourceUrl"
          :label="t('mod.details.source_code')"
          class="source-code-btn"
          @click="triggerSourceCodeRedirect(activeSourceUrl)"
        />

        <div class="stats-sidebar-grid">
          <div class="stat-sidebar-item">
            <span class="stat-label">{{ t('mod.details.downloads_label') }}</span>
            <span class="stat-val">{{ mod.downloads }}</span>
          </div>
          <div class="stat-sidebar-item">
            <span class="stat-label">{{ t('mod.details.creator_label') }}</span>
            <span class="stat-val author-tag">
              <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="Avatar" class="avatar-tag-img" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
              {{ mod.authorId?.globalName || mod.authorId?.username }}
              <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 2px 4px; font-size: 9px; border-radius: 4px; line-height: 1; margin-left: 2px;">✓</span>
            </span>
          </div>
          <div v-if="mod.collaboratorIds?.length > 0" class="stat-sidebar-item">
            <span class="stat-label">{{ t('mod.details.collabs') }}</span>
            <div class="collab-tag-list">
              <span v-for="c in mod.collaboratorIds" :key="c._id" class="collab-tag">
                <img :src="c.avatar || '/images/default_avatar.png'" alt="Avatar" class="avatar-tag-img" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
                {{ c.globalName || c.username }}
                <span v-if="c.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 2px 4px; font-size: 9px; border-radius: 4px; line-height: 1; margin-left: 2px;">✓</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit Update (Author / Collab only) -->
      <div v-if="isEditable" class="card sidebar-card update-submission-card">
        <h3>{{ t('update.title') }}</h3>

        <form class="update-form" @submit.prevent="submitUpdate">
          <div class="form-group">
            <label for="new-version">{{ t('update.version') }}</label>
            <input
              id="new-version"
              v-model="updateForm.version"
              type="text"
              :placeholder="t('submit.version_placeholder')"
              required
            >
          </div>

          <div class="form-group">
            <label for="new-game-version">{{ t('submit.game_version') }}</label>
            <input
              id="new-game-version"
              v-model="updateForm.gameVersion"
              type="text"
              :placeholder="t('submit.game_version_placeholder')"
            >
          </div>

          <div class="form-group">
            <label for="new-download">{{ t('submit.download_url') }}</label>
            <input
              id="new-download"
              v-model="updateForm.downloadUrl"
              type="text"
              :placeholder="t('submit.download_placeholder')"
              required
            >
            <span class="form-help-text">{{ t('submit.download_url_help') }}</span>
          </div>

          <div class="form-group" style="margin-bottom: 20px; width: 220px;">
            <UIToggle
              v-model="updateForm.isBeta"
              :default-value="false"
              :label="t('submit.is_beta_label', 'Mark as Beta Version')"
              :font-size="14"
            />
          </div>

          <div class="form-group">
            <label for="new-changelog">{{ t('submit.changelog') }}</label>
            <textarea
              id="new-changelog"
              v-model="updateForm.changelog"
              rows="4"
              :placeholder="t('update.changelog_placeholder')"
            />
          </div>

          <div v-if="formError" class="form-error-msg">
            {{ formError }}
          </div>
          <div v-if="formSuccess" class="form-success-msg">
            {{ formSuccess }}
          </div>

          <UIButton
            :label="submittingUpdate ? t('update.submitting') : t('update.submit')"
            :blocked="submittingUpdate"
            type="submit"
            style="width: 100%;"
          />
        </form>
      </div>
    </div>
  </div>

  <div v-else class="card detail-not-found-state">
    <h2>{{ t('submit.mod_not_found') }}</h2>
    <p>{{ t('mod.details.not_approved_detail') }}</p>
    <NuxtLink to="/">
      <UIButton :label="t('mod.details.back_home')" />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useI18n, navigateTo, useFetch, useSeoMeta } from '#imports'
import { UIButton, UIToggle } from 'overlayer-ui'
import { useAuth } from '../../composables/useAuth'
import { marked } from 'marked'

interface CreatorUser {
  _id: string
  username: string
  globalName?: string
  avatar?: string
  isVerifiedDeveloper: boolean
}

interface ModVersion {
  _id?: string
  version: string
  downloadUrl: string
  changelog: string
  gameVersion?: string
  isApproved: boolean
  isBeta?: boolean
  rejectionReason?: string
  submittedBy?: {
    username: string
    globalName?: string
    isVerifiedDeveloper?: boolean
  }
  createdAt: string
}

interface PendingEdit {
  name?: string
  summary?: string
  description?: string
  game?: 'adofai' | 'rhythm-doctor'
  categories?: Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
  logo?: string
  sourceUrl?: string
  createdAt: string
}

interface ModItem {
  _id: string
  name: string
  slug: string
  summary: string
  description?: string
  game: 'adofai' | 'rhythm-doctor'
  categories: Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
  authorId: CreatorUser
  collaboratorIds: CreatorUser[]
  pendingEdit?: PendingEdit | null
  isApproved: boolean
  rejectionReason?: string
  editRejectionReason?: string
  logo?: string
  sourceUrl?: string
  downloads: number
  versions: ModVersion[]
  isFeatured?: boolean
}

const route = useRoute()
const slug = route.params.slug as string
const { t } = useI18n()
const { user } = useAuth()

// Fetch mod details on both server and client side
const { data: modData, error: fetchError } = await useFetch<{ mod: ModItem; latestVersion: ModVersion | null; latestBetaVersion: ModVersion | null; isEditable: boolean }>(`/api/mods/${slug}`)

const mod = ref<ModItem | null>(null)
const latestVersion = ref<ModVersion | null>(null)
const latestBetaVersion = ref<ModVersion | null>(null)
const isEditable = ref(false)
const showPreviewMode = ref(false)
const loading = ref(true)

watch([modData, fetchError], ([newVal, err]) => {
  if (newVal) {
    mod.value = newVal.mod
    latestVersion.value = newVal.latestVersion
    latestBetaVersion.value = newVal.latestBetaVersion
    isEditable.value = newVal.isEditable
    loading.value = false
  } else if (err) {
    mod.value = null
    latestVersion.value = null
    latestBetaVersion.value = null
    isEditable.value = false
    loading.value = false
  }
}, { immediate: true })

// Version History Pagination
const versionPage = ref(1)
const versionsPerPage = 5

const totalVersionPages = computed(() => {
  if (!mod.value || !mod.value.versions) return 1
  return Math.ceil(mod.value.versions.length / versionsPerPage) || 1
})

const paginatedVersions = computed(() => {
  if (!mod.value || !mod.value.versions) return []
  const start = (versionPage.value - 1) * versionsPerPage
  const end = start + versionsPerPage
  return mod.value.versions.slice(start, end)
})

const changeVersionPage = (page: number) => {
  if (page < 1 || page > totalVersionPages.value) return
  versionPage.value = page
}

const visibleVersionPages = computed(() => {
  const range = []
  const maxVisible = 5
  let start = Math.max(1, versionPage.value - Math.floor(maxVisible / 2))
  const end = Math.min(totalVersionPages.value, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    range.push(i)
  }
  return range
})

watch(totalVersionPages, (newTotal) => {
  if (versionPage.value > newTotal) {
    versionPage.value = Math.max(1, newTotal)
  }
})


// SEO Metadata
useSeoMeta({
  title: () => mod.value ? mod.value.name : 'Loading...',
  ogTitle: () => mod.value ? mod.value.name : 'Loading...',
  description: () => mod.value?.summary || t('seo.description'),
  ogDescription: () => mod.value?.summary || t('seo.description'),
  ogImage: () => mod.value?.logo || '/favicon.svg',
  twitterCard: 'summary'
})

// Update Release form state
const updateForm = ref({
  version: '',
  downloadUrl: '',
  changelog: '',
  gameVersion: '',
  isBeta: false
})
const submittingUpdate = ref(false)
const formError = ref('')
const formSuccess = ref('')

const activeLogo = computed(() => {
  if (showPreviewMode.value && mod.value?.pendingEdit?.logo !== undefined) {
    return mod.value.pendingEdit.logo
  }
  return mod.value?.logo
})

const activeName = computed(() => {
  if (showPreviewMode.value && mod.value?.pendingEdit?.name) {
    return mod.value.pendingEdit.name
  }
  return mod.value?.name || ''
})

const activeSourceUrl = computed(() => {
  if (showPreviewMode.value && mod.value?.pendingEdit?.sourceUrl !== undefined) {
    return mod.value.pendingEdit.sourceUrl
  }
  return mod.value?.sourceUrl
})

const triggerSourceCodeRedirect = (url: string) => {
  if (url) {
    window.open(url, '_blank')
  }
}

const fallbackGradientStyle = computed(() => {
  const name = mod.value?.name || 'M'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const h1 = Math.abs(hash) % 360
  const h2 = (h1 + 40) % 360
  return {
    background: `linear-gradient(135deg, hsl(${h1}, 70%, 50%) 0%, hsl(${h2}, 70%, 40%) 100%)`
  }
})

const fetchModDetails = async () => {
  loading.value = true
  try {
    const response = await $fetch<{ mod: ModItem; latestVersion: ModVersion | null; latestBetaVersion: ModVersion | null; isEditable: boolean }>(`/api/mods/${slug}`)
    mod.value = response.mod
    latestVersion.value = response.latestVersion
    latestBetaVersion.value = response.latestBetaVersion
    isEditable.value = response.isEditable
    versionPage.value = 1
  } catch (error) {
    console.error('Failed to load mod details:', error)
    mod.value = null
  } finally {
    loading.value = false
  }
}

const renderedDescription = computed(() => {
  const desc = (showPreviewMode.value && mod.value?.pendingEdit?.description !== undefined)
    ? mod.value.pendingEdit.description
    : mod.value?.description

  if (!desc) return '<em>No description provided.</em>'
  try {
    return marked.parse(desc)
  } catch {
    return desc
  }
})

const renderMarkdown = (text: string) => {
  if (!text) return ''
  try {
    return marked.parse(text)
  } catch {
    return text
  }
}

const getGameLabel = (game: string) => {
  if (game === 'adofai') return t('games.adofai')
  if (game === 'rhythm-doctor') return t('games.rhythm_doctor')
  return game
}

const getCategoryLabel = (val: string) => {
  if (val === 'ui') return t('categories.ui')
  if (val === 'gameplay') return t('categories.gameplay')
  if (val === 'utility') return t('categories.utility')
  if (val === 'visuals') return t('categories.visuals')
  if (val === 'library') return t('categories.library')
  return val
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Download click handler
const triggerDownload = async (url: string) => {
  if (!url) return

  // Call the analytics increment endpoint in background
  try {
    await $fetch(`/api/mods/${slug}/download`, { method: 'POST' })
    if (mod.value) {
      mod.value.downloads++
    }
  } catch (e) {
    console.error('Failed to track download count:', e)
  }

  // Redirect to download link
  window.open(url, '_blank')
}
// Delete version submission helper
const deleteVersion = async (versionId: string | undefined) => {
  if (!versionId) return
  if (!confirm(t('mod.details.delete_version_confirm') || 'Are you sure you want to delete this version submission?')) return
  try {
    const data = await $fetch<{ success: boolean }>(`/api/mods/${slug}/versions/delete`, {
      method: 'POST',
      body: { versionId }
    })
    if (data.success) {
      await fetchModDetails()
    }
  } catch (e) {
    console.error(e)
    alert('Failed to delete version submission.')
  }
}

// Submit Update version
const submitUpdate = async () => {
  submittingUpdate.value = true
  formError.value = ''
  formSuccess.value = ''

  try {
    await $fetch(`/api/mods/${slug}/versions`, {
      method: 'POST',
      body: updateForm.value
    })

    formSuccess.value = user.value?.isVerifiedDeveloper || user.value?.isAdmin
      ? 'Update published successfully!'
      : 'Update submitted and is pending administrator approval.'

    // Reset Form
    updateForm.value = {
      version: '',
      downloadUrl: '',
      changelog: '',
      gameVersion: '',
      isBeta: false
    }

    // Refresh details after a short delay
    setTimeout(() => {
      fetchModDetails()
      formSuccess.value = ''
    }, 1500)

  } catch (err: unknown) {
    console.error('Failed to submit version update:', err)
    const error = err as { data?: { statusMessage?: string } }
    formError.value = error.data?.statusMessage || 'An unexpected error occurred.'
  } finally {
    submittingUpdate.value = false
  }
}

const adminApprove = async () => {
  try {
    await $fetch('/api/admin/approve-mod', {
      method: 'POST',
      body: { modId: mod.value?._id }
    })
    await fetchModDetails()
  } catch (e) {
    console.error(e)
    alert('Failed to approve mod.')
  }
}

const adminReject = async () => {
  const reason = prompt(t('admin.reject_reason_prompt') || 'Please enter the rejection reason:')
  if (reason === null) return // Canceled
  try {
    await $fetch('/api/admin/reject-mod', {
      method: 'POST',
      body: { modId: mod.value?._id, reason }
    })
    await fetchModDetails()
  } catch (e) {
    console.error(e)
    alert('Failed to reject mod.')
  }
}

const adminUnapprove = async () => {
  if (!confirm(t('admin.unapprove_confirm'))) return
  try {
    await $fetch('/api/admin/unapprove-mod', {
      method: 'POST',
      body: { modId: mod.value?._id }
    })
    await fetchModDetails()
  } catch (e) {
    console.error(e)
    alert('Failed to unapprove mod.')
  }
}

const adminDelete = async () => {
  if (!confirm(t('admin.delete_confirm'))) return
  try {
    await $fetch('/api/admin/delete-mod', {
      method: 'POST',
      body: { modId: mod.value?._id }
    })
    navigateTo('/')
  } catch (e) {
    console.error(e)
    alert('Failed to delete mod.')
  }
}

const adminToggleFeatured = async () => {
  try {
    await $fetch('/api/admin/toggle-featured', {
      method: 'POST',
      body: { modId: mod.value?._id }
    })
    await fetchModDetails()
  } catch (e) {
    console.error(e)
    alert('Failed to toggle featured status.')
  }
}

onMounted(() => {
  // Already fetched via useFetch on server/client hydration
})
</script>

<style scoped>
.detail-loading-state {
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

/* Detail Grid Layout */
.detail-grid {
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  gap: 32px;
  align-items: start;
  margin-top: 10px;
}

@media (max-width: 968px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.detail-main-pane {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-sidebar-pane {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 20px;
}

/* Main Cards */
.detail-header-card {
  padding: 32px;
}

.mod-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 10px 0;
  color: #ffffff;
}

.mod-summary-text {
  font-size: 16px;
  color: rgba(255,255,255,0.7);
  line-height: 1.6;
  margin: 0;
}

.detail-desc-card {
  padding: 32px;
}

.markdown-body {
  font-size: 15px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.85);
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  color: #ffffff;
  margin-top: 24px;
  margin-bottom: 12px;
  font-weight: 600;
}

.markdown-body :deep(h1) { font-size: 22px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }
.markdown-body :deep(h2) { font-size: 18px; }
.markdown-body :deep(h3) { font-size: 16px; }

.markdown-body :deep(p) {
  margin-bottom: 16px;
}

.markdown-body :deep(ul) {
  list-style-type: disc !important;
  padding-left: 20px;
  margin-bottom: 16px;
}

.markdown-body :deep(ol) {
  list-style-type: decimal !important;
  padding-left: 20px;
  margin-bottom: 16px;
}

.markdown-body :deep(li) {
  display: list-item !important;
}

.markdown-body :deep(code) {
  font-family: monospace;
  background-color: rgba(0,0,0,0.3);
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 14px;
  color: #919AFF;
}

.markdown-body :deep(pre) {
  background-color: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 16px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.markdown-body :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.preview-toggle-custom :deep(.toggle-label) {
  color: #f0ad4e !important;
  font-weight: 600 !important;
}

.preview-toggle-custom {
  width: 170px;
}

/* Version History */
.detail-versions-card {
  padding: 32px;
}

.versions-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 16px;
}

.version-row {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 20px;
  transition: border-color 0.2s;
}

.version-row:hover {
  border-color: rgba(145, 154, 255, 0.15);
}

.pending-version {
  border-color: rgba(226, 103, 109, 0.2);
  background-color: rgba(226, 103, 109, 0.03);
}

.version-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.version-number {
  font-size: 16px;
  font-weight: 700;
  color: #919AFF;
}

.version-date {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
}

.version-changelog {
  font-size: 14px;
  color: rgba(255,255,255,0.7);
  line-height: 1.6;
  margin-bottom: 14px;
}

.version-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 12px;
}

.submitted-by-label {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
}

/* Sidebar styling */
.sidebar-card {
  padding: 24px;
}

.action-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.download-main-btn {
  width: 100%;
  padding: 16px !important;
  font-size: 16px !important;
  background-color: #6C78FF !important;
}

.download-main-btn:hover {
  background-color: #838EFF !important;
}

.download-beta-btn {
  width: 100%;
  padding: 16px !important;
  font-size: 16px !important;
  background-color: rgba(240, 173, 78, 0.12) !important;
  color: #f0ad4e !important;
  border: 1px solid rgba(240, 173, 78, 0.25) !important;
  margin-top: 8px;
}

.download-beta-btn:hover {
  background-color: rgba(240, 173, 78, 0.22) !important;
}

.no-download-state {
  text-align: center;
  padding: 12px;
  color: rgba(255,255,255,0.4);
}

.stats-sidebar-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 16px;
}

.stat-sidebar-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
}

.stat-val {
  font-size: 14px;
  font-weight: 500;
}

.author-tag {
  display: flex;
  align-items: center;
  gap: 6px;
}

.collab-tag-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.collab-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  background-color: rgba(255,255,255,0.03);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.05);
}

.avatar-tag-img {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

/* Update release form */
.update-submission-card h3 {
  margin-bottom: 20px;
}

.update-form {
  display: flex;
  flex-direction: column;
}

.form-help-text {
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  margin-top: 4px;
}

.form-error-msg {
  background-color: rgba(226, 103, 109, 0.1);
  border: 1px solid rgba(226, 103, 109, 0.2);
  color: #E2676D;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
}

.form-success-msg {
  background-color: rgba(95, 195, 145, 0.1);
  border: 1px solid rgba(95, 195, 145, 0.2);
  color: #5FC391;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
}

/* Not found */
.detail-not-found-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 24px;
  text-align: center;
  max-width: 500px;
  margin: 40px auto;
}

/* Header Logo Styles */
.header-logo-container {
  width: 96px;
  height: 96px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.header-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-logo-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-logo-fallback span {
  font-size: 40px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.source-code-btn {
  width: 100%;
  padding: 14px !important;
  background-color: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
}

.source-code-btn:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(145, 154, 255, 0.3) !important;
}

/* Header layout classes */
.header-card-body {
  display: flex;
  gap: 24px;
  align-items: center;
  flex-wrap: wrap;
}

.header-info-container {
  flex: 1;
  min-width: 250px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.header-badges {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.header-edit-link {
  text-decoration: none;
}

/* Version layout classes */
.version-meta-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.version-pending-badge {
  font-size: 9px !important;
  padding: 1px 6px !important;
}

.version-verified-badge {
  padding: 1px 3px !important;
  font-size: 8px !important;
  border-radius: 3px !important;
  line-height: 1 !important;
  margin-right: 4px !important;
}

.version-submitter {
  color: rgba(255, 255, 255, 0.7);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.version-action-btn {
  padding: 6px 14px !important;
  font-size: 13px !important;
}

.version-rejection-reason {
  margin-bottom: 12px;
  padding: 10px 14px;
  background: rgba(226, 103, 109, 0.08);
  border: 1px solid rgba(226, 103, 109, 0.2);
  border-radius: 8px;
  font-size: 13px;
  color: #E2676D;
}

/* Admin controls sidebar overrides */
.admin-controls-card {
  border-color: rgba(226, 103, 109, 0.3) !important;
  background-color: rgba(226, 103, 109, 0.02) !important;
  margin-bottom: 8px;
}

.admin-controls-title {
  color: #E2676D !important;
  margin-bottom: 16px !important;
  border-bottom: 1px solid rgba(226, 103, 109, 0.15) !important;
  padding-bottom: 8px !important;
}

.admin-controls-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-btn {
  width: 100% !important;
}

.admin-delete-btn {
  background-color: #7c2227 !important;
}

/* Responsive Media Queries */
@media (max-width: 968px) {
  .detail-sidebar-pane {
    position: static !important;
  }
}

@media (max-width: 768px) {
  .header-card-body {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    width: 100% !important;
  }
  
  .header-logo-container {
    width: 80px;
    height: 80px;
    border-radius: 16px;
  }
  
  .header-logo-fallback span {
    font-size: 32px;
  }
  
  .header-info-container {
    width: 100%;
    min-width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .mod-title {
    font-size: 24px;
  }
  
  .header-actions {
    width: 100% !important;
    display: block !important;
  }
  
  .header-edit-link {
    width: 100% !important;
    display: block !important;
  }
  
  .header-edit-button {
    width: 100% !important;
    display: block !important;
  }
  
  .header-edit-link :deep(.overlayer-btn) {
    width: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 44px !important;
  }
}

@media (max-width: 600px) {
  .version-row-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .version-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .version-actions {
    width: 100%;
  }
  
  .version-actions :deep(.overlayer-btn) {
    flex: 1;
    width: 100% !important;
    text-align: center;
  }
}

/* Prevent markdown images from overflowing on mobile */
.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.badge-featured {
  background-color: rgba(255, 215, 0, 0.15) !important;
  color: #FFD700 !important;
  border: 1px solid rgba(255, 215, 0, 0.35) !important;
  font-weight: 700;
}
</style>
