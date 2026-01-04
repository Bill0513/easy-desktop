<script setup lang="ts">
import { ref } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { NewsSource } from '@/types'

const props = defineProps<{
  source: NewsSource
}>()

const store = useDesktopStore()
const isRefreshing = ref(false)

const openLink = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

const handleRefresh = async () => {
  isRefreshing.value = true
  await store.fetchNewsBySource(props.source.id)
  isRefreshing.value = false
}
</script>

<template>
  <div
    class="card-hand-drawn flex flex-col overflow-hidden"
    style="
      box-shadow: 3px 3px 0px #2d2d2d;
      border: 2px solid #2d2d2d;
      min-height: 500px;
      max-height: 500px;
    "
  >
    <!-- 新闻源标题 -->
    <div
      class="px-3 py-2 flex items-center gap-2 flex-shrink-0"
      style="
        background: linear-gradient(135deg, #fff9c4 0%, #ffecb3 100%);
        border-bottom: 2px solid #2d2d2d;
      "
    >
      <span class="text-xl">{{ source.icon }}</span>
      <div class="flex-1 min-w-0">
        <h3 class="font-handwritten text-sm font-bold text-pencil truncate">{{ source.name }}</h3>
        <p class="font-handwritten text-[10px] text-pencil/60 truncate">
          {{ source.lastUpdated ? `更新于 ${new Date(source.lastUpdated).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '暂无更新' }}
        </p>
      </div>

      <!-- 刷新按钮 -->
      <button
        class="p-1.5 hover:bg-paper/50 rounded transition-all hover:scale-110 flex-shrink-0"
        :disabled="isRefreshing"
        @click="handleRefresh"
      >
        <svg
          class="w-4 h-4 text-pencil transition-transform"
          :class="{ 'animate-spin': isRefreshing }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="source.items.length === 0 && !store.isLoadingNews" class="flex-1 flex items-center justify-center p-4">
      <p class="font-handwritten text-xs text-pencil/50 text-center">暂无新闻</p>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="store.isLoadingNews && source.items.length === 0" class="flex-1 flex items-center justify-center p-4">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-pencil animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span class="font-handwritten text-xs text-pencil/60">加载中...</span>
      </div>
    </div>

    <!-- 新闻列表 -->
    <div v-else class="flex-1 overflow-y-auto space-y-1.5 p-2.5">
      <button
        v-for="(item, index) in source.items"
        :key="item.id"
        class="w-full text-left group relative"
        @click="openLink(item.url)"
      >
        <!-- 新闻卡片 -->
        <div
          class="px-2 py-1.5 transition-all duration-200 hover:scale-[1.02]"
          style="
            box-shadow: 2px 2px 0px #2d2d2d;
            border: 1.5px solid #2d2d2d;
            background: #fdfbf7;
          "
          :style="{
            borderRadius: index % 3 === 0
              ? '225px 15px 255px 15px / 15px 255px 15px 225px'
              : index % 3 === 1
              ? '15px 255px 15px 225px / 255px 15px 225px 15px'
              : '255px 15px 225px 15px / 15px 225px 15px 255px'
          }"
        >
          <!-- 序号 -->
          <div class="flex items-center gap-1.5">
            <span
              class="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full font-handwritten text-[10px] font-bold"
              :class="[
                index < 3 ? 'bg-accent text-paper' : 'bg-muted text-pencil'
              ]"
            >
              {{ index + 1 }}
            </span>

            <!-- 内容 -->
            <p
              class="font-handwritten text-xs text-pencil group-hover:text-accent transition-colors truncate"
              :title="item.title"
            >
              {{ item.title }}
            </p>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #2d2d2d;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #1a1a1a;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
