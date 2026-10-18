<template>
  <div class="orgs">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ t('nav.organizations') }}</h1>
        <p class="page-subtitle">{{ t('org.page_subtitle') }}</p>
      </div>
    </header>

    <section class="card orgs-section">
      <h2 class="orgs-title">{{ t('org.all') }} <span class="section-count">{{ allOrgs.length }}</span></h2>
      <p v-if="allOrgs.length === 0" class="form-help-text">{{ t('org.empty_directory') }}</p>
      <ul v-else class="orgs-list">
        <li v-for="o in allOrgs" :key="o._id">
          <NuxtLink :to="`/orgs/${o.slug}`" class="orgs-item">
            <OrgAvatar :name="o.name" :logo="o.logo" :size="44" />
            <span class="orgs-item-text">
              <strong>{{ o.name }}</strong>
              <span>{{ o.description || `@${o.slug}` }}</span>
            </span>
            <span v-if="myRoles[o._id]" class="badge badge-category">{{ t(`org.role_${myRoles[o._id]}`) }}</span>
            <span class="orgs-counts">{{ t('org.counts', { mods: o.modCount, members: o.memberCount }) }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <template v-if="user">

      <section class="card orgs-section">
        <h2 class="orgs-title">{{ t('org.new') }}</h2>
        <form class="orgs-create" @submit.prevent="createOrg">
          <div class="form-group">
            <label for="org-new-name">{{ t('org.name') }}</label>
            <input id="org-new-name" v-model="newOrg.name" type="text" maxlength="60" required>
          </div>
          <div class="form-group">
            <label for="org-new-slug">{{ t('org.slug') }}</label>
            <input id="org-new-slug" v-model="newOrg.slug" type="text" maxlength="40" pattern="[a-zA-Z0-9_\-]+">
          </div>
          <div class="form-group">
            <label for="org-new-desc">{{ t('org.description') }}</label>
            <textarea id="org-new-desc" v-model="newOrg.description" rows="3" maxlength="2000" />
          </div>
          <p v-if="orgError" class="callout callout-danger callout-sm">{{ orgError }}</p>
          <button type="submit" class="btn btn-primary" :disabled="creating">{{ t('org.create') }}</button>
        </form>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFetch, useI18n, navigateTo, useSeoMeta } from '#imports'
import { useAuth } from '../../composables/useAuth'

const { t } = useI18n()
const { user } = useAuth()

const { data: directory } = await useFetch<{ organizations: { _id: string; name: string; slug: string; description: string; logo: string; modCount: number; memberCount: number }[] }>('/api/orgs')
const allOrgs = computed(() => directory.value?.organizations ?? [])
useSeoMeta({ title: () => t('nav.organizations') })

const orgs = ref<{ _id: string; role: 'owner' | 'member' }[]>([])
const myRoles = computed(() => Object.fromEntries(orgs.value.map((o) => [o._id, o.role])))
const newOrg = ref({ name: '', slug: '', description: '' })
const creating = ref(false)
const orgError = ref('')

watch(user, async (u) => {
  if (!u) return
  try {
    orgs.value = (await $fetch<{ organizations: typeof orgs.value }>('/api/orgs/mine')).organizations
  } catch (e) {
    console.error('Failed to load organizations:', e)
  }
}, { immediate: true })

const createOrg = async () => {
  creating.value = true
  orgError.value = ''
  try {
    const res = await $fetch<{ organization: { slug: string } }>('/api/orgs', { method: 'POST', body: newOrg.value })
    await navigateTo(`/orgs/${res.organization.slug}`)
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    orgError.value = e.data?.statusMessage || t('org.failed')
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.orgs {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.orgs-counts {
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-size: 12px;
}

.orgs-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.orgs-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
}

.orgs-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.orgs-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: var(--radius-sm);
  color: inherit;
  text-decoration: none;
}

.orgs-item:hover {
  background: var(--surface-2);
}

.orgs-item-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.orgs-item-text span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
  font-size: 13px;
}

.orgs-create .form-group:last-of-type {
  margin-bottom: 12px;
}
</style>
