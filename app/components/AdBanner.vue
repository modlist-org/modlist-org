<template>
  <div v-if="adsenseId" class="ad-banner-container">
    <span class="ad-label">{{ t('ads.advertisement') }}</span>
    <div class="ad-wrapper">
      <ClientOnly>
        <ins
          ref="adRef"
          class="adsbygoogle"
          :data-ad-client="adsenseId"
          :data-ad-slot="adSlot"
          :data-ad-format="adFormat"
          :style="adStyle"
        />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRuntimeConfig, computed, useI18n, ref, onMounted, onBeforeUnmount, nextTick } from '#imports'

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

const adRef = ref<HTMLElement | null>(null)
let retryTimer: ReturnType<typeof setTimeout> | null = null

const initAd = () => {
  try {
    if (typeof window !== 'undefined' && adRef.value) {
      const hasStatus = adRef.value.getAttribute('data-adsbygoogle-status')
      const width = adRef.value.offsetWidth

      if (!hasStatus && width > 0) {
        const adsbygoogle = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || []
        adsbygoogle.push({})
      } else if (!hasStatus && width === 0) {
        // Retry after a short delay if layout is not ready yet (prevents availableWidth=0 error)
        retryTimer = setTimeout(initAd, 200)
      }
    }
  } catch (e) {
    console.error('AdSense push error:', e)
  }
}

onMounted(async () => {
  await nextTick()
  // Brief delay to allow initial layout calculation
  retryTimer = setTimeout(initAd, 150)
})

onBeforeUnmount(() => {
  if (retryTimer) {
    clearTimeout(retryTimer)
  }
})
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
