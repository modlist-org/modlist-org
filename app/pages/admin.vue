<template>
  <div class="admin">
    <div v-if="authLoading || loadingData" class="state-center">
      <div class="spinner" />
      <p>{{ t('loading') }}</p>
    </div>

    <template v-else-if="user && user.isAdmin">
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ t('admin.title') }}</h1>
          <p class="page-subtitle">{{ t('admin.subtitle') }}</p>
        </div>
      </header>

      <nav class="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="tab"
          :class="{ active: activeTab === 'mods' }"
          :aria-selected="activeTab === 'mods'"
          @click="activeTab = 'mods'"
        >
          {{ t('admin.pending_mods') }}
          <span class="tab-count" :class="{ alert: pendingMods.length > 0 }">{{ pendingMods.length }}</span>
        </button>
        <button
          type="button"
          role="tab"
          class="tab"
          :class="{ active: activeTab === 'updates' }"
          :aria-selected="activeTab === 'updates'"
          @click="activeTab = 'updates'"
        >
          {{ t('admin.pending_updates') }}
          <span class="tab-count" :class="{ alert: pendingVersions.length > 0 }">{{ pendingVersions.length }}</span>
        </button>
        <button
          type="button"
          role="tab"
          class="tab"
          :class="{ active: activeTab === 'edits' }"
          :aria-selected="activeTab === 'edits'"
          @click="activeTab = 'edits'"
        >
          {{ t('admin.pending_edits') }}
          <span class="tab-count" :class="{ alert: pendingEdits.length > 0 }">{{ pendingEdits.length }}</span>
        </button>
        <button
          type="button"
          role="tab"
          class="tab"
          :class="{ active: activeTab === 'users' }"
          :aria-selected="activeTab === 'users'"
          @click="activeTab = 'users'"
        >
          {{ t('admin.users') }}
          <span class="tab-count">{{ totalUsers }}</span>
        </button>
      </nav>

      <!-- PENDING MODS TAB -->
      <section v-if="activeTab === 'mods'" class="pane">
        <div v-if="pendingMods.length > 0" class="review-list">
          <article v-for="mod in pendingMods" :key="mod._id" class="review-card">
            <div class="review-head">
              <div class="review-logo">
                <img v-if="mod.logo" :src="mod.logo" :alt="mod.name">
                <span v-else :style="getFallbackGradientStyle(mod.name)">{{ mod.name ? mod.name.charAt(0).toUpperCase() : 'M' }}</span>
              </div>
              <div class="review-info">
                <div class="review-title-row">
                  <h3 class="review-title">{{ mod.name }}</h3>
                  <span class="review-slug">/{{ mod.slug }}</span>
                </div>
                <div class="review-meta">
                  <span v-for="g in gamesOf(mod)" :key="g" class="badge badge-game">{{ getGameLabel(g) }}</span>
                  <span>{{ formatDate(mod.createdAt) }}</span>
                </div>
              </div>
              <div class="review-actions">
                <button type="button" class="btn btn-sm btn-success" @click="approveMod(mod._id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                  {{ t('admin.approve') }}
                </button>
                <button type="button" class="btn btn-sm btn-danger" @click="rejectMod(mod._id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  {{ t('admin.reject') }}
                </button>
              </div>
            </div>

            <p class="review-summary">{{ mod.summary }}</p>

            <div v-if="mod.versions?.[0]" class="release-box">
              <div class="release-row">
                <span class="release-label">{{ t('admin.initial_release', { version: mod.versions[0].version }) }}</span>
                <a :href="mod.versions[0].downloadUrl" target="_blank" rel="noopener" class="release-link">{{ mod.versions[0].downloadUrl }}</a>
              </div>
              <details v-if="mod.versions[0].changelog" class="release-details">
                <summary>{{ t('mod.details.changelog') }}</summary>
                <p class="release-changelog">{{ mod.versions[0].changelog }}</p>
              </details>
            </div>

            <footer class="review-foot">
              <span class="review-foot-label">{{ t('admin.submitted_by') }}</span>
              <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="" class="avatar-xs" @error="onAvatarError">
              <span class="review-foot-name">{{ mod.authorId?.globalName || mod.authorId?.username }}</span>
              <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-dot">✓</span>
            </footer>
          </article>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m22 4-10 10.01-3-3" /></svg>
          <p>{{ t('admin.no_pending') }}</p>
        </div>
      </section>

      <!-- PENDING UPDATES TAB -->
      <section v-if="activeTab === 'updates'" class="pane">
        <div v-if="pendingVersions.length > 0" class="review-list">
          <article v-for="ver in pendingVersions" :key="ver.versionId" class="review-card">
            <div class="review-head">
              <div class="review-logo">
                <span :style="getFallbackGradientStyle(ver.modName || '')">{{ ver.modName ? ver.modName.charAt(0).toUpperCase() : 'M' }}</span>
              </div>
              <div class="review-info">
                <div class="review-title-row">
                  <h3 class="review-title">
                    <NuxtLink :to="`/mods/${ver.modSlug}`" class="review-title-link">{{ ver.modName }}</NuxtLink>
                  </h3>
                  <span class="badge badge-admin">{{ t('admin.update_version', { version: ver.version }) }}</span>
                </div>
                <div class="review-meta">
                  <span class="badge badge-game">{{ getGameLabel(ver.game) }}</span>
                  <span>{{ formatDate(ver.createdAt) }}</span>
                </div>
              </div>
              <div class="review-actions">
                <button type="button" class="btn btn-sm btn-success" @click="approveVersion(ver.modId, ver.versionId)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                  {{ t('admin.approve') }}
                </button>
                <button type="button" class="btn btn-sm btn-danger" @click="rejectVersion(ver.modId, ver.versionId)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  {{ t('admin.reject') }}
                </button>
              </div>
            </div>

            <div class="release-box">
              <div class="release-row">
                <span class="release-label">{{ t('admin.download_link') }}</span>
                <a :href="ver.downloadUrl" target="_blank" rel="noopener" class="release-link">{{ ver.downloadUrl }}</a>
              </div>
              <details v-if="ver.changelog" class="release-details" open>
                <summary>{{ t('mod.details.changelog') }}</summary>
                <p class="release-changelog">{{ ver.changelog }}</p>
              </details>
            </div>

            <footer class="review-foot">
              <span class="review-foot-label">{{ t('admin.submitted_by') }}</span>
              <img :src="ver.submittedBy?.avatar || '/images/default_avatar.png'" alt="" class="avatar-xs" @error="onAvatarError">
              <span class="review-foot-name">{{ ver.submittedBy?.globalName || ver.submittedBy?.username || 'Unknown' }}</span>
              <span v-if="ver.submittedBy?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-dot">✓</span>
            </footer>
          </article>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m22 4-10 10.01-3-3" /></svg>
          <p>{{ t('admin.no_pending') }}</p>
        </div>
      </section>

      <!-- PENDING EDITS TAB -->
      <section v-if="activeTab === 'edits'" class="pane">
        <div v-if="pendingEdits.length > 0" class="review-list">
          <article v-for="mod in pendingEdits" :key="mod._id" class="review-card">
            <div class="review-head">
              <div class="review-logo">
                <img v-if="mod.logo" :src="mod.logo" :alt="mod.name">
                <span v-else :style="getFallbackGradientStyle(mod.name)">{{ mod.name ? mod.name.charAt(0).toUpperCase() : 'M' }}</span>
              </div>
              <div class="review-info">
                <div class="review-title-row">
                  <h3 class="review-title">
                    <NuxtLink :to="`/mods/${mod.slug}`" class="review-title-link" target="_blank">{{ mod.name }}</NuxtLink>
                  </h3>
                </div>
                <div class="review-meta">
                  <span v-for="g in gamesOf(mod)" :key="g" class="badge badge-game">{{ getGameLabel(g) }}</span>
                  <span class="review-meta-user">
                    {{ t('admin.proposed_by') }}
                    <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="" class="avatar-xs" @error="onAvatarError">
                    <span class="review-foot-name">{{ mod.authorId?.globalName || mod.authorId?.username }}</span>
                    <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-dot">✓</span>
                  </span>
                </div>
              </div>
            </div>

            <div class="diff">
              <div class="diff-row diff-header">
                <span>{{ t('admin.field') }}</span>
                <span>{{ t('admin.current') }}</span>
                <span>{{ t('admin.proposed') }}</span>
              </div>

              <!-- Name Change -->
              <div v-if="mod.pendingEdit?.name && mod.pendingEdit.name !== mod.name" class="diff-row">
                <span class="diff-label">{{ t('submit.name') }}</span>
                <span class="diff-old" :data-label="t('admin.current')">{{ mod.name }}</span>
                <span class="diff-new" :data-label="t('admin.proposed')">{{ mod.pendingEdit.name }}</span>
              </div>

              <!-- Logo Change -->
              <div v-if="mod.pendingEdit?.logo !== undefined && mod.pendingEdit.logo !== mod.logo" class="diff-row">
                <span class="diff-label">{{ t('submit.logo') }}</span>
                <span class="diff-old diff-logo" :data-label="t('admin.current')">
                  <img v-if="mod.logo" :src="mod.logo" alt="" class="diff-logo-img">
                  <span v-else class="diff-empty">{{ t('admin.none') }}</span>
                </span>
                <span class="diff-new diff-logo" :data-label="t('admin.proposed')">
                  <img v-if="mod.pendingEdit.logo" :src="mod.pendingEdit.logo" alt="" class="diff-logo-img">
                  <span v-else class="diff-removed">{{ t('admin.removed') }}</span>
                </span>
              </div>

              <!-- Source URL Change -->
              <div v-if="mod.pendingEdit?.sourceUrl !== undefined && mod.pendingEdit.sourceUrl !== mod.sourceUrl" class="diff-row">
                <span class="diff-label">{{ t('submit.source_url') }}</span>
                <span class="diff-old diff-url" :data-label="t('admin.current')">{{ mod.sourceUrl || t('admin.none') }}</span>
                <span class="diff-new diff-url" :class="{ 'diff-removed': !mod.pendingEdit.sourceUrl }" :data-label="t('admin.proposed')">{{ mod.pendingEdit.sourceUrl || t('admin.removed') }}</span>
              </div>

              <!-- Community URL Change -->
              <div v-if="mod.pendingEdit?.communityUrl !== undefined && mod.pendingEdit.communityUrl !== mod.communityUrl" class="diff-row">
                <span class="diff-label">{{ t('submit.community_url') }}</span>
                <span class="diff-old diff-url" :data-label="t('admin.current')">{{ mod.communityUrl || t('admin.none') }}</span>
                <span class="diff-new diff-url" :class="{ 'diff-removed': !mod.pendingEdit.communityUrl }" :data-label="t('admin.proposed')">{{ mod.pendingEdit.communityUrl || t('admin.removed') }}</span>
              </div>

              <!-- Game Change -->
              <div v-if="mod.pendingEdit && pendingGamesChanged(mod)" class="diff-row">
                <span class="diff-label">{{ t('submit.game') }}</span>
                <span class="diff-old" :data-label="t('admin.current')">{{ gamesOf(mod).map(getGameLabel).join(', ') }}</span>
                <span class="diff-new" :data-label="t('admin.proposed')">{{ proposedGames(mod).map(getGameLabel).join(', ') }}</span>
              </div>

              <!-- Categories Change -->
              <div v-if="mod.pendingEdit?.categories && mod.pendingEdit.categories.length > 0 && JSON.stringify(mod.pendingEdit.categories) !== JSON.stringify(mod.categories)" class="diff-row">
                <span class="diff-label">{{ t('submit.category') }}</span>
                <span class="diff-old" :data-label="t('admin.current')">{{ mod.categories.map(getCategoryLabelOnly).join(', ') }}</span>
                <span class="diff-new" :data-label="t('admin.proposed')">{{ mod.pendingEdit.categories.map(getCategoryLabelOnly).join(', ') }}</span>
              </div>

              <!-- Dependencies Change -->
              <div v-if="mod.pendingEdit?.dependencies !== undefined && JSON.stringify(mod.pendingEdit.dependencies) !== JSON.stringify(mod.dependencies || [])" class="diff-row">
                <span class="diff-label">{{ t('submit.dependencies') }}</span>
                <span class="diff-old" :data-label="t('admin.current')">{{ mod.dependencies?.join(', ') || t('admin.none') }}</span>
                <span class="diff-new" :data-label="t('admin.proposed')">{{ mod.pendingEdit.dependencies?.join(', ') || t('admin.none') }}</span>
              </div>

              <!-- Summary Change -->
              <div v-if="mod.pendingEdit?.summary && mod.pendingEdit.summary !== mod.summary" class="diff-row">
                <span class="diff-label">{{ t('submit.summary') }}</span>
                <span class="diff-old diff-old-plain" :data-label="t('admin.current')">{{ mod.summary }}</span>
                <span class="diff-new" :data-label="t('admin.proposed')">{{ mod.pendingEdit.summary }}</span>
              </div>

              <!-- Description Change -->
              <details v-if="mod.pendingEdit?.description && mod.pendingEdit.description !== mod.description" class="diff-desc" open>
                <summary>{{ t('submit.description') }}</summary>
                <div class="diff-desc-grid">
                  <div class="diff-desc-box diff-desc-old" :data-label="t('admin.current')">{{ mod.description }}</div>
                  <div class="diff-desc-box diff-desc-new" :data-label="t('admin.proposed')">{{ mod.pendingEdit.description }}</div>
                </div>
              </details>

              <!-- Translation Changes (one block per changed language) -->
              <template v-if="mod.pendingEdit?.translations !== undefined">
                <details
                  v-for="lang in changedTranslationLocales(mod)"
                  :key="lang.id"
                  class="diff-desc"
                  open
                >
                  <summary>{{ t('admin.translation_change', { language: lang.label }) }}</summary>
                  <div class="diff-desc-grid">
                    <div class="diff-desc-box diff-desc-old" :data-label="t('admin.current')">{{ translationText(mod.translations?.[lang.id]) || t('admin.none') }}</div>
                    <div class="diff-desc-box diff-desc-new" :data-label="t('admin.proposed')">{{ translationText(mod.pendingEdit.translations?.[lang.id]) || t('admin.removed') }}</div>
                  </div>
                </details>
              </template>
            </div>

            <footer class="review-foot review-foot-actions">
              <button type="button" class="btn btn-sm btn-danger" @click="rejectEdit(mod._id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                {{ t('admin.reject_edit') }}
              </button>
              <button type="button" class="btn btn-sm btn-success" @click="approveEdit(mod._id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                {{ t('admin.approve_edit') }}
              </button>
            </footer>
          </article>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m22 4-10 10.01-3-3" /></svg>
          <p>{{ t('admin.no_pending') }}</p>
        </div>
      </section>

      <!-- MANAGE USERS TAB -->
      <section v-if="activeTab === 'users'" class="pane">
        <div class="users-toolbar">
          <div class="search-field">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              v-model="userSearchQuery"
              type="search"
              :placeholder="t('admin.search_users')"
              :aria-label="t('admin.search_users')"
              @input="debouncedUserSearch"
            >
          </div>
        </div>

        <div v-if="users.length > 0" class="users-list">
          <div v-for="u in users" :key="u._id" class="user-row">
            <img :src="u.avatar || '/images/default_avatar.png'" alt="" class="user-avatar" @error="onAvatarError">
            <div class="user-names">
              <span class="user-global">{{ u.globalName || u.username }}</span>
              <span class="user-sub">@{{ u.username }} · <span class="user-id">{{ u.discordId }}</span></span>
            </div>
            <div class="user-badges">
              <span v-if="u.isAdmin" class="badge badge-admin">{{ t('profile.role_admin') }}</span>
              <span v-if="u.isVerifiedDeveloper" class="badge badge-verified">{{ t('profile.role_verified_dev') }}</span>
            </div>
            <div class="user-actions">
              <button
                type="button"
                class="btn btn-sm"
                :class="u.isVerifiedDeveloper ? 'btn-danger' : 'btn-secondary'"
                @click="toggleRole(u._id, 'developer')"
              >
                {{ u.isVerifiedDeveloper ? t('admin.remove_dev') : t('admin.make_dev') }}
              </button>
              <button
                v-if="u._id !== user.id"
                type="button"
                class="btn btn-sm"
                :class="u.isAdmin ? 'btn-danger' : 'btn-secondary'"
                @click="toggleRole(u._id, 'admin')"
              >
                {{ u.isAdmin ? t('admin.remove_admin') : t('admin.make_admin') }}
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          <p>{{ t('admin.no_users') }}</p>
        </div>

        <div v-if="userTotalPages > 1" class="pagination-container">
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
      </section>
    </template>

    <!-- Error State -->
    <div v-else class="card denied">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
      <h2>{{ t('admin.access_denied_title') }}</h2>
      <p>{{ t('admin.access_denied_desc') }}</p>
      <NuxtLink to="/" class="btn btn-secondary">{{ t('mod.details.back_home') }}</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SITE_LOCALES } from '../utils/locales'
