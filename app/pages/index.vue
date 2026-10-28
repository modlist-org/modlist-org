<template>
  <div class="home">
    <section class="hero">
      <div class="hero-head">
        <h1 class="hero-title">{{ t('subtitle') }}</h1>
        <p class="hero-subtitle">{{ t('home.hero_subtitle') }}</p>
      </div>
      <div class="hero-actions">
        <div class="hero-search">
          <svg aria-hidden="true" class="hero-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            v-model="searchQuery"
            type="search"
            name="q"
            :placeholder="t('search.placeholder')"
            :aria-label="t('search.placeholder')"
            @input="debouncedFetch"
          >
        </div>
        <a href="https://github.com/modlist-org/modlist_org_app/releases/latest" target="_blank" rel="noopener" class="hero-app-link">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.62 2.48A2 2 0 0 0 4.56 21h14.88a2 2 0 0 0 1.94-1.52L22 17" /></svg>
          {{ t('home.get_app') }}
        </a>
      </div>
    </section>

    <div class="browse">
      <aside class="filters" :class="{ open: filtersOpen }">
        <div class="filter-section">
          <h2 class="filter-title">{{ t('filter.game') }}</h2>
          <UIToggle
            :model-value="isAllGamesActive"
            :default-value="true"
            :label="t('games.all')"
            :font-size="14"
            disable-reset
            @update:model-value="selectAllGames"
          />
          <div v-if="GAMES.length > GAME_SEARCH_THRESHOLD" class="filter-search">
            <input v-model="gameFilterQuery" type="search" :placeholder="t('submit.game_search_placeholder')">
          </div>
          <div class="filter-scroll">
            <UIToggle
              v-for="game in visibleGameOptions"
              :key="game"
              :model-value="isGameActive(game)"
              :default-value="false"
              :label="getGameLabelOnly(game)"
              :font-size="14"
              disable-reset
              @update:model-value="toggleGame(game)"
            />
          </div>
        </div>

        <div class="filter-section">
          <h2 class="filter-title">{{ t('filter.category') }}</h2>
          <UIToggle
            v-for="cat in CATEGORY_FILTERS"
            :key="cat"
            :model-value="isCategoryActive(cat)"
            :default-value="cat === 'all'"
            :label="getCategoryLabelOnly(cat)"
            :font-size="14"
            disable-reset
            @update:model-value="selectCategory(cat)"
          />
        </div>

        <button v-if="hasActiveFilters" type="button" class="btn btn-ghost btn-sm" style="align-self: flex-start;" @click="clearFilters">
          {{ t('home.clear_filters') }}
        </button>
      </aside>

      <section class="results">
        <div class="results-toolbar">
          <button type="button" class="btn btn-secondary btn-sm filters-toggle" @click="filtersOpen = !filtersOpen">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
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

        <div v-if="loadingMods" class="mods-grid" aria-busy="true">
          <div v-for="n in 6" :key="n" class="mod-card mod-card-skeleton">
            <div class="skeleton mod-logo" />
            <div class="mod-info">
              <div class="skeleton" style="width: 40%; height: 20px;" />
              <div class="skeleton" style="width: 80%; height: 14px;" />
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
                  <span v-if="mod.isFeatured" class="badge badge-featured">{{ t('sort.featured', 'Featured') }}</span>
                  <span v-if="!mod.isApproved" class="badge badge-pending">{{ t('mod.details.pending_approval') }}</span>
                </div>

                <div class="mod-authors">
                  <div class="avatar-stack">
                    <OrgAvatar v-if="mod.organization" :name="mod.organization.name" :logo="mod.organization.logo" :size="18" />
                    <img
                      v-for="person in creditedPeople(mod).slice(0, mod.organization ? 2 : 3)"
                      :key="person._id"
                      :src="person.avatar || '/images/default_avatar.png'"
                      alt=""
                      @error="onAvatarError"
                    >
                  </div>
                  <span class="mod-author-names" :title="getFullAuthorsText(mod)">{{ getAuthorsText(mod) }}</span>
                  <svg v-if="!mod.organization && mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" role="img" :aria-label="t('mod.details.verified_source')"><path d="m5 12 5 5 9-10" /></svg>
                </div>

                <p class="mod-summary">{{ localizedText(mod, locale).summary }}</p>

                <div class="mod-meta">
                  <span v-for="g in modGames(mod)" :key="g" class="badge badge-game">{{ getGameLabelOnly(g) }}</span>
                  <span v-for="cat in mod.categories.slice(0, 3)" :key="cat" class="badge badge-category">{{ getCategoryLabelOnly(cat) }}</span>
                  <span v-if="mod.categories.length > 3" class="badge badge-category">+{{ mod.categories.length - 3 }}</span>
                </div>
              </div>

              <div class="mod-stats">
                <span class="mod-downloads">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.62 2.48A2 2 0 0 0 4.56 21h14.88a2 2 0 0 0 1.94-1.52L22 17" /></svg>
                  {{ formatNumber(mod.downloads) }}
                </span>
                <span v-if="mod.latestVersion" class="mod-version">v{{ mod.latestVersion.version }}</span>
              </div>
            </NuxtLink>
          </div>

          <div v-if="totalPages > 1" class="pagination-container">
            <button type="button" class="pagination-btn" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">
              {{ t('pagination.prev') }}
            </button>
            <div class="pagination-pages">
              <button
                v-for="p in visiblePages"
                :key="p"
                type="button"
                class="pagination-page-btn"
                :class="{ active: p === currentPage }"
                @click="changePage(p)"
              >
                {{ p }}
              </button>
            </div>
            <button type="button" class="pagination-btn" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">
              {{ t('pagination.next') }}
            </button>
          </div>
        </template>

        <div v-else class="empty-state">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>
          <p>{{ t('home.no_mods') }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { localizedText } from '../utils/locales'
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n, useSeoMeta } from '#imports'
import { UIDropdown, UIToggle } from 'overlayer-ui'
import { creditedPeople } from '../utils/credits'
import { GAME_IDS, gameLabelKey } from '../utils/games'

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
  games?: string[]
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
  organization?: { _id: string; name: string; slug: string; logo?: string; memberIds: string[] } | null
  isApproved: boolean
  downloads: number
  versions: ModVersion[]
  latestVersion?: ModVersion | null
  isFeatured?: boolean
  logo?: string
}

