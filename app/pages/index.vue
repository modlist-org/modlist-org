<template>
  <div class="homepage-container">
    <!-- Filters and Search Bar -->
    <div class="filter-controls card">
      <div class="filter-controls-top">
        <div class="filter-dropdowns-group">
          <!-- Game Chips Group -->
          <div class="filter-dropdown-wrap">
            <span class="control-label">{{ t('filter.game') }}</span>
            <div class="game-chips-group">
              <button
                type="button"
                class="game-chip"
                :class="{ active: isAllGamesActive }"
                @click="selectAllGames"
              >
                <span v-if="isAllGamesActive" class="check-icon">✓</span>
                <span>{{ t('games.all') }}</span>
              </button>
              <button
                v-for="game in ['adofai', 'rhythm-doctor']"
                :key="game"
                type="button"
                class="game-chip"
                :class="{ active: isGameActive(game) }"
                @click="toggleGame(game)"
              >
                <span v-if="isGameActive(game)" class="check-icon">✓</span>
                <span>{{ getGameLabelOnly(game) }}</span>
              </button>
            </div>
          </div>

          <!-- Sort Dropdown -->
          <div class="filter-dropdown-wrap">
            <span class="control-label">{{ t('filter.sort') }}</span>
            <div class="filter-dropdown-box sort-dropdown-box">
              <UIDropdown
                v-model="sortBy"
                default-value="downloads_desc"
                :values="['updated', 'created', 'downloads_desc', 'downloads_asc', 'name_asc', 'name_desc']"
                :display="getSortLabel"
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

      <!-- Category Chips -->
      <div class="category-chips-row">
        <button
          v-for="cat in ['all', 'ui', 'gameplay', 'utility', 'visuals', 'library']"
          :key="cat"
          type="button"
          class="category-chip"
          :class="{ active: isCategoryActive(cat) }"
          @click="selectCategory(cat)"
        >
          <span v-if="isCategoryActive(cat)" class="check-icon">✓</span>
          <span>{{ getCategoryLabelOnly(cat) }}</span>
        </button>
      </div>


    </div>

    <!-- Loading Indicator -->
    <div v-if="loadingMods" class="mods-loading-state">
      <div class="spinner" />
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Mod Grid List -->
    <template v-else-if="mods.length > 0">
      <div class="mods-grid">
        <NuxtLink
          v-for="mod in mods"
          :key="mod._id"
          :to="`/mods/${mod.slug}`"
          class="card card-hover mod-card"
        >
          <div class="mod-card-body-wrapper" style="display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; flex-grow: 1;">
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

          <div class="mod-card-tags" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; align-items: center;">
            <span v-if="mod.isFeatured" class="badge badge-featured">⭐ {{ t('sort.featured', 'Featured') }}</span>
            <span class="badge badge-game">{{ getGameLabelOnly(mod.game) }}</span>
            <span v-for="cat in mod.categories" :key="cat" class="badge badge-category">{{ getCategoryLabelOnly(cat) }}</span>
            <span v-if="!mod.isApproved" class="badge badge-pending" style="flex-shrink: 0; margin-left: auto;">{{ t('mod.details.pending_approval') }}</span>
          </div>

          <div class="mod-card-footer">
            <div class="author-info">
              <div class="author-avatars-group">
                <!-- Author Avatar -->
                <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="Avatar" class="author-avatar-img" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
                <!-- Collaborators Avatars (max 2 for visual balance) -->
                <template v-if="mod.collaboratorIds && mod.collaboratorIds.length > 0">
                  <img
                    v-for="collab in mod.collaboratorIds.slice(0, 2)"
                    :key="collab._id"
                    v-tooltip="collab.globalName || collab.username"
                    :src="collab.avatar || '/images/default_avatar.png'"
                    alt="Collab Avatar"
                    class="collab-avatar-img"
                    @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }"
                  >
                  <!-- If there are more than 2, render a "+N" circle -->
                  <div
                    v-if="mod.collaboratorIds.length > 2"
                    v-tooltip="mod.collaboratorIds.slice(2).map(c => c.globalName || c.username).join(', ')"
                    class="collab-avatar-more"
                  >
                    +{{ mod.collaboratorIds.length - 2 }}
                  </div>
                </template>
              </div>
              <span class="author-name" :title="getFullAuthorsText(mod)">{{ getAuthorsText(mod) }}</span>
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

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-container">
        <button
          class="pagination-btn"
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          {{ t('pagination.prev') }}
        </button>
        <div class="pagination-pages">
          <button
            v-for="p in visiblePages"
            :key="p"
            class="pagination-page-btn"
            :class="{ active: p === currentPage }"
            @click="changePage(p)"
          >
            {{ p }}
          </button>
        </div>
        <button
          class="pagination-btn"
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          {{ t('pagination.next') }}
        </button>
      </div>
    </template>

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
import { useI18n, useSeoMeta } from '#imports'
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
  isFeatured?: boolean
  logo?: string
}

