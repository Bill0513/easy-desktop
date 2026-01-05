<script setup lang="ts">
import type { MindMapFile } from '@/types'

defineProps<{
  history: MindMapFile[]
}>()

const emit = defineEmits<{
  open: [file: MindMapFile]
  remove: [id: string]
}>()

const handleRemove = (e: MouseEvent, id: string) => {
  e.stopPropagation()
  if (confirm('确定要从历史记录中移除吗？')) {
    emit('remove', id)
  }
}

// 获取缩略图完整URL
const getThumbnailUrl = (thumbnail: string | undefined) => {
  if (!thumbnail) return ''
  const imageDomain = import.meta.env.VITE_IMAGE_DOMAIN || 'https://sunkkk.de5.net'
  return `${imageDomain}/${thumbnail}`
}
</script>

<template>
  <div class="border-t-2 border-pencil/20 bg-paper/50 p-4">
    <h3 class="font-handwritten text-lg text-pencil mb-3">最近打开</h3>

    <div v-if="history.length === 0" class="text-center py-4">
      <p class="font-handwritten text-sm text-pencil/60">暂无历史记录</p>
    </div>

    <div v-else class="flex gap-3 overflow-x-auto pb-2">
      <div
        v-for="item in history"
        :key="item.id"
        class="card-hand-drawn p-3 min-w-[180px] cursor-pointer hover:scale-105 transition-transform group relative"
        @click="emit('open', item)"
      >
        <!-- Thumbnail or icon -->
        <div class="w-full h-24 mb-2 flex items-center justify-center bg-muted/20 rounded-lg overflow-hidden">
          <img v-if="item.thumbnail" :src="getThumbnailUrl(item.thumbnail)" alt="缩略图" class="w-full h-full object-cover" />
          <div v-else class="text-4xl">🧠</div>
        </div>

        <!-- Name -->
        <div class="font-handwritten text-sm text-pencil truncate" :title="item.name">
          {{ item.name }}
        </div>

        <!-- Last opened -->
        <div class="font-handwritten text-xs text-pencil/60">
          {{ new Date(item.lastOpened).toLocaleDateString() }}
        </div>

        <!-- Remove button -->
        <button
          class="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent text-paper opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
          @click="(e) => handleRemove(e, item.id)"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>
