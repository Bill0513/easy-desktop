<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { MarkdownWidget } from '@/types'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Markdown } from 'tiptap-markdown'

const props = defineProps<{
  widget: MarkdownWidget
}>()

const store = useDesktopStore()
const copied = ref(false)

// 初始化编辑器
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
    }),
    Placeholder.configure({
      placeholder: '输入 / 查看命令，或直接开始输入...',
    }),
    Typography,
    Underline,
    TextStyle,
    Color,
    Markdown.configure({
      html: true,
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ],
  content: typeof props.widget.content === 'string' ? props.widget.content : '',
  editorProps: {
    attributes: {
      class: 'tiptap-editor prose prose-sm max-w-none focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    // 保存为 HTML 格式（TipTap 原生支持）
    const html = editor.getHTML()
    props.widget.content = html
    store.save()
  },
})

// 监听外部内容变化
watch(() => props.widget.content, (newContent) => {
  if (editor.value && typeof newContent === 'string') {
    const currentContent = editor.value.getHTML()
    if (currentContent !== newContent) {
      editor.value.commands.setContent(newContent)
    }
  }
})

// 复制内容
const copyContent = async () => {
  try {
    if (editor.value) {
      const html = editor.value.getHTML()
      await navigator.clipboard.writeText(html)
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    }
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 格式化按钮
const toggleBold = () => editor.value?.chain().focus().toggleBold().run()
const toggleItalic = () => editor.value?.chain().focus().toggleItalic().run()
const toggleUnderline = () => editor.value?.chain().focus().toggleUnderline().run()
const toggleStrike = () => editor.value?.chain().focus().toggleStrike().run()
const toggleCode = () => editor.value?.chain().focus().toggleCode().run()
const toggleCodeBlock = () => editor.value?.chain().focus().toggleCodeBlock().run()
const toggleBlockquote = () => editor.value?.chain().focus().toggleBlockquote().run()
const toggleBulletList = () => editor.value?.chain().focus().toggleBulletList().run()
const toggleOrderedList = () => editor.value?.chain().focus().toggleOrderedList().run()
const setHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => editor.value?.chain().focus().toggleHeading({ level }).run()

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="h-full flex flex-col relative">
    <!-- 工具栏 -->
    <div class="flex items-center gap-1 mb-2 pb-2 border-b-2 border-dashed border-gray-200 flex-wrap">
      <!-- 标题 -->
      <div class="flex gap-1">
        <button
          v-for="level in [1, 2, 3]"
          :key="level"
          class="toolbar-btn"
          :class="{ 'is-active': editor?.isActive('heading', { level }) }"
          @click="setHeading(level as 1 | 2 | 3)"
          :title="`标题 ${level}`"
        >
          H{{ level }}
        </button>
      </div>

      <div class="w-px h-5 bg-gray-300 mx-1"></div>

      <!-- 文本格式 -->
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('bold') }"
        @click="toggleBold"
        title="加粗 (Ctrl+B)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 12h12M6 6h12M6 18h12" />
        </svg>
      </button>

      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('italic') }"
        @click="toggleItalic"
        title="斜体 (Ctrl+I)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m-4 4h8" />
        </svg>
      </button>

      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('underline') }"
        @click="toggleUnderline"
        title="下划线 (Ctrl+U)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20h10M7 4v8a5 5 0 0010 0V4" />
        </svg>
      </button>

      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('strike') }"
        @click="toggleStrike"
        title="删除线"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18M9 5l-2 14m10-14l-2 14" />
        </svg>
      </button>

      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('code') }"
        @click="toggleCode"
        title="行内代码"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </button>

      <div class="w-px h-5 bg-gray-300 mx-1"></div>

      <!-- 列表和引用 -->
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('bulletList') }"
        @click="toggleBulletList"
        title="无序列表"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('orderedList') }"
        @click="toggleOrderedList"
        title="有序列表"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18M3 12h18M3 20h18" />
        </svg>
      </button>

      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('blockquote') }"
        @click="toggleBlockquote"
        title="引用"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('codeBlock') }"
        @click="toggleCodeBlock"
        title="代码块"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      <div class="flex-1"></div>

      <!-- 复制按钮 -->
      <button
        class="toolbar-btn"
        :class="{ 'bg-green-100 border-green-600': copied }"
        @click="copyContent"
        title="复制为 Markdown"
      >
        <svg v-if="!copied" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <svg v-else class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>

    <!-- 编辑器内容 -->
    <div class="flex-1 overflow-y-auto">
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>

<style scoped>
.toolbar-btn {
  @apply px-2 py-1 text-xs font-handwritten rounded border-2 border-pencil hover:bg-muted/50 transition-colors flex items-center justify-center min-w-[32px];
}

.toolbar-btn.is-active {
  @apply bg-blue-100 border-blue-600;
}

/* TipTap 编辑器样式 */
:deep(.tiptap-editor) {
  font-family: 'Patrick Hand', cursive;
  color: #2d2d2d;
  padding: 1rem;
  min-height: 200px;
}

/* 标题样式 */
:deep(.tiptap-editor h1) {
  font-size: 2rem;
  font-weight: bold;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  line-height: 1.2;
}

:deep(.tiptap-editor h2) {
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

:deep(.tiptap-editor h3) {
  font-size: 1.25rem;
  font-weight: bold;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

/* 段落样式 */
:deep(.tiptap-editor p) {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

/* 列表样式 */
:deep(.tiptap-editor ul),
:deep(.tiptap-editor ol) {
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.tiptap-editor li) {
  margin-bottom: 0.25rem;
}

/* 引用样式 */
:deep(.tiptap-editor blockquote) {
  border-left: 3px solid #2d2d2d;
  padding-left: 1rem;
  margin-left: 0;
  margin-bottom: 0.75rem;
  font-style: italic;
  color: #666;
}

/* 代码样式 */
:deep(.tiptap-editor code) {
  background-color: #f5f5f5;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

:deep(.tiptap-editor pre) {
  background-color: #f5f5f5;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
  overflow-x: auto;
}

:deep(.tiptap-editor pre code) {
  background-color: transparent;
  padding: 0;
  font-size: 0.875rem;
}

/* 水平线 */
:deep(.tiptap-editor hr) {
  border: none;
  border-top: 2px solid #2d2d2d;
  margin: 1.5rem 0;
}

/* Placeholder 样式 */
:deep(.tiptap-editor p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

/* 选中文本样式 */
:deep(.tiptap-editor ::selection) {
  background-color: #fff9c4;
}
</style>
