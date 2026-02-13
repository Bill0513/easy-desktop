<template>
  <div class="h-screen w-full flex flex-col">
    <!-- 顶部标题栏 -->
    <div :class="isMobile ? 'mobile-news-topbar' : 'flex-shrink-0 px-6 py-4'">
      <div :class="isMobile ? 'mobile-news-topbar-inner card-hand-drawn bg-bg-secondary' : ''">
        <div class="min-w-0 flex-1">
          <h1 class="font-handwritten text-2xl font-bold text-text-primary mb-1">
            🔥 热点新闻
          </h1>
          <p class="font-handwritten text-xs text-text-secondary">
            实时追踪热门话题和趋势
          </p>
        </div>
        <button
          v-if="isMobile"
          class="mobile-news-refresh"
          :disabled="store.isLoadingNews"
          @click="refreshAll"
        >
          <RefreshCw :size="16" :stroke-width="2.5" :class="store.isLoadingNews ? 'animate-spin' : ''" />
          刷新
        </button>
      </div>
    </div>

    <!-- 新闻内容区 - 可滚动 -->
    <div class="flex-1 overflow-auto" :class="isMobile ? 'px-3 pt-[88px] pb-5 mobile-content-space' : 'px-6 pb-4'">
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
      <div v-else-if="store.filteredNewsSources.length > 0" class="grid gap-4" :class="gridColsClass">
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
import { useResponsiveMode } from '@/composables/useResponsiveMode'
import { RefreshCw } from 'lucide-vue-next'

const store = useDesktopStore()
const { isMobile } = useResponsiveMode()

const refreshAll = () => {
  store.fetchNews()
}

// 响应式网格列数 - 根据屏幕宽度动态调整
const gridColsClass = computed(() => {
  if (isMobile.value) return 'grid-cols-1 auto-rows-auto'
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

.mobile-news-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  padding: 8px 10px 6px;
  background: color-mix(in srgb, var(--color-bg-primary) 92%, transparent);
  backdrop-filter: blur(8px);
}

.mobile-news-topbar-inner {
  min-height: 66px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}

.mobile-news-refresh {
  min-height: 36px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 2px solid var(--color-border-primary);
  border-radius: 10px;
  font-family: 'Patrick Hand', cursive;
  font-size: 13px;
}
</style>
