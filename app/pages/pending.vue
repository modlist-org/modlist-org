<template>
  <div class="pending">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ t('pending.title') }}</h1>
        <p class="page-subtitle">{{ t('pending.subtitle') }}</p>
      </div>
    </header>

    <!-- Collaborator Invitations Section -->
    <section v-if="invitations.length > 0" class="section">
      <div class="section-head">
        <h2 class="section-title">
          {{ t('pending.invitations_title') }}
          <span class="section-count">{{ invitations.length }}</span>
        </h2>
        <p class="section-desc">{{ t('pending.invitations_subtitle') }}</p>
      </div>

      <div class="invite-list">
        <div v-for="inv in invitations" :key="inv._id" class="invite">
          <div class="invite-logo">
            <img v-if="inv.logo" :src="inv.logo" :alt="inv.name">
            <span v-else :style="getFallbackGradientStyle(inv.name)">{{ inv.name ? inv.name.charAt(0).toUpperCase() : 'M' }}</span>
          </div>
          <div class="invite-body">
            <div class="invite-name">{{ inv.name }}</div>
            <div class="invite-meta">
              <span>{{ t('mod.details.creator_label') }}</span>
              <img :src="inv.authorId?.avatar || '/images/default_avatar.png'" alt="" @error="onAvatarError">
              <span class="invite-author">{{ inv.authorId?.globalName || inv.authorId?.username }}</span>
              <span v-if="inv.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-dot">✓</span>
            </div>
          </div>
          <div class="invite-actions">
            <button type="button" class="btn btn-sm btn-ghost" @click="respondInvitation(inv.slug, 'reject')">
              {{ t('pending.reject') }}
            </button>
            <button type="button" class="btn btn-sm btn-primary" @click="respondInvitation(inv.slug, 'accept')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10" /></svg>
              {{ t('pending.accept') }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">
          {{ t('pending.your_submissions') }}
          <span v-if="!loading" class="section-count">{{ mods.length }}</span>
        </h2>
      </div>

      <!-- Loading Indicator -->
      <div v-if="loading" class="mods-grid" :aria-label="t('loading')">
        <div v-for="n in 2" :key="n" class="mod-card mod-card-skeleton">
          <div class="skeleton skeleton-logo" />
          <div class="skeleton-lines">
            <div class="skeleton skeleton-line w-50" />
            <div class="skeleton skeleton-line w-90" />
            <div class="skeleton skeleton-line w-70" />
          </div>
        </div>
      </div>

      <!-- Mods list -->
      <div v-else-if="mods.length > 0" class="mods-grid">
        <NuxtLink
          v-for="mod in mods"
          :key="mod._id"
          :to="`/mods/${mod.slug}`"
          class="mod-card"
          :class="{ rejected: !!mod.rejectionReason }"
        >
          <div class="mod-logo">
            <img v-if="mod.logo" :src="mod.logo" :alt="mod.name" loading="lazy">
            <span v-else :style="getFallbackGradientStyle(mod.name)">{{ mod.name ? mod.name.charAt(0).toUpperCase() : 'M' }}</span>
          </div>

          <div class="mod-info">
            <div class="mod-heading">
              <h3 class="mod-name">{{ mod.name }}</h3>
              <span v-if="mod.rejectionReason" class="badge badge-pending">{{ t('pending.status_rejected') }}</span>
              <span v-else class="badge badge-review">{{ t('mod.details.pending_approval') }}</span>
            </div>

            <div class="mod-authors">
              <div class="avatar-stack">
                <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="" @error="onAvatarError">
                <template v-if="mod.collaboratorIds && mod.collaboratorIds.length > 0">
                  <img
                    v-for="collab in mod.collaboratorIds.slice(0, 2)"
                    :key="collab._id"
                    v-tooltip="collab.globalName || collab.username"
                    :src="collab.avatar || '/images/default_avatar.png'"
                    alt=""
                    @error="onAvatarError"
                  >
                  <span
                    v-if="mod.collaboratorIds.length > 2"
                    v-tooltip="mod.collaboratorIds.slice(2).map(c => c.globalName || c.username).join(', ')"
                    class="avatar-more"
                  >
                    +{{ mod.collaboratorIds.length - 2 }}
                  </span>
                </template>
              </div>
              <span class="mod-author-names" :title="getFullAuthorsText(mod)">{{ getAuthorsText(mod) }}</span>
              <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-dot">✓</span>
            </div>

            <p class="mod-summary">{{ mod.summary }}</p>

            <!-- Rejection feedback on pending/rejected list -->
            <div v-if="mod.rejectionReason" class="rejection">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
              <div>
                <strong>{{ t('admin.rejection_reason') || 'Rejection Reason:' }}</strong>
                <p>{{ mod.rejectionReason }}</p>
              </div>
            </div>

            <div class="mod-meta">
              <span class="badge badge-game">{{ getGameLabel(mod.game) }}</span>
              <span v-for="cat in mod.categories" :key="cat" class="badge badge-category">{{ getCategoryLabelOnly(cat) }}</span>
              <span class="mod-stats">
                <span v-if="mod.latestVersion" class="mod-version">v{{ mod.latestVersion.version }}</span>
                <span class="mod-downloads">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.62 2.48A2 2 0 0 0 4.56 21h14.88a2 2 0 0 0 1.94-1.52L22 17" /></svg>
                  {{ mod.downloads }}
                </span>
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>
        <p>{{ t('pending.empty') }}</p>
      </div>
    </section>
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
  game: 'adofai' | 'rhythm-doctor' | 'dancing-line'
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

const onAvatarError = (e: Event) => {
  (e.target as HTMLImageElement).src = '/images/default_avatar.png'
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
  if (game === 'dancing-line') return t('games.dancing_line')
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
.pending {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.section-count {
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.section-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Invitations */
.invite-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.invite {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-lg);
}

.invite-logo {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.invite-logo img,
.invite-logo span {
  width: 100%;
  height: 100%;
}

.invite-logo img {
  display: block;
  object-fit: cover;
}

.invite-logo span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: #fff;
}

.invite-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.invite-name {
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.invite-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.invite-meta img {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}

.invite-author {
  color: var(--text);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.invite-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* Mod cards (mirrors index.vue) */
.mods-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mod-card {
  display: flex;
  gap: 16px;
  padding: 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.mod-card:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
  transform: translateY(-1px);
}

.mod-card.rejected {
  border-color: rgba(239, 107, 115, 0.22);
}

.mod-card.rejected:hover {
  border-color: rgba(239, 107, 115, 0.4);
}

.mod-card-skeleton {
  pointer-events: none;
}

.skeleton-logo {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 12px;
}

.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-line {
  height: 12px;
}

.skeleton-line.w-50 {
  width: 50%;
  height: 16px;
}

.skeleton-line.w-90 {
  width: 90%;
}

.skeleton-line.w-70 {
  width: 70%;
}

.mod-logo {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.mod-logo img,
.mod-logo span {
  width: 100%;
  height: 100%;
}

.mod-logo img {
  object-fit: cover;
  display: block;
}

.mod-logo span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
}

.mod-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mod-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.mod-name {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mod-heading .badge {
  flex-shrink: 0;
  margin-left: auto;
}

.badge-review {
  background-color: var(--warning-soft);
  color: var(--warning);
  border-color: rgba(242, 181, 82, 0.28);
}

.mod-authors {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.avatar-stack {
  display: flex;
  flex-shrink: 0;
}

.avatar-stack img,
.avatar-more {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--surface);
  margin-left: -6px;
}

.avatar-stack img {
  object-fit: cover;
}

.avatar-stack img:first-child {
  margin-left: 0;
}

.avatar-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: content-box;
  width: auto;
  min-width: 14px;
  height: 14px;
  padding: 0 2px;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 700;
}

.mod-author-names {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.verified-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  font-size: 9px;
  font-weight: 800;
}

.mod-summary {
  margin: 2px 0 4px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rejection {
  display: flex;
  gap: 10px;
  margin-bottom: 4px;
  padding: 10px 12px;
  background: var(--danger-soft);
  border: 1px solid rgba(239, 107, 115, 0.25);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--danger);
}

.rejection svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.rejection strong {
  font-weight: 700;
}

.rejection p {
  margin: 2px 0 0;
  color: var(--text);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.mod-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: auto;
}

.mod-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 600;
}

.mod-version {
  font-variant-numeric: tabular-nums;
}

.mod-downloads {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
}

.mod-downloads svg {
  width: 14px;
  height: 14px;
}

@media (max-width: 1100px) {
  .mods-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .invite {
    flex-wrap: wrap;
  }
  .invite-body {
    flex-basis: calc(100% - 58px);
  }
  .invite-actions {
    width: 100%;
  }
  .invite-actions .btn {
    flex: 1;
  }
}

@media (max-width: 520px) {
  .mod-card {
    padding: 14px;
    gap: 12px;
  }
  .mod-logo {
    width: 48px;
    height: 48px;
  }
  .mod-heading {
    flex-wrap: wrap;
  }
  .mod-heading .badge {
    margin-left: 0;
  }
}
</style>
