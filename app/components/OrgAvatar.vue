<template>
  <img v-if="logo" :src="logo" alt="" class="org-avatar" :style="{ width: `${size}px`, height: `${size}px` }">
  <span v-else class="org-avatar" :style="{ ...gradient, width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.4)}px` }">{{ name.charAt(0).toUpperCase() }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; logo?: string; size?: number }>(), { logo: '', size: 32 })

const gradient = computed(() => {
  let hash = 0
  for (let i = 0; i < props.name.length; i++) hash = props.name.charCodeAt(i) + ((hash << 5) - hash)
  const h1 = Math.abs(hash) % 360
  return { backgroundColor: `oklch(45% 0.1 ${h1})` }
})
</script>

<style scoped>
.org-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 22%;
  object-fit: cover;
  color: var(--text);
  font-weight: 800;
}
</style>
