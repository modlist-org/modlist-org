<template>
  <div class="premium-landing-container">
    <!-- Hero Header -->
    <div class="premium-hero">
      <div class="premium-badge-wrapper">
        <span class="premium-gold-badge">
          <svg class="badge-crown-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.55 18.55 20 18 20H6C5.45 20 5 19.55 5 19V18H19V19Z"/>
          </svg>
          {{ t('premium.badge') }}
        </span>
      </div>
      <h1 class="premium-title">{{ t('premium.title') }}</h1>
      <p class="premium-subtitle">
        {{ t('premium.subtitle') }}
      </p>
      
      <!-- Patreon CTA Button -->
      <div class="cta-wrapper">
        <a href="https://www.patreon.com/c/modlist_org/membership" target="_blank" class="patreon-cta-btn">
          <UIButton :label="t('premium.cta')" class="premium-btn" />
        </a>
      </div>
    </div>

    <!-- Feature Grid -->
    <div class="features-section">
      <h2 class="section-title">{{ t('premium.features_title') }}</h2>
      <div class="features-grid">
        <!-- Feature 1: Cloud Backup -->
        <div class="feature-card glass-panel">
          <div class="feature-icon-wrapper">
            <svg class="feature-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="feature-name">{{ t('premium.feature_cloud_title') }}</h3>
          <p class="feature-description">
            {{ t('premium.feature_cloud_desc') }}
          </p>
          <ul class="feature-details-list">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <li v-html="renderMarkdown(t('premium.feature_cloud_detail_1'))" />
            <!-- eslint-disable-next-line vue/no-v-html -->
            <li v-html="renderMarkdown(t('premium.feature_cloud_detail_2'))" />
            <li>{{ t('premium.feature_cloud_detail_3') }}</li>
            <li>{{ t('premium.feature_cloud_detail_4') }}</li>
          </ul>
        </div>

        <!-- Feature 2: Preset Sharing -->
        <div class="feature-card glass-panel">
          <div class="feature-icon-wrapper">
            <svg class="feature-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="feature-name">{{ t('premium.feature_presets_title') }}</h3>
          <p class="feature-description">
            {{ t('premium.feature_presets_desc') }}
          </p>
          <ul class="feature-details-list">
            <li>{{ t('premium.feature_presets_detail_1') }}</li>
            <li>{{ t('premium.feature_presets_detail_2') }}</li>
            <li>{{ t('premium.feature_presets_detail_3') }}</li>
            <li>{{ t('premium.feature_presets_detail_4') }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- How It Works Section -->
    <div class="workflow-section glass-panel">
      <h2 class="section-title">{{ t('premium.how_to_activate') }}</h2>
      <div class="steps-container">
        <div class="step-item">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>{{ t('premium.step_1_title') }}</h3>
            <p>{{ t('premium.step_1_desc') }}</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>{{ t('premium.step_2_title') }}</h3>
            <p>{{ t('premium.step_2_desc') }}</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>{{ t('premium.step_3_title') }}</h3>
            <p>{{ t('premium.step_3_desc') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UIButton } from 'overlayer-ui'
import { useI18n } from '#imports'
import { marked } from 'marked'

const { t } = useI18n()

const renderMarkdown = (text: string) => {
  return marked.parseInline(text)
}
</script>

<style scoped>
.premium-landing-container {
  max-width: 1100px;
  margin: 60px auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 80px;
}

.premium-hero {
  text-align: center;
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.premium-badge-wrapper {
  margin-bottom: 10px;
}

.premium-gold-badge {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #121118;
  font-weight: 800;
  padding: 6px 16px;
  border-radius: 30px;
  font-size: 13px;
  letter-spacing: 1.5px;
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.2);
}

.badge-crown-icon {
  width: 14px;
  height: 14px;
  margin-right: 4px;
  display: inline-block;
  vertical-align: middle;
  margin-top: -2px;
}

.premium-title {
  font-family: 'SUIT', 'Outfit', sans-serif;
  font-size: 48px;
  font-weight: 850;
  line-height: 1.2;
  background: linear-gradient(135deg, #ffffff 30%, rgba(255, 255, 255, 0.6) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  max-width: 800px;
}

.premium-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.6);
  max-width: 650px;
  line-height: 1.6;
}

.cta-wrapper {
  margin-top: 20px;
}

.patreon-cta-btn {
  text-decoration: none;
}

.premium-btn {
  padding: 14px 32px !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  box-shadow: 0 8px 30px rgba(145, 154, 255, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.premium-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(145, 154, 255, 0.4);
}

.section-title {
  font-size: 28px;
  font-weight: 750;
  color: #ffffff;
  margin-bottom: 40px;
  text-align: center;
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}

.glass-panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.feature-card {
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.feature-card:hover {
  border-color: rgba(145, 154, 255, 0.3);
  transform: translateY(-4px);
}

.feature-icon-wrapper {
  width: 60px;
  height: 60px;
  background: rgba(145, 154, 255, 0.1);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-icon {
  font-size: 32px;
}
.feature-icon-svg {
  width: 32px;
  height: 32px;
  color: #919AFF;
}

.feature-name {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
}

.feature-description {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
}

.feature-details-list {
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature-details-list li {
  font-size: 14.5px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}

.feature-details-list li strong {
  color: #919AFF;
}

.workflow-section {
  padding: 48px;
}

.steps-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 32px;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .steps-container {
    grid-template-columns: 1fr;
  }
}

.step-item {
  display: flex;
  gap: 20px;
}

.step-number {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #919AFF;
  color: #121118;
  font-weight: 800;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-content h3 {
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
}

.step-content p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
}
</style>
