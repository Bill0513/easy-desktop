<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { MarkdownWidget } from '@/types'
import { marked } from 'marked'

const props = defineProps<{
  widget: MarkdownWidget
}>()

const store = useDesktopStore()
const isEditing = ref(true)

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
})

// 渲染 markdown
const renderedHtml = computed(() => {
  try {
    return marked(props.widget.content || '')
  } catch (e) {
    return '<p>Markdown 解析错误</p>'
  }
})

// 内容变化时保存
const handleInput = () => {
  store.save()
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 模式切换按钮 -->
    <div class="flex justify-end mb-2 gap-2">
      <button
        class="px-3 py-1 text-xs font-handwritten rounded-lg transition-colors"
        :class="isEditing ? 'bg-pencil text-paper' : 'bg-muted hover:bg-muted/70'"
        @click="isEditing = true"
      >
        编辑
      </button>
      <button
        class="px-3 py-1 text-xs font-handwritten rounded-lg transition-colors"
        :class="!isEditing ? 'bg-pencil text-paper' : 'bg-muted hover:bg-muted/70'"
        @click="isEditing = false"
      >
        预览
      </button>
    </div>

    <!-- 编辑模式 -->
    <div v-if="isEditing" class="flex-1 overflow-hidden">
      <textarea
        v-model="widget.content"
        class="w-full h-full resize-none bg-transparent border-none outline-none font-mono text-sm leading-relaxed"
        style="color: #2d2d2d;"
        placeholder="# 标题

在这里使用 Markdown 语法...

- 列表项 1
- 列表项 2

**粗体** *斜体* `代码`"
        @input="handleInput"
      />
    </div>

    <!-- 预览模式 -->
    <div v-else class="flex-1 overflow-auto">
      <div
        class="prose prose-sm max-w-none font-handwritten"
        style="color: #2d2d2d;"
        v-html="renderedHtml"
      />
    </div>
  </div>
</template>

<style scoped>
/* Markdown 预览样式 */
:deep(.prose) {
  font-size: 0.95rem;
  line-height: 1.6;
}

:deep(.prose h1) {
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 2px solid #2d2d2d;
  padding-bottom: 0.25rem;
}

:deep(.prose h2) {
  font-size: 1.3rem;
  font-weight: bold;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

:deep(.prose h3) {
  font-size: 1.1rem;
  font-weight: bold;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

:deep(.prose p) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

:deep(.prose ul),
:deep(.prose ol) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding-left: 1.5rem;
}

:deep(.prose li) {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

:deep(.prose code) {
  background-color: #f5f5f5;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

:deep(.prose pre) {
  background-color: #f5f5f5;
  padding: 0.75rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

:deep(.prose pre code) {
  background-color: transparent;
  padding: 0;
}

:deep(.prose blockquote) {
  border-left: 3px solid #2d2d2d;
  padding-left: 1rem;
  margin-left: 0;
  font-style: italic;
  color: #666;
}

:deep(.prose a) {
  color: #ff4d4d;
  text-decoration: underline;
}

:deep(.prose strong) {
  font-weight: bold;
}

:deep(.prose em) {
  font-style: italic;
}

:deep(.prose hr) {
  border: none;
  border-top: 2px solid #2d2d2d;
  margin: 1rem 0;
}

:deep(.prose table) {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

:deep(.prose th),
:deep(.prose td) {
  border: 1px solid #2d2d2d;
  padding: 0.5rem;
  text-align: left;
}

:deep(.prose th) {
  background-color: #f5f5f5;
  font-weight: bold;
}
</style>
