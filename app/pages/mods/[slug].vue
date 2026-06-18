<template>
  <div v-if="loading" class="detail-loading-state">
    <div class="spinner" />
    <p>{{ t('loading') }}</p>
  </div>

  <div v-else-if="mod" class="detail-grid">
    <!-- Rejected Mod Banner -->
    <div v-if="!mod.isApproved && mod.rejectionReason" class="card rejection-banner" style="grid-column: 1 / -1; border-color: rgba(226, 103, 109, 0.3); background-color: rgba(226, 103, 109, 0.03); padding: 16px 20px; display: flex; align-items: center; gap: 12px; border-radius: 12px; flex-wrap: wrap;">
      <svg viewBox="0 0 24 24" fill="none" style="width: 20px; height: 20px; color: #E2676D; flex-shrink: 0;" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span style="font-size: 14px; font-weight: 500; color: #E2676D;">
        {{ t('mod.rejection_reason_banner', { reason: mod.rejectionReason }) }}
      </span>
    </div>

    <!-- Rejected Edit Banner -->
    <div v-if="mod.editRejectionReason" class="card rejection-banner" style="grid-column: 1 / -1; border-color: rgba(226, 103, 109, 0.3); background-color: rgba(226, 103, 109, 0.03); padding: 16px 20px; display: flex; align-items: center; gap: 12px; border-radius: 12px; flex-wrap: wrap;">
      <svg viewBox="0 0 24 24" fill="none" style="width: 20px; height: 20px; color: #E2676D; flex-shrink: 0;" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span style="font-size: 14px; font-weight: 500; color: #E2676D;">
        {{ t('mod.edit_rejection_reason_banner', { reason: mod.editRejectionReason }) }}
      </span>
    </div>

    <!-- Pending Edit Banner (Only for owners/collabs/admins) -->
    <div v-if="mod.pendingEdit && isEditable" class="card pending-edit-banner" style="grid-column: 1 / -1; border-color: rgba(240, 173, 78, 0.3); background-color: rgba(240, 173, 78, 0.03); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; border-radius: 12px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg viewBox="0 0 24 24" fill="none" style="width: 20px; height: 20px; color: #f0ad4e;" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-size: 14px; font-weight: 500; color: #f0ad4e;">
          {{ t('mod.details.pending_edit_banner') }}
        </span>
      </div>
      <UIToggle
        v-model="showPreviewMode"
        :default-value="false"
        :label="t('mod.details.preview_changes')"
        :font-size="13"
        class="preview-toggle-custom"
      />
    </div>

    <!-- Left Column: Detailed Info -->
    <div class="detail-main-pane">
      <div class="card detail-header-card">
        <div class="header-card-body">
          <div class="header-logo-container">
            <img v-if="activeLogo" :src="activeLogo" alt="Mod Logo" class="header-logo-img">
            <div v-else class="header-logo-fallback" :style="fallbackGradientStyle">
              <span>{{ activeName ? activeName.charAt(0).toUpperCase() : 'M' }}</span>
            </div>
          </div>
          <div class="header-info-container">
            <div class="header-text-block">
              <h1 class="mod-title">{{ activeName }}</h1>
              <p class="mod-summary-text">{{ (showPreviewMode && mod.pendingEdit?.summary) ? mod.pendingEdit.summary : mod.summary }}</p>
              <div class="header-badges">
                <span v-if="mod.isFeatured" class="badge badge-featured">⭐ {{ t('sort.featured', 'Featured') }}</span>
                <span class="badge badge-game">{{ getGameLabel((showPreviewMode && mod.pendingEdit?.game) ? mod.pendingEdit.game : mod.game) }}</span>
                <span v-for="cat in ((showPreviewMode && mod.pendingEdit?.categories && mod.pendingEdit.categories.length > 0) ? mod.pendingEdit.categories : mod.categories)" :key="cat" class="badge badge-category">{{ getCategoryLabel(cat) }}</span>
                <span v-if="!mod.isApproved" class="badge badge-pending">{{ t('mod.details.pending_approval') }}</span>
              </div>
            </div>

            <div v-if="isEditable" class="header-actions">
              <NuxtLink :to="`/edit/${mod.slug}`" class="header-edit-link">
                <UIButton :label="t('mod.details.edit')" class="header-edit-button" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile-only Admin Controls Panel (Only Admins) -->
      <div v-if="user?.isAdmin && mod" class="card sidebar-card admin-controls-card mobile-only-card">
        <h3 class="admin-controls-title">
          {{ t('admin.controls') }}
        </h3>
        <div class="admin-controls-buttons">
          <UIButton
            v-if="mod.isApproved"
            :label="mod.isFeatured ? t('admin.unfeature_mod', 'Unfeature Mod') : t('admin.feature_mod', 'Feature Mod')"
            :class="{ 'danger-btn': mod.isFeatured }"
            class="admin-btn"
            @click="adminToggleFeatured"
          />
          <UIButton
            v-if="!mod.isApproved"
            :label="t('admin.approve_mod')"
            class="success-btn admin-btn"
            @click="adminApprove"
          />
          <UIButton
            v-if="!mod.isApproved"
            :label="t('admin.reject_mod')"
            class="danger-btn admin-btn"
            @click="adminReject"
          />
          <UIButton
            v-if="mod.isApproved"
            :label="t('admin.unapprove_mod')"
            class="danger-btn admin-btn"
            @click="adminUnapprove"
          />
          <UIButton
            :label="t('admin.delete_mod')"
            class="danger-btn admin-btn admin-delete-btn"
            @click="adminDelete"
          />
        </div>
      </div>

      <!-- Mobile-only Download / Action Panel -->
      <div class="card sidebar-card action-card mobile-only-card">
        <div class="action-buttons-group">
          <a
            v-if="latestVersion"
            href="#"
            class="download-main-btn"
            @click.prevent="triggerDownloadModal(`/api/mods/${mod.slug}/download`)"
          >
            <svg style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/>
            </svg>
            <span>v{{ latestVersion.version }}</span>
          </a>
          <a
            v-if="latestBetaVersion"
            href="#"
            class="download-beta-btn"
            @click.prevent="triggerDownloadModal(`/api/mods/${mod.slug}/download?beta=true`)"
          >
            <svg style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/>
            </svg>
            <span>v{{ latestBetaVersion.version }} ({{ t('mod.details.beta') }})</span>
          </a>
          <!-- Source Code Link -->
          <a
            v-if="activeSourceUrl && sourceInfo"
            :href="activeSourceUrl"
            target="_blank"
            class="source-code-btn"
          >
            <!-- GitHub Icon -->
            <svg v-if="sourceInfo?.type === 'github'" style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            <!-- GitLab Icon -->
            <svg v-else-if="sourceInfo?.type === 'gitlab'" style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.953 13.072l-1.653-5.09a.908.908 0 0 0-.317-.417.92.92 0 0 0-.52-.108.932.932 0 0 0-.486.205.918.918 0 0 0-.275.428L18.42 15.02H5.58L3.298 7.973a.918.918 0 0 0-.275-.428.932.932 0 0 0-.486-.205.92.92 0 0 0-.52.108.908.908 0 0 0-.317.417L.047 13.072a1.002 1.002 0 0 0 .356 1.107l10.913 7.94a1.144 1.144 0 0 0 1.368 0l10.913-7.94a1.002 1.002 0 0 0 .356-1.107z"/>
            </svg>
            <!-- Bitbucket Icon -->
            <svg v-else-if="sourceInfo?.type === 'bitbucket'" style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.313 3.007a1.246 1.246 0 0 0-1.226 1.01L18.59 20.306a1.07 1.07 0 0 1-1.053.864H6.467a1.07 1.07 0 0 1-1.053-.864L2.915 4.017A1.246 1.246 0 0 0 1.69 3.007c-.99 0-1.636 1.008-1.34 1.95l2.49 14.887a2.535 2.535 0 0 0 2.497 2.05H17.81a2.535 2.535 0 0 0 2.497-2.05l2.49-14.887a1.157 1.157 0 0 0-.156-.837 1.18 1.18 0 0 0-.74-.47L22.313 3z"/>
            </svg>
            <!-- Generic Code Icon -->
            <svg v-else style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            <span>{{ sourceInfo?.name }}</span>
          </a>
          <!-- Community Link -->
          <a
            v-if="activeCommunityUrl && communityInfo"
            :href="activeCommunityUrl"
            target="_blank"
            class="community-btn"
            :class="communityInfo.type"
          >
            <!-- Discord Icon -->
            <svg v-if="communityInfo.type === 'discord'" style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
            </svg>
            <!-- Generic Chat Icon -->
            <svg v-else style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{{ communityInfo.name }}</span>
          </a>
        </div>
        <div v-if="!latestVersion && !latestBetaVersion" class="no-download-state">
          <p>{{ t('mod.details.no_downloads') }}</p>
        </div>

        <div class="stats-sidebar-grid">
          <div class="stat-sidebar-item">
            <span class="stat-label">{{ t('mod.details.downloads_label') }}</span>
            <span class="stat-val">{{ mod.downloads }}</span>
          </div>
          <div class="stat-sidebar-item">
            <span class="stat-label">{{ t('mod.details.creator_label') }}</span>
            <span class="stat-val author-tag">
              <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="Avatar" class="avatar-tag-img" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
              {{ mod.authorId?.globalName || mod.authorId?.username }}
              <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 2px 4px; font-size: 9px; border-radius: 4px; line-height: 1; margin-left: 2px;">✓</span>
            </span>
          </div>
          <div v-if="mod.collaboratorIds?.length > 0" class="stat-sidebar-item">
            <span class="stat-label">{{ t('mod.details.collabs') }}</span>
            <div class="collab-tag-list">
              <span v-for="c in mod.collaboratorIds" :key="c._id" class="collab-tag">
                <img :src="c.avatar || '/images/default_avatar.png'" alt="Avatar" class="avatar-tag-img" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
                {{ c.globalName || c.username }}
                <span v-if="c.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 2px 4px; font-size: 9px; border-radius: 4px; line-height: 1; margin-left: 2px;">✓</span>
              </span>
            </div>
          </div>
          <div v-if="loadedDependencies && loadedDependencies.length > 0" class="stat-sidebar-item">
            <span class="stat-label">{{ t('mod.details.dependencies') }}</span>
            <div class="collab-tag-list">
              <NuxtLink v-for="dep in loadedDependencies" :key="dep._id" :to="`/mods/${dep.slug}`" class="collab-tag" style="text-decoration: none;">
                <img :src="dep.logo || '/images/default_avatar.png'" alt="Logo" class="avatar-tag-img" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
                {{ dep.name }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>



      <!-- Description Block -->
      <div class="card detail-desc-card">
        <h3>{{ t('mod.details.about') }}</h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="markdown-body" v-html="renderedDescription" />
      </div>

      <!-- Version History -->
      <div class="card detail-versions-card">
        <h3>{{ t('mod.details.versions') }}</h3>
        <div class="versions-list">
          <div v-for="ver in paginatedVersions" :key="ver._id" :class="{ 'pending-version': !ver.isApproved }" class="version-row">
            <div class="version-row-header">
              <div class="version-meta-left">
                <span class="version-number">v{{ ver.version }}</span>
                <span v-if="ver.isBeta" class="badge badge-beta version-beta-badge" style="font-size: 11px; padding: 2px 6px; border-radius: 6px; background-color: rgba(240, 173, 78, 0.15); color: #f0ad4e; border: 1px solid rgba(240, 173, 78, 0.3); text-transform: uppercase;">BETA</span>
                <span v-if="ver.gameVersion" class="badge badge-category version-game-version-badge" style="font-size: 11px; padding: 2px 6px; border-radius: 6px;">{{ ver.gameVersion }}</span>
                <span v-if="!ver.isApproved" class="badge badge-pending version-pending-badge">{{ t('mod.details.pending_approval') }}</span>
              </div>
              <span class="version-date">{{ formatDate(ver.createdAt) }}</span>
            </div>

            <!-- Version Rejection Reason -->
            <div v-if="!ver.isApproved && ver.rejectionReason" class="version-rejection-reason">
              <strong>{{ t('mod.details.rejection_reason_label') || 'Rejection Reason:' }}</strong> {{ ver.rejectionReason }}
            </div>

            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="ver.changelog" class="version-changelog markdown-body" v-html="renderMarkdown(ver.changelog)" />


            <div class="version-footer">
              <div class="submitted-by-label">
                {{ t('mod.details.submitted_by', { user: 'USER_PLACEHOLDER' }).split('USER_PLACEHOLDER')[0] }}<span class="version-submitter">{{ ver.submittedBy?.globalName || ver.submittedBy?.username || 'Unknown' }}<span v-if="ver.submittedBy?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified version-verified-badge">✓</span></span>{{ t('mod.details.submitted_by', { user: 'USER_PLACEHOLDER' }).split('USER_PLACEHOLDER')[1] }}
              </div>
              <div class="version-actions">
                <UIButton
                  v-if="!ver.isApproved && isEditable"
                  :label="t('mod.details.delete_version')"
                  class="danger-btn version-action-btn"
                  @click="deleteVersion(ver._id)"
                />
                <a
                  class="version-download-link"
                  href="#"
                  @click.prevent="triggerDownloadModal(`/api/mods/${mod.slug}/download?version=${encodeURIComponent(ver.version)}`)"
                >
                  <UIButton
                    :label="t('mod.details.download')"
                    class="version-action-btn"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Versions Pagination -->
        <div v-if="totalVersionPages > 1" class="pagination-container" style="margin-top: 24px; margin-bottom: 0;">
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
      </div>
    </div>

    <!-- Right Column: Sidebar & Actions -->
    <div class="detail-sidebar-pane">
      <!-- Admin Controls Panel (Only Admins) -->
      <div v-if="user?.isAdmin && mod" class="card sidebar-card admin-controls-card desktop-only-card">
        <h3 class="admin-controls-title">
          {{ t('admin.controls') }}
        </h3>
        <div class="admin-controls-buttons">
          <UIButton
            v-if="mod.isApproved"
            :label="mod.isFeatured ? t('admin.unfeature_mod', 'Unfeature Mod') : t('admin.feature_mod', 'Feature Mod')"
            :class="{ 'danger-btn': mod.isFeatured }"
            class="admin-btn"
            @click="adminToggleFeatured"
          />
          <UIButton
            v-if="!mod.isApproved"
            :label="t('admin.approve_mod')"
            class="success-btn admin-btn"
            @click="adminApprove"
          />
          <UIButton
            v-if="!mod.isApproved"
            :label="t('admin.reject_mod')"
            class="danger-btn admin-btn"
            @click="adminReject"
          />
          <UIButton
            v-if="mod.isApproved"
            :label="t('admin.unapprove_mod')"
            class="danger-btn admin-btn"
            @click="adminUnapprove"
          />
          <UIButton
            :label="t('admin.delete_mod')"
            class="danger-btn admin-btn admin-delete-btn"
            @click="adminDelete"
          />
        </div>
      </div>

      <!-- Download / Action Panel -->
      <div class="card sidebar-card action-card desktop-only-card">
        <div class="action-buttons-group">
          <a
            v-if="latestVersion"
            href="#"
            class="download-main-btn"
            @click.prevent="triggerDownloadModal(`/api/mods/${mod.slug}/download`)"
          >
            <svg style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/>
            </svg>
            <span>v{{ latestVersion.version }}</span>
          </a>
          <a
            v-if="latestBetaVersion"
            href="#"
            class="download-beta-btn"
            @click.prevent="triggerDownloadModal(`/api/mods/${mod.slug}/download?beta=true`)"
          >
            <svg style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/>
            </svg>
            <span>v{{ latestBetaVersion.version }} ({{ t('mod.details.beta') }})</span>
          </a>
          <!-- Source Code Link -->
          <a
            v-if="activeSourceUrl && sourceInfo"
            :href="activeSourceUrl"
            target="_blank"
            class="source-code-btn"
          >
            <!-- GitHub Icon -->
            <svg v-if="sourceInfo?.type === 'github'" style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            <!-- GitLab Icon -->
            <svg v-else-if="sourceInfo?.type === 'gitlab'" style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.953 13.072l-1.653-5.09a.908.908 0 0 0-.317-.417.92.92 0 0 0-.52-.108.932.932 0 0 0-.486.205.918.918 0 0 0-.275.428L18.42 15.02H5.58L3.298 7.973a.918.918 0 0 0-.275-.428.932.932 0 0 0-.486-.205.92.92 0 0 0-.52.108.908.908 0 0 0-.317.417L.047 13.072a1.002 1.002 0 0 0 .356 1.107l10.913 7.94a1.144 1.144 0 0 0 1.368 0l10.913-7.94a1.002 1.002 0 0 0 .356-1.107z"/>
            </svg>
            <!-- Bitbucket Icon -->
            <svg v-else-if="sourceInfo?.type === 'bitbucket'" style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.313 3.007a1.246 1.246 0 0 0-1.226 1.01L18.59 20.306a1.07 1.07 0 0 1-1.053.864H6.467a1.07 1.07 0 0 1-1.053-.864L2.915 4.017A1.246 1.246 0 0 0 1.69 3.007c-.99 0-1.636 1.008-1.34 1.95l2.49 14.887a2.535 2.535 0 0 0 2.497 2.05H17.81a2.535 2.535 0 0 0 2.497-2.05l2.49-14.887a1.157 1.157 0 0 0-.156-.837 1.18 1.18 0 0 0-.74-.47L22.313 3z"/>
            </svg>
            <!-- Generic Code Icon -->
            <svg v-else style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            <span>{{ sourceInfo?.name }}</span>
          </a>
          <!-- Community Link -->
          <a
            v-if="activeCommunityUrl && communityInfo"
            :href="activeCommunityUrl"
            target="_blank"
            class="community-btn"
            :class="communityInfo.type"
          >
            <!-- Discord Icon -->
            <svg v-if="communityInfo.type === 'discord'" style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
            </svg>
            <!-- Generic Chat Icon -->
            <svg v-else style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{{ communityInfo.name }}</span>
          </a>
        </div>
        <div v-if="!latestVersion && !latestBetaVersion" class="no-download-state">
          <p>{{ t('mod.details.no_downloads') }}</p>
        </div>

        <div class="stats-sidebar-grid">
          <div class="stat-sidebar-item">
            <span class="stat-label">{{ t('mod.details.downloads_label') }}</span>
            <span class="stat-val">{{ mod.downloads }}</span>
          </div>
          <div class="stat-sidebar-item">
            <span class="stat-label">{{ t('mod.details.creator_label') }}</span>
            <span class="stat-val author-tag">
              <img :src="mod.authorId?.avatar || '/images/default_avatar.png'" alt="Avatar" class="avatar-tag-img" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
              {{ mod.authorId?.globalName || mod.authorId?.username }}
              <span v-if="mod.authorId?.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 2px 4px; font-size: 9px; border-radius: 4px; line-height: 1; margin-left: 2px;">✓</span>
            </span>
          </div>
          <div v-if="mod.collaboratorIds?.length > 0" class="stat-sidebar-item">
            <span class="stat-label">{{ t('mod.details.collabs') }}</span>
            <div class="collab-tag-list">
              <span v-for="c in mod.collaboratorIds" :key="c._id" class="collab-tag">
                <img :src="c.avatar || '/images/default_avatar.png'" alt="Avatar" class="avatar-tag-img" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
                {{ c.globalName || c.username }}
                <span v-if="c.isVerifiedDeveloper" v-tooltip="t('mod.details.verified_source')" class="badge badge-verified" style="padding: 2px 4px; font-size: 9px; border-radius: 4px; line-height: 1; margin-left: 2px;">✓</span>
              </span>
            </div>
          </div>
          <div v-if="loadedDependencies && loadedDependencies.length > 0" class="stat-sidebar-item">
            <span class="stat-label">{{ t('mod.details.dependencies') }}</span>
            <div class="collab-tag-list">
              <NuxtLink v-for="dep in loadedDependencies" :key="dep._id" :to="`/mods/${dep.slug}`" class="collab-tag" style="text-decoration: none;">
                <img :src="dep.logo || '/images/default_avatar.png'" alt="Logo" class="avatar-tag-img" @error="e => { (e.target as HTMLImageElement).src = '/images/default_avatar.png' }">
                {{ dep.name }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit Update (Author / Collab only) -->
      <div v-if="isEditable" class="card sidebar-card update-submission-card">
        <h3>{{ t('update.title') }}</h3>

        <form class="update-form" @submit.prevent="submitUpdate">
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

          <div class="form-group">
            <label for="new-download">{{ t('submit.download_url') }}</label>
            <input
              id="new-download"
              v-model="updateForm.downloadUrl"
              type="text"
              :placeholder="t('submit.download_placeholder')"
              required
            >
            <span class="form-help-text">{{ t('submit.download_url_help') }}</span>
          </div>

          <div class="form-group" style="margin-bottom: 20px; width: 220px;">
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

          <div v-if="formError" class="form-error-msg">
            {{ formError }}
          </div>
          <div v-if="formSuccess" class="form-success-msg">
            {{ formSuccess }}
          </div>

          <UIButton
            :label="submittingUpdate ? t('update.submitting') : t('update.submit')"
            :blocked="submittingUpdate"
            type="submit"
            style="width: 100%;"
          />
        </form>
      </div>
    </div>

    <!-- App Recommendation Modal -->
    <transition name="modal-fade">
      <div v-if="showAppRecommendModal" class="modal-overlay" @click.self="showAppRecommendModal = false">
        <div class="modal-content card app-recommend-card">
          <!-- Close Button -->
          <button class="modal-close-btn" aria-label="Close modal" @click="showAppRecommendModal = false">
            <svg style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <h3 class="modal-recommend-title">
            {{ t('mod.download_modal.title') }}
          </h3>
          <p class="modal-recommend-desc">
            {{ t('mod.download_modal.desc') }}
          </p>

          <!-- Features list -->
          <div class="app-features-list">
            <div class="app-feature-item">
              <span class="feature-icon">⚡</span>
              <span class="feature-text">{{ t('mod.download_modal.feature_1') }}</span>
            </div>
            <div class="app-feature-item">
              <span class="feature-icon">🔄</span>
              <span class="feature-text">{{ t('mod.download_modal.feature_2') }}</span>
            </div>
            <div class="app-feature-item">
              <span class="feature-icon">🧩</span>
              <span class="feature-text">{{ t('mod.download_modal.feature_3') }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="modal-actions-group" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <a :href="installLink" style="text-decoration: none; width: 100%;" @click="showAppRecommendModal = false">
              <UIButton
                label="Install with modlist.org App"
                class="modal-app-btn"
                style="width: 100%;"
              />
            </a>
            <div style="display: flex; gap: 10px; width: 100%; justify-content: space-between;">
              <button class="modal-direct-btn" style="flex: 1; min-height: 40px; padding: 0 10px;" @click="handleDirectDownload">
                {{ t('mod.download_modal.direct_btn') }}
              </button>
              <button class="modal-direct-btn" style="flex: 1; min-height: 40px; padding: 0 10px; border-color: rgba(255, 255, 255, 0.1); background: transparent; color: rgba(255, 255, 255, 0.6);" @click="handleAppDownload">
                Get Desktop App
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>

  <div v-else class="card detail-not-found-state">
    <h2>{{ t('submit.mod_not_found') }}</h2>
    <p>{{ t('mod.details.not_approved_detail') }}</p>
    <NuxtLink to="/">
      <UIButton :label="t('mod.details.back_home')" />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useI18n, navigateTo, useFetch, useSeoMeta } from '#imports'
import { UIButton, UIToggle } from 'overlayer-ui'
import { useAuth } from '../../composables/useAuth'
import { marked } from 'marked'

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

const installLink = computed(() => {
  if (!mod.value) return ''
  const isBeta = pendingDownloadUrl.value.includes('beta=true')
  return `modlist://install/${mod.value.slug}${isBeta ? '?beta=true' : ''}`
})

const triggerDownloadModal = (downloadUrl: string) => {
  pendingDownloadUrl.value = downloadUrl
  showAppRecommendModal.value = true
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
  downloadUrl: '',
  changelog: '',
  gameVersion: '',
  isBeta: false
})
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



const fallbackGradientStyle = computed(() => {
  const name = mod.value?.name || 'M'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const h1 = Math.abs(hash) % 360
  const h2 = (h1 + 40) % 360
  return {
    background: `linear-gradient(135deg, hsl(${h1}, 70%, 50%) 0%, hsl(${h2}, 70%, 40%) 100%)`
  }
})

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
    return marked.parse(desc)
  } catch {
    return desc
  }
})

