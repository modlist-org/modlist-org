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

  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI,
    discordClientId: process.env.DISCORD_CLIENT_ID,
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
    discordRedirectUri: process.env.DISCORD_REDIRECT_URI,
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-replace-in-production',
    adminDiscordIds: process.env.ADMIN_DISCORD_IDS || '',
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    discordModPingRoleIdAdofai: process.env.DISCORD_MOD_PING_ROLE_ID_ADOFAI || '',
    discordModPingRoleIdRhythmDoctor: process.env.DISCORD_MOD_PING_ROLE_ID_RHYTHM_DOCTOR || '',
    discordModPingRoleIdDancingLine: process.env.DISCORD_MOD_PING_ROLE_ID_DANCING_LINE || '',
    discordModAllRoleIdAdofai: process.env.DISCORD_MOD_ALL_ROLE_ID_ADOFAI || '',
    discordModAllRoleIdRhythmDoctor: process.env.DISCORD_MOD_ALL_ROLE_ID_RHYTHM_DOCTOR || '',
    discordModAllRoleIdDancingLine: process.env.DISCORD_MOD_ALL_ROLE_ID_DANCING_LINE || '',
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    discordGuildId: process.env.DISCORD_GUILD_ID || '',
    discordPremiumRoleId: process.env.DISCORD_PREMIUM_ROLE_ID || '',
    r2AccountId: process.env.R2_ACCOUNT_ID || '',
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    r2BucketName: process.env.R2_BUCKET_NAME || '',
    public: {}
  }
})