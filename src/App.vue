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
import ResourceSearchPage from '@/components/ResourceSearchPage.vue'
import FilePage from '@/components/FilePage.vue'
import MindMapPage from '@/components/MindMapPage.vue'
import CodeSnippetsPage from '@/components/CodeSnippetsPage.vue'
import WebClipperPage from '@/components/WebClipperPage.vue'
import SyncStatus from '@/components/SyncStatus.vue'
import ToastContainer from '@/components/ToastContainer.vue'

const store = useDesktopStore()
const isUnlocked = ref(false)
const toastContainer = ref<InstanceType<typeof ToastContainer> | null>(null)
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
  store.syncFilesBeforeUnload()
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
    store.syncFilesToCloud()
  }
})

const handleUnlock = async () => {
  isUnlocked.value = true

  // 密码验证成功后才加载数据
  await store.init()
  await store.initFiles()
  store.loadActiveTab()
  store.initNavigation()

  // 设置 toast 容器
  if (toastContainer.value) {
    store.setToastContainer(toastContainer.value)
  }

  // 启动自动同步定时器（5分钟）
  syncInterval = window.setInterval(() => {
    store.syncToCloud()
    store.syncFilesToCloud()
  }, 5 * 60 * 1000)

  // 数据加载完成后才进行首次同步
  store.syncToCloud()
  store.syncFilesToCloud()
}
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden" :style="{ backgroundColor: store.backgroundColor }">
    <!-- 密码输入页面 -->
    <PasswordInput v-if="!isUnlocked" @unlock="handleUnlock" />

    <!-- 主界面 -->
    <template v-else>
      <!-- Toast 容器 -->
      <ToastContainer ref="toastContainer" />

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

      <!-- 资源搜索 Tab -->
      <div v-show="store.activeTab === 'resource-search'" class="w-full h-full">
        <ResourceSearchPage />
      </div>

      <!-- 文件 Tab -->
      <div v-show="store.activeTab === 'file'" class="w-full h-full">
        <FilePage />
      </div>

      <!-- 思维导图 Tab -->
      <div v-show="store.activeTab === 'mindmap'" class="w-full h-full">
        <MindMapPage />
      </div>

      <!-- 代码片段 Tab -->
      <div v-show="store.activeTab === 'code-snippets'" class="w-full h-full">
        <CodeSnippetsPage />
      </div>

      <!-- 网页剪藏 Tab -->
      <div v-show="store.activeTab === 'web-clipper'" class="w-full h-full">
        <WebClipperPage />
      </div>
    </template>
  </div>
</template>
