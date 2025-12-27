<script setup lang="ts">
import { computed } from 'vue'
import type { NavigationSite } from '@/types'

const props = defineProps<{
  site: NavigationSite
}>()

const emit = defineEmits<{
  contextmenu: [e: MouseEvent]
  dragstart: [e: MouseEvent]
}>()

// 获取首字母
const firstLetter = computed(() => {
  return props.site.name.charAt(0).toUpperCase()
})

// 打开网站
const openSite = () => {
  window.open(props.site.url, '_blank')
}

// 处理右键菜单
const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  emit('contextmenu', e)
}

// 处理拖拽开始（只响应左键）
const handleMouseDown = (e: MouseEvent) => {
  // 只有左键才触发拖拽
  if (e.button === 0) {
    emit('dragstart', e)
  }
}
</script>

<template>
  <div
    class="site-card group cursor-pointer select-none"
    @click="openSite"
    @contextmenu="handleContextMenu"
    @mousedown="handleMouseDown"
  >
    <!-- 图标区域 -->
    <div class="site-icon-wrapper">
      <!-- 有图标时显示图标 -->
      <img
        v-if="site.icon"
        :src="site.icon"
        :alt="site.name"
        class="w-full h-full object-cover"
        @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
      />
      <!-- 无图标时显示颜色块+首字母 -->
      <div
        v-if="!site.icon"
        class="w-full h-full flex items-center justify-center text-white font-handwritten text-2xl font-bold"
        :style="{ backgroundColor: site.color }"
      >
        {{ firstLetter }}
      </div>
    </div>

    <!-- 网站名称 -->
    <div class="site-name">
      {{ site.name }}
    </div>
  </div>
</template>

<style scoped>
.site-card {
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: transform 0.2s;
}

.site-card:hover {
  transform: translateY(-2px);
}

.site-card:active {
  transform: scale(0.95);
}

.site-icon-wrapper {
  width: 60px;
  height: 60px;
  border: 2px solid #2d2d2d;
  border-radius: 125px 15px 125px 15px / 15px 125px 15px 125px;
  box-shadow: 2px 2px 0px 0px #2d2d2d;
  overflow: hidden;
  background-color: #fff;
  transition: box-shadow 0.2s;
}

.site-card:hover .site-icon-wrapper {
  box-shadow: 3px 3px 0px 0px #2d2d2d;
}

.site-name {
  font-family: 'Patrick Hand', cursive;
  font-size: 12px;
  text-align: center;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #2d2d2d;
}
</style>
