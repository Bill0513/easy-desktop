<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import DesktopCanvas from '@/components/DesktopCanvas.vue'
import Toolbar from '@/components/Toolbar.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import GlobalSearch from '@/components/GlobalSearch.vue'
import TabBar from '@/components/TabBar.vue'
import NavigationPage from '@/components/NavigationPage.vue'
import NewsPage from '@/components/NewsPage.vue'
import SyncStatus from '@/components/SyncStatus.vue'

const store = useDesktopStore()
const isUnlocked = ref(false)
let syncInterval: number | null = null

// Ctrl+F 快捷键打开搜索（仅在桌面Tab和导航Tab下生效）
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    // 只在桌面Tab和导航Tab下触发搜索
    if (store.activeTab === 'desktop' || store.activeTab === 'navigation') {
      e.preventDefault()
      store.openSearch()
    }
  }
}

// 页面关闭前同步
const handleBeforeUnload = () => {
  // 使用sendBeacon同步到云端，确保数据能够发送
  store.syncBeforeUnload()
}

onMounted(() => {
  // 只注册事件监听器，不加载数据
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)

  // 清除定时器
  if (syncInterval !== null) {
    clearInterval(syncInterval)
  }

  // 组件卸载时同步一次
  if (isUnlocked.value) {
    store.syncToCloud()
  }
})

const handleUnlock = async () => {
  isUnlocked.value = true

  // 密码验证成功后才加载数据
  await store.init()
  store.loadActiveTab()
  store.initNavigation()

  // 启动自动同步定时器（5分钟）
  syncInterval = window.setInterval(() => {
    store.syncToCloud()
  }, 5 * 60 * 1000)

  // 数据加载完成后才进行首次同步
  store.syncToCloud()
}
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden">
    <!-- 密码输入页面 -->
    <PasswordInput v-if="!isUnlocked" @unlock="handleUnlock" />

    <!-- 主界面 -->
    <template v-else>
      <!-- 同步状态 -->
      <SyncStatus />

      <!-- Tab 栏 -->
      <TabBar />

      <!-- 桌面 Tab -->
      <div v-show="store.activeTab === 'desktop'" class="w-full h-full">
        <!-- 工具栏 -->
        <Toolbar />

        <!-- 桌面画布 -->
        <DesktopCanvas />

        <!-- 全局搜索 -->
        <GlobalSearch />
      </div>

      <!-- 导航 Tab -->
      <div v-show="store.activeTab === 'navigation'" class="w-full h-full">
        <NavigationPage />
        <!-- 全局搜索 -->
        <GlobalSearch />
      </div>

      <!-- 新闻 Tab -->
      <div v-show="store.activeTab === 'news'" class="w-full h-full">
        <NewsPage />
      </div>
    </template>
  </div>
</template>
