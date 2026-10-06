<template>
  <div class="doc">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ t('nav.contact') }}</h1>
        <p class="page-subtitle">{{ t('contact.subtitle') }}</p>
      </div>
    </header>

    <div class="contact-grid">
      <!-- Discord Card -->
      <div class="contact-card card">
        <div class="contact-icon">
          <svg viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.53-2a75.58,75.58,0,0,0,73,0c.81.71,1.65,1.4,2.53,2a68.32,68.32,0,0,1-10.5,5,77.63,77.63,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,48.24,123.6,25.41,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" /></svg>
        </div>
        <h2 class="contact-name">Discord</h2>
        <p v-if="locale === 'ko-KR'" class="contact-desc">공식 Discord 서버 또는 개발자 DM을 통해 빠르게 피드백을 전달하고 도움을 받으실 수 있습니다.</p>
        <p v-else class="contact-desc">Get quick assistance, report bugs, or share feedback via our official Discord server or direct messages.</p>
        <a href="https://discord.modlist.org" target="_blank" rel="noopener" class="btn btn-discord">
          {{ locale === 'ko-KR' ? 'Discord 서버 입장하기' : 'Join Discord Server' }}
        </a>
      </div>

      <!-- Email Card -->
      <div class="contact-card card">
        <div class="contact-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 8 7.89 5.26a2 2 0 0 0 2.22 0L21 8" /></svg>
        </div>
        <h2 class="contact-name">Email</h2>
        <p v-if="locale === 'ko-KR'" class="contact-desc">기타 비즈니스 제안, 저작권 침해 신고 및 이메일 문의가 필요하신 경우 아래 메일로 연락바랍니다.</p>
        <p v-else class="contact-desc">For business proposals, copyright claims, or email inquiries, feel free to contact us via email.</p>
        <a href="mailto:admin@modlist.org" class="btn btn-secondary">
          admin@modlist.org
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n, useSeoMeta } from '#imports'

const { t, locale } = useI18n()

useSeoMeta({
  title: () => `${t('nav.contact')} - modlist.org`,
  ogTitle: () => `${t('nav.contact')} - modlist.org`,
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

.contact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.contact-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.contact-icon {
  width: 44px;
  height: 44px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--accent);
}

.contact-icon svg {
  width: 22px;
  height: 22px;
}

.card .contact-name {
  font-size: 18px;
}

.contact-desc {
  flex: 1;
  margin: 0 0 10px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .contact-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
