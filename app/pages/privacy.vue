<template>
  <div class="doc">
    <header class="page-header">
      <h1 class="page-title">{{ t('nav.privacy') }}</h1>
      <a href="/privacy.html" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">
        {{ t('legal.open_new_tab') }}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
      </a>
    </header>

    <div v-if="locale === 'ko-KR'" class="locale-notice">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
      본 개인정보처리방침은 영문으로 제공됩니다.
    </div>

    <div class="doc-frame">
      <iframe src="/privacy.html" title="Privacy Policy" />
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
.doc {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  align-items: center;
}

.locale-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 14px;
}

.locale-notice svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--accent);
}

.doc-frame {
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
}

.doc-frame iframe {
  display: block;
  width: 100%;
  height: max(600px, calc(100vh - var(--header-height) - 200px));
  border: none;
  background: #fff;
}
</style>
