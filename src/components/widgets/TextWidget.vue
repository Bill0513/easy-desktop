<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { TextWidget } from '@/types'

const props = defineProps<{
  widget: TextWidget
}>()

const store = useDesktopStore()
const textarea = ref<HTMLTextAreaElement | null>(null)

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

watch(() => props.widget.content, autoResize, { immediate: true })
</script>

<template>
  <div class="h-full">
    <textarea
      ref="textarea"
      v-model="widget.content"
      class="w-full h-full resize-none bg-transparent border-none outline-none font-handwritten text-lg leading-relaxed"
      style="min-height: 100px;"
      :style="{ color: '#2d2d2d' }"
      placeholder="在这里记录重要的文本内容..."
      @input="handleInput"
    />
  </div>
</template>
