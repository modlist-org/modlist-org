<template>
  <div class="pending-page-container">
    <!-- Header info -->
    <div class="pending-header card">
      <h1 class="pending-title">{{ t('pending.title') }}</h1>
      <p class="pending-subtitle">{{ t('pending.subtitle') }}</p>
    </div>

    <!-- Collaborator Invitations Section -->
    <div v-if="invitations.length > 0" class="invitations-section card" style="padding: 24px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0;">
        {{ t('pending.invitations_title') }}
      </h2>
      <p style="font-size: 14px; color: rgba(255, 255, 255, 0.5); margin: 0 0 20px 0;">
        {{ t('pending.invitations_subtitle') }}
      </p>

      <div class="invitations-list" style="display: flex; flex-direction: column; gap: 14px;">
        <div v-for="inv in invitations" :key="inv._id" class="invitation-item card" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px;">
          <div>
            <div style="font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">
              {{ inv.name }}
            </div>
            <div style="font-size: 13px; color: rgba(255, 255, 255, 0.4); display: flex; align-items: center; gap: 6px;">
              <span>{{ t('mod.details.creator_label') }}:</span>
              <img :src="inv.authorId?.avatar || '/images/default_avatar.png'" alt="Avatar" style="width: 16px; height: 16px; border-radius: 50%;">
              <span>{{ inv.authorId?.globalName || inv.authorId?.username }}</span>
              <span v-if="inv.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 1px 3px; font-size: 8px; border-radius: 3px; line-height: 1;">✓</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-action accept-btn" style="background-color: #5FC391; color: #0f1015; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;" @click="respondInvitation(inv.slug, 'accept')">
              {{ t('pending.accept') }}
            </button>
            <button type="button" class="btn-action reject-btn" style="background-color: rgba(226, 103, 109, 0.1); color: #E2676D; border: 1px solid rgba(226, 103, 109, 0.2); padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;" @click="respondInvitation(inv.slug, 'reject')">
              {{ t('pending.reject') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Indicator -->
    <div v-if="loading" class="pending-loading-state">
      <div class="spinner" />
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Mods list -->
    <div v-else-if="mods.length > 0" class="mods-grid">
      <NuxtLink
        v-for="mod in mods"
        :key="mod._id"
        :to="`/mods/${mod.slug}`"
        class="card card-hover mod-card"
      >
        <div class="mod-card-body-wrapper" style="display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; flex-grow: 1;">
          <div class="card-logo-container" style="width: 54px; height: 54px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: rgba(0, 0, 0, 0.2);">
            <img v-if="mod.logo" :src="mod.logo" alt="Mod Logo" class="card-logo-img" style="width: 100%; height: 100%; object-fit: cover;">
            <div v-else class="card-logo-fallback" :style="getFallbackGradientStyle(mod.name)" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 22px; font-weight: 700; color: #ffffff; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);">{{ mod.name ? mod.name.charAt(0).toUpperCase() : 'M' }}</span>
            </div>
          </div>
          <div class="mod-card-body" style="flex-grow: 1; margin-bottom: 0; display: flex; flex-direction: column; gap: 8px;">
            <h3 class="mod-card-title">{{ mod.name }}</h3>
            <p class="mod-card-summary">{{ mod.summary }}</p>
            
            <!-- Rejection feedback on pending/rejected list -->
            <div v-if="mod.rejectionReason" class="card-rejection-reason" style="margin-top: 8px; padding: 10px 14px; background: rgba(226, 103, 109, 0.08); border: 1px solid rgba(226, 103, 109, 0.2); border-radius: 8px; font-size: 13px; color: #E2676D;">
              <strong>{{ t('admin.rejection_reason') || 'Rejection Reason:' }}</strong> {{ mod.rejectionReason }}
            </div>
          </div>
        </div>

        <div class="mod-card-tags" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; align-items: center;">
          <span class="badge badge-game">{{ getGameLabel(mod.game) }}</span>
          <span v-for="cat in mod.categories" :key="cat" class="badge badge-category">{{ getCategoryLabelOnly(cat) }}</span>
          <span class="badge badge-pending" style="flex-shrink: 0; margin-left: auto;">
            {{ t('mod.details.pending_approval') }}
          </span>
        </div>

        <div class="mod-card-footer">
          <div class="author-info">
            <div class="author-avatars-group">
              <!-- Author Avatar -->
              <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="Avatar" class="author-avatar-img" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
              <!-- Collaborators Avatars (max 2 for visual balance) -->
              <template v-if="mod.collaboratorIds && mod.collaboratorIds.length > 0">
                <img
                  v-for="collab in mod.collaboratorIds.slice(0, 2)"
                  :key="collab._id"
                  v-tooltip="collab.globalName || collab.username"
                  :src="collab.avatar || '/images/default_avatar.png'"
                  alt="Collab Avatar"
                  class="collab-avatar-img"
                  @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }"
                >
                <!-- If there are more than 2, render a "+N" circle -->
                <div
                  v-if="mod.collaboratorIds.length > 2"
                  v-tooltip="mod.collaboratorIds.slice(2).map(c => c.globalName || c.username).join(', ')"
                  class="collab-avatar-more"
                >
                  +{{ mod.collaboratorIds.length - 2 }}
                </div>
              </template>
            </div>
            <span class="author-name" :title="getFullAuthorsText(mod)">{{ getAuthorsText(mod) }}</span>
            <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 2px 4px; font-size: 9px; border-radius: 4px; line-height: 1;">✓</span>
          </div>

          <div class="mod-stats">
            <span v-if="mod.latestVersion" class="version-tag">v{{ mod.latestVersion.version }}</span>
            <span class="downloads-count">
              <svg class="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ mod.downloads }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Empty State -->
    <div v-else class="pending-empty-state card">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M16 21V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v16" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
      <p>{{ t('pending.empty') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n, navigateTo, useSeoMeta } from '#imports'
import { useAuth } from '../composables/useAuth'

interface ModVersion {
  version: string
  downloadUrl: string
  changelog: string
  isApproved: boolean
  createdAt: string
  submittedBy?: {
    username: string
    globalName?: string
  }
}

interface ModItem {
  _id: string
  name: string
  slug: string
  summary: string
  description?: string
  game: 'adofai' | 'rhythm-doctor'
  categories: Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
  authorId?: {
    _id: string
    username: string
    globalName?: string
    avatar?: string
    isVerifiedDeveloper: boolean
  }
  collaboratorIds?: Array<{
    _id: string
    username: string
    globalName?: string
    avatar?: string
    isVerifiedDeveloper?: boolean
  }>
  isApproved: boolean
  downloads: number
  versions: ModVersion[]
  latestVersion?: ModVersion | null
  rejectionReason?: string
  logo?: string
}

const { t } = useI18n()

// SEO Metadata
useSeoMeta({
  title: () => t('pending.title'),
  ogTitle: () => t('pending.title'),
  description: () => t('seo.description'),
  ogDescription: () => t('seo.description'),
  ogImage: '/favicon.svg',
  twitterCard: 'summary'
})

const getAuthorsText = (mod: ModItem) => {
  const names = []
  if (mod.authorId) {
    names.push(mod.authorId.globalName || mod.authorId.username)
  }
  if (mod.collaboratorIds && mod.collaboratorIds.length > 0) {
    const displayed = mod.collaboratorIds.slice(0, 2)
    displayed.forEach(collab => {
      names.push(collab.globalName || collab.username)
    })
    if (mod.collaboratorIds.length > 2) {
      return names.join(', ') + ' and more'
    }
  }
  return names.length > 0 ? names.join(', ') : 'Unknown'
}

const getFullAuthorsText = (mod: ModItem) => {
  const names = []
  if (mod.authorId) {
    names.push(mod.authorId.globalName || mod.authorId.username)
  }
  if (mod.collaboratorIds && mod.collaboratorIds.length > 0) {
    mod.collaboratorIds.forEach(collab => {
      names.push(collab.globalName || collab.username)
    })
  }
  return names.length > 0 ? names.join(', ') : 'Unknown'
}

const getFallbackGradientStyle = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const h1 = Math.abs(hash) % 360
  const h2 = (h1 + 40) % 360
  return {
    background: `linear-gradient(135deg, hsl(${h1}, 70%, 50%) 0%, hsl(${h2}, 70%, 40%) 100%)`
  }
}

const { user, loading: authLoading, invitationsCount } = useAuth()

const mods = ref<ModItem[]>([])
const invitations = ref<ModItem[]>([])
const loading = ref(true)

const fetchPendingModsAndInvitations = async () => {
  loading.value = true
  try {
    const [modsRes, invsRes] = await Promise.all([
      $fetch<{ mods: ModItem[] }>('/api/mods', { params: { pending: 'true' } }),
      $fetch<{ mods: ModItem[] }>('/api/mods/invitations')
    ])
    mods.value = modsRes.mods || []
    invitations.value = invsRes.mods || []
    invitationsCount.value = invitations.value.length
  } catch (error) {
    console.error('Failed to load pending mods/invitations:', error)
  } finally {
    loading.value = false
  }
}

const respondInvitation = async (slug: string, action: 'accept' | 'reject') => {
  try {
    await $fetch(`/api/mods/${slug}/respond-invitation`, {
      method: 'POST',
      body: { action }
    })
    await fetchPendingModsAndInvitations()
  } catch (error) {
    console.error('Failed to respond to invitation:', error)
    alert('Failed to process invitation.')
  }
}

const getGameLabel = (game: string) => {
  if (game === 'adofai') return t('games.adofai')
  if (game === 'rhythm-doctor') return t('games.rhythm_doctor')
  return game
}

const getCategoryLabelOnly = (val: string) => {
  if (val === 'ui') return t('categories.ui')
  if (val === 'gameplay') return t('categories.gameplay')
  if (val === 'utility') return t('categories.utility')
  if (val === 'visuals') return t('categories.visuals')
  if (val === 'library') return t('categories.library')
  return val
}

onMounted(() => {
  if (!authLoading.value && !user.value) {
    navigateTo('/')
  } else {
    fetchPendingModsAndInvitations()
  }
})
</script>

<style scoped>
.pending-page-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 10px;
}

