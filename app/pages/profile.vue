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
            <span v-if="user.isAdmin" class="badge badge-admin">Admin</span>
            <span v-if="user.isVerifiedDeveloper" class="badge badge-verified">Verified Developer</span>
            <span v-if="isPremium" class="badge badge-premium">{{ t('profile.premium_member') }}</span>
            <span v-else class="badge badge-normal">{{ t('profile.normal_member') }}</span>
          </div>
        </div>
      </div>

      <div class="divider" />

      <!-- Premium Benefits Info -->
      <div class="premium-benefits-section">
        <h3>{{ t('profile.benefits_title') }}</h3>
        <div class="benefits-grid">
          <div class="benefit-item" :class="{ locked: !isPremium }">
            <span class="benefit-icon">☁️</span>
            <div class="benefit-desc">
              <h4>{{ t('profile.cloud_title') }}</h4>
              <p>{{ t('profile.cloud_desc') }}</p>
            </div>
          </div>
          <div class="benefit-item" :class="{ locked: !isPremium }">
            <span class="benefit-icon">🔗</span>
            <div class="benefit-desc">
              <h4>{{ t('profile.presets_title') }}</h4>
              <p>{{ t('profile.presets_desc') }}</p>
            </div>
          </div>
        </div>
        
        <div v-if="!isPremium" class="premium-help-container">
          <p class="premium-help-text">
            {{ t('profile.become_patron_help') }}
          </p>
          <a href="https://www.patreon.com/c/modlist_org/membership" target="_blank" class="patreon-cta-link-wrapper">
            <UIButton :label="t('premium.cta')" class="patreon-profile-btn" />
          </a>
        </div>
      </div>

      <div class="divider" />

      <!-- Desktop Integration Token Section -->
      <div class="integration-section">
        <h3>{{ t('profile.integration_title') }}</h3>
        <p class="section-desc">
          {{ t('profile.integration_desc') }}
        </p>

        <div v-if="integrationToken" class="token-box">
          <code class="token-text">{{ integrationToken }}</code>
          <div class="action-buttons-row">
            <UIButton 
              class="copy-btn"
              :label="copied ? t('profile.token_copied') : t('profile.token_copy')" 
              @click="copyToken"
            />
            <UIButton 
              class="link-app-btn"
              :label="t('profile.token_link_app')" 
              @click="linkDesktopApp"
            />
          </div>
        </div>
        <div v-else class="token-actions">
          <UIButton 
            :blocked="generating"
            :label="t('profile.token_generate')" 
            @click="generateToken"
          />
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
import { ref, computed } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useI18n } from '#imports'
import { UIButton } from 'overlayer-ui'

const { t } = useI18n()
const { user, loading } = useAuth()

const isPremium = computed(() => {
  return user.value?.isPremium || false
})

const integrationToken = ref('')
const generating = ref(false)
const copied = ref(false)

const generateToken = async () => {
  generating.value = true
  try {
    const res = await $fetch<{ token: string }>('/api/auth/token')
    integrationToken.value = res.token
  } catch (err) {
    console.error('Failed to generate token:', err)
  } finally {
    generating.value = false
  }
}

const copyToken = async () => {
  if (!integrationToken.value) return
  try {
    await navigator.clipboard.writeText(integrationToken.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy token:', err)
  }
}

const linkDesktopApp = () => {
  if (!integrationToken.value) return
  window.location.href = `modlist://auth?token=${encodeURIComponent(integrationToken.value)}`
}
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

.badge-premium {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1a1a1a;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.badge-normal {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.premium-benefits-section h3,
.integration-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #ffffff;
}

.benefits-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 600px) {
  .benefits-grid {
    grid-template-columns: 1fr;
  }
}

.benefit-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  display: flex;
  gap: 16px;
  transition: all 0.2s ease;
}

.benefit-item.locked {
  opacity: 0.5;
  filter: grayscale(1);
}

.benefit-icon {
  font-size: 28px;
}

.benefit-desc h4 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #ffffff;
}

.benefit-desc p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

.premium-help-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.premium-help-text {
  font-size: 14px;
  color: #FFD700;
  text-align: center;
  font-weight: 600;
}

.patreon-cta-link-wrapper {
  text-decoration: none;
}

.patreon-profile-btn {
  box-shadow: 0 4px 15px rgba(255, 165, 0, 0.2);
}

.section-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 16px;
}

.token-box {
  display: flex;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px 16px;
  border-radius: 8px;
  align-items: center;
}

.token-text {
  flex: 1;
  font-family: monospace;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  word-break: break-all;
  max-height: 48px;
  overflow-y: auto;
  user-select: all;
}

.copy-btn {
  flex-shrink: 0;
}
.action-buttons-row {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.login-action-btn {
  display: inline-block;
  margin-top: 16px;
  text-decoration: none;
}
</style>