import type { ModTranslation, ModTranslations } from '../utils/locales'
import { ref, computed, watch } from 'vue'
import { useI18n, navigateTo, useSeoMeta } from '#imports'
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
  games?: string[]
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
  translations?: ModTranslations
  game?: 'adofai' | 'rhythm-doctor' | 'dancing-line'
  games?: string[]
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
  translations?: ModTranslations
  game: 'adofai' | 'rhythm-doctor' | 'dancing-line'
  games?: string[]
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

const getFallbackGradientStyle = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h1 = Math.abs(hash) % 360
  const h2 = (h1 + 40) % 360
  return {
    background: `linear-gradient(135deg, hsl(${h1}, 70%, 50%) 0%, hsl(${h2}, 70%, 40%) 100%)`
  }
}

const onAvatarError = (e: Event) => {
  (e.target as HTMLImageElement).src = '/images/default_avatar.png'
}

const getCategoryLabelOnly = (val: string) => {
  if (val === 'ui') return t('categories.ui')
  if (val === 'gameplay') return t('categories.gameplay')
  if (val === 'utility') return t('categories.utility')
  if (val === 'visuals') return t('categories.visuals')
  if (val === 'library') return t('categories.library')
  return val
}

const translationText = (entry?: ModTranslation) => [entry?.summary, entry?.description].filter(Boolean).join('\n\n')

