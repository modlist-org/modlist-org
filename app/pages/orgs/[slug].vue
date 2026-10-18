<template>
  <div class="org-page">
    <div v-if="pending" class="org-loading"><div class="spinner" /></div>

    <div v-else-if="!data" class="card empty-state">
      <h2>{{ t('org.not_found') }}</h2>
    </div>

    <template v-else>
      <header class="card org-head">
        <span class="org-avatar" :style="gradient(org.name)">{{ org.name.charAt(0).toUpperCase() }}</span>
        <div class="org-head-text">
          <h1 class="org-name">{{ org.name }}</h1>
          <p class="org-handle">@{{ org.slug }}</p>
          <p v-if="org.description" class="org-description">{{ org.description }}</p>
        </div>
        <div class="org-head-actions">
          <template v-if="data.isInvited">
            <button type="button" class="btn btn-ghost btn-sm" @click="respond('reject')">{{ t('pending.reject') }}</button>
            <button type="button" class="btn btn-primary btn-sm" @click="respond('accept')">{{ t('pending.accept') }}</button>
          </template>
          <button v-else-if="data.myRole" type="button" class="btn btn-ghost btn-sm" @click="respond('leave')">{{ t('org.leave') }}</button>
        </div>
      </header>

      <section class="card org-section">
        <h2 class="org-section-title">{{ t('org.mods') }} <span class="section-count">{{ data.mods.length }}</span></h2>
        <p v-if="data.mods.length === 0" class="form-help-text">{{ t('org.no_mods') }}</p>
        <ul class="org-mods">
          <li v-for="m in data.mods" :key="m._id">
            <NuxtLink :to="`/mods/${m.slug}`" class="org-mod">
              <img v-if="m.logo" :src="m.logo" alt="" class="org-mod-logo">
              <span v-else class="org-mod-logo" :style="gradient(m.name)">{{ m.name.charAt(0).toUpperCase() }}</span>
              <span class="org-mod-text">
                <strong>{{ m.name }}</strong>
                <span>{{ m.summary }}</span>
              </span>
              <span v-if="!m.isApproved" class="badge badge-pending">{{ t('mod.details.pending_approval') }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section class="card org-section">
        <h2 class="org-section-title">{{ t('org.members') }} <span class="section-count">{{ acceptedCount }}</span></h2>
        <ul class="org-members">
          <li v-for="m in members" :key="m.user._id" class="org-member">
            <img :src="m.user.avatar || '/images/default_avatar.png'" alt="">
            <span class="org-member-name">{{ m.user.globalName || m.user.username }}</span>
            <span v-if="m.status === 'pending'" class="badge badge-pending">{{ t('org.invited') }}</span>
            <select v-if="isOwner" v-model="m.role" :aria-label="t('org.role')">
              <option value="owner">{{ t('org.role_owner') }}</option>
              <option value="member">{{ t('org.role_member') }}</option>
            </select>
            <span v-else class="badge badge-category">{{ t(`org.role_${m.role}`) }}</span>
            <button v-if="isOwner" type="button" class="btn btn-ghost btn-sm" @click="removeMember(m.user._id)">{{ t('org.remove') }}</button>
          </li>
        </ul>
        <template v-if="isOwner">
          <UserPicker :exclude="members.map((m) => m.user._id)" :placeholder="t('org.invite')" @pick="addMember" />
        </template>
      </section>

      <section v-if="isOwner" class="card org-section">
        <h2 class="org-section-title">{{ t('org.settings') }}</h2>
        <div class="form-group">
          <label for="org-name">{{ t('org.name') }}</label>
          <input id="org-name" v-model="settings.name" type="text" maxlength="60">
        </div>
        <div class="form-group">
          <label for="org-desc">{{ t('org.description') }}</label>
          <textarea id="org-desc" v-model="settings.description" rows="3" maxlength="2000" />
        </div>
        <p v-if="message" class="form-help-text">{{ message }}</p>
        <div class="org-settings-actions">
          <button type="button" class="btn btn-danger btn-sm" @click="deleteOrg">{{ t('org.delete') }}</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="save">{{ t('submit.save_changes') }}</button>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useFetch, useI18n, useSeoMeta, navigateTo } from '#imports'
import type { PickedUser } from '../../components/UserPicker.vue'

