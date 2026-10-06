<template>
  <div class="editor">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ t('submit.title') }}</h1>
        <p class="page-subtitle">{{ t('submit.subtitle') }}</p>
      </div>
    </header>

    <form class="editor-form" @submit.prevent="handleSubmit">
      <!-- Basics -->
      <section class="card form-section">
        <h2 class="section-title">{{ t('submit.section_basics') }}</h2>

        <div class="form-row">
          <div class="form-group">
            <label for="mod-name">{{ t('submit.name') }}</label>
            <input
              id="mod-name"
              v-model="form.name"
              type="text"
              :placeholder="t('submit.name_placeholder')"
              required
              @input="generateSlug"
            >
          </div>

          <div class="form-group">
            <label for="mod-slug">{{ t('submit.slug') }}</label>
            <div class="slug-input">
              <span class="slug-prefix">/mods/</span>
              <input
                id="mod-slug"
                v-model="form.slug"
                type="text"
                :placeholder="t('submit.slug_placeholder')"
                required
              >
            </div>
            <span class="form-help-text">{{ t('submit.slug_help') }}</span>
          </div>
        </div>

        <div class="form-group">
          <span id="mod-game-label" class="field-label">{{ t('submit.game') }}</span>
          <GameMultiSelect v-model="form.games" labelledby="mod-game-label" />
          <span class="form-help-text">{{ t('submit.game_multi_help') }}</span>
        </div>

        <div class="form-group">
          <span id="mod-category-label" class="field-label">{{ t('submit.category') }}</span>
          <div class="chip-list" role="group" aria-labelledby="mod-category-label">
            <button
              v-for="cat in CATEGORIES"
              :key="cat"
              type="button"
              class="chip"
              :class="{ active: form.categories.includes(cat) }"
              :aria-pressed="form.categories.includes(cat)"
              @click="toggleFormCategory(cat)"
            >
              <svg v-if="form.categories.includes(cat)" class="chip-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10" /></svg>
              {{ getCategoryLabelOnly(cat) }}
            </button>
          </div>
        </div>
      </section>

      <!-- Description -->
      <section class="card form-section">
        <h2 class="section-title">{{ t('submit.section_description') }}</h2>

        <LocalizedDescriptionFields
          v-model:summary="form.summary"
          v-model:description="form.description"
          v-model:translations="form.translations"
        />
      </section>

      <!-- Media & links -->
      <section class="card form-section">
        <h2 class="section-title">{{ t('submit.section_media') }}</h2>

        <div class="form-group">
          <span class="field-label">{{ t('submit.logo') }}</span>
          <div class="logo-field">
            <div class="logo-tile">
              <img v-if="form.logo" :src="form.logo" alt="Logo Preview">
              <span v-else :style="getFallbackGradientStyle(form.name || 'M')">{{ form.name ? form.name.charAt(0).toUpperCase() : 'M' }}</span>
            </div>
            <div class="logo-controls">
              <input
                ref="logoInput"
                class="hidden-input"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                @change="handleLogoUpload"
              >
              <div class="logo-buttons">
                <button type="button" class="btn btn-secondary btn-sm" @click="triggerLogoSelect">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                  {{ t('submit.logo_select') }}
                </button>
                <button v-if="form.logo" type="button" class="btn btn-ghost btn-sm" @click="clearLogo">
                  {{ t('submit.logo_remove') }}
                </button>
              </div>
              <span class="form-help-text">{{ t('submit.logo_help') }}</span>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="mod-source-url">{{ t('submit.source_url') }}</label>
            <input
              id="mod-source-url"
              v-model="form.sourceUrl"
              type="text"
              :placeholder="t('submit.source_url_placeholder')"
            >
            <span class="form-help-text">{{ t('submit.source_url_help') }}</span>
          </div>

          <div class="form-group">
            <label for="mod-community-url">{{ t('submit.community_url') }}</label>
            <input
              id="mod-community-url"
              v-model="form.communityUrl"
              type="text"
              :placeholder="t('submit.community_url_placeholder')"
            >
            <span class="form-help-text">{{ t('submit.community_url_help') }}</span>
          </div>
        </div>
      </section>

      <!-- Release -->
      <section class="card form-section">
        <h2 class="section-title">{{ t('submit.initial_release') }}</h2>

        <div class="form-row">
          <div class="form-group">
            <label for="mod-version">{{ t('submit.version') }}</label>
            <input
              id="mod-version"
              v-model="form.version"
              type="text"
              :placeholder="t('submit.version_placeholder')"
              required
            >
          </div>

          <div class="form-group">
            <label for="mod-game-version">{{ t('submit.game_version') }}</label>
            <input
              id="mod-game-version"
              v-model="form.gameVersion"
              type="text"
              :placeholder="t('submit.game_version_placeholder')"
            >
            <span class="form-help-text">{{ t('submit.game_version_help') }}</span>
          </div>
        </div>

        <DownloadLinksInput
          v-model:mode="form.downloadMode"
          v-model:unified-url="form.downloadUrl"
          v-model:platform-downloads="form.platformDownloads"
        />

        <div class="form-group">
          <label for="mod-changelog">{{ t('submit.changelog') }}</label>
          <textarea
            id="mod-changelog"
            v-model="form.changelog"
            rows="4"
            :placeholder="t('submit.changelog_placeholder')"
          />
        </div>

        <div class="beta-toggle">
          <UIToggle
            v-model="form.isBeta"
            :default-value="false"
            :label="t('submit.is_beta_label', 'Mark as Beta Version')"
            :font-size="14"
          />
        </div>
      </section>

      <!-- Team -->
      <section class="card form-section">
        <h2 class="section-title">{{ t('submit.section_team') }}</h2>

        <div class="form-group">
          <label for="collab-search">{{ t('submit.collaborators') }}</label>
          <div class="search-field">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              id="collab-search"
              v-model="collabSearchQuery"
              type="text"
              autocomplete="off"
              :placeholder="t('submit.search_user_placeholder')"
              @input="searchUsers"
            >
            <div v-if="searchResults.length > 0" class="search-results">
              <button
                v-for="userObj in searchResults"
                :key="userObj._id"
                type="button"
                class="search-result"
                @click="addCollab(userObj)"
              >
                <img :src="userObj.avatar || '/images/default_avatar.png'" alt="" class="result-avatar" @error="onAvatarError">
                <span class="result-text">
                  <span class="result-name">{{ userObj.globalName || userObj.username }}</span>
                  <span class="result-sub">@{{ userObj.username }}</span>
                </span>
                <svg class="result-add" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          </div>
          <span class="form-help-text">{{ t('submit.collaborators_help') }}</span>

          <div v-if="selectedCollabs.length > 0" class="token-list">
            <div v-for="userObj in selectedCollabs" :key="userObj._id" class="token pending">
              <img :src="userObj.avatar || '/images/default_avatar.png'" alt="" class="token-avatar" @error="onAvatarError">
              <span class="token-name">{{ userObj.globalName || userObj.username }}</span>
              <span class="token-status">{{ t('submit.invite_pending') }}</span>
              <button type="button" class="token-remove" :aria-label="t('submit.remove')" @click="removeCollab(userObj._id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Dependencies -->
      <section class="card form-section">
        <h2 class="section-title">{{ t('submit.dependencies') }}</h2>

        <div class="form-group">
          <div class="search-field">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              v-model="dependencySearchQuery"
              type="text"
              autocomplete="off"
              :placeholder="t('submit.dependencies_placeholder')"
              :aria-label="t('submit.dependencies')"
              @input="searchDependencies"
            >
            <div v-if="dependencySearchResults.length > 0" class="search-results">
              <button
                v-for="dep in dependencySearchResults"
                :key="dep._id"
                type="button"
                class="search-result"
                @click="addDependency(dep)"
              >
                <img :src="dep.logo || '/images/default_avatar.png'" alt="" class="result-logo" @error="onAvatarError">
                <span class="result-text">
                  <span class="result-name">{{ dep.name }}</span>
                  <span class="result-sub">{{ dep.slug }}</span>
                </span>
                <svg class="result-add" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          </div>
          <span class="form-help-text">{{ t('submit.dependencies_help') }}</span>

          <div v-if="selectedDependencies.length > 0" class="token-list">
            <div v-for="dep in selectedDependencies" :key="dep._id" class="token">
              <img :src="dep.logo || '/images/default_avatar.png'" alt="" class="token-logo" @error="onAvatarError">
              <span class="token-name">{{ dep.name }}</span>
              <button type="button" class="token-remove" :aria-label="t('submit.remove')" @click="removeDependency(dep._id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <div class="form-footer">
        <div class="form-footer-messages">
          <p v-if="errorMsg" class="form-message error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
            {{ errorMsg }}
          </p>
          <p v-if="successMsg" class="form-message success" role="status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10" /></svg>
            {{ successMsg }}
          </p>
        </div>
        <button type="submit" class="btn btn-primary btn-lg submit-btn" :disabled="submitting">
          <span v-if="submitting" class="btn-spinner" />
          {{ submitting ? t('submit.submitting') : t('submit.save') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { MAX_LOGO_BYTES, MAX_SOURCE_BYTES, dataUrlBytes, prepareLogo } from '../utils/logo-image'
import type { ModTranslations } from '../utils/locales'
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n, navigateTo, useSeoMeta } from '#imports'
import { UIToggle } from 'overlayer-ui'
import { useAuth } from '../composables/useAuth'

const { t } = useI18n()
const { user, loading: authLoading } = useAuth()

useSeoMeta({
  title: () => t('submit.title'),
  ogTitle: () => t('submit.title'),
  description: () => t('seo.description'),
  ogDescription: () => t('seo.description'),
  ogImage: '/favicon.svg',
  twitterCard: 'summary'
})

interface SearchUserItem {
  _id: string
  username: string
  globalName?: string
  avatar?: string
}

const CATEGORIES = ['ui', 'gameplay', 'utility', 'visuals', 'library'] as const

const form = ref({
  name: '',
  slug: '',
  logo: '',
  sourceUrl: '',
  communityUrl: '',
  games: ['adofai'] as string[],
  categories: [] as string[],
  summary: '',
  description: '',
  translations: {} as ModTranslations,
  version: '',
  downloadMode: 'unified' as 'unified' | 'platform',
  downloadUrl: '',
  platformDownloads: {
    windows: '',
    macos: '',
    linux: ''
  },
  changelog: '',
  gameVersion: '',
  isBeta: false
})

interface DependencyMod {
  _id: string
  name: string
  slug: string
  logo?: string
  summary?: string
  game?: string
  games?: string[]
}

const selectedCollabs = ref<SearchUserItem[]>([])
const collabSearchQuery = ref('')
const searchResults = ref<SearchUserItem[]>([])

const selectedDependencies = ref<DependencyMod[]>([])
const dependencySearchQuery = ref('')
const dependencySearchResults = ref<DependencyMod[]>([])
let dependencySearchTimeout: ReturnType<typeof setTimeout> | null = null

const submitting = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const logoInput = ref<HTMLInputElement | null>(null)

const hasDownload = computed(() => form.value.downloadMode === 'unified'
  ? form.value.downloadUrl.trim().length > 0
  : Object.values(form.value.platformDownloads).some((url) => url.trim().length > 0))

const onAvatarError = (e: Event) => {
  (e.target as HTMLImageElement).src = '/images/default_avatar.png'
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

const triggerLogoSelect = () => {
  if (logoInput.value) {
    logoInput.value.click()
  }
}

const handleLogoUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reject = () => {
    errorMsg.value = t('submit.logo_too_large') || 'Logo size must be smaller than 1MB.'
    if (logoInput.value) logoInput.value.value = ''
  }

  if (file.size > MAX_SOURCE_BYTES) return reject()

  errorMsg.value = ''
  try {
    const logo = await prepareLogo(file)
    if (dataUrlBytes(logo) > MAX_LOGO_BYTES) return reject()
    form.value.logo = logo
  } catch (e) {
    console.error('Failed to read logo:', e)
    reject()
  }
}

const clearLogo = () => {
  form.value.logo = ''
  if (logoInput.value) logoInput.value.value = ''
}

const toggleFormCategory = (cat: string) => {
  const index = form.value.categories.indexOf(cat)
  if (index > -1) {
    form.value.categories.splice(index, 1)
  } else {
    form.value.categories.push(cat)
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

const generateSlug = () => {
  form.value.slug = form.value.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-_]/g, '') // remove special characters
    .replace(/\s+/g, '-') // replace spaces with dashes
    .replace(/-+/g, '-') // replace double dashes
}

// User Search logic
let searchTimeout: ReturnType<typeof setTimeout> | null = null
const searchUsers = () => {
  clearTimeout(searchTimeout || undefined)
  if (collabSearchQuery.value.trim().length < 2) {
    searchResults.value = []
    return
  }

  searchTimeout = setTimeout(async () => {
    try {
      const data = await $fetch<{ users: SearchUserItem[] }>('/api/users/search', {
        params: { q: collabSearchQuery.value }
      })
      // Filter out users already selected and the current user
      searchResults.value = (data.users || []).filter(
        (u) => u._id !== user.value?.id && !selectedCollabs.value.some((sc) => sc._id === u._id)
      )
    } catch (e) {
      console.error(e)
    }
  }, 300)
}

const addCollab = (userObj: SearchUserItem) => {
  selectedCollabs.value.push(userObj)
  collabSearchQuery.value = ''
  searchResults.value = []
}

const removeCollab = (userId: string) => {
  selectedCollabs.value = selectedCollabs.value.filter((sc) => sc._id !== userId)
}

const searchDependencies = () => {
  clearTimeout(dependencySearchTimeout || undefined)
  if (dependencySearchQuery.value.trim().length < 2) {
    dependencySearchResults.value = []
    return
  }

  dependencySearchTimeout = setTimeout(async () => {
    try {
      const data = await $fetch<{ mods: DependencyMod[] }>('/api/mods', {
        params: {
          game: form.value.games.join(','),
          search: dependencySearchQuery.value,
          limit: 10
        }
      })
      dependencySearchResults.value = (data.mods || []).filter(
        (m) => !selectedDependencies.value.some((sd) => sd._id === m._id)
      )
    } catch (e) {
      console.error(e)
    }
  }, 300)
}

const addDependency = (dep: DependencyMod) => {
  selectedDependencies.value.push(dep)
  dependencySearchQuery.value = ''
  dependencySearchResults.value = []
}

const removeDependency = (depId: string) => {
  selectedDependencies.value = selectedDependencies.value.filter((sd) => sd._id !== depId)
}

// Dependencies must share at least one target game
watch(() => [...form.value.games], (games) => {
  selectedDependencies.value = selectedDependencies.value.filter((d) => {
    const depGames = d.games?.length ? d.games : d.game ? [d.game] : []
    return depGames.length === 0 || depGames.some((g) => games.includes(g))
  })
  dependencySearchQuery.value = ''
  dependencySearchResults.value = []
})

const handleSubmit = async () => {
  if (form.value.games.length === 0) {
    errorMsg.value = t('submit.error_game_required')
    return
  }

  if (form.value.categories.length === 0) {
    errorMsg.value = t('submit.error_category_required') || 'Please select at least one category.'
    return
  }

  if (!hasDownload.value) {
    errorMsg.value = t('submit.download_required', 'Add a download link.')
    return
  }

  submitting.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    const payload = {
      ...form.value,
      game: form.value.games[0],
      downloadUrl: form.value.downloadMode === 'unified'
        ? form.value.downloadUrl.trim()
        : Object.values(form.value.platformDownloads).find((url) => url.trim()) || '',
      platformDownloads: form.value.downloadMode === 'platform'
        ? Object.fromEntries(Object.entries(form.value.platformDownloads).filter(([, url]) => url.trim()))
        : {},
      collaboratorIds: selectedCollabs.value.map((c) => c._id),
      dependencies: selectedDependencies.value.map((d) => d._id)
    }

    const response = await $fetch<{ success: boolean; mod: { slug: string; isApproved: boolean } }>('/api/mods', {
      method: 'POST',
      body: payload
    })

    if (response.success) {
      navigateTo('/')
    }
  } catch (err: unknown) {
    console.error('Submission failed:', err)
    const error = err as { data?: { statusMessage?: string } }
    errorMsg.value = error.data?.statusMessage || 'An unexpected error occurred.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  // If not logged in, redirect home
  if (!authLoading.value && !user.value) {
    navigateTo('/')
  }
})
</script>

