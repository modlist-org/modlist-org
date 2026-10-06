<template>
  <div class="download-links">
    <div class="download-links-header">
      <div class="download-links-heading">
        <span class="download-links-title">{{ t('submit.platform_downloads', 'Download links') }}</span>
        <span class="form-help-text">{{ t('submit.platform_downloads_help', 'Choose one link for every OS or provide separate OS links.') }}</span>
      </div>

      <div class="segmented" role="tablist">
        <button
          type="button"
          role="tab"
          class="segmented-option"
          :class="{ active: mode === 'unified' }"
          :aria-selected="mode === 'unified'"
          @click="setMode('unified')"
        >
          {{ t('submit.download_mode_unified', 'Unified link') }}
        </button>
        <button
          type="button"
          role="tab"
          class="segmented-option"
          :class="{ active: mode === 'platform' }"
          :aria-selected="mode === 'platform'"
          @click="setMode('platform')"
        >
          {{ t('submit.download_mode_platform', 'OS-specific') }}
        </button>
      </div>
    </div>

    <div v-if="mode === 'unified'" class="download-rows">
      <div class="download-row">
        <span class="download-kind">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
          {{ t('submit.download_all_platforms', 'All platforms') }}
        </span>
        <input
          :value="unifiedUrl"
          type="url"
          :placeholder="t('submit.download_placeholder')"
          :aria-label="t('submit.download_all_platforms', 'All platforms')"
          required
          @input="updateUnifiedUrl"
        >
      </div>
    </div>

    <div v-else class="download-rows">
      <div v-for="platform in platforms" :key="platform.key" class="download-row">
        <span class="download-kind">{{ platform.label }}</span>
        <input
          :value="platformDownloads[platform.key]"
          type="url"
          :placeholder="t('submit.download_placeholder')"
          :aria-label="platform.label"
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
.download-links {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elev);
}

.download-links-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.download-links-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.download-links-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.segmented {
  display: inline-grid;
  grid-template-columns: repeat(2, max-content);
  gap: 2px;
  flex-shrink: 0;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
}

.segmented-option {
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.segmented-option:hover {
  color: var(--text);
}

.segmented-option.active {
  background: var(--surface-3);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

.download-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.download-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.download-row input {
  flex: 1;
  min-width: 0;
  background: var(--surface);
}

.download-kind {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  width: 116px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.download-kind svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--text-tertiary);
}

@media (max-width: 640px) {
  .download-links-header {
    flex-direction: column;
    gap: 12px;
  }

  .segmented {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .download-row {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .download-kind {
    width: auto;
    height: auto;
    padding: 0;
    border: none;
    background: none;
    font-size: 12px;
  }

  .download-row input {
    width: 100%;
  }
}
</style>
