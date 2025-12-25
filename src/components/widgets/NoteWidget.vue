<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { NoteWidget } from '@/types'

const props = defineProps<{
  widget: NoteWidget
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

// 颜色选项
const colors = [
  '#fff9c4', // 黄色便签
  '#ffcdd2', // 红色
  '#c8e6c9', // 绿色
  '#bbdefb', // 蓝色
  '#ffe0b2', // 橙色
  '#f3e5f5', // 紫色
]

// 切换颜色
const setColor = (color: string) => {
  store.updateWidget(props.widget.id, { color })
  store.save()
}

watch(() => props.widget.content, autoResize, { immediate: true })
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 颜色选择器 -->
    <div class="flex gap-1 mb-2 flex-wrap">
      <button
        v-for="color in colors"
        :key="color"
        class="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
        :style="{ backgroundColor: color, borderColor: widget.color === color ? '#2d2d2d' : 'transparent' }"
        @click="setColor(color)"
      />
    </div>

    <!-- 文本编辑区 -->
    <textarea
      ref="textarea"
      v-model="widget.content"
      class="flex-1 w-full resize-none bg-transparent border-none outline-none font-handwritten text-lg leading-relaxed"
      :style="{ color: '#2d2d2d' }"
      placeholder="在这里写下你的想法..."
      @input="handleInput"
    />
  </div>
</template>
