import koKR from './locales/ko-KR.json'
import enUS from './locales/en-US.json'

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en-US',
  messages: {
    'ko-KR': koKR,
    'en-US': enUS
  }
}))
