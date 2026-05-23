<template>
  <div v-if="adsenseId" class="promo-banner-container">
    <span class="promo-label">{{ t('ads.advertisement') }}</span>
    <div class="promo-wrapper">
      <ClientOnly>
        <ins
          ref="adRef"
          class="adsbygoogle"
          :data-ad-client="adsenseId"
          :data-ad-slot="adSlot"
          :data-ad-format="adFormat"
          :data-full-width-responsive="fullWidthResponsive"
          :style="adStyle"
        />
        <!-- Premium visual mock-ad fallback shown in dev, when loading, or if blocked -->
        <div v-if="showFallback" class="mock-ad-content">
          <div class="mock-ad-brand">Google AdSense</div>
          <div class="mock-ad-title">Sponsor Advertisement</div>
          <div class="mock-ad-desc">
            This space is reserved for advertisements in production.
            <span class="block-info">(If you use an ad-blocker, please disable it to preview live ads)</span>
          </div>
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRuntimeConfig, computed, useI18n, ref, onMounted, onBeforeUnmount, nextTick } from '#imports'

defineProps({
  adSlot: {
    type: String,
    default: '7096034180'
  },
  adStyle: {
    type: Object,
    default: () => ({ display: 'block' })
  },
  adFormat: {
    type: String,
    default: 'auto'
  },
  fullWidthResponsive: {
    type: String,
    default: 'true'
  }
})

const { t } = useI18n()
const config = useRuntimeConfig()
const adsenseId = computed(() => config.public.adsenseClientId)

const adRef = ref<HTMLElement | null>(null)
const showFallback = ref(true)
let retryTimer: ReturnType<typeof setTimeout> | null = null
let observer: MutationObserver | null = null
let retryCount = 0
const MAX_RETRIES = 5

const initAd = () => {
  try {
    if (typeof window !== 'undefined' && adRef.value) {
      const hasStatus = adRef.value.getAttribute('data-adsbygoogle-status')
      const width = adRef.value.offsetWidth

      if (hasStatus === 'done') {
        showFallback.value = false
      }

      if (!hasStatus && width > 0) {
        const adsbygoogle = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || []
        adsbygoogle.push({})
      } else if (!hasStatus && width === 0) {
        if (retryCount < MAX_RETRIES) {
          retryCount++
          retryTimer = setTimeout(initAd, 250)
        } else {
          console.warn('AdSense layout width remained 0 after maximum retries. Keeping fallback active.')
        }
      }
    }
  } catch (e) {
    console.error('AdSense push error:', e)
  }
}

onMounted(async () => {
  await nextTick()

  // Use MutationObserver to detect when AdSense changes status to 'done' (loaded successfully)
  if (typeof window !== 'undefined' && adRef.value) {
    // If it's already done before observer setup
    if (adRef.value.getAttribute('data-adsbygoogle-status') === 'done') {
      showFallback.value = false
    }

    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-adsbygoogle-status') {
          const status = adRef.value?.getAttribute('data-adsbygoogle-status')
          if (status === 'done') {
            showFallback.value = false
          }
        }
      })
    })

    observer.observe(adRef.value, {
      attributes: true,
      attributeFilter: ['data-adsbygoogle-status']
    })
  }

  // Initial load trigger
  retryTimer = setTimeout(initAd, 150)
})

onBeforeUnmount(() => {
  if (retryTimer) {
    clearTimeout(retryTimer)
  }
  if (observer) {
    observer.disconnect()
  }
})
</script>

<style scoped>
.promo-banner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 28px 0;
  width: 100%;
}

.promo-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.2);
  margin-bottom: 8px;
  user-select: none;
}

.promo-wrapper {
  position: relative;
  width: 100%;
  min-height: 90px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px dashed rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.promo-wrapper:hover {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

/* Premium mock ad styling */
.mock-ad-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
  width: 100%;
  min-height: 90px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.01) 0%, rgba(255, 255, 255, 0.03) 100%);
  color: rgba(255, 255, 255, 0.6);
  user-select: none;
  animation: fadeIn 0.4s ease-out;
}

.mock-ad-brand {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #d4af37; /* Premium Gold tone */
  margin-bottom: 6px;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.2);
}

.mock-ad-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 4px;
}

.mock-ad-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.block-info {
  font-size: 9px;
  color: rgba(226, 103, 109, 0.5); /* Soft red warning color */
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
