<template>
  <div v-if="adsenseId" class="ad-banner-container">
    <span class="ad-label">{{ t('ads.advertisement') }}</span>
    <div class="ad-wrapper">
      <ClientOnly>
        <adsbygoogle
          :ad-slot="adSlot"
          :ad-style="adStyle"
          :ad-format="adFormat"
        />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRuntimeConfig, computed, useI18n } from '#imports'

defineProps({
  adSlot: {
    type: String,
    default: '1234567890'
  },
  adStyle: {
    type: Object,
    default: () => ({ display: 'block' })
  },
  adFormat: {
    type: String,
    default: 'auto'
  }
})

const { t } = useI18n()
const config = useRuntimeConfig()
const adsenseId = computed(() => config.public.adsenseClientId)
</script>

<style scoped>
.ad-banner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 24px 0;
  width: 100%;
}

.ad-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.25);
  margin-bottom: 8px;
}

.ad-wrapper {
  width: 100%;
  min-height: 90px;
  background-color: rgba(0, 0, 0, 0.15);
  border: 1px dashed rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
</style>