interface Member {
  user: PickedUser
  role: 'owner' | 'member'
  status: 'accepted' | 'pending'
}

interface OrgResponse {
  organization: { _id: string; name: string; slug: string; description: string; members: Member[] }
  mods: { _id: string; name: string; slug: string; summary: string; logo?: string; isApproved: boolean }[]
  myRole: 'owner' | 'member' | null
  isInvited: boolean
}

const route = useRoute()
const slug = route.params.slug as string
const { t } = useI18n()

// Plain string: the typed route for /api/orgs/${slug} collides with /api/orgs/mine (GET only)
const orgUrl: string = `/api/orgs/${slug}`
const { data, pending, refresh } = await useFetch<OrgResponse>(orgUrl)
const org = computed(() => data.value!.organization)
const isOwner = computed(() => data.value?.myRole === 'owner')

// Editable copies; saved together with the settings
const members = ref<Member[]>([])
const settings = ref({ name: '', description: '' })
watch(data, (d) => {
  if (!d) return
  members.value = d.organization.members.map((m) => ({ ...m }))
  settings.value = { name: d.organization.name, description: d.organization.description }
}, { immediate: true })
const acceptedCount = computed(() => members.value.filter((m) => m.status === 'accepted').length)

useSeoMeta({ title: () => data.value?.organization.name || 'Organization' })

const saving = ref(false)
const message = ref('')

const errorText = (err: unknown) => (err as { data?: { statusMessage?: string } }).data?.statusMessage || t('org.failed')

const save = async () => {
  saving.value = true
  message.value = ''
  try {
    await $fetch(orgUrl, {
      method: 'PUT',
      body: { ...settings.value, members: members.value.map((m) => ({ userId: m.user._id, role: m.role })) }
    })
    message.value = t('org.saved')
    await refresh()
  } catch (err) {
    message.value = errorText(err)
  } finally {
    saving.value = false
  }
}

const addMember = (u: PickedUser) => {
  members.value.push({ user: u, role: 'member', status: 'pending' })
  message.value = t('org.unsaved')
}

const removeMember = (id: string) => {
  members.value = members.value.filter((m) => m.user._id !== id)
  message.value = t('org.unsaved')
}

const respond = async (action: 'accept' | 'reject' | 'leave') => {
  if (action === 'leave' && !confirm(t('org.leave_confirm'))) return
  try {
    await $fetch(`/api/orgs/${slug}/respond`, { method: 'POST', body: { action } })
    await refresh()
  } catch (err) {
    alert(errorText(err))
  }
}

const deleteOrg = async () => {
  if (!confirm(t('org.delete_confirm', { name: org.value.name }))) return
  try {
    await $fetch(orgUrl, { method: 'DELETE' })
    await navigateTo('/profile')
  } catch (err) {
    alert(errorText(err))
  }
}

const gradient = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const h1 = Math.abs(hash) % 360
  return { background: `linear-gradient(135deg, hsl(${h1}, 70%, 50%) 0%, hsl(${(h1 + 40) % 360}, 70%, 40%) 100%)` }
}
</script>

<style scoped>
.org-page {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.org-loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.org-head {
  display: flex;
  align-items: center;
  gap: 20px;
}

.org-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 16px;
  color: #fff;
  font-size: 28px;
  font-weight: 800;
}

.org-head-text {
  flex: 1;
  min-width: 0;
}

.org-name {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.org-handle {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.org-description {
  margin: 8px 0 0;
  white-space: pre-wrap;
}

.org-head-actions {
  display: flex;
  gap: 8px;
}

.org-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.org-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
}

.org-mods,
.org-members {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.org-mod {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: var(--radius-sm);
  color: inherit;
  text-decoration: none;
}

.org-mod:hover {
  background: var(--surface-2);
}

.org-mod-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  object-fit: cover;
  color: #fff;
  font-weight: 700;
}

.org-mod-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.org-mod-text span {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-member {
  display: flex;
  align-items: center;
  gap: 10px;
}

.org-member img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.org-member-name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.org-member select {
  width: auto;
}

.org-settings-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

@media (max-width: 560px) {
  .org-head {
    flex-direction: column;
    text-align: center;
  }

  .org-member {
    flex-wrap: wrap;
  }
}
</style>