<style scoped>
.editor {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card .section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.form-section .form-group {
  margin-bottom: 0;
  min-width: 0;
}

.form-section .form-row {
  row-gap: 20px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.char-count {
  font-size: 12px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.form-group input,
.form-group textarea {
  width: 100%;
}

textarea {
  resize: vertical;
}

/* Slug */
.slug-input {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-elev);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.slug-input:focus-within {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.slug-prefix {
  display: flex;
  align-items: center;
  padding: 0 0 0 14px;
  color: var(--text-tertiary);
  font-size: 14px;
  white-space: nowrap;
}

.form-group .slug-input input {
  padding-left: 2px;
  border: none;
  background: transparent;
  box-shadow: none;
}

/* Chips */
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip-check {
  width: 14px;
  height: 14px;
  color: #fff;
}

/* Logo */
.logo-field {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-tile {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.logo-tile img,
.logo-tile span {
  width: 100%;
  height: 100%;
}

.logo-tile img {
  display: block;
  object-fit: cover;
}

.logo-tile span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 800;
  color: #fff;
}

.logo-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.logo-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.form-group .hidden-input {
  display: none;
}

.beta-toggle {
  width: 240px;
  max-width: 100%;
}

/* Search + tokens */
.search-field {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 20px;
  width: 16px;
  height: 16px;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.form-group .search-field input {
  padding-left: 36px;
}

.search-results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
}

.search-result {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.search-result:hover,
.search-result:focus-visible {
  background: var(--surface-3);
}

.result-avatar,
.result-logo {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  object-fit: cover;
}

.result-avatar {
  border-radius: 50%;
}

.result-logo {
  border-radius: 7px;
}

.result-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.3;
}

.result-name {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-sub {
  font-size: 12px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-add {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.search-result:hover .result-add {
  color: var(--accent);
}

.token-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.token {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  height: 34px;
  padding: 0 4px 0 4px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: var(--surface-2);
  font-size: 13px;
  font-weight: 500;
}

.token.pending {
  border-style: dashed;
}

.token-avatar,
.token-logo {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  object-fit: cover;
}

.token-avatar {
  border-radius: 50%;
}

.token-logo {
  border-radius: 6px;
}

.token-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.token-status {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--warning);
}

.token-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.token-remove svg {
  width: 12px;
  height: 12px;
}

.token-remove:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

/* Footer */
.form-footer {
  position: sticky;
  bottom: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 12px 12px 20px;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.form-footer-messages {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.form-message svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.form-message.error {
  color: var(--danger);
}

.form-message.success {
  color: var(--success);
}

.submit-btn {
  margin-left: auto;
  min-width: 160px;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

@media (max-width: 640px) {
  .form-section {
    padding: 20px 16px;
  }

  .logo-field {
    align-items: flex-start;
  }

  .logo-tile {
    width: 64px;
    height: 64px;
  }

  .form-footer {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
    bottom: 8px;
  }

  .form-footer-messages:empty {
    display: none;
  }

  .submit-btn {
    width: 100%;
    margin-left: 0;
  }
}
</style>
