<template>
  <div class="home">
    <section class="hero">
      <h1 class="hero-title">{{ t('home.hero_title') }}</h1>
      <p class="hero-subtitle">{{ t('home.hero_subtitle') }}</p>
      <div class="hero-search">
        <svg class="hero-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          v-model="searchQuery"
          type="search"
          :placeholder="t('search.placeholder')"
          :aria-label="t('search.placeholder')"
          @input="debouncedFetch"
        >
      </div>
      <a href="https://github.com/modlist-org/modlist_org_app/releases/latest" target="_blank" rel="noopener" class="hero-app-link">
        {{ t('home.get_app') }} →
      </a>
    </section>

    <div class="browse">
      <aside class="filters" :class="{ open: filtersOpen }">
        <div class="filter-section">
          <h2 class="filter-title">{{ t('filter.game') }}</h2>
          <button type="button" class="filter-option" :class="{ active: isAllGamesActive }" @click="selectAllGames">
            <span class="filter-check" />
            {{ t('games.all') }}
          </button>
          <button
            v-for="game in GAMES"
            :key="game"
            type="button"
            class="filter-option"
            :class="{ active: isGameActive(game) }"
            @click="toggleGame(game)"
          >
            <span class="filter-check" />
            {{ getGameLabelOnly(game) }}
          </button>
        </div>

        <div class="filter-section">
          <h2 class="filter-title">{{ t('filter.category') }}</h2>
          <button
            v-for="cat in CATEGORY_FILTERS"
            :key="cat"
            type="button"
            class="filter-option"
            :class="{ active: isCategoryActive(cat) }"
            @click="selectCategory(cat)"
          >
            <span class="filter-check" />
            {{ getCategoryLabelOnly(cat) }}
          </button>
        </div>

        <button v-if="hasActiveFilters" type="button" class="btn btn-ghost btn-sm" style="align-self: flex-start;" @click="clearFilters">
          {{ t('home.clear_filters') }}
        </button>
      </aside>

      <section class="results">
        <div class="results-toolbar">
          <button type="button" class="btn btn-secondary btn-sm filters-toggle" @click="filtersOpen = !filtersOpen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            {{ t('home.filters') }}
          </button>
          <span class="results-count">{{ loadingMods ? '' : t('home.results', { count: totalMods }) }}</span>
          <div class="sort-box">
            <UIDropdown
              v-model="sortBy"
              default-value="downloads_desc"
              :values="['updated', 'created', 'downloads_desc', 'downloads_asc', 'name_asc', 'name_desc']"
              :display="getSortLabel"
              disable-reset
            />
          </div>
        </div>

        <div v-if="loadingMods" class="mods-grid">
          <div v-for="n in 6" :key="n" class="mod-card mod-card-skeleton">
            <div class="skeleton" style="width: 56px; height: 56px; border-radius: 12px;" />
            <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
              <div class="skeleton" style="width: 50%; height: 16px;" />
              <div class="skeleton" style="width: 90%; height: 12px;" />
              <div class="skeleton" style="width: 70%; height: 12px;" />
            </div>
          </div>
        </div>

        <template v-else-if="mods.length > 0">
          <div class="mods-grid">
            <NuxtLink
              v-for="mod in mods"
              :key="mod._id"
              :to="`/mods/${mod.slug}`"
              class="mod-card"
              :class="{ featured: mod.isFeatured }"
            >
              <div class="mod-logo">
                <img v-if="mod.logo" :src="mod.logo" :alt="mod.name" loading="lazy">
                <span v-else :style="getFallbackGradientStyle(mod.name)">{{ mod.name ? mod.name.charAt(0).toUpperCase() : 'M' }}</span>
              </div>

              <div class="mod-info">
                <div class="mod-heading">
                  <h3 class="mod-name">{{ mod.name }}</h3>
                  <span v-if="mod.isFeatured" class="badge badge-featured">★ {{ t('sort.featured', 'Featured') }}</span>
                  <span v-if="!mod.isApproved" class="badge badge-pending">{{ t('mod.details.pending_approval') }}</span>
                </div>

                <div class="mod-authors">
                  <div class="avatar-stack">
                    <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="" @error="onAvatarError">
                    <img
                      v-for="collab in (mod.collaboratorIds || []).slice(0, 2)"
                      :key="collab._id"
                      :src="collab.avatar || '/images/default_avatar.png'"
                      alt=""
                      @error="onAvatarError"
                    >
                  </div>
                  <span class="mod-author-names" :title="getFullAuthorsText(mod)">{{ getAuthorsText(mod) }}</span>
                  <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-dot">✓</span>
                </div>

                <p class="mod-summary">{{ mod.summary }}</p>

                <div class="mod-meta">
                  <span class="badge badge-game">{{ getGameLabelOnly(mod.game) }}</span>
                  <span v-for="cat in mod.categories.slice(0, 3)" :key="cat" class="badge badge-category">{{ getCategoryLabelOnly(cat) }}</span>
                  <span v-if="mod.categories.length > 3" class="badge badge-category">+{{ mod.categories.length - 3 }}</span>
                  <span class="mod-stats">
                    <span v-if="mod.latestVersion" class="mod-version">v{{ mod.latestVersion.version }}</span>
                    <span class="mod-downloads">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.62 2.48A2 2 0 0 0 4.56 21h14.88a2 2 0 0 0 1.94-1.52L22 17" /></svg>
                      {{ formatNumber(mod.downloads) }}
                    </span>
                  </span>
                </div>
              </div>
            </NuxtLink>
          </div>

          <div v-if="totalPages > 1" class="pagination-container">
            <button class="pagination-btn" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">
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
            <button class="pagination-btn" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">
              {{ t('pagination.next') }}
            </button>
          </div>
        </template>

        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>
          <p>{{ t('home.no_mods') }}</p>
        </div>
      </section>
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
  game: 'adofai' | 'rhythm-doctor' | 'dancing-line'
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
      return names.join(', ') + ` +${mod.collaboratorIds.length - 2}`
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

