<template>
  <div class="user-picker">
    <input
      v-model="query"
      type="text"
      :placeholder="placeholder || t('submit.search_user_placeholder')"
      autocomplete="off"
      @input="search"
    >
    <ul v-if="results.length > 0" class="user-picker-results">
      <li v-for="u in results" :key="u._id">
        <button type="button" @click="pick(u)">
          <img :src="u.avatar || '/images/default_avatar.png'" alt="">
          <span>{{ u.globalName || u.username }}</span>
          <span class="user-picker-handle">@{{ u.username }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '#imports'

export interface PickedUser {
  _id: string
  username: string
  globalName?: string
  avatar?: string
}

const props = defineProps<{ exclude?: string[]; placeholder?: string }>()
const emit = defineEmits<{ (event: 'pick', value: PickedUser): void }>()
const { t } = useI18n()

const query = ref('')
const results = ref<PickedUser[]>([])
let timer: ReturnType<typeof setTimeout> | undefined

const search = () => {
  clearTimeout(timer)
  if (query.value.trim().length < 2) {
    results.value = []
    return
  }
  timer = setTimeout(async () => {
    try {
      const data = await $fetch<{ users: PickedUser[] }>('/api/users/search', { params: { q: query.value } })
      results.value = (data.users || []).filter((u) => !props.exclude?.includes(u._id))
    } catch (e) {
      console.error(e)
    }
  }, 300)
}

const pick = (u: PickedUser) => {
  emit('pick', u)
  query.value = ''
  results.value = []
}
</script>

<style scoped>
.user-picker {
  position: relative;
}

.user-picker input {
  width: 100%;
}

.user-picker-results {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.user-picker-results button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.user-picker-results button:hover {
  background: var(--surface-3);
}

.user-picker-results img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.user-picker-handle {
  color: var(--text-tertiary);
  font-size: 12px;
}
</style>
