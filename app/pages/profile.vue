<template>
  <div class="profile">
    <div v-if="loading" class="profile-card card">
      <div class="skeleton profile-avatar" />
      <div class="profile-meta">
        <div class="skeleton skeleton-line w-40" />
        <div class="skeleton skeleton-line w-25" />
      </div>
    </div>

    <template v-else-if="user">
      <header class="page-header">
        <h1 class="page-title">{{ t('nav.profile') }}</h1>
      </header>

      <section class="profile-card card">
        <img :src="user.avatar || '/images/default_avatar.png'" alt="" class="profile-avatar" @error="onAvatarError">
        <div class="profile-meta">
          <h2 class="profile-name">{{ user.globalName || user.username }}</h2>
          <p class="profile-handle">@{{ user.username }}</p>
          <div class="profile-badges">
            <span v-if="user.isAdmin" class="badge badge-admin">{{ t('profile.role_admin') }}</span>
            <span v-if="user.isVerifiedDeveloper" class="badge badge-verified">✓ {{ t('profile.role_verified_dev') }}</span>
            <span class="badge badge-game">{{ t('profile.normal_member') }}</span>
          </div>
        </div>
      </section>
    </template>

    <div v-else class="card signed-out">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
      <h2>{{ t('profile.not_logged_in_title') }}</h2>
      <p>{{ t('profile.not_logged_in_desc') }}</p>
      <a href="/api/auth/login" class="btn btn-discord">
        <svg viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.53-2a75.58,75.58,0,0,0,73,0c.81.71,1.65,1.4,2.53,2a68.32,68.32,0,0,1-10.5,5,77.63,77.63,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,48.24,123.6,25.41,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" /></svg>
        {{ t('nav.login') }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '../composables/useAuth'
import { useI18n } from '#imports'

const { t } = useI18n()
const { user, loading } = useAuth()

const onAvatarError = (e: Event) => {
  (e.target as HTMLImageElement).src = '/images/default_avatar.png'
}
</script>

<style scoped>
.profile {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 24px;
}

.profile-avatar {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
}

.profile-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card .profile-name {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.profile-handle {
  margin: 0 0 8px;
  color: var(--text-secondary);
  font-size: 14px;
}

.profile-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.skeleton-line {
  height: 14px;
}

.skeleton-line.w-40 {
  width: 40%;
  height: 22px;
}

.skeleton-line.w-25 {
  width: 25%;
  margin-top: 6px;
}

.signed-out {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 24px;
  text-align: center;
}

.signed-out > svg {
  width: 40px;
  height: 40px;
  color: var(--text-tertiary);
}

.signed-out p {
  margin: 0 0 8px;
  color: var(--text-secondary);
}

@media (max-width: 520px) {
  .profile-card {
    flex-direction: column;
    text-align: center;
  }
  .profile-badges {
    justify-content: center;
  }
}
</style>
