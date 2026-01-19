<template>
  <div class="h-screen w-full flex flex-col">
    <!-- 顶部标题栏 -->
    <div class="flex-shrink-0 px-6 py-4">
      <h1 class="font-handwritten text-2xl font-bold text-pencil mb-1">
        🔥 热点新闻
      </h1>
      <p class="font-handwritten text-xs text-pencil/60">
        实时追踪热门话题和趋势
      </p>
    </div>

    <!-- 新闻内容区 - 可滚动 -->
    <div class="flex-1 overflow-auto px-6 pb-4">
      <!-- 暂无新闻状态 -->
      <div v-if="store.enabledSources.size === 0" class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="w-32 h-32 mx-auto mb-4 bg-white rounded-full border-2 border-pencil flex items-center justify-center" style="box-shadow: 4px 4px 0px #2d2d2d;">
            <span class="text-5xl">📰</span>
          </div>
          <p class="font-handwritten text-base text-pencil/60">请在下方选择新闻来源</p>
        </div>
      </div>

      <!-- 空新闻列表状态 -->
      <div v-else-if="store.filteredNewsSources.length > 0 && store.filteredNewsSources.every(s => s.items.length === 0) && !store.isLoadingNews" class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="w-32 h-32 mx-auto mb-4 bg-white rounded-full border-2 border-pencil flex items-center justify-center" style="box-shadow: 4px 4px 0px #2d2d2d;">
            <span class="text-5xl">📭</span>
          </div>
          <p class="font-handwritten text-base text-pencil/60">暂时没有新闻数据</p>
          <p class="font-handwritten text-xs text-pencil/40 mt-1">点击右上角刷新按钮重新加载</p>
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

    <!-- 来源筛选 - 固定底部 -->
    <div class="flex-shrink-0 px-6 py-3 bg-paper border-t-2 border-pencil/10">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-handwritten text-xs text-pencil/60">来源:</span>
        <div class="flex gap-1.5 flex-wrap">
          <button
            v-for="source in allSources"
            :key="source.id"
            class="card-hand-drawn px-2 py-1 flex items-center gap-1 transition-all hover:scale-105"
            :style="{
              background: store.enabledSources.has(source.id) ? '#ff4d4d' : '#e8e8e8',
              color: store.enabledSources.has(source.id) ? '#fdfbf7' : '#2d2d2d',
              boxShadow: '2px 2px 0px #2d2d2d'
            }"
            @click="store.toggleNewsSource(source.id)"
          >
            <span class="text-sm">{{ source.icon }}</span>
            <span class="font-handwritten text-xs font-medium">{{ source.name }}</span>
            <span v-if="store.enabledSources.has(source.id)" class="text-xs">✓</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import NewsCard from './NewsCard.vue'

const store = useDesktopStore()

const allSources = [
  { id: 'baidu', name: '百度热搜', icon: '🔥' },
  { id: 'github', name: 'GitHub Trending', icon: '🐙' },
  { id: 'zhihu', name: '知乎热榜', icon: '💡' },
  { id: 'douyin', name: '抖音热搜', icon: '🎵' },
  { id: 'hupu', name: '虎扑', icon: '🏀' },
  { id: 'tieba', name: '百度贴吧', icon: '💬' },
  { id: 'toutiao', name: '今日头条', icon: '📰' },
  { id: 'thepaper', name: '澎湃新闻', icon: '📄' },
  { id: 'chongbuluo', name: '虫部落', icon: '🐛' },
  { id: 'tencent', name: '腾讯新闻', icon: '🐧' },
  { id: 'wallstreetcn', name: '华尔街见闻', icon: '💰' },
  { id: 'zaobao', name: '联合早报', icon: '📰' },
  { id: 'sputniknewscn', name: '卫星通讯社', icon: '🛰️' },
  { id: 'coolapk', name: '酷安', icon: '📱' },
  { id: 'ithome', name: 'IT之家', icon: '💻' },
  { id: 'juejin', name: '稀土掘金', icon: '⛏️' },
  { id: 'sspai', name: '少数派', icon: '✨' },
  { id: 'solidot', name: 'Solidot', icon: '🔧' }
]

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