const changedTranslationLocales = (mod: { translations?: ModTranslations; pendingEdit?: { translations?: ModTranslations } | null }) =>
  SITE_LOCALES.filter((l) => translationText(mod.translations?.[l.id]) !== translationText(mod.pendingEdit?.translations?.[l.id]))

const gamesOf = (mod: { game: string; games?: string[] }) => mod.games?.length ? mod.games : [mod.game]

const proposedGames = (mod: { game: string; games?: string[]; pendingEdit?: { game?: string; games?: string[] } | null }) => {
  const edit = mod.pendingEdit
  if (edit?.games?.length) return edit.games
  if (edit?.game) return [edit.game]
  return gamesOf(mod)
}

const pendingGamesChanged = (mod: { game: string; games?: string[]; pendingEdit?: { game?: string; games?: string[] } | null }) =>
  proposedGames(mod).join(',') !== gamesOf(mod).join(',')

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

// Auth may still be resolving on a direct page load; act once it settles
watch(authLoading, async (isLoading) => {
  if (isLoading) return
  if (!user.value || !user.value.isAdmin) {
    navigateTo('/')
  } else {
    await fetchData()
  }
}, { immediate: true })
</script>

<style scoped>
.admin {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 0;
  color: var(--text-secondary);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  height: 44px;
  padding: 0 14px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease;
}

