<script setup lang="ts">
import { useDesktopStore } from '@/stores/desktop'

const store = useDesktopStore()

// 添加组件的快捷方式
const addWidget = (type: string) => {
  store.createWidget({ type: type as any })
}
</script>

<template>
  <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50">
    <div class="card-hand-drawn px-4 py-2 flex items-center gap-2">
      <!-- 便签 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group"
        title="添加便签"
        @click="addWidget('note')"
      >
        <span class="text-2xl group-hover:scale-110 transition-transform">📝</span>
      </button>

      <!-- 待办 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group"
        title="添加待办"
        @click="addWidget('todo')"
      >
        <span class="text-2xl group-hover:scale-110 transition-transform">✅</span>
      </button>

      <!-- 文本 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group"
        title="添加文本"
        @click="addWidget('text')"
      >
        <span class="text-2xl group-hover:scale-110 transition-transform">📋</span>
      </button>

      <!-- 书签 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group"
        title="添加书签"
        @click="addWidget('bookmark')"
      >
        <span class="text-2xl group-hover:scale-110 transition-transform">🔖</span>
      </button>

      <!-- 分隔线 -->
      <div class="w-px h-8 bg-pencil/20"></div>

      <!-- 文件夹 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group"
        title="创建文件夹"
        @click="addWidget('folder')"
      >
        <span class="text-2xl group-hover:scale-110 transition-transform">📁</span>
      </button>

      <!-- 分隔线 -->
      <div class="w-px h-8 bg-pencil/20"></div>

      <!-- 保存状态指示 -->
      <div class="text-xs font-handwritten text-pencil/40">
        已自动保存
      </div>
    </div>
  </div>
</template>
