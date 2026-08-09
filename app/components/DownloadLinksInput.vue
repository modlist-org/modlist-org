<template>
  <div class="download-links-card">
    <div class="download-links-header">
      <div>
        <div class="download-links-title">{{ t('submit.platform_downloads', 'Download links') }}</div>
        <p>{{ t('submit.platform_downloads_help', 'Choose one link for every OS or provide separate OS links.') }}</p>
      </div>

      <div class="download-mode-switch" role="tablist">
        <button
          type="button"
          class="download-mode-button"
          :class="{ active: mode === 'unified' }"
          @click="setMode('unified')"
        >
          {{ t('submit.download_mode_unified', 'Unified link') }}
        </button>
        <button
          type="button"
          class="download-mode-button"
          :class="{ active: mode === 'platform' }"
          @click="setMode('platform')"
        >
          {{ t('submit.download_mode_platform', 'OS-specific') }}
        </button>
      </div>
    </div>

    <div v-if="mode === 'unified'" class="download-editor-row">
      <span class="download-kind-badge">ALL</span>
      <input
        :value="unifiedUrl"
        type="url"
        :placeholder="t('submit.download_placeholder')"
        required
        @input="updateUnifiedUrl"
      >
    </div>

    <div v-else class="platform-download-list">
      <div v-for="platform in platforms" :key="platform.key" class="download-editor-row">
        <span class="platform-kind-badge">{{ platform.label }}</span>
        <input
          :value="platformDownloads[platform.key]"
          type="url"
          :placeholder="t('submit.download_placeholder')"
          :required="!hasPlatformDownload"
          @input="updatePlatformUrl(platform.key, $event)"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '#imports'

type DownloadMode = 'unified' | 'platform'
type PlatformKey = 'windows' | 'macos' | 'linux'
type PlatformDownloads = Record<PlatformKey, string>

const props = defineProps<{
  mode: DownloadMode
  unifiedUrl: string
  platformDownloads: PlatformDownloads
}>()

const emit = defineEmits<{
  (event: 'update:mode', value: DownloadMode): void
  (event: 'update:unifiedUrl', value: string): void
  (event: 'update:platformDownloads', value: PlatformDownloads): void
}>()

const { t } = useI18n()

const platforms: Array<{ key: PlatformKey; label: string }> = [
  { key: 'windows', label: 'Windows' },
  { key: 'macos', label: 'macOS' },
  { key: 'linux', label: 'Linux' }
]

const hasPlatformDownload = computed(() => Object.values(props.platformDownloads).some((url) => url.trim().length > 0))

const setMode = (value: DownloadMode) => {
  emit('update:mode', value)
}

const updateUnifiedUrl = (event: Event) => {
  emit('update:unifiedUrl', (event.target as HTMLInputElement).value)
}

const updatePlatformUrl = (platform: PlatformKey, event: Event) => {
  emit('update:platformDownloads', {
    ...props.platformDownloads,
    [platform]: (event.target as HTMLInputElement).value
  })
}
</script>

<style scoped>
.download-links-card {
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
}

.download-links-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.download-links-title {
  color: rgba(255, 255, 255, 0.82);
  font-size: 14px;
  font-weight: 600;
}

.download-links-header p {
  max-width: 420px;
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.38);
  font-size: 12px;
  line-height: 1.45;
}

.download-mode-switch {
  display: grid;
  grid-template-columns: repeat(2, max-content);
  gap: 2px;
  flex-shrink: 0;
  padding: 3px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.07);
}

.download-mode-button {
  padding: 7px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: rgba(255, 255, 255, 0.48);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}

.download-mode-button.active {
  background: rgba(145, 154, 255, 0.22);
  color: #fff;
}

.download-editor-row {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 12px;
}

.download-editor-row input {
  min-width: 0;
  flex: 1;
}

.download-kind-badge,
.platform-kind-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 54px;
  height: 34px;
  padding: 0 9px;
  border: 1px solid rgba(145, 154, 255, 0.18);
  border-radius: 8px;
  background: rgba(145, 154, 255, 0.1);
  color: rgba(255, 255, 255, 0.72);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.platform-kind-badge {
  min-width: 72px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
}

.platform-download-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 10px;
}

@media (max-width: 640px) {
  .download-links-header {
    flex-direction: column;
    gap: 10px;
  }

  .download-mode-switch {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .platform-download-list {
    grid-template-columns: 1fr;
  }
}
</style>