const GAMES = ['adofai', 'rhythm-doctor', 'dancing-line'] as const
const CATEGORY_FILTERS = ['all', 'ui', 'gameplay', 'utility', 'visuals', 'library'] as const

const filtersOpen = ref(false)

const onAvatarError = (e: Event) => {
  (e.target as HTMLImageElement).src = '/images/default_avatar.png'
}

const numberFormatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const formatNumber = (n: number) => numberFormatter.format(n || 0)

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

const hasActiveFilters = computed(() => activeGames.value.length > 0 || activeCategories.value.length > 0)

const clearFilters = () => {
  activeGames.value = []
  activeCategories.value = []
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
  if (game === 'dancing-line') return t('games.dancing_line')
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
          const filtered = parsed.filter((g: string) => ['adofai', 'rhythm-doctor', 'dancing-line'].includes(g))
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
.home {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Hero */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 0 8px;
  gap: 14px;
}

.hero-title {
  margin: 0;
  font-size: clamp(30px, 4.6vw, 48px);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.1;
  background: linear-gradient(180deg, #ffffff 30%, #b9bdf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-subtitle {
  margin: 0;
  max-width: 560px;
  color: var(--text-secondary);
  font-size: 16px;
}

.hero-search {
  position: relative;
  width: 100%;
  max-width: 600px;
  margin-top: 12px;
}

.hero-search input {
  width: 100%;
  height: 52px;
  padding: 0 18px 0 48px;
  font-size: 16px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.hero-search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  width: 20px;
  height: 20px;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.hero-app-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}

.hero-app-link:hover {
  text-decoration: underline;
}

/* Browse layout */
.browse {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}

.filters {
  position: sticky;
  top: calc(var(--header-height) + 24px);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.filter-title {
  margin: 0 0 8px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.filter-option:hover {
  background: var(--surface-2);
  color: var(--text);
}

.filter-option.active {
  color: var(--text);
}

.filter-check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 5px;
  border: 1.5px solid var(--border-strong);
  transition: all 0.15s ease;
}

.filter-option.active .filter-check {
  border-color: var(--accent-strong);
  background: var(--accent-strong) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 12 5 5 9-10'/%3E%3C/svg%3E") center / 11px no-repeat;
}

/* Results */
.results {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.results-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.results-count {
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
}

.sort-box {
  margin-left: auto;
  width: 200px;
}

.filters-toggle {
  display: none;
}

.mods-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mod-card {
  display: flex;
  gap: 16px;
  padding: 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.mod-card:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
  transform: translateY(-1px);
}

.mod-card.featured {
  border-color: rgba(242, 181, 82, 0.22);
  background:
    linear-gradient(180deg, rgba(242, 181, 82, 0.05), transparent 60%),
    var(--surface);
}

.mod-card.featured:hover {
  border-color: rgba(242, 181, 82, 0.4);
}

.mod-card-skeleton {
  pointer-events: none;
}

.mod-logo {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.mod-logo img,
.mod-logo span {
  width: 100%;
  height: 100%;
}

.mod-logo img {
  object-fit: cover;
  display: block;
}

.mod-logo span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
}

.mod-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mod-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.mod-name {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mod-authors {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.avatar-stack {
  display: flex;
  flex-shrink: 0;
}

.avatar-stack img {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--surface);
  margin-left: -6px;
}

.avatar-stack img:first-child {
  margin-left: 0;
}

.mod-author-names {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.mod-summary {
  margin: 2px 0 4px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mod-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: auto;
}

.mod-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 600;
}

.mod-version {
  font-variant-numeric: tabular-nums;
}

.mod-downloads {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
}

.mod-downloads svg {
  width: 14px;
  height: 14px;
}

@media (max-width: 1100px) {
  .mods-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 860px) {
  .hero {
    padding-top: 16px;
  }
  .browse {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .filters {
    display: none;
    position: static;
    padding: 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }
  .filters.open {
    display: flex;
  }
  .filters-toggle {
    display: inline-flex;
  }
  .sort-box {
    width: 170px;
  }
}

@media (max-width: 520px) {
  .mod-card {
    padding: 14px;
    gap: 12px;
  }
  .mod-logo {
    width: 48px;
    height: 48px;
  }
  .results-count {
    display: none;
  }
}
</style>
