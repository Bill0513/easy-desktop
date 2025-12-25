<script setup lang="ts">
import { onMounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import DesktopCanvas from '@/components/DesktopCanvas.vue'
import Toolbar from '@/components/Toolbar.vue'
import ContextMenu from '@/components/ContextMenu.vue'

const store = useDesktopStore()

onMounted(() => {
  store.init()
})
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden">
    <!-- 工具栏 -->
    <Toolbar />

    <!-- 桌面画布 -->
    <DesktopCanvas />

    <!-- 右键菜单 -->
    <ContextMenu />
  </div>
</template>
