<template>
  <div ref="rootRef" class="game-select" :class="{ open }">
    <div
      class="game-select-header"
      role="combobox"
      tabindex="0"
      :aria-expanded="open"
      :aria-labelledby="labelledby"
      @click="toggleOpen"
      @keydown.enter.prevent="toggleOpen"
      @keydown.space.prevent="toggleOpen"
      @keydown.esc="open = false"
    >
      <div class="game-select-values">
        <span v-if="modelValue.length === 0" class="game-select-placeholder">{{ t('submit.game_select_placeholder') }}</span>
        <span v-for="id in modelValue" :key="id" class="game-select-tag">
          {{ label(id) }}
          <button type="button" class="game-select-tag-remove" :aria-label="t('submit.remove')" @click.stop="toggle(id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </span>
      </div>
      <svg class="game-select-triangle" :class="{ 'is-expanded': open }" viewBox="0 0 24 24"><polygon points="6,9 12,15 18,9" fill="currentColor" /></svg>
    </div>

    <transition name="expand">
      <div v-if="open" class="game-select-list">
        <div v-if="options.length > SEARCH_THRESHOLD" class="game-select-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input ref="searchRef" v-model="query" type="text" :placeholder="t('submit.game_search_placeholder')" @keydown.esc="open = false">
        </div>
        <div class="game-select-rows">
          <button
            v-for="id in filteredOptions"
            :key="id"
            type="button"
            class="game-select-row"
            :class="{ selected: modelValue.includes(id) }"
            @click="toggle(id)"
          >
            <span>{{ label(id) }}</span>
            <span class="game-select-indicator" />
          </button>
          <div v-if="filteredOptions.length === 0" class="game-select-empty">{{ t('submit.game_search_empty') }}</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '#imports'
import { GAME_IDS, gameLabelKey } from '../utils/games'

const props = withDefaults(defineProps<{
  modelValue: string[]
  options?: string[]
  labelledby?: string
}>(), {
  options: () => GAME_IDS,
  labelledby: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const SEARCH_THRESHOLD = 6

const { t } = useI18n()
const open = ref(false)
const query = ref('')
const rootRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)

const label = (id: string) => t(gameLabelKey(id))

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter((id) => label(id).toLowerCase().includes(q) || id.includes(q))
})

const toggle = (id: string) => {
  const next = props.modelValue.includes(id)
    ? props.modelValue.filter((g) => g !== id)
    : [...props.modelValue, id]
  emit('update:modelValue', next)
}

const toggleOpen = () => {
  open.value = !open.value
  if (open.value) {
    query.value = ''
    nextTick(() => searchRef.value?.focus())
  }
}

const onDocumentClick = (e: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<style scoped>
.game-select {
  position: relative;
  width: 100%;
}

/* Header mirrors overlayer-ui's dropdown header */
.game-select-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 6px 8px 6px 8px;
  background-color: var(--ol-control);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  outline: none;
}

.game-select-header::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid var(--ol-accent);
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.1s ease-out;
  pointer-events: none;
}

.game-select-header:hover::after,
.game-select-header:focus-visible::after,
.game-select.open .game-select-header::after {
  opacity: 1;
}

.game-select-values {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.game-select-placeholder {
  padding: 0 6px;
  color: var(--text-tertiary);
  font-size: 14px;
  line-height: 30px;
}

.game-select-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 6px 0 12px;
  border-radius: 6px;
  background: var(--ol-button);
  color: #fff;
  font-size: 13px;
  white-space: nowrap;
}

.game-select-tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
}

.game-select-tag-remove:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.game-select-tag-remove svg {
  width: 12px;
  height: 12px;
}

.game-select-triangle {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: #f3f4ff;
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.2s ease-out;
}

.game-select-triangle.is-expanded {
  color: var(--ol-accent);
  transform: rotate(180deg);
}

/* List mirrors overlayer-ui's dropdown list */
.game-select-list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background-color: var(--ol-control);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.game-select-search {
  position: relative;
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.game-select-search svg {
  position: absolute;
  left: 18px;
  top: 50%;
  width: 16px;
  height: 16px;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.game-select-search input {
  width: 100%;
  height: 36px;
  padding: 0 12px 0 34px;
  background: var(--surface-2);
}

.game-select-rows {
  max-height: 250px;
  overflow-y: auto;
}

.game-select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 40px;
  padding: 0 12px 0 14px;
  border: none;
  background: transparent;
  color: #fff;
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease-out;
}

.game-select-row:hover {
  background-color: var(--ol-accent);
}

/* Same indicator as overlayer-ui's toggle: muted ring -> filled accent dot */
.game-select-indicator {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--ol-muted);
  transition: all 0.15s ease-out;
}

.game-select-row.selected .game-select-indicator {
  border-color: var(--ol-accent);
  background: var(--ol-accent);
}

.game-select-row:hover .game-select-indicator {
  border-color: #fff;
}

.game-select-row.selected:hover .game-select-indicator {
  background: #fff;
}

.game-select-empty {
  padding: 12px 14px;
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>
