<template>
  <div class="card contact-page-card">
    <h1 class="contact-title">{{ t('nav.contact') }}</h1>
    
    <div class="contact-box-grid">
      <!-- Discord Card -->
      <div class="contact-card card-hover">
        <div class="contact-icon-wrapper discord-color">
          <svg class="contact-icon" viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.53-2a75.58,75.58,0,0,0,73,0c.81.71,1.65,1.4,2.53,2a68.32,68.32,0,0,1-10.5,5,77.63,77.63,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,48.24,123.6,25.41,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
          </svg>
        </div>
        <div class="contact-details">
          <h3>Discord</h3>
          <p v-if="locale === 'ko-KR'">공식 Discord 서버 또는 개발자 DM을 통해 빠르게 피드백을 전달하고 도움을 받으실 수 있습니다.</p>
          <p v-else>Get quick assistance, report bugs, or share feedback via our official Discord server or direct messages.</p>
          <a href="https://discord.modlist.org" target="_blank" class="contact-btn">
            {{ locale === 'ko-KR' ? 'Discord 서버 입장하기' : 'Join Discord Server' }}
          </a>
        </div>
      </div>

      <!-- Email Card -->
      <div class="contact-card card-hover">
        <div class="contact-icon-wrapper email-color">
          <svg class="contact-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8L10.89 13.26C11.56 13.71 12.44 13.71 13.11 13.26L21 8M5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7V17C3 18.1 3.9 19 5 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="contact-details">
          <h3>Email</h3>
          <p v-if="locale === 'ko-KR'">기타 비즈니스 제안, 저작권 침해 신고 및 이메일 문의가 필요하신 경우 아래 메일로 연락바랍니다.</p>
          <p v-else>For business proposals, copyright claims, or email inquiries, feel free to contact us via email.</p>
          <a href="mailto:admin@modlist.org" class="contact-btn email-btn">
            admin@modlist.org
          </a>
        </div>
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
.contact-page-card {
  padding: 40px;
  max-width: 900px;
  margin: 0 auto;
}

.contact-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 32px;
  color: #ffffff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 16px;
  text-align: center;
}

.contact-box-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .contact-box-grid {
    grid-template-columns: 1fr;
  }
}

.contact-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.2s, border-color 0.2s;
}

.contact-icon-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.discord-color {
  background: rgba(88, 101, 242, 0.1);
  color: #5865F2;
  border: 1px solid rgba(88, 101, 242, 0.2);
}

.email-color {
  background: rgba(145, 154, 255, 0.1);
  color: #919AFF;
  border: 1px solid rgba(145, 154, 255, 0.2);
}

.contact-icon {
  width: 32px;
  height: 32px;
  fill: currentColor;
}

.contact-icon path {
  fill: currentColor;
}

.contact-details h3 {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 12px 0;
}

.contact-details p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin: 0 0 24px 0;
  min-height: 48px;
}

.contact-btn {
  display: inline-block;
  background-color: #5865F2;
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  transition: background-color 0.2s, transform 0.2s;
  box-shadow: 0 4px 12px rgba(88, 101, 242, 0.2);
}

.contact-btn:hover {
  background-color: #4752C4;
  transform: translateY(-1px);
}

.email-btn {
  background-color: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.email-btn:hover {
  background-color: rgba(255, 255, 255, 0.08);
}
</style>
