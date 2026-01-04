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
    class="card-hand-drawn flex flex-col"
    style="
      box-shadow: 4px 4px 0px #2d2d2d;
      border: 2px solid #2d2d2d;
      max-height: calc(100vh - 200px);
    "
  >
    <!-- 新闻源标题 -->
    <div
      class="px-4 py-3 flex items-center gap-3 flex-shrink-0"
      style="
        background: linear-gradient(135deg, #fff9c4 0%, #ffecb3 100%);
        border-bottom: 2px solid #2d2d2d;
        border-radius: 255px 15px 0 0 / 15px 225px 0 0;
      "
    >
      <span class="text-3xl">{{ source.icon }}</span>
      <div class="flex-1">
        <h3 class="font-handwritten text-lg font-bold text-pencil">{{ source.name }}</h3>
        <p class="font-handwritten text-xs text-pencil/60">
          更新于 {{ new Date(source.lastUpdated).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
        </p>
      </div>

      <!-- 刷新按钮 -->
      <button
        class="p-2 hover:bg-paper/50 rounded-lg transition-all hover:scale-110"
        :disabled="isRefreshing"
        @click="handleRefresh"
      >
        <svg
          class="w-5 h-5 text-pencil transition-transform"
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

    <!-- 新闻列表 -->
    <div class="flex-1 overflow-y-auto space-y-2 p-4">
      <button
        v-for="(item, index) in source.items"
        :key="item.id"
        class="w-full text-left group relative"
        @click="openLink(item.url)"
      >
        <!-- 新闻卡片 -->
        <div
          class="card-hand-drawn px-3 py-2.5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
          style="
            box-shadow: 2px 2px 0px #2d2d2d;
            border: 1.5px solid #2d2d2d;
          "
          :style="{
            background: index % 2 === 0 ? '#fdfbf7' : '#fff9f5',
            borderRadius: index % 3 === 0
              ? '225px 15px 255px 15px / 15px 255px 15px 225px'
              : index % 3 === 1
              ? '15px 255px 15px 225px / 255px 15px 225px 15px'
              : '255px 15px 225px 15px / 15px 225px 15px 255px'
          }"
        >
          <!-- 序号 -->
          <div class="flex items-start gap-2">
            <span
              class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full font-handwritten text-xs font-bold"
              :class="[
                index < 3 ? 'bg-accent text-paper' : 'bg-muted text-pencil'
              ]"
            >
              {{ index + 1 }}
            </span>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <p
                class="font-handwritten text-sm leading-relaxed text-pencil group-hover:text-accent transition-colors line-clamp-2"
                :title="item.title"
              >
                {{ item.title }}
              </p>
            </div>

            <!-- 箭头图标 -->
            <svg
              class="flex-shrink-0 w-4 h-4 text-pencil/30 group-hover:text-accent group-hover:translate-x-1 transition-all"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
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
