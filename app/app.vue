<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from '#imports'
import { useOverlayerState } from 'overlayer-ui'

const { locale } = useI18n()
const { state, loadSettings } = useOverlayerState()
onMounted(() => {
  // If no language is explicitly saved in localStorage, sync overlayer state with Nuxt i18n locale
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('overlayer_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (!parsed.language) {
          state.language = locale.value
        }
      } else {
        state.language = locale.value
      }
    } catch (e) {
      console.error('Failed to parse overlayer settings from localStorage:', e)
    }
  }

  // Initialize settings from local storage
  loadSettings()
  
  // Set default font size to 14px instead of library default of 24px
  if (state.fontSize === 24) {
    state.fontSize = 14
  }
})
</script>
