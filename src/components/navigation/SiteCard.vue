<script setup lang="ts">
import { computed } from 'vue'
import type { NavigationSite } from '@/types'

const props = defineProps<{
  site: NavigationSite
}>()

const emit = defineEmits<{
  contextmenu: [e: MouseEvent]
}>()

// 获取首字母
const firstLetter = computed(() => {
  return props.site.name.charAt(0).toUpperCase()
})

// 打开网站
const openSite = () => {
  let url = props.site.url
  // 如果 URL 不包含协议，自动添加 https://
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url
  }
  window.open(url, '_blank')
}

// 处理右键菜单
const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  emit('contextmenu', e)
}
</script>

<template>
  <div
    class="site-card group cursor-move select-none"
    @click="openSite"
    @contextmenu="handleContextMenu"
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
        class="w-full h-full flex items-center justify-center text-white font-handwritten text-3xl font-bold"
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
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: transform 0.2s;
}

.site-card:hover {
  transform: translateY(-2px);
}

.site-card:active {
  transform: scale(0.95);
}

.site-icon-wrapper {
  width: 80px;
  height: 80px;
  border: 2px solid var(--color-border-primary);
  border-radius: 125px 15px 125px 15px / 15px 125px 15px 125px;
  box-shadow: 2px 2px 0px 0px var(--color-shadow-primary);
  overflow: hidden;
  background-color: var(--color-bg-secondary);
  transition: box-shadow 0.2s;
}

.site-card:hover .site-icon-wrapper {
  box-shadow: 3px 3px 0px 0px var(--color-shadow-primary);
}

.site-name {
  font-family: 'Patrick Hand', cursive;
  font-size: 14px;
  text-align: center;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
  color: var(--color-text-primary);
  min-height: 36px;
}
</style>
