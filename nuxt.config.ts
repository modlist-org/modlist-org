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

  modules: [
    '@nuxt/eslint',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-adsense',
    '@nuxtjs/eslint-module',
    '@nuxtjs/i18n'
  ],

  i18n: {
    restructureDir: 'app',
    vueI18n: './i18n.config.ts',
    locales: [
      { code: 'en-US', file: 'en-US.json' },
      { code: 'ko-KR', file: 'ko-KR.json' }
    ],
    langDir: 'locales',
    defaultLocale: 'en-US',
    strategy: 'no_prefix'
  },

  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI,
    discordClientId: process.env.DISCORD_CLIENT_ID,
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
    discordRedirectUri: process.env.DISCORD_REDIRECT_URI,
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-replace-in-production',
    adminDiscordIds: process.env.ADMIN_DISCORD_IDS || ''
  }
})