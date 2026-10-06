<template>
  <div v-if="loading" class="detail-loading-state">
    <div class="spinner" />
    <p>{{ t('loading') }}</p>
  </div>

  <div v-else-if="mod" class="mod-page">
    <!-- Status callouts -->
    <div v-if="!mod.isApproved && mod.rejectionReason" class="callout callout-danger">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></svg>
      <span>{{ t('mod.rejection_reason_banner', { reason: mod.rejectionReason }) }}</span>
    </div>
    <div v-else-if="!mod.isApproved" class="callout callout-info">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      <span>{{ t('mod.details.pending_notice') }}</span>
    </div>

    <div v-if="mod.editRejectionReason" class="callout callout-danger">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></svg>
      <span>{{ t('mod.edit_rejection_reason_banner', { reason: mod.editRejectionReason }) }}</span>
    </div>

    <!-- Pending Edit Banner (Only for owners/collabs/admins) -->
    <div v-if="mod.pendingEdit && isEditable" class="callout callout-warning pending-edit-callout">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
      <span class="callout-text">{{ t('mod.details.pending_edit_banner') }}</span>
      <UIToggle
        v-model="showPreviewMode"
        :default-value="false"
        :label="t('mod.details.preview_changes')"
        :font-size="13"
        class="preview-toggle"
      />
    </div>

    <!-- Header -->
    <header class="mod-hero">
      <div class="mod-logo">
        <img v-if="activeLogo" :src="activeLogo" :alt="activeName">
        <span v-else :style="fallbackGradientStyle">{{ activeName ? activeName.charAt(0).toUpperCase() : 'M' }}</span>
      </div>

      <div class="mod-hero-info">
        <div class="mod-title-row">
          <h1 class="mod-title">{{ activeName }}</h1>
          <span v-if="mod.isFeatured" class="badge badge-featured">★ {{ t('sort.featured', 'Featured') }}</span>
          <span v-if="!mod.isApproved" class="badge badge-pending">{{ t('mod.details.pending_approval') }}</span>
        </div>
        <p class="mod-summary">{{ (showPreviewMode && mod.pendingEdit?.summary) ? mod.pendingEdit.summary : mod.summary }}</p>

        <div class="mod-creators">
          <span class="creator-chip">
            <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="" @error="onAvatarError">
            <span class="creator-name">{{ mod.authorId?.globalName || mod.authorId?.username }}</span>
            <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-dot">✓</span>
          </span>
          <span v-for="c in mod.collaboratorIds" :key="c._id" class="creator-chip">
            <img :src="c.avatar || '/images/default_avatar.png'" alt="" @error="onAvatarError">
            <span class="creator-name">{{ c.globalName || c.username }}</span>
            <span v-if="c.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-dot">✓</span>
          </span>
        </div>

        <div class="mod-badges">
          <span class="badge badge-game">{{ getGameLabel(activeGame) }}</span>
          <span v-for="cat in activeCategories" :key="cat" class="badge badge-category">{{ getCategoryLabel(cat) }}</span>
        </div>
      </div>

      <div class="mod-hero-actions">
        <button
          v-if="latestVersion"
          type="button"
          class="btn btn-primary btn-lg download-btn"
          @click="triggerDownloadModal(`/api/mods/${mod.slug}/download`)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.62 2.48A2 2 0 0 0 4.56 21h14.88a2 2 0 0 0 1.94-1.52L22 17" /></svg>
          <span>{{ t('mod.details.download') }}</span>
          <span class="download-btn-version">v{{ latestVersion.version }}</span>
        </button>
        <button
          v-if="latestBetaVersion"
          type="button"
          class="btn btn-secondary download-btn beta-btn"
          @click="triggerDownloadModal(`/api/mods/${mod.slug}/download?beta=true`)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.62 2.48A2 2 0 0 0 4.56 21h14.88a2 2 0 0 0 1.94-1.52L22 17" /></svg>
          <span>v{{ latestBetaVersion.version }}</span>
          <span class="badge badge-beta">{{ t('mod.details.beta') }}</span>
        </button>
        <p v-if="latestVersion?.availablePlatforms?.length" class="download-platforms">
          {{ latestVersion.availablePlatforms.map(getPlatformLabel).join(' · ') }}
        </p>
        <p v-if="!latestVersion && !latestBetaVersion" class="no-downloads">{{ t('mod.details.no_downloads') }}</p>

        <div v-if="isEditable" class="editor-actions">
          <NuxtLink :to="`/edit/${mod.slug}`" class="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            {{ t('mod.details.edit') }}
          </NuxtLink>
          <a href="#submit-update" class="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            {{ t('mod.details.update') }}
          </a>
        </div>
      </div>
    </header>

    <div class="mod-stats">
      <div class="mod-stat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.62 2.48A2 2 0 0 0 4.56 21h14.88a2 2 0 0 0 1.94-1.52L22 17" /></svg>
        <strong>{{ mod.downloads.toLocaleString('en-US') }}</strong>
        <span>{{ t('mod.details.downloads_label') }}</span>
      </div>
      <div v-if="latestVersion || latestBetaVersion" class="mod-stat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" /><path d="M7 7h.01" /></svg>
        <strong>v{{ (latestVersion || latestBetaVersion)?.version }}</strong>
        <span>{{ t('mod.details.latest_version') }}</span>
      </div>
      <div v-if="latestVersion || latestBetaVersion" class="mod-stat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        <span>{{ t('mod.details.updated') }}</span>
        <strong>{{ formatDate((latestVersion || latestBetaVersion)?.createdAt || '') }}</strong>
      </div>
    </div>

    <div class="mod-layout" :class="{ 'has-admin': user?.isAdmin }">
      <div class="mod-main">
        <!-- Description -->
        <section class="card mod-section">
          <h2 class="section-title">{{ t('mod.details.about') }}</h2>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="markdown-body" v-html="renderedDescription" />
        </section>

        <!-- Version History -->
        <section class="card mod-section">
          <h2 class="section-title">
            {{ t('mod.details.versions') }}
            <span v-if="mod.versions?.length" class="section-count">{{ mod.versions.length }}</span>
          </h2>
          <div class="versions-list">
            <div v-for="(ver, idx) in paginatedVersions" :key="ver._id" class="version-row" :class="{ pending: !ver.isApproved }">
              <div class="version-head">
                <div class="version-main">
                  <div class="version-title">
                    <span class="version-number">v{{ ver.version }}</span>
                    <span v-if="ver.isBeta" class="badge badge-beta">{{ t('mod.details.beta') }}</span>
                    <span v-if="!ver.isApproved" class="badge badge-pending">{{ t('mod.details.pending_approval') }}</span>
                  </div>
                  <div class="version-meta">
                    <span v-if="ver.gameVersion" v-tooltip="t('mod.details.game_version_label')" class="version-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="3" /><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" /></svg>
                      {{ ver.gameVersion }}
                    </span>
                    <span class="version-meta-item">{{ formatDate(ver.createdAt) }}</span>
                    <span class="version-meta-item">
                      {{ t('mod.details.submitted_by', { user: 'USER_PLACEHOLDER' }).split('USER_PLACEHOLDER')[0] }}<span class="version-submitter">{{ ver.submittedBy?.globalName || ver.submittedBy?.username || 'Unknown' }}<span v-if="ver.submittedBy?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-dot">✓</span></span>{{ t('mod.details.submitted_by', { user: 'USER_PLACEHOLDER' }).split('USER_PLACEHOLDER')[1] }}
                    </span>
                    <span v-if="ver.availablePlatforms?.length" class="version-platforms">
                      <span v-for="platform in ver.availablePlatforms" :key="platform" class="badge badge-category platform-badge">{{ getPlatformLabel(platform) }}</span>
                    </span>
                  </div>
                </div>

                <div class="version-actions">
                  <button
                    v-if="!ver.isApproved && isEditable"
                    type="button"
                    class="btn btn-danger btn-sm"
                    @click="deleteVersion(ver._id)"
                  >
                    {{ t('mod.details.delete_version') }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    @click="triggerDownloadModal(`/api/mods/${mod.slug}/download?version=${encodeURIComponent(ver.version)}`)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.62 2.48A2 2 0 0 0 4.56 21h14.88a2 2 0 0 0 1.94-1.52L22 17" /></svg>
                    {{ t('mod.details.download') }}
                  </button>
                </div>
              </div>

              <div v-if="!ver.isApproved && ver.rejectionReason" class="callout callout-danger callout-sm">
                <span><strong>{{ t('mod.details.rejection_reason_label') || 'Rejection Reason:' }}</strong> {{ ver.rejectionReason }}</span>
              </div>

              <details v-if="ver.changelog" class="version-changelog" :open="versionPage === 1 && idx === 0">
                <summary>{{ t('mod.details.changelog') }}</summary>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div class="markdown-body" v-html="renderMarkdown(ver.changelog)" />
              </details>
            </div>
          </div>

          <!-- Versions Pagination -->
          <div v-if="totalVersionPages > 1" class="pagination-container">
            <button
              class="pagination-btn"
              :disabled="versionPage === 1"
              @click="changeVersionPage(versionPage - 1)"
            >
              {{ t('pagination.prev') }}
            </button>
            <div class="pagination-pages">
              <button
                v-for="p in visibleVersionPages"
                :key="p"
                class="pagination-page-btn"
                :class="{ active: p === versionPage }"
                @click="changeVersionPage(p)"
              >
                {{ p }}
              </button>
            </div>
            <button
              class="pagination-btn"
              :disabled="versionPage === totalVersionPages"
              @click="changeVersionPage(versionPage + 1)"
            >
              {{ t('pagination.next') }}
            </button>
          </div>
        </section>

        <!-- Submit Update (Author / Collab only) -->
        <section v-if="isEditable" id="submit-update" class="card mod-section">
          <h2 class="section-title">{{ t('update.title') }}</h2>

          <form class="update-form" @submit.prevent="submitUpdate">
            <div class="form-row">
              <div class="form-group">
                <label for="new-version">{{ t('update.version') }}</label>
                <input
                  id="new-version"
                  v-model="updateForm.version"
                  type="text"
                  :placeholder="t('submit.version_placeholder')"
                  required
                >
              </div>

              <div class="form-group">
                <label for="new-game-version">{{ t('submit.game_version') }}</label>
                <input
                  id="new-game-version"
                  v-model="updateForm.gameVersion"
                  type="text"
                  :placeholder="t('submit.game_version_placeholder')"
                >
              </div>
            </div>

            <div class="form-group">
              <DownloadLinksInput
                v-model:mode="updateForm.downloadMode"
                v-model:unified-url="updateForm.downloadUrl"
                v-model:platform-downloads="updateForm.platformDownloads"
              />
            </div>

            <div class="form-group beta-toggle">
              <UIToggle
                v-model="updateForm.isBeta"
                :default-value="false"
                :label="t('submit.is_beta_label', 'Mark as Beta Version')"
                :font-size="14"
              />
            </div>

            <div class="form-group">
              <label for="new-changelog">{{ t('submit.changelog') }}</label>
              <textarea
                id="new-changelog"
                v-model="updateForm.changelog"
                rows="4"
                :placeholder="t('update.changelog_placeholder')"
              />
            </div>

            <div v-if="formError" class="callout callout-danger callout-sm form-message">
              {{ formError }}
            </div>
            <div v-if="formSuccess" class="callout callout-success callout-sm form-message">
              {{ formSuccess }}
            </div>

            <button type="submit" class="btn btn-primary submit-update-btn" :disabled="submittingUpdate">
              <span v-if="submittingUpdate" class="spinner btn-spinner" />
              {{ submittingUpdate ? t('update.submitting') : t('update.submit') }}
            </button>
          </form>
        </section>
      </div>

      <!-- Admin Controls Panel (Only Admins) -->
      <section v-if="user?.isAdmin" class="card side-card admin-card">
        <h3 class="side-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
          {{ t('admin.controls') }}
        </h3>
        <div class="admin-buttons">
          <button
            v-if="mod.isApproved"
            type="button"
            class="btn btn-sm"
            :class="mod.isFeatured ? 'btn-secondary' : 'btn-primary'"
            @click="adminToggleFeatured"
          >
            {{ mod.isFeatured ? t('admin.unfeature_mod', 'Unfeature Mod') : t('admin.feature_mod', 'Feature Mod') }}
          </button>
          <button v-if="!mod.isApproved" type="button" class="btn btn-sm btn-success" @click="adminApprove">
            {{ t('admin.approve_mod') }}
          </button>
          <button v-if="!mod.isApproved" type="button" class="btn btn-sm btn-danger" @click="adminReject">
            {{ t('admin.reject_mod') }}
          </button>
          <button v-if="mod.isApproved" type="button" class="btn btn-sm btn-danger" @click="adminUnapprove">
            {{ t('admin.unapprove_mod') }}
          </button>
          <button type="button" class="btn btn-sm btn-danger-solid" @click="adminDelete">
            {{ t('admin.delete_mod') }}
          </button>
        </div>
      </section>

      <!-- Sidebar -->
      <aside class="mod-sidebar">
        <section class="card side-card">
          <h3 class="side-title">{{ t('mod.details.info') }}</h3>
          <dl class="info-list">
            <div class="info-row">
              <dt>{{ t('mod.details.game') }}</dt>
              <dd>{{ getGameLabel(activeGame) }}</dd>
            </div>
            <div class="info-row">
              <dt>{{ t('mod.details.categories') }}</dt>
              <dd class="info-badges">
                <span v-for="cat in activeCategories" :key="cat" class="badge badge-category">{{ getCategoryLabel(cat) }}</span>
              </dd>
            </div>
            <div class="info-row">
              <dt>{{ t('mod.details.downloads_label') }}</dt>
              <dd>{{ mod.downloads.toLocaleString('en-US') }}</dd>
            </div>
            <div v-if="latestVersion?.gameVersion" class="info-row">
              <dt>{{ t('mod.details.game_version_label') }}</dt>
              <dd>{{ latestVersion.gameVersion }}</dd>
            </div>
          </dl>
        </section>

        <section v-if="(activeSourceUrl && sourceInfo) || (activeCommunityUrl && communityInfo)" class="card side-card">
          <h3 class="side-title">{{ t('mod.details.links') }}</h3>
          <div class="link-list">
            <!-- Source Code Link -->
            <a
              v-if="activeSourceUrl && sourceInfo"
              :href="activeSourceUrl"
              target="_blank"
              rel="noopener"
              class="side-link"
            >
              <!-- GitHub Icon -->
              <svg v-if="sourceInfo?.type === 'github'" class="side-link-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              <!-- GitLab Icon -->
              <svg v-else-if="sourceInfo?.type === 'gitlab'" class="side-link-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.953 13.072l-1.653-5.09a.908.908 0 0 0-.317-.417.92.92 0 0 0-.52-.108.932.932 0 0 0-.486.205.918.918 0 0 0-.275.428L18.42 15.02H5.58L3.298 7.973a.918.918 0 0 0-.275-.428.932.932 0 0 0-.486-.205.92.92 0 0 0-.52.108.908.908 0 0 0-.317.417L.047 13.072a1.002 1.002 0 0 0 .356 1.107l10.913 7.94a1.144 1.144 0 0 0 1.368 0l10.913-7.94a1.002 1.002 0 0 0 .356-1.107z" />
              </svg>
              <!-- Bitbucket Icon -->
              <svg v-else-if="sourceInfo?.type === 'bitbucket'" class="side-link-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.313 3.007a1.246 1.246 0 0 0-1.226 1.01L18.59 20.306a1.07 1.07 0 0 1-1.053.864H6.467a1.07 1.07 0 0 1-1.053-.864L2.915 4.017A1.246 1.246 0 0 0 1.69 3.007c-.99 0-1.636 1.008-1.34 1.95l2.49 14.887a2.535 2.535 0 0 0 2.497 2.05H17.81a2.535 2.535 0 0 0 2.497-2.05l2.49-14.887a1.157 1.157 0 0 0-.156-.837 1.18 1.18 0 0 0-.74-.47L22.313 3z" />
              </svg>
              <!-- Generic Code Icon -->
              <svg v-else class="side-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span>{{ sourceInfo?.name }}</span>
              <svg class="side-link-external" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
            </a>
            <!-- Community Link -->
            <a
              v-if="activeCommunityUrl && communityInfo"
              :href="activeCommunityUrl"
              target="_blank"
              rel="noopener"
              class="side-link"
              :class="communityInfo.type"
            >
              <!-- Discord Icon -->
              <svg v-if="communityInfo.type === 'discord'" class="side-link-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
              </svg>
              <!-- Generic Chat Icon -->
              <svg v-else class="side-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{{ communityInfo.name }}</span>
              <svg class="side-link-external" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
            </a>
          </div>
        </section>

        <section v-if="loadedDependencies && loadedDependencies.length > 0" class="card side-card">
          <h3 class="side-title">{{ t('mod.details.dependencies') }}</h3>
          <div class="dep-list">
            <NuxtLink v-for="dep in loadedDependencies" :key="dep._id" :to="`/mods/${dep.slug}`" class="dep-item">
              <span class="dep-logo">
                <img v-if="dep.logo" :src="dep.logo" alt="" @error="onAvatarError">
                <span v-else :style="getFallbackGradientStyle(dep.name)">{{ dep.name ? dep.name.charAt(0).toUpperCase() : 'M' }}</span>
              </span>
              <span class="dep-text">
                <span class="dep-name">{{ dep.name }}</span>
                <span v-if="dep.summary" class="dep-summary">{{ dep.summary }}</span>
              </span>
            </NuxtLink>
          </div>
        </section>

        <section class="card side-card">
          <h3 class="side-title">{{ t('mod.details.creators') }}</h3>
          <div class="creator-list">
            <div class="creator-item">
              <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="" @error="onAvatarError">
              <div class="creator-text">
                <span class="creator-item-name">
                  {{ mod.authorId?.globalName || mod.authorId?.username }}
                  <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-dot">✓</span>
                </span>
                <span class="creator-role">{{ t('mod.details.author') }}</span>
              </div>
            </div>
            <div v-for="c in mod.collaboratorIds" :key="c._id" class="creator-item">
              <img :src="c.avatar || '/images/default_avatar.png'" alt="" @error="onAvatarError">
              <div class="creator-text">
                <span class="creator-item-name">
                  {{ c.globalName || c.username }}
                  <span v-if="c.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="verified-dot">✓</span>
                </span>
                <span class="creator-role">{{ t('mod.details.collaborator') }}</span>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <!-- App Recommendation Modal -->
    <transition name="modal-fade">
      <div v-if="showAppRecommendModal" class="modal-overlay" @click.self="showAppRecommendModal = false">
        <div class="app-recommend-card" role="dialog" aria-modal="true">
          <button type="button" class="btn btn-ghost btn-icon modal-close-btn" aria-label="Close modal" @click="showAppRecommendModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>

          <h3 class="modal-recommend-title">
            {{ t('mod.download_modal.title') }}
          </h3>
          <p class="modal-recommend-desc">
            {{ t('mod.download_modal.desc') }}
          </p>

          <ul class="app-features-list">
            <li class="app-feature-item">
              <span class="feature-icon">⚡</span>
              <span>{{ t('mod.download_modal.feature_1') }}</span>
            </li>
            <li class="app-feature-item">
              <span class="feature-icon">🔄</span>
              <span>{{ t('mod.download_modal.feature_2') }}</span>
            </li>
            <li class="app-feature-item">
              <span class="feature-icon">🧩</span>
              <span>{{ t('mod.download_modal.feature_3') }}</span>
            </li>
          </ul>

          <div class="modal-actions">
            <button type="button" class="btn btn-primary btn-lg modal-app-btn" @click="handleAppDownload">
              {{ t('mod.download_modal.get_app_btn') }}
            </button>
            <button type="button" class="modal-direct-btn" @click="handleDirectDownload">
              {{ t('mod.download_modal.direct_btn') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>

  <div v-else class="empty-state detail-not-found-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>
    <h2>{{ t('submit.mod_not_found') }}</h2>
    <p>{{ t('mod.details.not_approved_detail') }}</p>
    <NuxtLink to="/" class="btn btn-secondary">
      {{ t('mod.details.back_home') }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useI18n, navigateTo, useFetch, useSeoMeta } from '#imports'
import { UIToggle } from 'overlayer-ui'
import { useAuth } from '../../composables/useAuth'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

interface CreatorUser {
  _id: string
  username: string
  globalName?: string
  avatar?: string
  isVerifiedDeveloper: boolean
}

interface ModVersion {
  _id?: string
  version: string
  downloadUrl: string
  changelog: string
  gameVersion?: string
  isApproved: boolean
  availablePlatforms?: Array<'windows' | 'macos' | 'linux'>
  isBeta?: boolean
  rejectionReason?: string
  submittedBy?: {
    username: string
    globalName?: string
    isVerifiedDeveloper?: boolean
  }
  createdAt: string
}

interface DependencyMod {
  _id: string
  name: string
  slug: string
  logo?: string
  summary?: string
}

interface PendingEdit {
  name?: string
  summary?: string
  description?: string
  game?: 'adofai' | 'rhythm-doctor' | 'dancing-line'
  categories?: Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
  logo?: string
  sourceUrl?: string
  communityUrl?: string
  dependencies?: string[]
  createdAt: string
}

interface ModItem {
  _id: string
  name: string
  slug: string
  summary: string
  description?: string
  game: 'adofai' | 'rhythm-doctor' | 'dancing-line'
  categories: Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
  authorId: CreatorUser
  collaboratorIds: CreatorUser[]
  pendingEdit?: PendingEdit | null
  isApproved: boolean
  rejectionReason?: string
  editRejectionReason?: string
  logo?: string
  sourceUrl?: string
  communityUrl?: string
  dependencies: string[]
  downloads: number
  versions: ModVersion[]
  isFeatured?: boolean
}

const route = useRoute()
const slug = route.params.slug as string
const { t } = useI18n()
const { user } = useAuth()

const mod = ref<ModItem | null>(null)
const latestVersion = ref<ModVersion | null>(null)
const latestBetaVersion = ref<ModVersion | null>(null)
const isEditable = ref(false)
const showPreviewMode = ref(false)
const loading = ref(true)

// App Recommendation Modal State
const showAppRecommendModal = ref(false)
const pendingDownloadUrl = ref('')

const triggerDownloadModal = (downloadUrl: string) => {
  pendingDownloadUrl.value = downloadUrl
  if (!mod.value) return

  const isBeta = downloadUrl.includes('beta=true')
  const protocolUrl = `modlist://install/${mod.value.slug}${isBeta ? '?beta=true' : ''}`

  showAppRecommendModal.value = true
  window.location.href = protocolUrl
}

const handleAppDownload = () => {
  window.open('https://github.com/modlist-org/modlist_org_app/releases/latest', '_blank')
  showAppRecommendModal.value = false
}

const handleDirectDownload = () => {
  if (pendingDownloadUrl.value) {
    if (mod.value) {
      mod.value.downloads++
    }
    window.open(pendingDownloadUrl.value, '_blank')
  }
  showAppRecommendModal.value = false
}

// Fetch mod details on both server and client side
const { data: modData, error: fetchError } = await useFetch<{ mod: ModItem; latestVersion: ModVersion | null; latestBetaVersion: ModVersion | null; isEditable: boolean }>(`/api/mods/${slug}`)

watch([modData, fetchError], ([newVal, err]) => {
  if (newVal) {
    mod.value = newVal.mod
    latestVersion.value = newVal.latestVersion
    latestBetaVersion.value = newVal.latestBetaVersion
    isEditable.value = newVal.isEditable
    loading.value = false
  } else if (err) {
    mod.value = null
    latestVersion.value = null
    latestBetaVersion.value = null
    isEditable.value = false
    loading.value = false
  }
}, { immediate: true })

// Version History Pagination
const versionPage = ref(1)
const versionsPerPage = 5

const totalVersionPages = computed(() => {
  if (!mod.value || !mod.value.versions) return 1
  return Math.ceil(mod.value.versions.length / versionsPerPage) || 1
})

const paginatedVersions = computed(() => {
  if (!mod.value || !mod.value.versions) return []
  const start = (versionPage.value - 1) * versionsPerPage
  const end = start + versionsPerPage
  return mod.value.versions.slice(start, end)
})

const changeVersionPage = (page: number) => {
  if (page < 1 || page > totalVersionPages.value) return
  versionPage.value = page
}

const visibleVersionPages = computed(() => {
  const range = []
  const maxVisible = 5
  let start = Math.max(1, versionPage.value - Math.floor(maxVisible / 2))
  const end = Math.min(totalVersionPages.value, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    range.push(i)
  }
  return range
})

watch(totalVersionPages, (newTotal) => {
  if (versionPage.value > newTotal) {
    versionPage.value = Math.max(1, newTotal)
  }
})


// SEO Metadata
useSeoMeta({
  title: () => mod.value ? mod.value.name : 'Loading...',
  ogTitle: () => mod.value ? mod.value.name : 'Loading...',
  description: () => mod.value?.summary || t('seo.description'),
  ogDescription: () => mod.value?.summary || t('seo.description'),
  ogImage: () => mod.value?.logo || '/favicon.svg',
  twitterCard: 'summary'
})

// Update Release form state
const updateForm = ref({
  version: '',
  downloadMode: 'unified' as 'unified' | 'platform',
  downloadUrl: '',
  platformDownloads: {
    windows: '',
    macos: '',
    linux: ''
  },
  changelog: '',
  gameVersion: '',
  isBeta: false
})
const hasUpdateDownload = computed(() => updateForm.value.downloadMode === 'unified'
  ? updateForm.value.downloadUrl.trim().length > 0
  : Object.values(updateForm.value.platformDownloads).some((url) => url.trim().length > 0))
const submittingUpdate = ref(false)
const formError = ref('')
const formSuccess = ref('')

const activeLogo = computed(() => {
  if (showPreviewMode.value && mod.value?.pendingEdit?.logo !== undefined) {
    return mod.value.pendingEdit.logo
  }
  return mod.value?.logo
})

const activeName = computed(() => {
  if (showPreviewMode.value && mod.value?.pendingEdit?.name) {
    return mod.value.pendingEdit.name
  }
  return mod.value?.name || ''
})

const activeSourceUrl = computed(() => {
  if (showPreviewMode.value && mod.value?.pendingEdit?.sourceUrl !== undefined) {
    return mod.value.pendingEdit.sourceUrl
  }
  return mod.value?.sourceUrl
})

const activeCommunityUrl = computed(() => {
  if (showPreviewMode.value && mod.value?.pendingEdit?.communityUrl !== undefined) {
    return mod.value.pendingEdit.communityUrl
  }
  return mod.value?.communityUrl
})

const activeGame = computed(() => {
  if (showPreviewMode.value && mod.value?.pendingEdit?.game) {
    return mod.value.pendingEdit.game
  }
  return mod.value?.game || ''
})

const activeCategories = computed(() => {
  if (showPreviewMode.value && mod.value?.pendingEdit?.categories && mod.value.pendingEdit.categories.length > 0) {
    return mod.value.pendingEdit.categories
  }
  return mod.value?.categories || []
})

const loadedDependencies = ref<DependencyMod[]>([])

const activeDependencySlugs = computed(() => {
  if (showPreviewMode.value && mod.value?.pendingEdit?.dependencies !== undefined) {
    return mod.value.pendingEdit.dependencies
  }
  return mod.value?.dependencies || []
})

watch(activeDependencySlugs, async (slugs) => {
  if (!slugs || slugs.length === 0) {
    loadedDependencies.value = []
    return
  }
  try {
    const data = await $fetch<{ mods: DependencyMod[] }>('/api/mods', {
      query: {
        slugs: slugs.join(','),
        limit: slugs.length
      }
    })
    loadedDependencies.value = data.mods || []
  } catch (err) {
    console.error('Failed to fetch dynamic dependencies:', err)
    loadedDependencies.value = []
  }
}, { immediate: true })

const sourceInfo = computed(() => {
  const url = activeSourceUrl.value
  if (!url) return null
  const lower = url.toLowerCase()
  if (lower.includes('github.com')) {
    return { name: 'GitHub', type: 'github' }
  }
  if (lower.includes('gitlab.com') || lower.includes('gitlab')) {
    return { name: 'GitLab', type: 'gitlab' }
  }
  if (lower.includes('bitbucket.org') || lower.includes('bitbucket')) {
    return { name: 'Bitbucket', type: 'bitbucket' }
  }
  if (lower.includes('gitee.com') || lower.includes('gitee')) {
    return { name: 'Gitee', type: 'gitee' }
  }
  return { name: t('mod.details.source_code'), type: 'code' }
})

const communityInfo = computed(() => {
  const url = activeCommunityUrl.value
  if (!url) return null
  const lower = url.toLowerCase()
  if (lower.includes('discord.gg') || lower.includes('discord.com')) {
    return { name: 'Discord', type: 'discord' }
  }
  if (lower.includes('twitter.com') || lower.includes('x.com')) {
    return { name: 'Twitter / X', type: 'twitter' }
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return { name: 'YouTube', type: 'youtube' }
  }
  return { name: t('mod.details.community'), type: 'community' }
})



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

const getPlatformLabel = (platform: string) => {
  if (platform === 'windows') return 'Windows'
  if (platform === 'macos') return 'macOS'
  if (platform === 'linux') return 'Linux'
  return platform
}

const fallbackGradientStyle = computed(() => getFallbackGradientStyle(mod.value?.name || 'M'))

const fetchModDetails = async () => {
  loading.value = true
  try {
    const response = await $fetch<{ mod: ModItem; latestVersion: ModVersion | null; latestBetaVersion: ModVersion | null; isEditable: boolean }>(`/api/mods/${slug}`)
    mod.value = response.mod
    latestVersion.value = response.latestVersion
    latestBetaVersion.value = response.latestBetaVersion
    isEditable.value = response.isEditable
    versionPage.value = 1
  } catch (error) {
    console.error('Failed to load mod details:', error)
    mod.value = null
  } finally {
    loading.value = false
  }
}

const renderedDescription = computed(() => {
  const desc = (showPreviewMode.value && mod.value?.pendingEdit?.description !== undefined)
    ? mod.value.pendingEdit.description
    : mod.value?.description

  if (!desc) return '<em>No description provided.</em>'
  try {
    return DOMPurify.sanitize(marked.parse(desc, { async: false }) as string)
  } catch {
    return ''
  }
})

const renderMarkdown = (text: string) => {
  if (!text) return ''
  try {
    return DOMPurify.sanitize(marked.parse(text, { async: false }) as string)
  } catch {
    return ''
  }
}

const getGameLabel = (game: string) => {
  if (game === 'adofai') return t('games.adofai')
  if (game === 'rhythm-doctor') return t('games.rhythm_doctor')
  if (game === 'dancing-line') return t('games.dancing_line')
  return game
}

const getCategoryLabel = (val: string) => {
  if (val === 'ui') return t('categories.ui')
  if (val === 'gameplay') return t('categories.gameplay')
  if (val === 'utility') return t('categories.utility')
  if (val === 'visuals') return t('categories.visuals')
  if (val === 'library') return t('categories.library')
  return val
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Download click handler

// Delete version submission helper
const deleteVersion = async (versionId: string | undefined) => {
  if (!versionId) return
  if (!confirm(t('mod.details.delete_version_confirm') || 'Are you sure you want to delete this version submission?')) return
  try {
    const data = await $fetch<{ success: boolean }>(`/api/mods/${slug}/versions/delete`, {
      method: 'POST',
      body: { versionId }
    })
    if (data.success) {
      await fetchModDetails()
    }
  } catch (e) {
    console.error(e)
    alert('Failed to delete version submission.')
  }
}

// Submit Update version
const submitUpdate = async () => {
  submittingUpdate.value = true
  formError.value = ''
  formSuccess.value = ''

  if (!hasUpdateDownload.value) {
    formError.value = t('submit.download_required', 'Add a download link.')
    submittingUpdate.value = false
    return
  }

  try {
    const platformDownloads = updateForm.value.downloadMode === 'platform'
      ? Object.fromEntries(Object.entries(updateForm.value.platformDownloads).filter(([, url]) => url.trim()))
      : {}
    await $fetch(`/api/mods/${slug}/versions`, {
      method: 'POST',
      body: {
        ...updateForm.value,
        downloadUrl: updateForm.value.downloadMode === 'unified'
          ? updateForm.value.downloadUrl.trim()
          : Object.values(updateForm.value.platformDownloads).find((url) => url.trim()) || '',
        platformDownloads
      }
    })

    formSuccess.value = user.value?.isVerifiedDeveloper || user.value?.isAdmin
      ? 'Update published successfully!'
      : 'Update submitted and is pending administrator approval.'

    // Reset Form
    updateForm.value = {
      version: '',
      downloadMode: 'unified',
      downloadUrl: '',
      platformDownloads: {
        windows: '',
        macos: '',
        linux: ''
      },
      changelog: '',
      gameVersion: '',
      isBeta: false
    }

    // Refresh details after a short delay
    setTimeout(() => {
      fetchModDetails()
      formSuccess.value = ''
    }, 1500)

  } catch (err: unknown) {
    console.error('Failed to submit version update:', err)
    const error = err as { data?: { statusMessage?: string } }
    formError.value = error.data?.statusMessage || 'An unexpected error occurred.'
  } finally {
    submittingUpdate.value = false
  }
}

const adminApprove = async () => {
  try {
    await $fetch('/api/admin/approve-mod', {
      method: 'POST',
      body: { modId: mod.value?._id }
    })
    await fetchModDetails()
  } catch (e) {
    console.error(e)
    alert('Failed to approve mod.')
  }
}

const adminReject = async () => {
  const reason = prompt(t('admin.reject_reason_prompt') || 'Please enter the rejection reason:')
  if (reason === null) return // Canceled
  try {
    await $fetch('/api/admin/reject-mod', {
      method: 'POST',
      body: { modId: mod.value?._id, reason }
    })
    await fetchModDetails()
  } catch (e) {
    console.error(e)
    alert('Failed to reject mod.')
  }
}

const adminUnapprove = async () => {
  if (!confirm(t('admin.unapprove_confirm'))) return
  try {
    await $fetch('/api/admin/unapprove-mod', {
      method: 'POST',
      body: { modId: mod.value?._id }
    })
    await fetchModDetails()
  } catch (e) {
    console.error(e)
    alert('Failed to unapprove mod.')
  }
}

const adminDelete = async () => {
  if (!confirm(t('admin.delete_confirm'))) return
  try {
    await $fetch('/api/admin/delete-mod', {
      method: 'POST',
      body: { modId: mod.value?._id }
    })
    navigateTo('/')
  } catch (e) {
    console.error(e)
    alert('Failed to delete mod.')
  }
}

const adminToggleFeatured = async () => {
  try {
    await $fetch('/api/admin/toggle-featured', {
      method: 'POST',
      body: { modId: mod.value?._id }
    })
    await fetchModDetails()
  } catch (e) {
    console.error(e)
    alert('Failed to toggle featured status.')
  }
}

onMounted(() => {
  // Already fetched via useFetch on server/client hydration
})
</script>

<style scoped>
.detail-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 0;
  color: var(--text-secondary);
}

.mod-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Callouts */
.callout {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.callout > svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.callout-sm {
  padding: 8px 12px;
  font-size: 13px;
  border-radius: var(--radius-sm);
}

.callout-danger {
  background: var(--danger-soft);
  border-color: rgba(239, 107, 115, 0.28);
  color: var(--danger);
}

.callout-warning {
  background: var(--warning-soft);
  border-color: rgba(242, 181, 82, 0.28);
  color: var(--warning);
}

.callout-success {
  background: var(--success-soft);
  border-color: rgba(95, 195, 145, 0.28);
  color: var(--success);
}

.callout-info {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  color: var(--accent);
}

.pending-edit-callout {
  flex-wrap: wrap;
}

.callout-text {
  flex: 1;
  min-width: 200px;
}

.preview-toggle {
  width: 180px;
  flex-shrink: 0;
}

/* Header */
.mod-hero {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding-top: 4px;
}

.mod-logo {
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  border-radius: 20px;
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
  display: block;
  object-fit: cover;
}

.mod-logo span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 800;
  color: #fff;
}

.mod-hero-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mod-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
}

.mod-title {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.mod-summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.55;
}

.mod-creators {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
}

.creator-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.creator-chip img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.creator-name {
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
  line-height: 1;
}

.mod-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mod-hero-actions {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.download-btn {
  width: 100%;
}

.download-btn-version {
  font-weight: 500;
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}

.beta-btn .badge {
  height: 20px;
  font-size: 11px;
}

.download-platforms,
.no-downloads {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
}

.no-downloads {
  padding: 12px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  font-size: 13px;
}

.editor-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 4px;
}

.editor-actions .btn {
  min-width: 0;
  padding: 0 8px;
}

/* Stats row */
.mod-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  padding: 14px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.mod-stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
}

.mod-stat svg {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
}

.mod-stat strong {
  color: var(--text);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Two-column layout */
.mod-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  grid-template-areas: "main side";
  gap: 24px;
  align-items: start;
}

.mod-layout.has-admin {
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "main admin"
    "main side";
}

.mod-main {
  grid-area: main;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.admin-card {
  grid-area: admin;
}

.mod-sidebar {
  grid-area: side;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.section-count {
  padding: 0 7px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

/* Versions */
.versions-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.version-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid var(--border);
}

.version-row:first-child {
  border-top: none;
}

.version-row:hover {
  background: var(--surface-hover);
}

.version-row.pending {
  background: rgba(239, 107, 115, 0.04);
}

.version-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.version-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.version-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.version-number {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.version-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.version-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.version-meta-item svg {
  width: 14px;
  height: 14px;
}

.version-submitter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-weight: 600;
}

.platform-badge {
  height: 20px;
  font-size: 11px;
}

.version-platforms {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}

.version-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.version-changelog summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.version-changelog summary::-webkit-details-marker {
  display: none;
}

.version-changelog summary::before {
  content: '';
  width: 6px;
  height: 6px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 0.15s ease;
}

.version-changelog[open] summary::before {
  transform: rotate(45deg);
}

.version-changelog summary:hover {
  color: var(--text);
}

.version-changelog .markdown-body {
  margin-top: 10px;
  padding: 12px 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.version-changelog .markdown-body > :deep(:first-child) {
  margin-top: 0;
}

.version-changelog .markdown-body > :deep(:last-child) {
  margin-bottom: 0;
}

.mod-section > .markdown-body > :deep(:first-child) {
  margin-top: 0;
}

.markdown-body :deep(img) {
  height: auto;
}

/* Update form */
.update-form {
  display: flex;
  flex-direction: column;
}

.beta-toggle {
  width: 240px;
  max-width: 100%;
}

.form-message {
  margin-bottom: 16px;
}

.submit-update-btn {
  width: 100%;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border-width: 2px;
}

/* Sidebar cards */
.side-card {
  padding: 18px;
}

.side-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.side-title svg {
  width: 16px;
  height: 16px;
}

.info-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 14px;
}

.info-row dt {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.info-row dd {
  margin: 0;
  text-align: right;
  font-weight: 600;
  min-width: 0;
}

.info-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.link-list,
.dep-list,
.creator-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.side-link,
.dep-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin: 0 -10px;
  border-radius: var(--radius-sm);
  color: var(--text);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.15s ease;
}

.side-link:hover,
.dep-item:hover {
  background: var(--surface-2);
}

.side-link-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.side-link.discord .side-link-icon {
  color: #5865f2;
}

.side-link-external {
  width: 14px;
  height: 14px;
  margin-left: auto;
  color: var(--text-tertiary);
}

.dep-logo {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.dep-logo img,
.dep-logo span {
  width: 100%;
  height: 100%;
}

.dep-logo img {
  display: block;
  object-fit: cover;
}

.dep-logo span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
}

.dep-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.dep-name,
.dep-summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dep-name {
  font-weight: 600;
}

.dep-summary {
  font-size: 12px;
  color: var(--text-tertiary);
}

.creator-list {
  gap: 12px;
}

.creator-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.creator-item img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.creator-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.creator-item-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
}

.creator-role {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* Admin controls */
.admin-card {
  border-color: rgba(239, 107, 115, 0.25);
}

.admin-card .side-title {
  color: var(--danger);
}

.admin-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-success {
  background: var(--success-soft);
  border-color: rgba(95, 195, 145, 0.3);
  color: var(--success);
}

.btn-success:hover:not(:disabled) {
  background: var(--success);
  color: #0b0b10;
}

.btn-danger-solid {
  background: var(--danger);
  color: #fff;
}

.btn-danger-solid:hover:not(:disabled) {
  background: var(--danger-hover);
}

/* Not found */
.detail-not-found-state {
  max-width: 520px;
  width: 100%;
  margin: 40px auto;
}

.detail-not-found-state h2 {
  margin: 0;
  font-size: 20px;
  color: var(--text);
}

.detail-not-found-state p {
  margin: 0;
}

/* App recommendation modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(5, 5, 8, 0.7);
}

.app-recommend-card {
  position: relative;
  width: 100%;
  max-width: 440px;
  padding: 32px 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.modal-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
}

.modal-recommend-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.modal-recommend-desc {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
  word-break: keep-all;
  overflow-wrap: break-word;
}

.app-features-list {
  width: 100%;
  margin: 0 0 24px;
  padding: 14px 16px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.app-feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  font-size: 14px;
  font-weight: 500;
}

.feature-icon {
  font-size: 15px;
}

.modal-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.modal-app-btn {
  width: 100%;
}

.modal-direct-btn {
  padding: 8px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
}

.modal-direct-btn:hover {
  color: var(--text);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .app-recommend-card,
.modal-fade-leave-active .app-recommend-card {
  transition: transform 0.2s ease;
}

.modal-fade-enter-from .app-recommend-card,
.modal-fade-leave-to .app-recommend-card {
  transform: translateY(8px) scale(0.98);
}

/* Responsive */
@media (max-width: 900px) {
  .mod-layout,
  .mod-layout.has-admin {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
    grid-template-areas: "main" "side";
  }

  .mod-layout.has-admin {
    grid-template-areas: "admin" "main" "side";
  }

  .mod-hero {
    flex-wrap: wrap;
  }

  .mod-hero-info {
    flex-basis: calc(100% - 120px);
  }

  .mod-hero-actions {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .mod-hero {
    gap: 16px;
  }

  .mod-logo {
    width: 72px;
    height: 72px;
    border-radius: 16px;
  }

  .mod-logo span {
    font-size: 30px;
  }

  .mod-hero-info {
    flex-basis: calc(100% - 88px);
  }

  .mod-title {
    font-size: 24px;
  }

  .mod-summary {
    font-size: 15px;
  }

  .mod-stats {
    gap: 8px 18px;
  }

  .mod-section {
    padding: 18px;
  }

  .version-head {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .version-actions .btn {
    flex: 1;
  }

  .app-recommend-card {
    padding: 28px 20px 20px;
  }
}

</style>
