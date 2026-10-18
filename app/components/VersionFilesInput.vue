<template>
  <div class="version-files">
    <div class="version-files-heading">
      <span class="version-files-title">{{ t('files.title') }}</span>
      <span class="form-help-text">{{ t('files.help') }}</span>
    </div>

    <div v-for="(row, i) in modelValue" :key="i" class="file-row">
      <div class="file-pick">
        <UIDropdown
          :model-value="row.loader"
          default-value=""
          :values="loaderValues"
          :display="(id: string) => id ? loaderLabel(id) : t('files.any_loader')"
          disable-reset
          @update:model-value="patch(i, { loader: $event })"
        />
      </div>
      <div class="file-pick">
        <UIDropdown
          :model-value="row.platform"
          default-value=""
          :values="platformValues"
          :display="(id: string) => id ? platformLabel(id) : t('files.any_os')"
          disable-reset
          @update:model-value="patch(i, { platform: $event })"
        />
      </div>
      <input
        :value="row.gameVersion"
        type="text"
        class="file-game"
        maxlength="40"
        :placeholder="t('files.any_game_version')"
        :aria-label="t('submit.game_version')"
        @input="patch(i, { gameVersion: ($event.target as HTMLInputElement).value })"
      >
      <input
        :value="row.url"
        type="url"
        class="file-url"
        :placeholder="t('submit.download_placeholder')"
        :aria-label="t('files.url')"
        :required="i === 0"
        @input="patch(i, { url: ($event.target as HTMLInputElement).value })"
      >
      <button
        v-if="modelValue.length > 1"
        type="button"
        class="btn btn-ghost btn-icon file-remove"
        :aria-label="t('files.remove')"
        @click="remove(i)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </div>

    <button type="button" class="btn btn-secondary btn-sm file-add" @click="add">+ {{ t('files.add') }}</button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '#imports'
import { UIDropdown } from 'overlayer-ui'
import { MOD_LOADER_OPTIONS, PLATFORM_OPTIONS, emptyFileRow, loaderLabel, platformLabel } from '../utils/loaders'
import type { FileRow } from '../utils/loaders'

const props = defineProps<{ modelValue: FileRow[] }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: FileRow[]): void }>()
const { t } = useI18n()

const loaderValues = ['', ...MOD_LOADER_OPTIONS.map((l) => l.id)]
const platformValues = ['', ...PLATFORM_OPTIONS.map((p) => p.id)]

const patch = (index: number, change: Partial<FileRow>) => {
  emit('update:modelValue', props.modelValue.map((row, i) => i === index ? { ...row, ...change } : row))
}

// New rows copy the previous row's loader and game version, the usual next step is another OS or loader
const add = () => {
  const last = props.modelValue[props.modelValue.length - 1]
  emit('update:modelValue', [...props.modelValue, { ...emptyFileRow(), loader: last?.loader ?? '', gameVersion: last?.gameVersion ?? '' }])
}

const remove = (index: number) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}
</script>

<style scoped>
.version-files {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elev);
}

.version-files-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 4px;
}

.version-files-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.file-row {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) 36px;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.file-url {
  grid-column: 1 / -1;
}

.file-row input {
  min-width: 0;
  background: var(--surface);
}

.file-pick {
  min-width: 0;
}

.file-remove {
  grid-row: 1;
  grid-column: -2;
  width: 36px;
  height: 36px;
}

.file-remove svg {
  width: 14px;
  height: 14px;
}

.file-add {
  align-self: flex-start;
}

@media (max-width: 560px) {
  .file-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 36px;
  }

  .file-game {
    grid-column: 1 / 3;
  }

  .file-url {
    grid-column: 1 / -1;
  }
}
</style>
