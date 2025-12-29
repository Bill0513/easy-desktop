<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'

const store = useDesktopStore()

// 同步间隔（5分钟）
const SYNC_INTERVAL = 5 * 60 * 1000

// 当前时间（用于倒计时）
const currentTime = ref(Date.now())

// 格式化具体时间
const formatTime = (timestamp: number | null) => {
  if (!timestamp) return '从未同步'

  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

// 格式化倒计时
const formatCountdown = (ms: number) => {
  if (ms <= 0) return '即将同步'

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// 上次同步时间
const lastSyncText = computed(() => formatTime(store.lastSyncTime))

// 下次同步倒计时
const nextSyncCountdown = computed(() => {
  if (!store.lastSyncTime) return '等待首次同步'

  const nextSyncTime = store.lastSyncTime + SYNC_INTERVAL
  const remaining = nextSyncTime - currentTime.value

  return formatCountdown(remaining)
})

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

// 定时器更新当前时间
let timer: number | null = null

onMounted(() => {
  timer = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer !== null) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex items-center gap-2">
    <!-- 同步状态显示 -->
    <div
      class="card-hand-drawn bg-paper px-3 py-2 flex flex-col gap-1 text-sm w-48"
      :class="statusColor"
    >
      <div class="flex items-center gap-2">
        <span class="text-base">{{ statusIcon }}</span>
        <span class="font-handwritten" v-if="store.syncStatus === 'syncing'">同步中...</span>
        <span class="font-handwritten" v-else-if="store.syncStatus === 'error'">{{ store.syncErrorMessage || '同步失败' }}</span>
        <span class="font-handwritten" v-else>
          下次同步: {{ nextSyncCountdown }}
        </span>
      </div>
      <div class="text-xs text-gray-500 font-handwritten" v-if="store.lastSyncTime">
        上次同步: {{ lastSyncText }}
      </div>
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
