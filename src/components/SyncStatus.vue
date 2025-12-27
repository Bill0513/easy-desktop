<script setup lang="ts">
import { computed } from 'vue'
import { useDesktopStore } from '@/stores/desktop'

const store = useDesktopStore()

const formatTime = (timestamp: number | null) => {
  if (!timestamp) return '从未同步'

  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`

  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const lastSyncText = computed(() => formatTime(store.lastSyncTime))

const statusIcon = computed(() => {
  switch (store.syncStatus) {
    case 'syncing':
      return '⏳'
    case 'success':
      return '✓'
    case 'error':
      return '✗'
    default:
      return '☁'
  }
})

const statusText = computed(() => {
  switch (store.syncStatus) {
    case 'syncing':
      return '同步中...'
    case 'success':
      return '同步成功'
    case 'error':
      return store.syncErrorMessage || '同步失败'
    default:
      return lastSyncText.value
  }
})

const statusColor = computed(() => {
  switch (store.syncStatus) {
    case 'syncing':
      return 'text-blue-600'
    case 'success':
      return 'text-green-600'
    case 'error':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
})

const handleSync = () => {
  store.syncToCloud()
}
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex items-center gap-2">
    <!-- 同步状态显示 -->
    <div
      class="card-hand-drawn bg-paper px-3 py-2 flex items-center gap-2 text-sm"
      :class="statusColor"
    >
      <span class="text-base">{{ statusIcon }}</span>
      <span class="font-handwritten">{{ statusText }}</span>
    </div>

    <!-- 手动同步按钮 -->
    <button
      @click="handleSync"
      :disabled="store.syncStatus === 'syncing'"
      class="btn-hand-drawn px-3 py-2 bg-paper text-pencil disabled:opacity-50 disabled:cursor-not-allowed"
      title="手动同步到云端"
    >
      <span class="text-base">🔄</span>
    </button>
  </div>
</template>
