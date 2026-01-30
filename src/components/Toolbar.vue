<script setup lang="ts">
import { useDesktopStore } from '@/stores/desktop'
import SearchBar from './SearchBar.vue'
import {
  StickyNote,
  CheckSquare,
  FileText,
  FileCode,
  Image,
  Timer,
  Dices,
  CalendarCheck
} from 'lucide-vue-next'

const store = useDesktopStore()

// 添加组件的快捷方式
const addWidget = (type: string) => {
  store.createWidget({ type: type as any })
}
</script>

<template>
  <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
    <div class="card-hand-drawn px-4 py-2 flex items-center gap-2">
      <!-- 便签 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="添加便签"
        @click="addWidget('note')"
      >
        <StickyNote :stroke-width="2.5" class="w-6 h-6 group-hover:scale-110 transition-transform text-text-primary" />
        <span class="text-[10px] font-handwritten text-text-secondary">便签</span>
      </button>

      <!-- 待办 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="添加待办"
        @click="addWidget('todo')"
      >
        <CheckSquare :stroke-width="2.5" class="w-6 h-6 group-hover:scale-110 transition-transform text-text-primary" />
        <span class="text-[10px] font-handwritten text-text-secondary">待办</span>
      </button>

      <!-- 文本 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="添加文本"
        @click="addWidget('text')"
      >
        <FileText :stroke-width="2.5" class="w-6 h-6 group-hover:scale-110 transition-transform text-text-primary" />
        <span class="text-[10px] font-handwritten text-text-secondary">文本</span>
      </button>

      <!-- Markdown -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="添加Markdown"
        @click="addWidget('markdown')"
      >
        <FileCode :stroke-width="2.5" class="w-6 h-6 group-hover:scale-110 transition-transform text-text-primary" />
        <span class="text-[10px] font-handwritten text-text-secondary">Markdown</span>
      </button>

      <!-- 图片 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="添加图片"
        @click="addWidget('image')"
      >
        <Image :stroke-width="2.5" class="w-6 h-6 group-hover:scale-110 transition-transform text-text-primary" />
        <span class="text-[10px] font-handwritten text-text-secondary">图片</span>
      </button>

      <!-- 倒计时 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="添加倒计时"
        @click="addWidget('countdown')"
      >
        <Timer :stroke-width="2.5" class="w-6 h-6 group-hover:scale-110 transition-transform text-text-primary" />
        <span class="text-[10px] font-handwritten text-text-secondary">倒计时</span>
      </button>

      <!-- 随机决策器 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="添加随机决策器"
        @click="addWidget('random-picker')"
      >
        <Dices :stroke-width="2.5" class="w-6 h-6 group-hover:scale-110 transition-transform text-text-primary" />
        <span class="text-[10px] font-handwritten text-text-secondary">决策器</span>
      </button>

      <!-- 打卡 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="添加打卡"
        @click="addWidget('check-in')"
      >
        <CalendarCheck :stroke-width="2.5" class="w-6 h-6 group-hover:scale-110 transition-transform text-text-primary" />
        <span class="text-[10px] font-handwritten text-text-secondary">打卡</span>
      </button>

      <!-- 分隔线 -->
      <div class="w-px h-8 bg-border-primary/20 mx-2"></div>

      <!-- 搜索栏 -->
      <SearchBar class="w-[380px]" />
    </div>
  </div>
</template>
