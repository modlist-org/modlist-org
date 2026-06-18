<template>
  <div class="preset-landing-container">
    <div v-if="loading" class="detail-loading-state">
      <div class="spinner" />
      <p>{{ t('loading') }}</p>
    </div>

    <div v-else-if="preset" class="preset-card card">
      <div class="preset-header">
        <div class="preset-title-wrap">
          <span class="badge badge-game">{{ getGameLabel(preset.game) }}</span>
          <span v-if="preset.fileKey" class="badge badge-saves">{{ t('profile.presets_has_attached_saves') }}</span>
          <h1 class="preset-name">{{ preset.name }}</h1>
          <p class="preset-creator">
            {{ t('preset.details.created_by_user') }}<span class="creator-name">{{ preset.owner?.globalName || preset.owner?.username || 'Unknown' }}</span>{{ t('preset.details.created_by_date') }}{{ formatDate(preset.createdAt) }}{{ t('preset.details.created_by_end') }}
          </p>
        </div>

        <div class="app-integration-action">
          <UIButton :label="t('preset.details.open_app')" class="open-app-btn" @click="handleOpenApp" />
          <div class="app-links-row">
            <span class="app-help-text">{{ t('preset.details.requires_app') }}</span>
            <a href="https://github.com/modlist-org/modlist_org_app/releases/latest" target="_blank" class="download-app-link">
              {{ t('mod.download_modal.get_app_btn') }}
            </a>
          </div>
        </div>
      </div>

      <div v-if="preset.fileKey" class="preset-saves-notice-card">
        <span class="notice-icon">💡</span>
        <div class="notice-text">
          <strong>{{ t('preset.details.saves_included_title') }}</strong>
          <span>{{ t('preset.details.saves_included_desc') }}</span>
        </div>
      </div>

      <div class="divider" />

      <!-- Preset Mod List -->
      <div class="preset-mods-section">
        <h3 class="section-title">{{ t('preset.details.included_mods', { count: preset.mods?.length || 0 }) }}</h3>
        
        <div class="table-container">
          <table class="presets-table">
            <thead>
              <tr>
                <th>{{ t('preset.details.mod_slug') }}</th>
                <th>{{ t('preset.details.required_version') }}</th>
                <th>{{ t('preset.details.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mod in preset.mods" :key="mod.slug" :class="{ disabled: !mod.isEnabled }">
                <td class="mod-slug-cell">
                  <NuxtLink :to="`/mods/${mod.slug}`" class="mod-link">
                    {{ mod.slug }}
                  </NuxtLink>
                </td>
                <td class="mod-version-cell">
                  <span class="version-badge">v{{ mod.version }}</span>
                </td>
                <td class="mod-status-cell">
                  <span v-if="mod.isEnabled" class="status-indicator enabled">{{ t('preset.details.enabled') }}</span>
                  <span v-else class="status-indicator disabled">{{ t('preset.details.disabled') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else class="card detail-not-found-state">
      <h2>{{ t('preset.details.not_found_title') }}</h2>
      <p>{{ t('preset.details.not_found_desc') }}</p>
      <NuxtLink to="/">
        <UIButton :label="t('preset.details.back_home')" />
      </NuxtLink>
    </div>

    <!-- Roblox-style App Launch / Download Recommendation Modal -->
    <transition name="modal-fade">
      <div v-if="showDownloadRecommendation && preset" class="modal-overlay" @click.self="showDownloadRecommendation = false">
        <div class="modal-content card app-recommend-card">
          <!-- Close Button -->
          <button class="modal-close-btn" aria-label="Close modal" @click="showDownloadRecommendation = false">
            <svg style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <!-- Header Logo / Icon -->
          <div class="modal-header-icon-container">
            <div class="app-logo-glow-wrap">
              <svg class="app-logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <h3 class="modal-recommend-title">
            {{ t('mod.download_modal.title') }}
          </h3>
          <p class="modal-recommend-desc">
            {{ t('mod.download_modal.desc') }}
          </p>

          <!-- Features list -->
          <div class="app-features-list">
            <div class="app-feature-item">
              <span class="feature-icon">⚡</span>
              <span class="feature-text">{{ t('mod.download_modal.feature_1') }}</span>
            </div>
            <div class="app-feature-item">
              <span class="feature-icon">🔄</span>
              <span class="feature-text">{{ t('mod.download_modal.feature_2') }}</span>
            </div>
            <div class="app-feature-item">
              <span class="feature-icon">🧩</span>
              <span class="feature-text">{{ t('mod.download_modal.feature_3') }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="modal-actions-group" style="display: flex; flex-direction: column; gap: 12px; width: 100%; align-items: center;">
            <UIButton
              :label="t('mod.download_modal.get_app_btn')"
              class="modal-app-btn"
              style="width: 100%;"
              @click="handleAppDownload"
            />
            <a :href="`modlist://presets/${preset.id}`" class="modal-direct-btn" @click="showDownloadRecommendation = false">
              {{ t('preset.details.open_app') }}
            </a>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useI18n, useFetch, useSeoMeta } from '#imports'
import { UIButton } from 'overlayer-ui'

interface PresetUser {
  username: string
  globalName?: string
}

interface PresetMod {
  slug: string
  version: string
  isEnabled: boolean
}

interface PresetItem {
  id: string
  name: string
  game: 'adofai' | 'rhythm-doctor' | 'dancing-line'
  mods: PresetMod[]
  fileKey?: string
  owner: PresetUser
  createdAt: string
}

const route = useRoute()
const presetId = route.params.id as string
const { t } = useI18n()

const preset = ref<PresetItem | null>(null)
const loading = ref(true)
const showDownloadRecommendation = ref(false)

const handleOpenApp = () => {
  if (!preset.value) return
  const protocolUrl = `modlist://presets/${preset.value.id}`
  
  showDownloadRecommendation.value = true
  window.location.href = protocolUrl
}

const handleAppDownload = () => {
  window.open('https://github.com/modlist-org/modlist_org_app/releases/latest', '_blank')
  showDownloadRecommendation.value = false
}

const getGameLabel = (game: string) => {
  if (game === 'adofai') return 'A Dance of Fire and Ice'
  if (game === 'rhythm-doctor') return 'Rhythm Doctor'
  if (game === 'dancing-line') return 'Dancing Line'
  return game
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

// Fetch preset data
const { data: presetData } = await useFetch<{ success: boolean; preset: PresetItem }>(`/api/premium/presets/${presetId}`)

if (presetData.value && presetData.value.success) {
  preset.value = presetData.value.preset
  loading.value = false
} else {
  preset.value = null
  loading.value = false
}

useSeoMeta({
  title: () => preset.value ? `Mod Preset: ${preset.value.name}` : 'Preset Not Found',
  description: () => preset.value ? `A shared mod list preset containing ${preset.value.mods.length} mods for ${getGameLabel(preset.value.game)}.` : 'Mod Preset Shared Link'
})
</script>

<style scoped>
.preset-landing-container {
  max-width: 900px;
  margin: 40px auto;
  padding: 0 20px;
}

.preset-card {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.preset-title-wrap {
  flex: 1;
  min-width: 280px;
}

.preset-name {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 8px 0;
}

.preset-creator {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.creator-name {
  color: #ffffff;
  font-weight: 500;
}

.app-integration-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

@media (max-width: 600px) {
  .app-integration-action {
    align-items: flex-start;
    width: 100%;
  }
  .open-app-btn-link {
    width: 100%;
  }
  .app-links-row {
    justify-content: flex-start;
  }
}

.app-links-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-top: 4px;
}

.download-app-link {
  font-size: 11px;
  color: #919AFF;
  text-decoration: none;
  font-weight: 600;
  border-bottom: 1px dashed rgba(145, 154, 255, 0.4);
  transition: all 0.2s ease;
}

.download-app-link:hover {
  color: #b3b9ff;
  border-bottom-color: #b3b9ff;
}

.open-app-btn {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1a1a1a;
  font-weight: 700;
}

.app-help-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #ffffff;
}

.table-container {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
}

.presets-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.presets-table th {
  background: rgba(255, 255, 255, 0.03);
  padding: 14px 20px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.presets-table td {
  padding: 14px 20px;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.8);
}

.presets-table tr:last-child td {
  border-bottom: none;
}

.presets-table tr.disabled td {
  opacity: 0.5;
}

.mod-link {
  color: #4da6ff;
  text-decoration: none;
  font-weight: 500;
}

.mod-link:hover {
  text-decoration: underline;
}

.version-badge {
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 8px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
}

.status-indicator {
  font-size: 12px;
  font-weight: 600;
}

.status-indicator.enabled {
  color: #00e676;
}

.status-indicator.disabled {
  color: rgba(255, 255, 255, 0.4);
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}
.badge-game {
  background: rgba(145, 154, 255, 0.1);
  color: #919AFF;
}
.badge-saves {
  background: rgba(255, 165, 0, 0.1);
  color: #FFA500;
  margin-left: 8px;
}

.preset-saves-notice-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 165, 0, 0.08);
  border: 1px solid rgba(255, 165, 0, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 10px;
}

.notice-icon {
  font-size: 20px;
}

.notice-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
}

.notice-text strong {
  color: #FFA500;
  font-weight: 600;
}

/* Modal Overlay / Replicated Styles from [slug].vue */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(10, 9, 14, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 24px;
}

.app-recommend-card {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: rgba(30, 29, 38, 0.75) !important;
  border: 1px solid rgba(145, 154, 255, 0.15) !important;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 
              0 0 40px rgba(145, 154, 255, 0.1) !important;
  border-radius: 24px !important;
  padding: 40px 32px 32px 32px !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  backdrop-filter: blur(20px) !important;
  box-sizing: border-box;
}

.modal-close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.modal-header-icon-container {
  margin-bottom: 24px;
}

.app-logo-glow-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(145, 154, 255, 0.15), rgba(108, 120, 255, 0.05));
  border: 1px solid rgba(145, 154, 255, 0.25);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(145, 154, 255, 0.15);
}

.app-logo-glow-wrap::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  background: radial-gradient(circle, rgba(145, 154, 255, 0.3) 0%, transparent 70%);
  z-index: -1;
  opacity: 0.8;
}

.app-logo-svg {
  width: 44px;
  height: 44px;
  stroke: rgba(145, 154, 255, 0.8);
}

.modal-recommend-title {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff !important;
  margin: 0 0 12px 0 !important;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.modal-recommend-desc {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 28px 0;
  padding: 0 8px;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.app-features-list {
  width: 100%;
  background-color: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
}

.app-feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.feature-text {
  font-size: 13.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.modal-actions-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-app-btn {
  width: 100% !important;
  background-color: #6c78ff !important;
  height: 46px !important;
  border-radius: 12px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 20px rgba(108, 120, 255, 0.25) !important;
  transition: all 0.2s ease !important;
  color: #ffffff !important;
}

.modal-app-btn:hover {
  background-color: #919aff !important;
  box-shadow: 0 6px 24px rgba(145, 154, 255, 0.35) !important;
  transform: translateY(-1px);
}

.modal-secondary-btn {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.modal-secondary-btn:hover {
  background-color: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.modal-direct-btn {
  width: 100%;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 10px;
  text-decoration: underline;
  text-underline-offset: 4px;
  transition: color 0.2s ease;
  display: inline-block;
  text-align: center;
}

.modal-direct-btn:hover {
  color: #ffffff;
}

/* Modal Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .app-recommend-card,
.modal-fade-leave-active .app-recommend-card {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-enter-from .app-recommend-card {
  transform: scale(0.9) translateY(10px);
}

.modal-fade-leave-to .app-recommend-card {
  transform: scale(0.95) translateY(5px);
}

@media (max-width: 480px) {
  .app-recommend-card {
    padding: 32px 20px 24px 20px !important;
  }
  
  .modal-recommend-title {
    font-size: 19px;
  }
  
  .app-features-list {
    padding: 12px 14px;
  }
  
  .feature-text {
    font-size: 12.5px;
  }
}
</style>
