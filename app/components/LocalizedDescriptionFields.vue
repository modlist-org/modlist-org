<template>
  <div class="localized-fields">
    <div class="lang-tabs" role="tablist" :aria-label="t('submit.translations_label')">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="lang-tab"
        :class="{ active: activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span v-if="tab.id !== DEFAULT_TAB && hasTranslation(tab.id)" class="lang-tab-dot" />
      </button>
    </div>
    <p class="form-help-text lang-help">
      {{ activeTab === DEFAULT_TAB ? t('submit.translations_default_help') : t('submit.translations_locale_help', { language: tabLabel(activeTab) }) }}
    </p>

    <div class="form-group">
      <div class="label-row">
        <label :for="`${idPrefix}-summary`">{{ t('submit.summary') }}</label>
        <span class="char-count">{{ currentSummary.length }}/150</span>
      </div>
      <input
        :id="`${idPrefix}-summary`"
        :value="currentSummary"
        type="text"
        maxlength="150"
        :placeholder="activeTab === DEFAULT_TAB ? t('submit.summary_placeholder') : summary"
        :required="activeTab === DEFAULT_TAB"
        @input="setSummary(($event.target as HTMLInputElement).value)"
      >
      <span v-if="activeTab === DEFAULT_TAB" class="form-help-text">{{ t('submit.summary_help') }}</span>
    </div>

    <div class="form-group">
      <label :for="`${idPrefix}-description`">{{ t('submit.description') }}</label>
      <textarea
        :id="`${idPrefix}-description`"
        :value="currentDescription"
        rows="10"
        :placeholder="activeTab === DEFAULT_TAB ? t('submit.description_placeholder') : t('submit.translations_description_placeholder')"
        @input="setDescription(($event.target as HTMLTextAreaElement).value)"
      />
      <span class="form-help-text">{{ t('submit.description_help') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '#imports'
import { SITE_LOCALES } from '../utils/locales'
import type { ModTranslations } from '../utils/locales'

const props = withDefaults(defineProps<{
  summary: string
  description: string
  translations: ModTranslations
  idPrefix?: string
}>(), {
  idPrefix: 'mod'
})

const emit = defineEmits<{
  'update:summary': [value: string]
  'update:description': [value: string]
  'update:translations': [value: ModTranslations]
}>()

const { t } = useI18n()
const DEFAULT_TAB = 'default'
const activeTab = ref<string>(DEFAULT_TAB)

const tabs = computed(() => [
  { id: DEFAULT_TAB, label: t('submit.translations_default') },
  ...SITE_LOCALES.map((l) => ({ id: l.id, label: l.label }))
])

const tabLabel = (id: string) => tabs.value.find((tab) => tab.id === id)?.label ?? id

const hasTranslation = (locale: string) => {
  const entry = props.translations[locale]
  return !!(entry?.summary?.trim() || entry?.description?.trim())
}

const currentSummary = computed(() => activeTab.value === DEFAULT_TAB
  ? props.summary
  : props.translations[activeTab.value]?.summary ?? '')

const currentDescription = computed(() => activeTab.value === DEFAULT_TAB
  ? props.description
  : props.translations[activeTab.value]?.description ?? '')

const updateTranslation = (field: 'summary' | 'description', value: string) => {
  const locale = activeTab.value
  const entry = { ...(props.translations[locale] ?? {}), [field]: value }
  // Drop languages whose fields are all empty
  const next = Object.fromEntries(
    Object.entries({ ...props.translations, [locale]: entry })
      .filter(([, e]) => !!(e?.summary || e?.description))
  ) as ModTranslations
  emit('update:translations', next)
}

const setSummary = (value: string) => {
  if (activeTab.value === DEFAULT_TAB) emit('update:summary', value)
  else updateTranslation('summary', value)
}

const setDescription = (value: string) => {
  if (activeTab.value === DEFAULT_TAB) emit('update:description', value)
  else updateTranslation('description', value)
}
</script>

<style scoped>
.localized-fields {
  display: flex;
  flex-direction: column;
}

.lang-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  margin-bottom: 8px;
  background: var(--bg-elev);
  border-radius: var(--radius-sm);
  align-self: flex-start;
}

.lang-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.12s ease-out, color 0.12s ease-out, box-shadow 0.1s ease-out;
}

.lang-tab:hover {
  color: var(--text);
  box-shadow: var(--outline);
}

.lang-tab.active {
  background: var(--ol-control);
  color: var(--text);
}

.lang-tab-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ol-accent);
}

.lang-help {
  margin: 0 0 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.char-count {
  font-size: 12px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

textarea {
  resize: vertical;
  min-height: 180px;
}
</style>
