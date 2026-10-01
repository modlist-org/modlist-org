<template>
  <div class="profile-container">
    <div v-if="loading" class="detail-loading-state">
      <div class="spinner" />
      <p>{{ t('loading') }}</p>
    </div>

    <div v-else-if="user" class="profile-card card">
      <div class="profile-header">
        <img :src="user.avatar || '/images/default_avatar.png'" alt="Avatar" class="profile-avatar" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
        <div class="profile-meta">
          <h2 class="profile-username">{{ user.globalName || user.username }}</h2>
          <p class="profile-discord-tag">@{{ user.username }}</p>
          <div class="profile-badges">
            <span v-if="user.isAdmin" class="badge badge-admin">{{ t('profile.role_admin') }}</span>
            <span v-if="user.isVerifiedDeveloper" class="badge badge-verified">{{ t('profile.role_verified_dev') }}</span>
            <span class="badge badge-normal">{{ t('profile.normal_member') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card detail-not-found-state">
      <h2>{{ t('profile.not_logged_in_title') }}</h2>
      <p>{{ t('profile.not_logged_in_desc') }}</p>
      <a href="/api/auth/login" class="login-action-btn">
        <UIButton :label="t('nav.login')" />
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '../composables/useAuth'
import { useI18n } from '#imports'
import { UIButton } from 'overlayer-ui'

const { t } = useI18n()
const { user, loading } = useAuth()
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 0 20px;
}

.profile-card {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
}

.profile-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.profile-username {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  color: #ffffff;
}

.profile-discord-tag {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
}

.profile-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge-normal {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.login-action-btn {
  display: inline-block;
  margin-top: 16px;
  text-decoration: none;
}
</style>
