<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { TextWidget } from '@/types'

const props = defineProps<{
  widget: TextWidget
}>()

const store = useDesktopStore()
const textarea = ref<HTMLTextAreaElement | null>(null)
const copied = ref(false)

// 自动调整高度
const autoResize = () => {
  if (textarea.value) {
    textarea.value.style.height = 'auto'
    textarea.value.style.height = `${textarea.value.scrollHeight}px`
  }
}

// 内容变化时保存
const handleInput = () => {
  autoResize()
  store.save()
}

// 复制内容
const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(props.widget.content || '')
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

watch(() => props.widget.content, autoResize, { immediate: true })
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 复制按钮 -->
    <div class="flex justify-end mb-2">
      <button
        class="px-2 py-1 text-xs font-handwritten rounded border-2 border-border-primary hover:bg-muted/50 transition-all hover:scale-110 flex items-center gap-1"
        :class="{ 'bg-green-100 border-green-600': copied }"
        @click="copyContent"
        title="复制内容"
      >
        <svg v-if="!copied" class="w-3 h-3 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <svg v-else class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span class="text-text-primary">{{ copied ? '已复制' : '复制' }}</span>
      </button>
    </div>

    <!-- 文本编辑区 -->
    <textarea
      ref="textarea"
      v-model="widget.content"
      class="flex-1 w-full resize-none bg-transparent border-none outline-none font-handwritten text-lg leading-relaxed"
      style="min-height: 100px;"
      :style="{ color: 'var(--color-text-primary)' }"
      placeholder="在这里记录重要的文本内容..."
      @input="handleInput"
    />
  </div>
</template>