const { t } = useI18n()

// SEO Metadata
useSeoMeta({
  title: () => `modlist.org - ${t('subtitle')}`,
  ogTitle: () => `modlist.org - ${t('subtitle')}`,
  description: () => t('seo.description'),
  ogDescription: () => t('seo.description'),
  ogImage: '/favicon.svg',
  twitterCard: 'summary'
})

const getAuthorsText = (mod: ModItem) => {
  const names = []
  if (mod.authorId) {
    names.push(mod.authorId.globalName || mod.authorId.username)
  }
  if (mod.collaboratorIds && mod.collaboratorIds.length > 0) {
    const displayed = mod.collaboratorIds.slice(0, 2)
    displayed.forEach(collab => {
      names.push(collab.globalName || collab.username)
    })
    if (mod.collaboratorIds.length > 2) {
      return names.join(', ') + ' and more'
    }
  }
  return names.length > 0 ? names.join(', ') : 'Unknown'
}

const getFullAuthorsText = (mod: ModItem) => {
  const names = []
  if (mod.authorId) {
    names.push(mod.authorId.globalName || mod.authorId.username)
  }
  if (mod.collaboratorIds && mod.collaboratorIds.length > 0) {
    mod.collaboratorIds.forEach(collab => {
      names.push(collab.globalName || collab.username)
    })
  }
  return names.length > 0 ? names.join(', ') : 'Unknown'
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

const activeGames = ref<string[]>([])

const isAllGamesActive = computed(() => {
  return activeGames.value.length === 0
})

const selectAllGames = () => {
  activeGames.value = []
}

const isGameActive = (game: string) => {
  return activeGames.value.includes(game)
}

const toggleGame = (game: string) => {
  const isAllActive = activeGames.value.length === 0
  if (isAllActive) {
    activeGames.value = [game]
  } else {
    const index = activeGames.value.indexOf(game)
    if (index > -1) {
      activeGames.value.splice(index, 1)
    } else {
      activeGames.value.push(game)
    }
  }
}

const activeCategories = ref<string[]>([])
const searchQuery = ref('')
const sortBy = ref('downloads_desc')
const mods = ref<ModItem[]>([])
const loadingMods = ref(true)

// Pagination states
const currentPage = ref(1)
const totalPages = ref(1)
const totalMods = ref(0)

const fetchMods = async () => {
  loadingMods.value = true
  try {
    const params: Record<string, string> = {
      page: String(currentPage.value),
      limit: '12',
      sortBy: sortBy.value
    }
    if (activeGames.value.length > 0) {
      params.game = activeGames.value.join(',')
    }
    if (activeCategories.value.length > 0) {
      params.categories = activeCategories.value.join(',')
    }
    if (searchQuery.value.trim().length > 0) {
      params.search = searchQuery.value
    }

    const response = await $fetch<{ mods: ModItem[]; pagination?: { total: number; page: number; limit: number; totalPages: number } }>('/api/mods', { params })
    mods.value = response.mods || []
    if (response.pagination) {
      totalMods.value = response.pagination.total
      totalPages.value = response.pagination.totalPages
      currentPage.value = response.pagination.page
    } else {
      totalMods.value = mods.value.length
      totalPages.value = 1
    }
  } catch (error) {
    console.error('Failed to load mods:', error)
  } finally {
    loadingMods.value = false
  }
}

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchMods()
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const visiblePages = computed(() => {
  const range = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages.value, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    range.push(i)
  }
  return range
})

// Simple debounce for search input
let debounceTimeout: ReturnType<typeof setTimeout> | undefined = undefined
const debouncedFetch = () => {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchMods()
  }, 300)
}





const isCategoryActive = (cat: string) => {
  if (cat === 'all') return activeCategories.value.length === 0
  return activeCategories.value.includes(cat)
}

const selectCategory = (cat: string) => {
  if (cat === 'all') {
    activeCategories.value = []
  } else {
    const index = activeCategories.value.indexOf(cat)
    if (index > -1) {
      activeCategories.value.splice(index, 1)
    } else {
      activeCategories.value.push(cat)
    }
  }
}



