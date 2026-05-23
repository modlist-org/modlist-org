<template>
  <div class="card legal-page-card">
    <h1 class="legal-title">{{ t('nav.privacy') }}</h1>
    
    <div v-if="locale === 'ko-KR'" class="locale-notice">
      💡 본 개인정보처리방침은 영문으로 제공됩니다.
    </div>

    <div class="privacy-iframe-container">
      <iframe src="/privacy.html" class="privacy-iframe" title="Privacy Policy"></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n, useSeoMeta } from '#imports'

const { t, locale } = useI18n()

useSeoMeta({
  title: () => `${t('nav.privacy')} - modlist.org`,
  ogTitle: () => `${t('nav.privacy')} - modlist.org`,
  robots: 'noindex, follow'
})
</script>

<style scoped>
.legal-page-card {
  padding: 40px;
  max-width: 900px;
  margin: 0 auto;
}

.legal-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #ffffff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 16px;
}

.locale-notice {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--accent-purple);
}

.privacy-iframe-container {
  width: 100%;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
  margin-top: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.privacy-iframe {
  width: 100%;
  height: 800px;
  border: none;
  background: #ffffff;
  display: block;
}
</style>
