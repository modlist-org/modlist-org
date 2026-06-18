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
          <a :href="`modlist://presets/${preset.id}`" class="open-app-btn-link">
            <UIButton :label="t('preset.details.open_app')" class="open-app-btn" />
          </a>
          <p class="app-help-text">
            {{ t('preset.details.requires_app') }}
          </p>
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
</style>
