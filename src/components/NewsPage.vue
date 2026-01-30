<template>
  <div class="h-screen w-full flex flex-col">
    <!-- 顶部标题栏 -->
    <div class="flex-shrink-0 px-6 py-4">
      <h1 class="font-handwritten text-2xl font-bold text-text-primary mb-1">
        🔥 热点新闻
      </h1>
      <p class="font-handwritten text-xs text-text-secondary">
        实时追踪热门话题和趋势
      </p>
    </div>

    <!-- 新闻内容区 - 可滚动 -->
    <div class="flex-1 overflow-auto px-6 pb-4">
      <!-- 暂无新闻状态 -->
      <div v-if="store.enabledSources.size === 0" class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="w-32 h-32 mx-auto mb-4 bg-bg-secondary rounded-full border-2 border-border-primary flex items-center justify-center" style="box-shadow: 4px 4px 0px var(--color-border-primary);">
            <span class="text-5xl">📰</span>
          </div>
          <p class="font-handwritten text-base text-text-secondary">请在下方选择新闻来源</p>
        </div>
      </div>

      <!-- 空新闻列表状态 -->
      <div v-else-if="store.filteredNewsSources.length > 0 && store.filteredNewsSources.every(s => s.items.length === 0) && !store.isLoadingNews" class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="w-32 h-32 mx-auto mb-4 bg-bg-secondary rounded-full border-2 border-border-primary flex items-center justify-center" style="box-shadow: 4px 4px 0px var(--color-border-primary);">
            <span class="text-5xl">📭</span>
          </div>
          <p class="font-handwritten text-base text-text-secondary">暂时没有新闻数据</p>
          <p class="font-handwritten text-xs text-text-secondary/70 mt-1">点击右上角刷新按钮重新加载</p>
        </div>
      </div>

      <!-- 新闻网格 -->
      <div v-else-if="store.filteredNewsSources.length > 0" class="grid gap-4 auto-rows-[520px]" :class="gridColsClass">
        <NewsCard
          v-for="source in store.filteredNewsSources"
          :key="source.id"
          :source="source"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import NewsCard from './NewsCard.vue'

const store = useDesktopStore()

// 响应式网格列数 - 根据屏幕宽度动态调整
const gridColsClass = computed(() => {
  const count = store.filteredNewsSources.length
  if (count <= 1) return 'grid-cols-1'
  if (count <= 2) return 'grid-cols-2'
  if (count <= 4) return 'grid-cols-3'
  if (count <= 6) return 'grid-cols-4'
  if (count <= 8) return 'grid-cols-5'
  return 'grid-cols-6'
})

onMounted(() => {
  store.initNews()
})
</script>

<style scoped>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
