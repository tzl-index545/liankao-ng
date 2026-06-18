<template>
  <span
    class="user-name"
    :class="{ 'user-name--link': canNavigate }"
    :title="fullDisplayName"
    :role="canNavigate ? 'link' : undefined"
    :tabindex="canNavigate ? 0 : undefined"
    @click="goToUser"
    @keydown.enter.prevent="goToUser"
    @keydown.space.prevent="goToUser"
  >
    <span class="user-name__nickname" :style="{ color: nicknameColor }">{{ nicknameDisplay }}</span>
    <span v-if="realnameDisplay" class="user-name__realname">({{ realnameDisplay }})</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { UserObject } from '../../../server/src/types/user'
import { getUserDetail } from '../api/user'
import { getRatingColor } from '../utils/rating'

const props = defineProps<{
  uid?: string | number
  user?: Partial<UserObject> | null
  rating?: number | string | null
}>()

const localUser = ref<Partial<UserObject> | null>(null)
const hasError = ref(false)
const router = useRouter()
let requestVersion = 0

const isValidUserObject = (value: unknown): value is Partial<UserObject> => {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<UserObject>
  return typeof record.nickname === 'string' && record.nickname.trim().length > 0
}

const hasCompleteDisplayUser = (value: Partial<UserObject> | null) => {
  return isValidUserObject(value) && typeof value.realname === 'string'
}

const fetchUser = async (uid?: string | number) => {
  if (uid === null || uid === undefined || uid === '') {
    localUser.value = isValidUserObject(props.user) ? props.user : null
    hasError.value = !isValidUserObject(props.user)
    return
  }

  const currentVersion = ++requestVersion
  hasError.value = false
  localUser.value = isValidUserObject(props.user) ? props.user : null

  try {
    const res = await getUserDetail(uid)
    const userData = res?.data
    if (currentVersion !== requestVersion) return

    if (isValidUserObject(userData)) {
      localUser.value = userData
      return
    }
    hasError.value = true
  } catch (error) {
    if (currentVersion !== requestVersion) return
    hasError.value = true
  }
}

watch(
  () => [props.uid, props.user] as const,
  ([uid, user]) => {
    if (hasCompleteDisplayUser(user)) {
      requestVersion += 1
      localUser.value = user
      hasError.value = false
      return
    }
    if (isValidUserObject(user)) {
      localUser.value = user
      hasError.value = false
    }
    void fetchUser(uid)
  },
  { immediate: true }
)

const nicknameDisplay = computed(() => {
  if (localUser.value?.nickname) return localUser.value.nickname
  if (hasError.value) return 'ErrorUser'
  return ''
})

const realnameDisplay = computed(() => {
  const realname = localUser.value?.realname
  return typeof realname === 'string' && realname.trim() ? realname : ''
})

const ratingValue = computed(() => props.rating ?? localUser.value?.rating ?? null)

const nicknameColor = computed(() => getRatingColor(ratingValue.value))

const fullDisplayName = computed(() => {
  if (!realnameDisplay.value) return nicknameDisplay.value
  return `${nicknameDisplay.value}(${realnameDisplay.value})`
})

const canNavigate = computed(() => props.uid !== null && props.uid !== undefined && props.uid !== '')

const goToUser = () => {
  if (!canNavigate.value) return
  router.push(`/users/${props.uid}`)
}
</script>

<style scoped>
.user-name {
  display: inline-flex;
  align-items: baseline;
  min-width: 0;
  font-weight: 700;
  white-space: nowrap;
}

.user-name--link {
  cursor: pointer;
}

.user-name--link:hover .user-name__nickname,
.user-name--link:focus-visible .user-name__nickname {
  text-decoration: underline;
}

.user-name__nickname,
.user-name__realname {
  min-width: 0;
  overflow-wrap: anywhere;
}

.user-name__realname {
  color: #909399;
  font-weight: 500;
}
</style>
