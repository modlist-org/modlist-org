<template>
  <div class="homepage-container">
    <!-- Filters and Search Bar -->
    <div class="filter-controls card">
      <div class="filter-controls-top">
        <div class="filter-dropdowns-group">
          <!-- Game Dropdown -->
          <div class="filter-dropdown-wrap">
            <span class="control-label">{{ t('filter.game') }}</span>
            <div style="width: 170px;">
              <UIDropdown
                v-model="gameFilterModel"
                :default-value="gameFilterModel"
                :values="['all', 'adofai', 'rhythm-doctor']"
                :display="getGameLabel"
              />
            </div>
          </div>

          <!-- Category Dropdown -->
          <div class="filter-dropdown-wrap">
            <span class="control-label">{{ t('filter.category') }}</span>
            <div style="width: 180px;">
              <UIDropdown
                v-model="categoryFilterModel"
                :default-value="categoryFilterModel"
                :values="['all', 'ui', 'gameplay', 'utility', 'visuals', 'library']"
                :display="getCategoryLabel"
              />
            </div>
          </div>
        </div>

        <div class="search-input-wrap">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('search.placeholder')"
            class="search-input"
            @input="debouncedFetch"
          >
        </div>
      </div>

      <!-- Active Filter Tags -->
      <div v-if="activeCategories.length > 0 || activeGames.length > 0" class="active-tags-row">
        <div v-for="game in activeGames" :key="game" class="active-tag-badge">
          <span>{{ getGameLabelOnly(game) }}</span>
          <button type="button" class="remove-tag-btn" @click="toggleGame(game)">&times;</button>
        </div>
        <div v-for="cat in activeCategories" :key="cat" class="active-tag-badge">
          <span>{{ getCategoryLabelOnly(cat) }}</span>
          <button type="button" class="remove-tag-btn" @click="toggleCategory(cat)">&times;</button>
        </div>
        <button type="button" class="clear-all-tags-btn" @click="clearAllFilters">
          {{ t('categories.clear_all') }}
        </button>
      </div>
    </div>

    <!-- Loading Indicator -->
    <div v-if="loadingMods" class="mods-loading-state">
      <div class="spinner" />
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Mod Grid List -->
    <div v-else-if="mods.length > 0" class="mods-grid">
      <NuxtLink
        v-for="mod in mods"
        :key="mod._id"
        :to="`/mods/${mod.slug}`"
        class="card card-hover mod-card"
      >
        <div class="mod-card-header">
          <div style="display: flex; gap: 8px; flex-wrap: wrap; flex-grow: 1; flex-shrink: 1;">
            <span class="badge badge-game">{{ getGameLabelOnly(mod.game) }}</span>
            <span v-for="cat in mod.categories" :key="cat" class="badge badge-category">{{ getCategoryLabelOnly(cat) }}</span>
          </div>
          <span v-if="!mod.isApproved" class="badge badge-pending" style="flex-shrink: 0; margin-left: 8px;">{{ t('mod.details.pending_approval') }}</span>
        </div>

        <div class="mod-card-body-wrapper" style="display: flex; gap: 16px; align-items: flex-start; margin-bottom: 20px; flex-grow: 1;">
          <div class="card-logo-container" style="width: 54px; height: 54px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: rgba(0, 0, 0, 0.2);">
            <img v-if="mod.logo" :src="mod.logo" alt="Mod Logo" class="card-logo-img" style="width: 100%; height: 100%; object-fit: cover;">
            <div v-else class="card-logo-fallback" :style="getFallbackGradientStyle(mod.name)" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 22px; font-weight: 700; color: #ffffff; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);">{{ mod.name ? mod.name.charAt(0).toUpperCase() : 'M' }}</span>
            </div>
          </div>
          <div class="mod-card-body" style="flex-grow: 1; margin-bottom: 0;">
            <h3 class="mod-card-title">{{ mod.name }}</h3>
            <p class="mod-card-summary">{{ mod.summary }}</p>
          </div>
        </div>

        <div class="mod-card-footer">
          <div class="author-info">
            <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="Avatar" class="author-avatar-img" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
            <span class="author-name">{{ mod.authorId?.globalName || mod.authorId?.username || 'Unknown' }}</span>
            <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 2px 4px; font-size: 9px; border-radius: 4px; line-height: 1;">✓</span>
          </div>

          <div class="mod-stats">
            <span v-if="mod.latestVersion" class="version-tag">v{{ mod.latestVersion.version }}</span>
            <span class="downloads-count">
              <svg class="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ mod.downloads }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Empty State -->
    <div v-else class="mods-empty-state card">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M16 21V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v16" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
      <p>{{ t('home.no_mods') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from '#imports'
import { UIDropdown } from 'overlayer-ui'

interface ModVersion {
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

interface ModItem {
  _id: string
  name: string
  slug: string
  summary: string
  description?: string
  game: 'adofai' | 'rhythm-doctor'
  categories: Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
  authorId?: {
    _id: string
    username: string
    globalName?: string
    avatar?: string
    isVerifiedDeveloper: boolean
  }
  collaboratorIds?: Array<{
    _id: string
    username: string
    globalName?: string
    avatar?: string
  }>
  isApproved: boolean
  downloads: number
  versions: ModVersion[]
  latestVersion?: ModVersion | null
  logo?: string
}

const { t } = useI18n()

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

const activeGames = ref<string[]>([])
const activeCategories = ref<string[]>([])
const searchQuery = ref('')
const mods = ref<ModItem[]>([])
const loadingMods = ref(true)

const fetchMods = async () => {
  loadingMods.value = true
  try {
    const params: Record<string, string> = {}
    if (activeGames.value.length > 0) {
      params.game = activeGames.value.join(',')
    }
    if (activeCategories.value.length > 0) {
      params.categories = activeCategories.value.join(',')
    }
    if (searchQuery.value.trim().length > 0) {
      params.search = searchQuery.value
    }

    const response = await $fetch<{ mods: ModItem[] }>('/api/mods', { params })
    mods.value = response.mods || []
  } catch (error) {
    console.error('Failed to load mods:', error)
  } finally {
    loadingMods.value = false
  }
}

// Simple debounce for search input
let debounceTimeout: ReturnType<typeof setTimeout> | undefined = undefined
const debouncedFetch = () => {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    fetchMods()
  }, 300)
}

const gameFilterModel = computed({
  get() {
    if (activeGames.value.length === 0) return 'all'
    return 'selected:' + activeGames.value.join(',')
  },
  set(val: string) {
    if (val === 'all') {
      activeGames.value = []
    } else {
      const actualVal = val.startsWith('selected:') ? val.slice(9) : val
      const index = activeGames.value.indexOf(actualVal)
      if (index > -1) {
        activeGames.value.splice(index, 1)
      } else {
        activeGames.value.push(actualVal)
      }
    }
  }
})

const categoryFilterModel = computed({
  get() {
    if (activeCategories.value.length === 0) return 'all'
    return 'selected:' + activeCategories.value.join(',')
  },
  set(val: string) {
    if (val === 'all') {
      activeCategories.value = []
    } else {
      const actualVal = val.startsWith('selected:') ? val.slice(9) : val
      const index = activeCategories.value.indexOf(actualVal)
      if (index > -1) {
        activeCategories.value.splice(index, 1)
      } else {
        activeCategories.value.push(actualVal)
      }
    }
  }
})

const toggleGame = (game: string) => {
  const index = activeGames.value.indexOf(game)
  if (index > -1) {
    activeGames.value.splice(index, 1)
  } else {
    activeGames.value.push(game)
  }
}

const toggleCategory = (cat: string) => {
  const index = activeCategories.value.indexOf(cat)
  if (index > -1) {
    activeCategories.value.splice(index, 1)
  } else {
    activeCategories.value.push(cat)
  }
}

const clearAllFilters = () => {
  activeGames.value = []
  activeCategories.value = []
}

watch([activeGames, activeCategories], () => {
  fetchMods()
}, { deep: true })

const getGameLabelOnly = (game: string) => {
  if (game === 'adofai') return t('games.adofai')
  if (game === 'rhythm-doctor') return t('games.rhythm_doctor')
  return game
}

const getGameLabel = (val: string) => {
  if (!val) return ''
  if (val === 'all') return t('games.all')
  if (val.startsWith('selected:')) {
    const listStr = val.slice(9)
    if (!listStr) return t('games.all')
    return listStr.split(',').map(getGameLabelOnly).join(', ')
  }
  const label = getGameLabelOnly(val)
  if (activeGames.value.includes(val)) {
    return `✓ ${label}`
  }
  return label
}

const getCategoryLabelOnly = (val: string) => {
  if (val === 'ui') return t('categories.ui')
  if (val === 'gameplay') return t('categories.gameplay')
  if (val === 'utility') return t('categories.utility')
  if (val === 'visuals') return t('categories.visuals')
  if (val === 'library') return t('categories.library')
  return val
}

const getCategoryLabel = (val: string) => {
  if (!val) return ''
  if (val === 'all') return t('categories.all')
  if (val.startsWith('selected:')) {
    const listStr = val.slice(9)
    if (!listStr) return t('categories.all')
    return listStr.split(',').map(getCategoryLabelOnly).join(', ')
  }
  const label = getCategoryLabelOnly(val)
  if (activeCategories.value.includes(val)) {
    return `✓ ${label}`
  }
  return label
}

onMounted(() => {
  fetchMods()
})
</script>

<style scoped>
.homepage-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 10px;
}

