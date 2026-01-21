<script setup lang="ts">
import { Edit, Trash2, Camera, ExternalLink } from 'lucide-vue-next'
import type { WebClip } from '@/types'

defineProps<{
  clip: WebClip
}>()

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
  capture: [id: string]
}>()
</script>

<template>
  <div class="card-hand-drawn p-4 hover:shadow-lg transition-shadow">
    <!-- 截图或 Favicon -->
    <div class="w-full h-40 mb-3 bg-pencil/5 rounded flex items-center justify-center overflow-hidden">
      <img
        v-if="clip.screenshot"
        :src="clip.screenshot"
        :alt="clip.title"
        class="w-full h-full object-cover"
      />
      <img
        v-else-if="clip.favicon"
        :src="clip.favicon"
        :alt="clip.title"
        class="w-16 h-16 object-contain"
        @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
      />
      <div v-else class="text-4xl">📄</div>
    </div>

    <!-- 标题 -->
    <h3 class="font-handwritten text-lg text-pencil mb-2 line-clamp-2">
      {{ clip.title }}
    </h3>

    <!-- URL -->
    <a
      :href="clip.url"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-1 text-sm text-blue-pen hover:underline mb-2 truncate"
    >
      <ExternalLink :size="14" />
      <span class="truncate">{{ clip.url }}</span>
    </a>

    <!-- 描述 -->
    <p v-if="clip.description" class="text-sm text-pencil/60 mb-3 line-clamp-2">
      {{ clip.description }}
    </p>

    <!-- 标签 -->
    <div v-if="clip.tags.length > 0" class="flex flex-wrap gap-1 mb-3">
      <span
        v-for="tag in clip.tags"
        :key="tag"
        class="px-2 py-1 text-xs bg-pencil/10 text-pencil rounded"
      >
        {{ tag }}
      </span>
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center gap-2 pt-3 border-t border-pencil/10">
      <button
        @click="emit('capture', clip.id)"
        class="flex items-center gap-1 px-2 py-1 text-sm text-pencil hover:bg-pencil/5 rounded"
        :title="clip.screenshot ? '重新截图' : '生成截图'"
      >
        <Camera :size="16" />
      </button>
      <button
        @click="emit('edit', clip.id)"
        class="flex items-center gap-1 px-2 py-1 text-sm text-pencil hover:bg-pencil/5 rounded"
        title="编辑"
      >
        <Edit :size="16" />
      </button>
      <button
        @click="emit('delete', clip.id)"
        class="flex items-center gap-1 px-2 py-1 text-sm text-red hover:bg-red/5 rounded"
        title="删除"
      >
        <Trash2 :size="16" />
      </button>
    </div>
  </div>
</template>