const renderMarkdown = (text: string) => {
  if (!text) return ''
  try {
    return marked.parse(text)
  } catch {
    return text
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

  try {
    await $fetch(`/api/mods/${slug}/versions`, {
      method: 'POST',
      body: updateForm.value
    })

    formSuccess.value = user.value?.isVerifiedDeveloper || user.value?.isAdmin
      ? 'Update published successfully!'
      : 'Update submitted and is pending administrator approval.'

    // Reset Form
    updateForm.value = {
      version: '',
      downloadUrl: '',
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
.version-download-link {
  text-decoration: none;
}



.detail-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 0;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(145, 154, 255, 0.2);
  border-top-color: #919AFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Detail Grid Layout */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 32px;
  align-items: start;
  margin-top: 10px;
}

.mobile-only-card {
  display: none !important;
}

@media (max-width: 968px) {
  .detail-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: stretch;
  }
  .mobile-only-card.admin-controls-card {
    display: block !important;
  }
  .mobile-only-card.action-card {
    display: flex !important;
  }
  .desktop-only-card {
    display: none !important;
  }
}

.detail-main-pane {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-sidebar-pane {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 20px;
}

/* Main Cards */
.detail-header-card {
  padding: 32px;
}

.mod-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 10px 0;
  color: #ffffff;
}

.mod-summary-text {
  font-size: 16px;
  color: rgba(255,255,255,0.7);
  line-height: 1.6;
  margin: 0;
}

.detail-desc-card {
  padding: 32px;
}

.markdown-body {
  font-size: 15px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.85);
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  color: #ffffff;
  margin-top: 24px;
  margin-bottom: 12px;
  font-weight: 600;
}

.markdown-body :deep(h1) { font-size: 22px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }
.markdown-body :deep(h2) { font-size: 18px; }
.markdown-body :deep(h3) { font-size: 16px; }

.markdown-body :deep(p) {
  margin-bottom: 16px;
}

.markdown-body :deep(ul) {
  list-style-type: disc !important;
  padding-left: 20px;
  margin-bottom: 16px;
}

.markdown-body :deep(ol) {
  list-style-type: decimal !important;
  padding-left: 20px;
  margin-bottom: 16px;
}

.markdown-body :deep(li) {
  display: list-item !important;
}

.markdown-body :deep(code) {
  font-family: monospace;
  background-color: rgba(0,0,0,0.3);
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 14px;
  color: #919AFF;
}

.markdown-body :deep(pre) {
  background-color: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 16px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.markdown-body :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.preview-toggle-custom :deep(.toggle-label) {
  color: #f0ad4e !important;
  font-weight: 600 !important;
}

.preview-toggle-custom {
  width: 170px;
}

/* Version History */
.detail-versions-card {
  padding: 32px;
}

.versions-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 16px;
}

.version-row {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 20px;
  transition: border-color 0.2s;
}

.version-row:hover {
  border-color: rgba(145, 154, 255, 0.15);
}

.pending-version {
  border-color: rgba(226, 103, 109, 0.2);
  background-color: rgba(226, 103, 109, 0.03);
}

.version-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.version-number {
  font-size: 16px;
  font-weight: 700;
  color: #919AFF;
}

.version-date {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
}

.version-changelog {
  font-size: 14px;
  color: rgba(255,255,255,0.7);
  line-height: 1.6;
  margin-bottom: 14px;
}

.version-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 12px;
}

