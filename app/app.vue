<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useOverlayerState } from 'overlayer-ui'
import { useHead, useRuntimeConfig } from '#imports'

const config = useRuntimeConfig()
const { state, loadSettings } = useOverlayerState()

if (config.public.adsenseClientId) {
  useHead({
    script: [
      {
        async: true,
        src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.public.adsenseClientId}`,
        crossorigin: 'anonymous'
      }
    ]
  })
}

onMounted(() => {
  // Initialize settings from local storage
  loadSettings()
  // Set default font size to 14px instead of library default of 24px
  if (state.fontSize === 24) {
    state.fontSize = 14
  }
})
</script>