.tab::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: transparent;
  transition: background-color 0.15s ease;
}

.tab:hover {
  color: var(--text);
}

.tab.active {
  color: var(--text);
}

.tab.active::after {
  background: var(--accent);
}

.tab-count {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.tab-count.alert {
  background: var(--accent-soft);
  color: var(--accent);
}

.pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Review cards */
.review-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.review-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.review-logo {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.review-logo img,
.review-logo span {
  width: 100%;
  height: 100%;
}

.review-logo img {
  display: block;
  object-fit: cover;
}

.review-logo span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  color: #fff;
}

.review-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.review-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-width: 0;
}

.review-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.review-title-link {
  color: var(--text);
  text-decoration: none;
}

.review-title-link:hover {
  color: var(--accent);
}

.review-slug {
  color: var(--text-tertiary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.review-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 12px;
  color: var(--text-tertiary);
  font-size: 13px;
}

.review-meta-user {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.review-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.review-summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.55;
}

.btn-success {
  background: var(--success-soft);
  border-color: rgba(95, 195, 145, 0.3);
  color: var(--success);
}

.btn-success:hover:not(:disabled) {
  background: var(--success);
  color: var(--bg);
}

/* Release info */
.release-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13px;
}

.release-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-width: 0;
}

.release-label {
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-weight: 600;
}