.submitted-by-label {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
}

/* Sidebar styling */
.sidebar-card {
  padding: 24px;
}

.action-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.action-buttons-group {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
}

.download-main-btn {
  flex: 1 1 100%;
  width: 100%;
  height: 44px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px;
  font-size: 15px !important;
  font-weight: 600 !important;
  background-color: #6C78FF !important;
  border: none !important;
  color: #ffffff !important;
  border-radius: 10px !important;
  cursor: pointer !important;
  transition: background-color 0.2s;
}

.download-main-btn:hover {
  background-color: #838EFF !important;
}

.download-beta-btn {
  flex: 1 1 100%;
  width: 100%;
  height: 44px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px;
  font-size: 15px !important;
  font-weight: 600 !important;
  background-color: rgba(240, 173, 78, 0.12) !important;
  color: #f0ad4e !important;
  border: 1px solid rgba(240, 173, 78, 0.25) !important;
  border-radius: 10px !important;
  cursor: pointer !important;
  transition: background-color 0.2s;
}

.download-beta-btn:hover {
  background-color: rgba(240, 173, 78, 0.22) !important;
}

.no-download-state {
  text-align: center;
  padding: 12px;
  color: rgba(255,255,255,0.4);
}

.stats-sidebar-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 16px;
}

.stat-sidebar-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
}

