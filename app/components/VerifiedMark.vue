<template>
  <svg class="verified-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" role="img" :aria-label="t('mod.details.verified_source')"><path d="m5 12 5 5 9-10" /></svg>
</template>

<script setup lang="ts">
import { useI18n } from '#imports'

const { t } = useI18n()
</script>

<style>
.verified-mark {
  display: inline-block;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  vertical-align: -2px;
  color: var(--success);
}
</style>
