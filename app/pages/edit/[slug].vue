<template>
  <div class="edit-page-container">
    <div v-if="loading" class="edit-loading-state">
      <div class="spinner" />
      <p>{{ t('loading') }}</p>
    </div>

    <div v-else-if="mod" class="card form-card">
      <h2>{{ t('submit.edit_title') }}</h2>
      <div class="card-divider" />

      <form class="main-form" @submit.prevent="handleUpdate">
        <!-- Mod Name -->
        <div class="form-group">
          <label for="mod-name">{{ t('submit.name') }}</label>
          <input
            id="mod-name"
            v-model="form.name"
            type="text"
            required
          >
        </div>

        <!-- Mod Logo -->
        <div class="form-group">
          <label>{{ t('submit.logo') }}</label>
          <div class="logo-upload-container">
            <div class="logo-preview-box">
              <img v-if="form.logo" :src="form.logo" alt="Logo Preview" class="logo-preview-img">
              <div v-else class="logo-preview-placeholder">
                <span class="logo-placeholder-text">{{ form.name ? form.name.charAt(0).toUpperCase() : 'M' }}</span>
              </div>
            </div>
            <div class="logo-upload-controls">
              <input
                ref="logoInput"
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                style="display: none;"
                @change="handleLogoUpload"
              >
              <div class="logo-upload-buttons">
                <UIButton
                  type="button"
                  :label="t('submit.logo_select')"
                  @click="triggerLogoSelect"
                />
                <UIButton
                  v-if="form.logo"
                  type="button"
                  :label="t('submit.logo_remove')"
                  class="danger-btn"
                  @click="clearLogo"
                />
              </div>
              <span class="form-help-text logo-help-text">
                {{ t('submit.logo_help') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Target Game -->
        <div class="form-group">
          <label>{{ t('submit.game') }}</label>
          <div class="form-dropdown-wrapper">
            <UIDropdown
              v-model="form.game"
              default-value="adofai"
              :values="['adofai', 'rhythm-doctor']"
              :display="getGameLabel"
            />
          </div>
        </div>

        <!-- Category -->
        <div class="form-group">
          <label>{{ t('submit.category') }}</label>
          <div class="form-dropdown-wrapper category-dropdown-wrapper">
            <UIDropdown
              v-model="categoriesFormModel"
              default-value="selected:"
              :values="['ui', 'gameplay', 'utility', 'visuals', 'library']"
              :display="getCategoryLabel"
            />
          </div>
          <!-- Selected Categories tags -->
          <div v-if="form.categories.length > 0" class="collabs-tags-container">
            <div v-for="cat in form.categories" :key="cat" class="collab-tag-item">
              <span>{{ getCategoryLabelOnly(cat) }}</span>
              <button type="button" class="remove-collab-btn" @click="toggleFormCategory(cat)">&times;</button>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="form-group">
          <label for="mod-summary">{{ t('submit.summary') }}</label>
          <input
            id="mod-summary"
            v-model="form.summary"
            type="text"
            maxlength="150"
            required
          >
        </div>

        <!-- Description -->
        <div class="form-group">
          <label for="mod-description">{{ t('submit.description') }}</label>
          <textarea
            id="mod-description"
            v-model="form.description"
            rows="10"
          />
        </div>

        <!-- Source Code Link -->
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

        <!-- Community Link -->
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

        <div class="card-divider-sub" />

        <!-- Collaborators Section (Only Author or Admin can manage) -->
        <div v-if="isAuthorOrAdmin" class="form-group">
          <label>{{ t('submit.collaborators') }}</label>
          
          <!-- Selected Collabs List -->
          <div v-if="selectedCollabs.length > 0" class="collabs-tags-container">
            <div v-for="userObj in selectedCollabs" :key="userObj._id" class="collab-tag-item">
              <img :src="userObj.avatar || '/images/default_avatar.png'" alt="Avatar" class="collab-avatar">
              <span>{{ userObj.globalName || userObj.username }}</span>
              <span v-if="userObj.isPending" style="font-size: 11px; opacity: 0.6; margin-left: 4px;">({{ t('mod.details.pending_approval') }})</span>
              <button type="button" class="remove-collab-btn" @click="removeCollab(userObj._id)">&times;</button>
            </div>
          </div>

          <!-- Collab Search Input -->
          <div class="collab-search-wrapper">
            <input
              v-model="collabSearchQuery"
              type="text"
              :placeholder="t('submit.search_user_placeholder')"
              class="collab-search-input"
              @input="searchUsers"
            >
            
            <!-- Search Results Dropdown -->
            <div v-if="searchResults.length > 0" class="search-results-dropdown">
              <div
                v-for="userObj in searchResults"
                :key="userObj._id"
                class="search-result-item"
                @click="addCollab(userObj)"
              >
                <img :src="userObj.avatar || '/images/default_avatar.png'" alt="Avatar" class="collab-avatar">
                <span>{{ userObj.globalName || userObj.username }} ({{ userObj.username }})</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="form-group">
          <label>{{ t('submit.collaborators') }}</label>
          <div class="collabs-tags-container">
            <div v-for="userObj in selectedCollabs" :key="userObj._id" class="collab-tag-item" style="padding-right: 12px;">
              <img :src="userObj.avatar || '/images/default_avatar.png'" alt="Avatar" class="collab-avatar">
              <span>{{ userObj.globalName || userObj.username }}</span>
              <span v-if="userObj.isPending" style="font-size: 11px; opacity: 0.6; margin-left: 4px;">({{ t('mod.details.pending_approval') }})</span>
            </div>
          </div>
          <span class="form-help-text">{{ t('submit.only_author_manage_collabs') }}</span>
        </div>

        <div class="card-divider-sub" />

        <!-- Form Messages -->
        <div v-if="errorMsg" class="form-error-msg">
          {{ errorMsg }}
        </div>
        <div v-if="successMsg" class="form-success-msg">
          {{ successMsg }}
        </div>

        <div class="form-actions">
          <UIButton
            :label="updating ? t('submit.saving') : t('submit.save_changes')"
            :blocked="updating"
            type="submit"
            class="form-submit-btn"
          />
          <UIButton
            :label="t('submit.cancel')"
            class="danger-btn form-cancel-btn"
            type="button"
            @click="cancelEdit"
          />
        </div>
      </form>
    </div>

    <div v-else class="card error-card">
      <h2>{{ t('submit.mod_not_found') }}</h2>
      <p>{{ t('submit.mod_not_found_detail') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useI18n, navigateTo, useSeoMeta } from '#imports'
import { UIButton, UIDropdown } from 'overlayer-ui'
import { useAuth } from '../../composables/useAuth'

const { t } = useI18n()

useSeoMeta({
  title: () => t('submit.edit_title'),
  ogTitle: () => t('submit.edit_title'),
  description: () => t('seo.description'),
  ogDescription: () => t('seo.description'),
  ogImage: '/favicon.svg',
  twitterCard: 'summary',
  robots: 'noindex, nofollow'
})

interface SearchUserItem {
  _id: string
  username: string
  globalName?: string
  avatar?: string
  isPending?: boolean
}

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
  authorId: {
    _id: string
    username: string
    globalName?: string
    avatar?: string
    isVerifiedDeveloper: boolean
  }
  collaboratorIds: SearchUserItem[]
  pendingCollaboratorIds: SearchUserItem[]
  isApproved: boolean
  downloads: number
  versions: ModVersion[]
  logo?: string
  sourceUrl?: string
  communityUrl?: string
  pendingEdit?: {
    name?: string
    summary?: string
    description?: string
    game?: 'adofai' | 'rhythm-doctor'
    categories?: Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
    logo?: string
    sourceUrl?: string
    communityUrl?: string
  } | null
}

const route = useRoute()
const slug = route.params.slug as string
const { user, loading: authLoading } = useAuth()

const mod = ref<ModItem | null>(null)
const loading = ref(true)
const updating = ref(false)

const form = ref({
  name: '',
  logo: '',
  sourceUrl: '',
  communityUrl: '',
  game: 'adofai' as 'adofai' | 'rhythm-doctor',
  categories: ['ui'] as string[],
  summary: '',
  description: ''
})

const selectedCollabs = ref<SearchUserItem[]>([])
const collabSearchQuery = ref('')
const searchResults = ref<SearchUserItem[]>([])

const errorMsg = ref('')
const successMsg = ref('')

const logoInput = ref<HTMLInputElement | null>(null)

const triggerLogoSelect = () => {
  if (logoInput.value) {
    logoInput.value.click()
  }
}

const handleLogoUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.size > 1024 * 1024) {
    errorMsg.value = t('submit.logo_too_large') || 'Logo size must be smaller than 1MB.'
    if (logoInput.value) logoInput.value.value = ''
    return
  }

  errorMsg.value = ''
  const reader = new FileReader()
  reader.onload = (e) => {
    form.value.logo = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const clearLogo = () => {
  form.value.logo = ''
  if (logoInput.value) logoInput.value.value = ''
}

const isAuthorOrAdmin = computed(() => {
  if (!mod.value || !user.value) return false
  return user.value.isAdmin || mod.value.authorId._id === user.value.id
})

const getGameLabel = (val: string) => {
  if (val === 'adofai') return t('games.adofai')
  if (val === 'rhythm-doctor') return t('games.rhythm_doctor')
  return val
}

const categoriesFormModel = computed({
  get() {
    return 'selected:' + form.value.categories.join(',')
  },
  set(val: string) {
    if (val === 'selected:' || !val) {
      form.value.categories = []
      return
    }
    const actualVal = val.startsWith('selected:') ? val.slice(9) : val
    toggleFormCategory(actualVal)
  }
})

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

const getCategoryLabel = (val: string) => {
  if (!val) return ''
  if (val.startsWith('selected:')) {
    const listStr = val.slice(9)
    if (!listStr) return ''
    return listStr.split(',').map(getCategoryLabelOnly).join(', ')
  }
  const label = getCategoryLabelOnly(val)
  if (form.value.categories.includes(val)) {
    return `✓ ${label}`
  }
  return label
}

const loadModDetails = async () => {
  loading.value = true
  try {
    const data = await $fetch<{ mod: ModItem; isEditable: boolean }>(`/api/mods/${slug}`)
    if (!data.isEditable) {
      // Not allowed to edit
      navigateTo(`/mods/${slug}`)
      return
    }

    mod.value = data.mod
    const edit = data.mod.pendingEdit || {}
    form.value = {
      name: edit.name || data.mod.name,
      game: edit.game || data.mod.game,
      categories: (edit.categories && edit.categories.length > 0)
        ? [...edit.categories]
        : (data.mod.categories && data.mod.categories.length > 0) ? [...data.mod.categories] : ['ui'],
      summary: edit.summary || data.mod.summary,
      description: edit.description !== undefined ? edit.description : (data.mod.description || ''),
      logo: edit.logo !== undefined ? edit.logo : (data.mod.logo || ''),
      sourceUrl: edit.sourceUrl !== undefined ? edit.sourceUrl : (data.mod.sourceUrl || ''),
      communityUrl: edit.communityUrl !== undefined ? edit.communityUrl : (data.mod.communityUrl || '')
    }
    selectedCollabs.value = [
      ...(data.mod.collaboratorIds || []),
      ...(data.mod.pendingCollaboratorIds || []).map((c) => ({ ...c, isPending: true }))
    ]
  } catch (e) {
    console.error(e)
    mod.value = null
  } finally {
    loading.value = false
  }
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
      // Filter out main author, current user and already added collabs
      searchResults.value = (data.users || []).filter(
        (u) => u._id !== mod.value?.authorId._id &&
                    !selectedCollabs.value.some((sc) => sc._id === u._id)
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

const cancelEdit = () => {
  navigateTo(`/mods/${slug}`)
}

const handleUpdate = async () => {
  if (form.value.categories.length === 0) {
    errorMsg.value = t('submit.error_category_required') || 'Please select at least one category.'
    return
  }

  updating.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    const payload: Record<string, string | string[]> = {
      ...form.value
    }
    
    // Only send collaborators if author/admin
    if (isAuthorOrAdmin.value) {
      payload.collaboratorIds = selectedCollabs.value.map((c) => c._id)
    }

    const data = await $fetch<{ success: boolean }>(`/api/mods/${slug}`, {
      method: 'PUT',
      body: payload
    })

    if (data.success) {
      navigateTo(`/mods/${slug}`)
    }
  } catch (err: unknown) {
    console.error(err)
    const error = err as { data?: { statusMessage?: string } }
    errorMsg.value = error.data?.statusMessage || 'Failed to save changes.'
  } finally {
    updating.value = false
  }
}

onMounted(() => {
  // If not logged in, redirect home
  if (!authLoading.value && !user.value) {
    navigateTo('/')
  } else {
    loadModDetails()
  }
})
</script>

<style scoped>
.edit-page-container {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.edit-loading-state {
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

.form-card {
  width: 100%;
  max-width: 800px;
  padding: 40px;
}

.card-divider {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.08);
  margin: 20px 0 30px 0;
}

.card-divider-sub {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.05);
  margin: 30px 0 24px 0;
}

.main-form {
  display: flex;
  flex-direction: column;
}

/* Collaborators styles */
.collabs-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.collab-tag-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(145, 154, 255, 0.1);
  border: 1px solid rgba(145, 154, 255, 0.2);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.collab-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.remove-collab-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-collab-btn:hover {
  color: #E2676D;
}

.collab-search-wrapper {
  position: relative;
}

.collab-search-input {
  width: 100%;
  box-sizing: border-box;
}

.search-results-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #1e1d24;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 50;
  margin-top: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-result-item:hover {
  background-color: rgba(145, 154, 255, 0.1);
}

.form-error-msg {
  background-color: rgba(226, 103, 109, 0.1);
  border: 1px solid rgba(226, 103, 109, 0.2);
  color: #E2676D;
  padding: 14px;
  border-radius: 12px;
  font-size: 14px;
  margin-bottom: 24px;
}

.form-success-msg {
  background-color: rgba(95, 195, 145, 0.1);
  border: 1px solid rgba(95, 195, 145, 0.2);
  color: #5FC391;
  padding: 14px;
  border-radius: 12px;
  font-size: 14px;
  margin-bottom: 24px;
}

.error-card {
  max-width: 500px;
  text-align: center;
  padding: 40px;
}

/* Logo Upload Custom Styles */
.logo-upload-container {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
}

.logo-preview-box {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, rgba(145, 154, 255, 0.15) 0%, rgba(108, 120, 255, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.logo-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.logo-placeholder-text {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent-purple);
  text-shadow: 0 0 10px rgba(145, 154, 255, 0.4);
}

.logo-upload-controls {
  flex-grow: 1;
}

.logo-upload-buttons {
  display: flex;
  gap: 8px;
}

.logo-help-text {
  display: block;
  margin-top: 8px;
}

.form-dropdown-wrapper {
  width: 100%;
  max-width: 320px;
}

.category-dropdown-wrapper {
  margin-bottom: 12px;
}

.form-actions {
  display: flex;
  gap: 16px;
}

.form-submit-btn {
  flex-grow: 1;
}

.form-submit-btn :deep(.overlayer-btn),
.form-cancel-btn :deep(.overlayer-btn) {
  padding: 0 24px !important;
  font-size: 16px !important;
  height: 48px !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .form-card {
    padding: 24px 16px !important;
  }
  
  .logo-upload-container {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .logo-preview-box {
    margin: 0 auto;
  }
  
  .logo-upload-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .logo-upload-buttons {
    width: 100%;
    flex-direction: column;
    gap: 8px;
  }
  
  .logo-upload-buttons :deep(.overlayer-btn) {
    width: 100% !important;
    text-align: center;
  }

  .form-dropdown-wrapper {
    max-width: 100%;
  }

  .form-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .form-submit-btn,
  .form-cancel-btn,
  .form-submit-btn :deep(.overlayer-btn),
  .form-cancel-btn :deep(.overlayer-btn) {
    width: 100% !important;
  }
}
</style>