watch([activeGames, activeCategories], () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selected_games', JSON.stringify(activeGames.value))
  }
  currentPage.value = 1
  fetchMods()
}, { deep: true })

watch(sortBy, () => {
  currentPage.value = 1
  fetchMods()
})

const getSortLabel = (val: string) => {
  if (val === 'updated') return t('sort.updated')
  if (val === 'created') return t('sort.created')
  if (val === 'downloads_desc') return t('sort.downloads_desc')
  if (val === 'downloads_asc') return t('sort.downloads_asc')
  if (val === 'name_asc') return t('sort.name_asc')
  if (val === 'name_desc') return t('sort.name_desc')
  return val
}

const getGameLabelOnly = (game: string) => {
  if (game === 'adofai') return t('games.adofai')
  if (game === 'rhythm-doctor') return t('games.rhythm_doctor')
  return game
}



const getCategoryLabelOnly = (val: string) => {
  if (val === 'all') return t('categories.all')
  if (val === 'ui') return t('categories.ui')
  if (val === 'gameplay') return t('categories.gameplay')
  if (val === 'utility') return t('categories.utility')
  if (val === 'visuals') return t('categories.visuals')
  if (val === 'library') return t('categories.library')
  return val
}



onMounted(() => {
  let hasChanges = false
  if (typeof window !== 'undefined') {
    const savedGames = localStorage.getItem('selected_games')
    if (savedGames) {
      try {
        const parsed = JSON.parse(savedGames)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((g: string) => ['adofai', 'rhythm-doctor'].includes(g))
          if (JSON.stringify(filtered) !== JSON.stringify(activeGames.value)) {
            activeGames.value = filtered
            hasChanges = true
          }
        }
      } catch (e) {
        console.error('Failed to parse selected games:', e)
      }
    }
  }
  
  if (!hasChanges) {
    fetchMods()
  }
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

.game-chips-group {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  max-width: 100%;
}

.game-chips-group::-webkit-scrollbar {
  display: none;
}

.game-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #1e1c28;
  color: #7e808f;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  outline: none;
  flex-shrink: 0;
}

.game-chip:hover {
  border-color: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
}

.game-chip.active {
  background-color: rgba(145, 154, 255, 0.15);
  color: #919aff;
  border-color: #919aff;
  font-weight: 600;
}

@media (max-width: 768px) {
  .game-chips-group {
    justify-content: flex-end;
    max-width: 70%;
  }
}

.category-dropdown-box {
  width: 180px;
}

.sort-dropdown-box {
  width: 180px;
}

.badge-featured {
  background-color: rgba(255, 215, 0, 0.15) !important;
  color: #FFD700 !important;
  border: 1px solid rgba(255, 215, 0, 0.35) !important;
  font-weight: 700;
}

@media (max-width: 768px) {
  .filter-dropdowns-group {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .filter-dropdown-wrap {
    width: 100%;
    justify-content: space-between;
  }

  .filter-dropdown-box {
    flex-grow: 1;
    max-width: 260px;
  }
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

@media (max-width: 768px) {
  .search-input-wrap {
    width: 100%;
    max-width: 100%;
  }
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
  overflow: hidden;
  max-width: 70%;
}

.author-avatars-group {
  display: flex;
  align-items: center;
}

.author-avatar-img, .collab-avatar-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid #1b1a22; /* overlaps overlay boundary */
  object-fit: cover;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.collab-avatar-img, .collab-avatar-more {
  margin-left: -8px;
}

.collab-avatar-more {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid #1b1a22;
  background-color: #2b2a33;
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.author-avatars-group:hover .author-avatar-img,
.author-avatars-group:hover .collab-avatar-img,
.author-avatars-group:hover .collab-avatar-more {
  transform: translateY(-2px);
}

.author-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
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

/* Category Chips styling */
.category-chips-row {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  /* Hide scrollbar for Chrome, Safari and Opera */
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.category-chips-row::-webkit-scrollbar {
  display: none;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #1e1c28;
  color: #7e808f;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  outline: none;
}

.category-chip:hover {
  border-color: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
}

.category-chip.active {
  background-color: rgba(145, 154, 255, 0.15);
  color: #919aff;
  border-color: #919aff;
  font-weight: 600;
}

.check-icon {
  font-size: 14px;
  line-height: 1;
}
</style>
