<template>
  <div class="submit-page-container">
    <div class="card form-card">
      <h2>{{ t('submit.title') }}</h2>
      <div class="card-divider" />

      <form class="main-form" @submit.prevent="handleSubmit">
        <!-- Mod Name -->
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

        <!-- Slug (Auto-generated) -->
        <div class="form-group">
          <label for="mod-slug">{{ t('submit.slug') }}</label>
          <input
            id="mod-slug"
            v-model="form.slug"
            type="text"
            :placeholder="t('submit.slug_placeholder')"
            required
          >
          <span class="form-help-text">{{ t('submit.slug_help') }}</span>
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
              :default-value="'adofai'"
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
              :default-value="categoriesFormModel"
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
            :placeholder="t('submit.summary_placeholder')"
            required
          >
          <span class="form-help-text">{{ t('submit.summary_help') }}</span>
        </div>

        <!-- Description -->
        <div class="form-group">
          <label for="mod-description">{{ t('submit.description') }}</label>
          <textarea
            id="mod-description"
            v-model="form.description"
            rows="8"
            :placeholder="t('submit.description_placeholder')"
          />
          <span class="form-help-text">{{ t('submit.description_help') }}</span>
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

        <div class="card-divider-sub" />
        <h3>{{ t('submit.initial_release') }}</h3>

        <div class="form-row">
          <!-- Initial Version -->
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

          <!-- Download Link -->
          <div class="form-group">
            <label for="mod-download">{{ t('submit.download_url') }}</label>
            <input
              id="mod-download"
              v-model="form.downloadUrl"
              type="text"
              :placeholder="t('submit.download_placeholder')"
              required
            >
          </div>
        </div>
        <span class="form-help-text" style="margin-top: -12px; margin-bottom: 20px; display: block;">
          {{ t('submit.download_url_help') }}
        </span>

        <!-- Changelog -->
        <div class="form-group">
          <label for="mod-changelog">{{ t('submit.changelog') }}</label>
          <textarea
            id="mod-changelog"
            v-model="form.changelog"
            rows="3"
            :placeholder="t('submit.changelog_placeholder')"
          />
        </div>

        <div class="card-divider-sub" />

        <!-- Collaborators Section -->
        <div class="form-group">
          <label>{{ t('submit.collaborators') }}</label>
          
          <!-- Selected Collabs List -->
          <div v-if="selectedCollabs.length > 0" class="collabs-tags-container">
            <div v-for="userObj in selectedCollabs" :key="userObj._id" class="collab-tag-item">
              <img :src="userObj.avatar || '/images/default_avatar.png'" alt="Avatar" class="collab-avatar">
              <span>{{ userObj.globalName || userObj.username }}</span>
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

        <div class="card-divider-sub" />

        <!-- Form Messages -->
        <div v-if="errorMsg" class="form-error-msg">
          {{ errorMsg }}
        </div>
        <div v-if="successMsg" class="form-success-msg">
          {{ successMsg }}
        </div>

        <UIButton
          :label="submitting ? t('submit.submitting') : t('submit.save')"
          :blocked="submitting"
          type="submit"
          style="width: 100%; padding: 14px; font-size: 16px;"
        />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n, navigateTo } from '#imports'
import { UIButton, UIDropdown } from 'overlayer-ui'
import { useAuth } from '../composables/useAuth'

const { t } = useI18n()
const { user, loading: authLoading } = useAuth()

interface SearchUserItem {
  _id: string
  username: string
  globalName?: string
  avatar?: string
}

const form = ref({
  name: '',
  slug: '',
  logo: '',
  sourceUrl: '',
  game: 'adofai',
  categories: [] as string[],
  summary: '',
  description: '',
  version: '',
  downloadUrl: '',
  changelog: ''
})

const selectedCollabs = ref<SearchUserItem[]>([])
const collabSearchQuery = ref('')
const searchResults = ref<SearchUserItem[]>([])

const submitting = ref(false)
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

const handleSubmit = async () => {
  if (form.value.categories.length === 0) {
    errorMsg.value = t('submit.error_category_required') || 'Please select at least one category.'
    return
  }

  submitting.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    const payload = {
      ...form.value,
      collaboratorIds: selectedCollabs.value.map((c) => c._id)
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
.submit-page-container {
  display: flex;
  justify-content: center;
  margin-top: 10px;
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

.form-help-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 4px;
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
}
</style>
