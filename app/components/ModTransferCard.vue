<template>
  <section v-if="canTransfer" class="card transfer-card">
    <h2 class="transfer-title">{{ t('transfer.title') }}</h2>
    <p class="form-help-text">{{ t('transfer.help') }}</p>

    <div class="transfer-row">
      <label for="transfer-org">{{ t('transfer.organization') }}</label>
      <div class="transfer-inline">
        <select id="transfer-org" v-model="orgChoice">
          <option value="">{{ t('transfer.personal') }}</option>
          <option v-if="mod.organization && !myOrgs.some((o) => o._id === mod.organization!._id)" :value="mod.organization._id">{{ mod.organization.name }}</option>
          <option v-for="o in myOrgs" :key="o._id" :value="o._id">{{ o.name }}</option>
        </select>
        <button type="button" class="btn btn-secondary btn-sm" :disabled="busy || orgChoice === (mod.organization?._id || '')" @click="moveToOrg">
          {{ t('transfer.move') }}
        </button>
      </div>
    </div>

    <div class="transfer-row">
      <span class="field-label">{{ t('transfer.to_user') }}</span>
      <div v-if="mod.transferToUserId" class="callout callout-warning callout-sm transfer-pending">
        <span>{{ t('transfer.pending') }}</span>
        <button type="button" class="btn btn-ghost btn-sm" :disabled="busy" @click="send({ cancel: true })">{{ t('transfer.cancel') }}</button>
      </div>
      <UserPicker v-else :exclude="[mod.authorId?._id || '']" :placeholder="t('transfer.search_user')" @pick="transferToUser" />
    </div>

    <p v-if="message" class="form-help-text">{{ message }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from '#imports'
import { useAuth } from '../composables/useAuth'
import type { PickedUser } from './UserPicker.vue'

const props = defineProps<{
  mod: {
    slug: string
    authorId?: { _id: string } | null
    organization?: { _id: string; name: string } | null
    transferToUserId?: string | null
  }
}>()
const emit = defineEmits<{ (event: 'changed'): void }>()
const { t } = useI18n()
const { user } = useAuth()

const myOrgs = ref<{ _id: string; name: string; role: 'owner' | 'member' }[]>([])
const orgChoice = ref(props.mod.organization?._id || '')
const busy = ref(false)
const message = ref('')
watch(() => props.mod.organization?._id, (id) => { orgChoice.value = id || '' })

// Same rule as the API: author, admin, or owner of the organization that owns the mod
const canTransfer = computed(() => !!user.value && (
  user.value.isAdmin ||
  props.mod.authorId?._id === user.value.id ||
  myOrgs.value.some((o) => o._id === props.mod.organization?._id && o.role === 'owner')
))

onMounted(async () => {
  try {
    myOrgs.value = (await $fetch<{ organizations: typeof myOrgs.value }>('/api/orgs/mine')).organizations
  } catch {
    myOrgs.value = []
  }
})

const send = async (body: Record<string, unknown>) => {
  busy.value = true
  message.value = ''
  try {
    const res = await $fetch<{ transferred?: boolean }>(`/api/mods/${props.mod.slug}/transfer`, { method: 'POST', body })
    message.value = body.toUserId && !res.transferred ? t('transfer.offer_sent') : t('transfer.done')
    emit('changed')
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    message.value = e.data?.statusMessage || t('transfer.failed')
  } finally {
    busy.value = false
  }
}

const moveToOrg = () => {
  if (confirm(t('transfer.confirm_org'))) send({ organizationId: orgChoice.value || null })
}

const transferToUser = (u: PickedUser) => {
  if (confirm(t('transfer.confirm_user', { user: u.globalName || u.username }))) send({ toUserId: u._id })
}
</script>

<style scoped>
.transfer-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-color: var(--danger, var(--border));
}

.transfer-title {
  margin: 0;
  font-size: 18px;
}

.transfer-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.transfer-inline {
  display: flex;
  gap: 8px;
}

.transfer-inline select {
  flex: 1;
  min-width: 0;
}

.transfer-pending {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>