const { t, locale } = useI18n()

// SEO Metadata
useSeoMeta({
  title: () => `modlist.org - ${t('subtitle')}`,
  ogTitle: () => `modlist.org - ${t('subtitle')}`,
  description: () => t('seo.description'),
  ogDescription: () => t('seo.description'),
  ogImage: '/favicon.svg',
  twitterCard: 'summary'
})

const creditNames = (mod: ModItem) => [
  ...(mod.organization ? [mod.organization.name] : []),
  ...creditedPeople(mod).map((p) => p.globalName || p.username)
]

const getAuthorsText = (mod: ModItem) => {
  const names = creditNames(mod)
  if (names.length === 0) return 'Unknown'
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ')
}

const getFullAuthorsText = (mod: ModItem) => creditNames(mod).join(', ') || 'Unknown'

const getFallbackGradientStyle = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const h1 = Math.abs(hash) % 360
  return {
    backgroundColor: `oklch(45% 0.1 ${h1})`
  }
}

const GAMES = GAME_IDS
const GAME_SEARCH_THRESHOLD = 6
const gameFilterQuery = ref('')
// Selected games stay visible while searching
const visibleGameOptions = computed(() => {
  const q = gameFilterQuery.value.trim().toLowerCase()
  if (!q) return GAMES
  return GAMES.filter((g) => activeGames.value.includes(g) || getGameLabelOnly(g).toLowerCase().includes(q))
})
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

const modGames = (mod: { game: string; games?: string[] }) => mod.games?.length ? mod.games : [mod.game]

const getGameLabelOnly = (game: string) => t(gameLabelKey(game))



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
          const filtered = parsed.filter((g: string) => GAMES.includes(g))
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
  gap: var(--space-2xl);
}

