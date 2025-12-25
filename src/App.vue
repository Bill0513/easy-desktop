<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import DesktopCanvas from '@/components/DesktopCanvas.vue'
import Toolbar from '@/components/Toolbar.vue'
import ContextMenu from '@/components/ContextMenu.vue'
import PasswordInput from '@/components/PasswordInput.vue'

const store = useDesktopStore()
const isUnlocked = ref(false)

onMounted(() => {
  store.init()
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
    </template>
  </div>
</template>
