<template>
  <section v-if="canTransfer" class="card transfer-card">
    <h2 class="transfer-title">{{ t('transfer.title') }}</h2>
    <p class="form-help-text">{{ t('transfer.help') }}</p>

    <div class="transfer-row">
      <label>{{ t('transfer.organization') }}</label>
      <div class="transfer-inline">
        <div class="transfer-dropdown">
          <UIDropdown
            v-model="orgChoice"
            default-value=""
            :values="orgValues"
            :display="orgLabel"
            disable-reset
          />
        </div>
        <button type="button" class="btn btn-secondary btn-sm" :disabled="busy || orgChoice === (mod.organization?._id || '')" @click="moveToOrg">
          {{ t('transfer.move') }}
        </button>
      </div>
    </div>

    <div class="transfer-row">
      <label>{{ t('transfer.to_user') }}</label>
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
import { UIDropdown } from 'overlayer-ui'
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
const orgValues = computed(() => {
  const ids = myOrgs.value.map((o) => o._id)
  const current = props.mod.organization?._id
  return ['', ...(current && !ids.includes(current) ? [current] : []), ...ids]
})
const orgLabel = (id: string) => id
  ? myOrgs.value.find((o) => o._id === id)?.name ?? props.mod.organization?.name ?? id
  : t('transfer.personal')
const busy = ref(false)
const message = ref('')
watch(() => props.mod.organization?._id, (id) => { orgChoice.value = id || '' })

// Same rule as the API: admins, the owners of the owning organization, or the author of a personal mod
const canTransfer = computed(() => !!user.value && (
  user.value.isAdmin ||
  (props.mod.organization
    ? myOrgs.value.some((o) => o._id === props.mod.organization?._id && o.role === 'owner')
    : props.mod.authorId?._id === user.value.id)
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

.transfer-dropdown {
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