/* Hero: Index posture, head then search stacked and centred, the mod index below it is the visual */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-xl);
  padding: var(--space-xl) 0 var(--space-xl);
  border-bottom: var(--rule-hair) solid var(--border);
}

.hero-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
}

.hero-title {
  font-size: var(--text-page-head);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1;
  max-width: 14ch;
  color: var(--text);
}

.hero-subtitle {
  color: var(--text-secondary);
  font-size: var(--text-lead);
  line-height: 1.45;
  max-width: 44ch;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
  max-width: 640px;
  min-width: 0;
}

.hero-search {
  position: relative;
  width: 100%;
}

.hero-search input {
  width: 100%;
  height: 56px;
  padding: 0 var(--space-md) 0 52px;
  font-size: var(--text-md);
}

.hero-search-icon {
  position: absolute;
  left: var(--space-md);
  top: 50%;
  width: 20px;
  height: 20px;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.hero-app-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
  border-radius: var(--radius-sm);
}

.hero-app-link svg {
  width: 16px;
  height: 16px;
}

.hero-app-link:hover {
  text-decoration: underline;
}

/* Browse layout */
.browse {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: var(--gap-columns);
  align-items: start;
}

.filters {
  position: sticky;
  top: calc(var(--header-height) + var(--space-lg));
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
}

.filter-search input {
  width: 100%;
  height: 36px;
  margin-bottom: var(--space-2xs);
}

.filter-scroll {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  max-height: 320px;
  overflow-y: auto;
}

.filters :deep(.overlayer-toggle) {
  background-color: transparent !important;
}

.filter-title {
  margin: 0 0 var(--space-xs);
  padding: 0 var(--space-sm);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0;
  color: var(--text-tertiary);
}

/* Results */
.results {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.results-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.results-count {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.sort-box {
  margin-left: auto;
  width: 200px;
}

.filters-toggle {
  display: none;
}

/* The mod index: rows parted by hairlines, logo large, figures in a right column */
.mods-grid {
  display: flex;
  flex-direction: column;
  border-top: var(--rule-hair) solid var(--border);
}

.mod-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-lg) var(--space-md);
  border-bottom: var(--rule-hair) solid var(--border);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: inherit;
  transition: background-color var(--dur-micro) var(--ease-out);
}

.mod-card:hover {
  background: var(--surface-hover);
}

.mod-card:focus-visible {
  outline-offset: -2px;
}

.mod-card-skeleton {
  pointer-events: none;
}

.mod-logo {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--surface-3);
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
  font-size: var(--text-xl);
  font-weight: 800;
  color: var(--text);
}

.mod-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.mod-heading {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
}

.mod-name {
  margin: 0;
  max-width: none;
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mod-authors {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.avatar-stack {
  display: flex;
  flex-shrink: 0;
}

.avatar-stack img {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--bg);
  margin-left: -8px;
}

.avatar-stack img:first-child {
  margin-left: 0;
}

.avatar-stack .org-avatar {
  margin-left: 0;
  border-radius: 5px;
}

.mod-author-names {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.verified-mark {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--success);
}

.mod-summary {
  color: var(--text-secondary);
  font-size: var(--text-md);
  line-height: 1.5;
  max-width: 70ch;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mod-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  flex-wrap: wrap;
}

.mod-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2xs);
  min-width: 96px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.mod-downloads {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text);
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.mod-downloads svg {
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
}

.mod-version {
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  font-weight: 500;
}

@media (max-width: 960px) {
  .hero {
    padding-top: var(--space-md);
  }
  .browse {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-md);
  }
  .filters {
    display: none;
    position: static;
    padding: var(--space-md);
    background: var(--surface);
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

@media (max-width: 560px) {
  .mod-card {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: var(--space-sm) var(--space-md);
    padding: var(--space-md) var(--space-2xs);
    align-items: start;
  }
  .mod-logo {
    width: 56px;
    height: 56px;
  }
  .mod-stats {
    grid-column: 2;
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-sm);
    min-width: 0;
  }
  .mod-downloads {
    font-size: var(--text-md);
  }
  .results-count {
    display: none;
  }
}
</style>
