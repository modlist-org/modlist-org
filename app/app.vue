<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useOverlayerState } from 'overlayer-ui'

const { state, loadSettings } = useOverlayerState()

onMounted(() => {
  // Initialize settings from local storage
  loadSettings()
  // Set default font size to 14px instead of library default of 24px
  if (state.fontSize === 24) {
    state.fontSize = 14
  }
})
</script>
