<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import DesktopCanvas from '@/components/DesktopCanvas.vue'
import Toolbar from '@/components/Toolbar.vue'
import ContextMenu from '@/components/ContextMenu.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import GlobalSearch from '@/components/GlobalSearch.vue'

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
      <!-- 工具栏 -->
      <Toolbar />

      <!-- 桌面画布 -->
      <DesktopCanvas />

      <!-- 右键菜单 -->
      <ContextMenu />

      <!-- 全局搜索 -->
      <GlobalSearch />
    </template>
  </div>
</template>
