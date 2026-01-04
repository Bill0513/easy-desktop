<script setup lang="ts">
import { onMounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import NewsCard from './NewsCard.vue'

const store = useDesktopStore()

const allSources = [
  { id: 'baidu', name: '百度热搜', icon: '🔥' },
  { id: 'github', name: 'GitHub Trending', icon: '🐙' },
  { id: 'zhihu', name: '知乎热榜', icon: '💡' }
]

onMounted(() => {
  store.initNews()
})
</script>

<template>
  <div class="h-screen w-full overflow-hidden bg-paper flex flex-col">
    <!-- 顶部标题栏 -->
    <div class="flex-shrink-0 px-8 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-handwritten text-4xl font-bold text-pencil mb-2">
            🔥 热点新闻
          </h1>
          <p class="font-handwritten text-sm text-pencil/60">
            实时追踪热门话题和趋势
          </p>
        </div>

        <!-- 来源筛选 -->
        <div class="flex items-center gap-3">
          <span class="font-handwritten text-sm text-pencil/60">来源:</span>
          <div class="flex gap-2">
            <button
              v-for="source in allSources"
              :key="source.id"
              class="card-hand-drawn px-4 py-2 flex items-center gap-2 transition-all hover:scale-105"
              :style="{
                background: store.enabledSources.has(source.id) ? '#ff4d4d' : '#e8e8e8',
                color: store.enabledSources.has(source.id) ? '#fdfbf7' : '#2d2d2d',
                boxShadow: '2px 2px 0px #2d2d2d'
              }"
              @click="store.toggleNewsSource(source.id)"
            >
              <span class="text-xl">{{ source.icon }}</span>
              <span class="font-handwritten text-sm font-medium">{{ source.name }}</span>
              <span v-if="store.enabledSources.has(source.id)" class="text-xs">✓</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新闻网格 -->
    <div class="flex-1 overflow-hidden px-8 pb-8">
      <div v-if="store.filteredNewsSources.length === 0 && !store.isLoadingNews" class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="text-6xl mb-4">📰</div>
          <p class="font-handwritten text-lg text-pencil/60">请选择至少一个新闻来源</p>
        </div>
      </div>

      <div v-else class="h-full grid gap-6" :class="{
        'grid-cols-1': store.filteredNewsSources.length === 1,
        'grid-cols-2': store.filteredNewsSources.length === 2,
        'grid-cols-3': store.filteredNewsSources.length === 3,
        'grid-cols-4': store.filteredNewsSources.length >= 4
      }">
        <NewsCard
          v-for="source in store.filteredNewsSources"
          :key="source.id"
          :source="source"
        />
      </div>
    </div>
  </div>
</template>

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
