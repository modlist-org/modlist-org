<template>
  <div class="loader-links">
    <div class="loader-links-head">
      <span class="loader-links-title">{{ t('loader.title') }}</span>
      <span class="form-help-text">{{ t('loader.help') }}</span>
    </div>
    <div class="loader-chips">
      <button
        v-for="loader in MOD_LOADER_OPTIONS"
        :key="loader.id"
        type="button"
        class="loader-chip"
        :class="{ active: !!modelValue[loader.id] }"
        :aria-pressed="!!modelValue[loader.id]"
        @click="toggle(loader.id)"
      >
        {{ loader.label }}
      </button>
    </div>
    <template v-for="loader in MOD_LOADER_OPTIONS" :key="loader.id">
      <DownloadLinksInput
        v-if="modelValue[loader.id]"
        :title="loader.label"
        :help="t('loader.entry_help', { loader: loader.label })"
        :mode="modelValue[loader.id]!.mode"
        :unified-url="modelValue[loader.id]!.downloadUrl"
        :platform-downloads="modelValue[loader.id]!.platformDownloads"
        @update:mode="patch(loader.id, { mode: $event })"
        @update:unified-url="patch(loader.id, { downloadUrl: $event })"
        @update:platform-downloads="patch(loader.id, { platformDownloads: $event })"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '#imports'
import { MOD_LOADER_OPTIONS } from '../utils/loaders'
import type { LoaderLinkForm, LoaderLinksForm, ModLoaderId } from '../utils/loaders'

const props = defineProps<{ modelValue: LoaderLinksForm }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: LoaderLinksForm): void }>()
const { t } = useI18n()

const toggle = (id: ModLoaderId) => {
  const { [id]: current, ...rest } = props.modelValue
  emit('update:modelValue', current
    ? rest
    : { ...rest, [id]: { mode: 'unified', downloadUrl: '', platformDownloads: { windows: '', macos: '', linux: '' } } })
}

const patch = (id: ModLoaderId, change: Partial<LoaderLinkForm>) => {
  emit('update:modelValue', { ...props.modelValue, [id]: { ...props.modelValue[id]!, ...change } })
}
</script>

<style scoped>
.loader-links {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loader-links-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.loader-links-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.loader-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.loader-chip {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.loader-chip:hover {
  color: var(--text);
}

.loader-chip.active {
  border-color: var(--accent);
  background: var(--surface-3);
  color: var(--text);
}
</style>
