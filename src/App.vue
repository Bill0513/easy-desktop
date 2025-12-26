<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import DesktopCanvas from '@/components/DesktopCanvas.vue'
import Toolbar from '@/components/Toolbar.vue'
import ContextMenu from '@/components/ContextMenu.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import GlobalSearch from '@/components/GlobalSearch.vue'
import TabBar from '@/components/TabBar.vue'
import NewsPage from '@/components/NewsPage.vue'

const store = useDesktopStore()
const isUnlocked = ref(false)

// Ctrl+F 快捷键打开搜索
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault()
    store.openSearch()
  }
}

onMounted(() => {
  store.init()
  store.loadActiveTab()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const handleUnlock = () => {
  isUnlocked.value = true
}
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden">
    <!-- 密码输入页面 -->
    <PasswordInput v-if="!isUnlocked" @unlock="handleUnlock" />

    <!-- 主界面 -->
    <template v-else>
      <!-- Tab 栏 -->
      <TabBar />

      <!-- 桌面 Tab -->
      <div v-show="store.activeTab === 'desktop'" class="w-full h-full">
        <!-- 工具栏 -->
        <Toolbar />

        <!-- 桌面画布 -->
        <DesktopCanvas />

        <!-- 右键菜单 -->
        <ContextMenu />

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