.pending-header {
  padding: 24px 32px;
}

.pending-title {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 6px 0;
}

.pending-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

/* Mods Grid */
.mods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

@media (max-width: 480px) {
  .mods-grid {
    grid-template-columns: 1fr;
  }
}

.mod-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 200px;
  text-decoration: none;
  cursor: pointer;
  padding: 24px;
}



.badge-category {
  background-color: rgba(145, 154, 255, 0.1);
  color: #919AFF;
  border: 1px solid rgba(145, 154, 255, 0.25);
}

.mod-card-body {
  flex-grow: 1;
  margin-bottom: 20px;
}

.mod-card-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0 !important;
  color: #ffffff;
  border-left: none !important;
  padding-left: 0 !important;
}

.mod-card-summary {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mod-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 14px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  max-width: 70%;
}

.author-avatars-group {
  display: flex;
  align-items: center;
}

.author-avatar-img, .collab-avatar-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid #1b1a22; /* overlaps overlay boundary */
  object-fit: cover;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.collab-avatar-img, .collab-avatar-more {
  margin-left: -8px;
}

.collab-avatar-more {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid #1b1a22;
  background-color: #2b2a33;
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.author-avatars-group:hover .author-avatar-img,
.author-avatars-group:hover .collab-avatar-img,
.author-avatars-group:hover .collab-avatar-more {
  transform: translateY(-2px);
}

.author-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}

.mod-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.version-tag {
  background-color: rgba(145, 154, 255, 0.1);
  color: #919AFF;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.downloads-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.icon-svg {
  width: 14px;
  height: 14px;
}

/* Loading state */
.pending-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: rgba(255, 255, 255, 0.5);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(145, 154, 255, 0.2);
  border-top-color: #919AFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty state */
.pending-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: rgba(255, 255, 255, 0.2);
}

.btn-action:hover {
  opacity: 0.85;
}
</style>
