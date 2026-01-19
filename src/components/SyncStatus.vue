<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import { RefreshCw, Newspaper, Loader2 } from 'lucide-vue-next'

const store = useDesktopStore()

// 同步间隔（5分钟）
const SYNC_INTERVAL = 5 * 60 * 1000
// 新闻刷新间隔（30分钟）
const NEWS_REFRESH_INTERVAL = 30 * 60 * 1000

// 当前时间（用于倒计时）
const currentTime = ref(Date.now())

// 新闻刷新状态
const isRefreshingNews = ref(false)

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

// 文件上次同步时间
const lastFileSyncText = computed(() => formatTime(store.lastFileSyncTime))

// 根据当前tab选择显示的同步状态
const currentSyncStatus = computed(() => {
  return store.activeTab === 'file' ? store.fileSyncStatus : store.syncStatus
})

const currentLastSyncTime = computed(() => {
  return store.activeTab === 'file' ? store.lastFileSyncTime : store.lastSyncTime
})

const currentSyncErrorMessage = computed(() => {
  return store.activeTab === 'file' ? store.fileSyncErrorMessage : store.syncErrorMessage
})

const currentLastSyncText = computed(() => {
  return store.activeTab === 'file' ? lastFileSyncText.value : lastSyncText.value
})

const currentHasDirtyData = computed(() => {
  return store.activeTab === 'file' ? store.hasFileDirtyData : store.hasDirtyData
})

// 下次同步倒计时
const nextSyncCountdown = computed(() => {
  const lastTime = currentLastSyncTime.value
  if (!lastTime) return '等待首次同步'

  const nextSyncTime = lastTime + SYNC_INTERVAL
  const remaining = nextSyncTime - currentTime.value

  return formatCountdown(remaining)
})

const statusIcon = computed(() => {
  switch (currentSyncStatus.value) {
    case 'syncing':
      return '⏳'
    case 'success':
      return '✓'
    case 'error':
      return '✗'
    default:
      // 如果有脏数据，显示待同步图标
      return currentHasDirtyData.value ? '⚠' : '☁'
  }
})

const statusColor = computed(() => {
  switch (currentSyncStatus.value) {
    case 'syncing':
      return 'text-blue-600'
    case 'success':
      return 'text-green-600'
    case 'error':
      return 'text-red-600'
    default:
      // 如果有脏数据，显示橙色警告
      return currentHasDirtyData.value ? 'text-orange-600' : 'text-gray-600'
  }
})

const handleSync = () => {
  store.syncToCloud()
  // 如果在文件tab，也同步文件
  if (store.activeTab === 'file') {
    store.syncFilesToCloud()
  }
}

// 刷新新闻（带30分钟检查）
const handleRefreshNews = async () => {
  isRefreshingNews.value = true
  await store.refreshNewsWithCheck(NEWS_REFRESH_INTERVAL)
  isRefreshingNews.value = false
}

// 监听 tab 切换，切换到新闻 tab 时自动检查刷新
watch(() => store.activeTab, async (newTab) => {
  if (newTab === 'news') {
    // 自动检查并刷新过期的新闻源
    isRefreshingNews.value = true
    await store.refreshNewsWithCheck(NEWS_REFRESH_INTERVAL)
    isRefreshingNews.value = false
  }
})

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
    <!-- 新闻 Tab：刷新新闻按钮 -->
    <template v-if="store.activeTab === 'news'">
      <div
        class="card-hand-drawn bg-paper px-3 py-2 flex items-center gap-2 text-sm"
        :class="isRefreshingNews ? 'text-blue-600' : 'text-gray-600'"
      >
        <Loader2 v-if="isRefreshingNews" :size="18" :stroke-width="2.5" class="animate-spin" />
        <Newspaper v-else :size="18" :stroke-width="2.5" />
        <span class="font-handwritten">
          {{ isRefreshingNews ? '刷新中...' : '新闻' }}
        </span>
      </div>

      <button
        @click="handleRefreshNews"
        :disabled="isRefreshingNews"
        class="btn-hand-drawn px-3 py-2 bg-paper text-pencil disabled:opacity-50 disabled:cursor-not-allowed"
        title="刷新新闻（超过30分钟的源会更新）"
      >
        <RefreshCw
          :size="18"
          :stroke-width="2.5"
          :class="{ 'animate-spin': isRefreshingNews }"
        />
      </button>
    </template>

    <!-- 其他 Tab：同步状态显示 -->
    <template v-else>
      <div
        class="card-hand-drawn bg-paper px-3 py-2 flex flex-col gap-1 text-sm w-48"
        :class="statusColor"
      >
        <div class="flex items-center gap-2">
          <span class="text-base">{{ statusIcon }}</span>
          <span class="font-handwritten" v-if="currentSyncStatus === 'syncing'">同步中...</span>
          <span class="font-handwritten" v-else-if="currentSyncStatus === 'error'">{{ currentSyncErrorMessage || '同步失败' }}</span>
          <span class="font-handwritten flex items-center gap-1" v-else>
            <span>下次同步: {{ nextSyncCountdown }}</span>
            <span v-if="currentHasDirtyData" class="text-orange-500" title="有未同步的数据">●</span>
          </span>
        </div>
        <div class="text-xs text-gray-500 font-handwritten" v-if="currentLastSyncTime">
          上次同步: {{ currentLastSyncText }}
        </div>
      </div>

      <!-- 手动同步按钮 -->
      <button
        @click="handleSync"
        :disabled="currentSyncStatus === 'syncing'"
        class="btn-hand-drawn px-3 py-2 bg-paper text-pencil disabled:opacity-50 disabled:cursor-not-allowed"
        :title="store.activeTab === 'file' ? '手动同步文件到云端' : '手动同步到云端'"
      >
        <RefreshCw
          :size="18"
          :stroke-width="2.5"
          :class="{ 'animate-spin': currentSyncStatus === 'syncing' }"
        />
      </button>
    </template>
  </div>
</template>