.stat-val {
  font-size: 14px;
  font-weight: 500;
}

.author-tag {
  display: flex;
  align-items: center;
  gap: 6px;
}

.collab-tag-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.collab-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  background-color: rgba(255,255,255,0.03);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.05);
}

.avatar-tag-img {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

/* Update release form */
.update-submission-card h3 {
  margin-bottom: 20px;
}

.update-form {
  display: flex;
  flex-direction: column;
}

.form-help-text {
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  margin-top: 4px;
}

.form-error-msg {
  background-color: rgba(226, 103, 109, 0.1);
  border: 1px solid rgba(226, 103, 109, 0.2);
  color: #E2676D;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
}

.form-success-msg {
  background-color: rgba(95, 195, 145, 0.1);
  border: 1px solid rgba(95, 195, 145, 0.2);
  color: #5FC391;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
}

/* Not found */
.detail-not-found-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 24px;
  text-align: center;
  max-width: 500px;
  margin: 40px auto;
}

/* Header Logo Styles */
.header-logo-container {
  width: 96px;
  height: 96px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.header-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-logo-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-logo-fallback span {
  font-size: 40px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.source-code-btn {
  flex: 1 1 120px;
  width: auto;
  height: 38px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px;
  background-color: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  text-decoration: none !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  border-radius: 8px !important;
  box-sizing: border-box !important;
  transition: background-color 0.2s, border-color 0.2s;
}

.source-code-btn:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(145, 154, 255, 0.3) !important;
}

.community-btn {
  flex: 1 1 120px;
  width: auto;
  height: 38px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px;
  background-color: rgba(88, 101, 242, 0.12) !important;
  border: 1px solid rgba(88, 101, 242, 0.25) !important;
  color: #5865f2 !important;
  text-decoration: none !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  border-radius: 8px !important;
  box-sizing: border-box !important;
  transition: background-color 0.2s, border-color 0.2s;
}

.community-btn:hover {
  background-color: rgba(88, 101, 242, 0.22) !important;
}

.community-btn.community {
  background-color: rgba(95, 195, 145, 0.12) !important;
  border: 1px solid rgba(95, 195, 145, 0.25) !important;
  color: #5fc391 !important;
}

.community-btn.community:hover {
  background-color: rgba(95, 195, 145, 0.22) !important;
}

/* Header layout classes */
.header-card-body {
  display: flex;
  gap: 24px;
  align-items: center;
  flex-wrap: wrap;
}

.header-info-container {
  flex: 1;
  min-width: 250px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.header-badges {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.header-edit-link {
  text-decoration: none;
}

/* Version layout classes */
.version-meta-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.version-pending-badge {
  font-size: 9px !important;
  padding: 1px 6px !important;
}

.version-verified-badge {
  padding: 1px 3px !important;
  font-size: 8px !important;
  border-radius: 3px !important;
  line-height: 1 !important;
  margin-right: 4px !important;
}

.version-submitter {
  color: rgba(255, 255, 255, 0.7);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.version-action-btn {
  padding: 6px 14px !important;
  font-size: 13px !important;
}

.version-rejection-reason {
  margin-bottom: 12px;
  padding: 10px 14px;
  background: rgba(226, 103, 109, 0.08);
  border: 1px solid rgba(226, 103, 109, 0.2);
  border-radius: 8px;
  font-size: 13px;
  color: #E2676D;
}

/* Admin controls sidebar overrides */
.admin-controls-card {
  border-color: rgba(226, 103, 109, 0.3) !important;
  background-color: rgba(226, 103, 109, 0.02) !important;
  margin-bottom: 8px;
}

.admin-controls-title {
  color: #E2676D !important;
  margin-bottom: 16px !important;
  border-bottom: 1px solid rgba(226, 103, 109, 0.15) !important;
  padding-bottom: 8px !important;
}

.admin-controls-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-btn {
  width: 100% !important;
}

.admin-delete-btn {
  background-color: #7c2227 !important;
}


@media (max-width: 768px) {
  .header-card-body {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    width: 100% !important;
  }
  
  .header-logo-container {
    width: 80px;
    height: 80px;
    border-radius: 16px;
  }
  
  .header-logo-fallback span {
    font-size: 32px;
  }
  
  .header-info-container {
    width: 100%;
    min-width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .mod-title {
    font-size: 24px;
  }
  
  .header-actions {
    width: 100% !important;
    display: block !important;
  }
  
  .header-edit-link {
    width: 100% !important;
    display: block !important;
  }
  
  .header-edit-button {
    width: 100% !important;
    display: block !important;
  }
  
  .header-edit-link :deep(.overlayer-btn) {
    width: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 44px !important;
  }
}

@media (max-width: 600px) {
  .version-row-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .version-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .version-actions {
    width: 100%;
  }
  
  .version-actions :deep(.overlayer-btn) {
    flex: 1;
    width: 100% !important;
    text-align: center;
  }
}

/* Prevent markdown images from overflowing on mobile */
.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.badge-featured {
  background-color: rgba(255, 215, 0, 0.15) !important;
  color: #FFD700 !important;
  border: 1px solid rgba(255, 215, 0, 0.35) !important;
  font-weight: 700;
}

/* App Recommendation Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(10, 9, 14, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 24px;
}

.app-recommend-card {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: rgba(30, 29, 38, 0.75) !important;
  border: 1px solid rgba(145, 154, 255, 0.15) !important;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 
              0 0 40px rgba(145, 154, 255, 0.1) !important;
  border-radius: 24px !important;
  padding: 40px 32px 32px 32px !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  backdrop-filter: blur(20px) !important;
}

.modal-close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.modal-header-icon-container {
  margin-bottom: 24px;
}

.app-logo-glow-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(145, 154, 255, 0.15), rgba(108, 120, 255, 0.05));
  border: 1px solid rgba(145, 154, 255, 0.25);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(145, 154, 255, 0.15);
}

.app-logo-glow-wrap::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  background: radial-gradient(circle, var(--accent-purple-glow) 0%, transparent 70%);
  z-index: -1;
  opacity: 0.8;
}

.app-logo-svg {
  width: 44px;
  height: 44px;
}

.modal-recommend-title {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff !important;
  margin: 0 0 12px 0 !important;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.modal-recommend-desc {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted);
  margin: 0 0 28px 0;
  padding: 0 8px;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.app-features-list {
  width: 100%;
  background-color: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
}

.app-feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.feature-icon {
  font-size: 16px;
}

.feature-text {
  font-size: 13.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.modal-actions-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-app-btn {
  width: 100% !important;
  background-color: var(--accent-blue) !important;
  height: 46px !important;
  border-radius: 12px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 20px rgba(108, 120, 255, 0.25) !important;
  transition: all 0.2s ease !important;
}

.modal-app-btn:hover {
  background-color: var(--accent-purple) !important;
  box-shadow: 0 6px 24px rgba(145, 154, 255, 0.35) !important;
  transform: translateY(-1px);
}

.modal-direct-btn {
  width: 100%;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 10px;
  text-decoration: underline;
  text-underline-offset: 4px;
  transition: color 0.2s ease;
}

.modal-direct-btn:hover {
  color: var(--text-primary);
}

/* Modal Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .app-recommend-card,
.modal-fade-leave-active .app-recommend-card {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-enter-from .app-recommend-card {
  transform: scale(0.9) translateY(10px);
}

.modal-fade-leave-to .app-recommend-card {
  transform: scale(0.95) translateY(5px);
}

@media (max-width: 480px) {
  .app-recommend-card {
    padding: 32px 20px 24px 20px !important;
  }
  
  .modal-recommend-title {
    font-size: 19px;
  }
  
  .app-features-list {
    padding: 12px 14px;
  }
  
  .feature-text {
    font-size: 12.5px;
  }
}
</style>
