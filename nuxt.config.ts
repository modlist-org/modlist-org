// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },

  css: [
    'overlayer-ui/dist/overlayer-ui.css',
    '~/assets/css/main.css'
  ],

  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      nodeCompat: true
    }
  },

  modules: [
    '@nuxt/eslint',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/eslint-module',
    '@nuxtjs/i18n'
  ],

  i18n: {
    restructureDir: 'app',
    vueI18n: './i18n.config.ts',
    locales: ['en-US', 'ko-KR', 'zh-CN'],
    defaultLocale: 'en-US',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root'
    }
  },

  // Values are injected at runtime from Worker secrets/vars named NUXT_<KEY> (e.g. NUXT_JWT_SECRET)
  runtimeConfig: {
    discordClientId: '',
    discordClientSecret: '',
    discordRedirectUri: '',
    jwtSecret: '',
    adminDiscordIds: '',
    discordWebhookUrl: '',
    discordModPingRoleIdAdofai: '',
    discordModPingRoleIdRhythmDoctor: '',
    discordModPingRoleIdDancingLine: '',
    discordModAllRoleIdAdofai: '',
    discordModAllRoleIdRhythmDoctor: '',
    discordModAllRoleIdDancingLine: '',
    siteUrl: 'http://localhost:3000',
    public: {}
  }
})