.release-link {
  min-width: 0;
  color: var(--accent);
  text-decoration: none;
  word-break: break-all;
}

.release-link:hover {
  text-decoration: underline;
}

.release-details summary,
.diff-desc summary {
  width: fit-content;
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

.release-details summary:hover,
.diff-desc summary:hover {
  color: var(--text);
}

.release-changelog {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.review-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  color: var(--text-tertiary);
  font-size: 13px;
  min-width: 0;
}

.review-foot-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.review-foot-name {
  color: var(--text-secondary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-xs {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}

.verified-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  font-size: 9px;
  font-weight: 800;
}

/* Diff */
.diff {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.diff-row {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding: 12px 14px;
  font-size: 14px;
  border-top: 1px solid var(--border);
}

.diff-header {
  border-top: none;
  padding-top: 9px;
  padding-bottom: 9px;
  background: var(--bg-elev);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 700;
}

.diff-label {
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 600;
}

.diff-old {
  color: var(--text-tertiary);
  text-decoration: line-through;
  text-decoration-color: rgba(239, 107, 115, 0.6);
  overflow-wrap: anywhere;
}

.diff-old-plain {
  text-decoration: none;
}

.diff-new {
  color: var(--accent);
  font-weight: 500;
  overflow-wrap: anywhere;
}

.diff-url {
  word-break: break-all;
}

.diff-logo {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.diff-logo-img {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  object-fit: cover;
}

.diff-old .diff-logo-img {
  opacity: 0.55;
}

.diff-new .diff-logo-img {
  border-color: var(--accent-border);
}

.diff-empty {
  color: var(--text-tertiary);
}

.diff-removed,
.diff-new.diff-removed {
  color: var(--danger);
}

.diff-desc {
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  font-size: 13px;
}

.diff-desc summary {
  font-size: 13px;
}

.diff-desc-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  margin-top: 10px;
}

.diff-desc-box {
  max-height: 220px;
  overflow-y: auto;
  padding: 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.diff-desc-box::before {
  content: attr(data-label);
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
}

.diff-desc-old {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  color: var(--text-tertiary);
}

.diff-desc-new {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--text);
}

.diff-desc-new::before {
  color: var(--accent);
}

/* Users */
.users-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-field {
  position: relative;
  width: 100%;
  max-width: 420px;
}

.search-field input {
  width: 100%;
  padding-left: 40px;
}

.search-icon {
  position: absolute;
  left: 13px;
  top: 50%;
  width: 16px;
  height: 16px;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.users-list {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.user-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  transition: background-color 0.15s ease;
}

.user-row:first-child {
  border-top: none;
}

.user-row:hover {
  background: var(--surface-hover);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--surface-2);
}

.user-names {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-global {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-sub {
  color: var(--text-tertiary);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-id {
  font-variant-numeric: tabular-nums;
}

.user-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.user-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Access denied */
.denied {
  width: 100%;
  max-width: 480px;
  margin: 40px auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.denied svg {
  width: 40px;
  height: 40px;
  color: var(--text-tertiary);
}

.denied p {
  margin: 0 0 8px;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .user-row {
    grid-template-columns: 40px minmax(0, 1fr);
    row-gap: 10px;
  }
  .user-badges,
  .user-actions {
    grid-column: 2;
    justify-content: flex-start;
  }
  .user-badges:empty {
    display: none;
  }
}

@media (max-width: 720px) {
  .review-card {
    padding: 16px;
  }
  .review-head {
    flex-wrap: wrap;
  }
  .review-info {
    flex-basis: calc(100% - 62px);
  }
  .review-actions {
    width: 100%;
  }
  .review-actions .btn {
    flex: 1;
  }
  .diff-header {
    display: none;
  }
  .diff-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }
  .diff-old::before,
  .diff-new::before {
    content: attr(data-label) ': ';
    color: var(--text-tertiary);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    display: inline-block;
    white-space: pre;
    margin-right: 4px;
  }
  .diff-desc-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 480px) {
  .user-actions {
    flex-wrap: wrap;
  }
  .review-foot-actions .btn {
    flex: 1;
  }
}
</style>