/* Filter control card */
.filter-controls {
  position: relative;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  padding: 20px 24px;
}

.filter-controls-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

@media (max-width: 968px) {
  .filter-controls-top {
    flex-direction: column;
    align-items: stretch;
  }
}

.active-tags-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.active-tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: rgba(145, 154, 255, 0.1);
  color: #919AFF;
  border: 1px solid rgba(145, 154, 255, 0.25);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

.remove-tag-btn {
  background: none;
  border: none;
  color: rgba(145, 154, 255, 0.6);
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.remove-tag-btn:hover {
  color: #E2676D;
}

.clear-all-tags-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s;
}

.clear-all-tags-btn:hover {
  color: #ffffff;
  text-decoration: underline;
}

.filter-dropdowns-group {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.filter-dropdown-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}

.filter-toggle-wrap {
  display: flex;
  align-items: center;
  margin-left: 4px;
}

.badge-category {
  background-color: rgba(145, 154, 255, 0.1);
  color: #919AFF;
  border: 1px solid rgba(145, 154, 255, 0.25);
}

.search-input-wrap {
  flex-grow: 1;
  max-width: 480px;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
}

/* Mods Grid */
.mods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

@media (max-width: 480px) {
  .mods-grid {
    grid-template-columns: 1fr;
  }
}

.mod-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 200px;
  text-decoration: none;
  cursor: pointer;
  padding: 24px;
}

.mod-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.mod-card-body {
  flex-grow: 1;
  margin-bottom: 20px;
}

.mod-card-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0 !important;
  color: #ffffff;
  border-left: none !important;
  padding-left: 0 !important;
}

.mod-card-summary {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mod-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 14px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.author-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.mod-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.version-tag {
  background-color: rgba(145, 154, 255, 0.1);
  color: #919AFF;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.downloads-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.icon-svg {
  width: 14px;
  height: 14px;
}

/* Loading state */
.mods-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: rgba(255, 255, 255, 0.5);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(145, 154, 255, 0.2);
  border-top-color: #919AFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty state */
.mods-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: rgba(255, 255, 255, 0.2);
}
</style>
