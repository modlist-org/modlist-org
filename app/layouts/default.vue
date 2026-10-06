<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="container site-header-inner">
        <NuxtLink to="/" class="brand" @click="mobileOpen = false">
          <BrandMark />
          <span class="brand-name">modlist.org</span>
        </NuxtLink>

        <nav class="site-nav">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="site-nav-link"
            active-class="active"
            :exact-active-class="link.to === '/' ? 'active' : undefined"
          >
            {{ link.label }}
            <span v-if="link.count" class="nav-count">{{ link.count }}</span>
          </NuxtLink>
          <a href="https://github.com/modlist-org/modlist_org_app/releases/latest" target="_blank" rel="noopener" class="site-nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.62 2.48A2 2 0 0 0 4.56 21h14.88a2 2 0 0 0 1.94-1.52L22 17" /></svg>
            {{ t('nav.download') }}
          </a>
          <a href="https://discord.modlist.org" target="_blank" rel="noopener" class="site-nav-link">
            <svg viewBox="0 0 127.14 96.36" fill="currentColor"><path :d="discordPath" /></svg>
            Discord
          </a>
        </nav>

        <div class="header-actions">
          <div class="lang-dropdown">
            <UIDropdown
              v-model="state.language"
              default-value="en-US"
              :values="languages.map((l) => l.value)"
              :display="getLanguageName"
              disable-reset
            />
          </div>

          <div v-if="loading" class="skeleton" style="width: 120px; height: 36px; border-radius: 999px;" />
          <div v-else-if="user" ref="userMenuRef" class="user-menu">
            <button type="button" class="user-menu-trigger" :aria-expanded="userMenuOpen" @click="userMenuOpen = !userMenuOpen">
              <img :src="user.avatar || '/images/default_avatar.png'" alt="" @error="onAvatarError">
              <span class="user-menu-name">{{ user.globalName || user.username }}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            <transition name="fade">
              <div v-if="userMenuOpen" class="user-menu-panel" @click="userMenuOpen = false">
                <div class="user-menu-header">
                  <strong>{{ user.globalName || user.username }}</strong>
                  <div style="display: flex; gap: 4px;">
                    <span v-if="user.isAdmin" class="badge badge-admin">{{ t('nav.badge_admin') }}</span>
                    <span v-if="user.isVerifiedDeveloper" class="badge badge-verified">✓ {{ t('mod.details.verified_source') }}</span>
                  </div>
                </div>
                <NuxtLink to="/submit" class="user-menu-item">{{ t('nav.submit') }}</NuxtLink>
                <NuxtLink to="/pending" class="user-menu-item">
                  {{ t('nav.pending_mods') }}
                  <span v-if="invitationsCount > 0" class="nav-count" style="margin-left: auto;">{{ invitationsCount }}</span>
                </NuxtLink>
                <NuxtLink to="/profile" class="user-menu-item">{{ t('nav.profile') }}</NuxtLink>
                <NuxtLink v-if="user.isAdmin" to="/admin" class="user-menu-item">{{ t('nav.admin') }}</NuxtLink>
                <button type="button" class="user-menu-item danger" @click="logout">{{ t('nav.logout') }}</button>
              </div>
            </transition>
          </div>
          <a v-else href="/api/auth/login" class="btn btn-discord btn-sm">
            <svg viewBox="0 0 127.14 96.36" fill="currentColor"><path :d="discordPath" /></svg>
            {{ t('nav.login') }}
          </a>

          <button type="button" class="btn btn-ghost btn-icon menu-toggle" :aria-label="t('nav.menu')" @click="mobileOpen = !mobileOpen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path v-if="!mobileOpen" d="M4 7h16M4 12h16M4 17h16" /><path v-else d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      </div>
      <nav v-if="mobileOpen" class="mobile-nav" @click="mobileOpen = false">
        <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to" class="site-nav-link">
          {{ link.label }}
          <span v-if="link.count" class="nav-count">{{ link.count }}</span>
        </NuxtLink>
        <a href="https://github.com/modlist-org/modlist_org_app/releases/latest" target="_blank" rel="noopener" class="site-nav-link">{{ t('nav.download') }}</a>
        <a href="https://discord.modlist.org" target="_blank" rel="noopener" class="site-nav-link">Discord</a>
      </nav>
    </header>

    <main class="app-main">
      <slot />
    </main>

    <footer class="site-footer">
      <div class="container site-footer-inner">
        <div style="display: flex; align-items: center; gap: 10px;">
          <BrandMark style="width: 18px; height: 18px; opacity: 0.6;" />
          <span>&copy; {{ new Date().getFullYear() }} modlist.org</span>
        </div>
        <div class="site-footer-links">
          <NuxtLink to="/privacy">{{ t('nav.privacy') }}</NuxtLink>
          <NuxtLink to="/terms">{{ t('nav.terms') }}</NuxtLink>
          <NuxtLink to="/contact">{{ t('nav.contact') }}</NuxtLink>
          <a href="https://github.com/modlist-org" target="_blank" rel="noopener">GitHub</a>
        </div>
      </div>
    </footer>

    <transition name="tooltip-fade">
      <div
        v-if="tooltipVisible"
        ref="tooltipRef"
        class="global-tooltip"
        :style="{
          left: `${adjustedX}px`,
          top: `${adjustedY}px`
        }"
      >
        {{ tooltipText }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import { useI18n } from '#imports'
import {
  UIDropdown,
  useOverlayerState,
  setI18nLocaleRef
} from 'overlayer-ui'
import { useAuth } from '../composables/useAuth'

const { t, locale } = useI18n()

const {
  state,
  tooltipText,
  tooltipVisible,
  tooltipX,
  tooltipY
} = useOverlayerState()

// Sync overlayer language with standard Nuxt i18n
setI18nLocaleRef(locale)

// Two-way synchronization between overlayer state language and Nuxt i18n locale
watch(() => state.language, (newLang) => {
  if (newLang && locale.value !== newLang) {
    (locale as { value: string }).value = newLang
  }
})

watch(locale, (newLocale) => {
  if (newLocale && state.language !== newLocale) {
    state.language = newLocale
  }
}, { immediate: true })

const { user, loading, fetchUser, logout, invitationsCount } = useAuth()

const languages = [
  { value: 'en-US', label: 'English' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'zh-CN', label: '简体中文' }
]

const getLanguageName = (value: string) => languages.find((l) => l.value === value)?.label ?? value

const discordPath = 'M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.53-2a75.58,75.58,0,0,0,73,0c.81.71,1.65,1.4,2.53,2a68.32,68.32,0,0,1-10.5,5,77.63,77.63,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,48.24,123.6,25.41,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z'

const navLinks = computed(() => {
  const links: Array<{ to: string; label: string; count?: number }> = [{ to: '/', label: t('nav.home') }]
  if (user.value) {
    links.push({ to: '/submit', label: t('nav.submit') })
    links.push({ to: '/pending', label: t('nav.pending_mods'), count: invitationsCount.value || undefined })
    if (user.value.isAdmin) links.push({ to: '/admin', label: t('nav.admin') })
  }
  return links
})

const mobileOpen = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

const onAvatarError = (e: Event) => {
  (e.target as HTMLImageElement).src = '/images/default_avatar.png'
}

const onDocumentClick = (e: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false
  }
}

// Tooltip collision bounds checks
const tooltipRef = ref<HTMLElement | null>(null)
const adjustedX = ref(-9999)
const adjustedY = ref(-9999)

watch([tooltipX, tooltipY, tooltipVisible, tooltipText], () => {
  if (!tooltipVisible.value) {
    adjustedX.value = -9999
    adjustedY.value = -9999
    return
  }

  nextTick(() => {
    if (!tooltipRef.value) return
    const el = tooltipRef.value
    const rect = el.getBoundingClientRect()
    
    const width = rect.width
    const height = rect.height
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let x = tooltipX.value
    let y = tooltipY.value
    
    // Check right boundary (keep 16px safety padding)
    if (x + width > viewportWidth - 16) {
      x = viewportWidth - width - 16
    }
    // Check left boundary
    if (x < 16) {
      x = 16
    }
    
    // Check bottom boundary (keep 16px safety padding)
    if (y + height > viewportHeight - 16) {
      y = viewportHeight - height - 16
    }
    // Check top boundary
    if (y < 16) {
      y = 16
    }
    
    adjustedX.value = x
    adjustedY.value = y
  })
}, { immediate: true })

onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  await fetchUser()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>
