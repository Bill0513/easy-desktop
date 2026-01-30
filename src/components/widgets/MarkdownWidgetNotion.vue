<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { MarkdownWidget } from '@/types'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Markdown } from 'tiptap-markdown'

const props = defineProps<{
  widget: MarkdownWidget
}>()

const store = useDesktopStore()
const copied = ref(false)
const showSlashMenu = ref(false)
const selectedSlashIndex = ref(0)
const slashMenuPosition = ref({ top: 0, left: 0 })
const slashMenuRef = ref<HTMLElement | null>(null)

// 计算光标位置
const updateSlashMenuPosition = () => {
  if (!editor.value) return

  const { state, view } = editor.value
  const { from } = state.selection

  // 获取光标的 DOM 坐标
  const coords = view.coordsAtPos(from)

  // 计算相对于视口的位置
  slashMenuPosition.value = {
    top: coords.bottom + 4, // 光标下方 4px
    left: coords.left,
  }
}

// 滚动到选中的菜单项
const scrollToSelectedItem = () => {
  if (!slashMenuRef.value) return

  const selectedItem = slashMenuRef.value.querySelector('.slash-menu-item.is-selected')
  if (selectedItem) {
    selectedItem.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    })
  }
}

// 斜杠命令列表
const slashCommands = [
  { title: '标题 1', icon: 'H1', command: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: '标题 2', icon: 'H2', command: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: '标题 3', icon: 'H3', command: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run() },
  { title: '无序列表', icon: '•', command: () => editor.value?.chain().focus().toggleBulletList().run() },
  { title: '有序列表', icon: '1.', command: () => editor.value?.chain().focus().toggleOrderedList().run() },
  { title: '引用', icon: '"', command: () => editor.value?.chain().focus().toggleBlockquote().run() },
  { title: '代码块', icon: '</>', command: () => editor.value?.chain().focus().toggleCodeBlock().run() },
  { title: '表格', icon: '⊞', command: () => editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
]

// 初始化编辑器
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') {
          return '标题'
        }
        return '输入 / 查看命令，或直接开始输入...'
      },
    }),
    Typography,
    Underline,
    TextStyle,
    Color,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
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
    handleKeyDown: (view, event) => {
      // 处理斜杠命令菜单的键盘事件
      if (showSlashMenu.value) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          selectedSlashIndex.value = (selectedSlashIndex.value + 1) % slashCommands.length
          // 滚动到选中项
          setTimeout(() => scrollToSelectedItem(), 0)
          return true
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          selectedSlashIndex.value = (selectedSlashIndex.value - 1 + slashCommands.length) % slashCommands.length
          // 滚动到选中项
          setTimeout(() => scrollToSelectedItem(), 0)
          return true
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          executeSlashCommand(selectedSlashIndex.value)
          return true
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          showSlashMenu.value = false
          return true
        }
      }

      // 检测斜杠输入
      if (event.key === '/') {
        const { state } = view
        const { from } = state.selection
        const textBefore = state.doc.textBetween(Math.max(0, from - 1), from, '\n')

        // 如果是在行首或空格后输入斜杠，显示菜单
        if (textBefore === '' || textBefore === ' ') {
          setTimeout(() => {
            showSlashMenu.value = true
            selectedSlashIndex.value = 0
            updateSlashMenuPosition()
          }, 10)
        }
      }

      return false
    },
  },
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    props.widget.content = html
    store.save()

    // 检查是否需要隐藏斜杠菜单
    const { state } = editor
    const { from } = state.selection
    const textBefore = state.doc.textBetween(Math.max(0, from - 10), from, '\n')

    if (!textBefore.includes('/')) {
      showSlashMenu.value = false
    }
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

// 执行斜杠命令
const executeSlashCommand = (index: number) => {
  if (!editor.value) return

  // 删除斜杠字符
  const { state } = editor.value
  const { from } = state.selection
  const textBefore = state.doc.textBetween(Math.max(0, from - 10), from, '\n')
  const slashIndex = textBefore.lastIndexOf('/')

  if (slashIndex !== -1) {
    const deleteFrom = from - (textBefore.length - slashIndex)
    editor.value.chain().focus().deleteRange({ from: deleteFrom, to: from }).run()
  }

  // 执行命令
  slashCommands[index].command()
  showSlashMenu.value = false
}

// 复制内容
const copyContent = async () => {
  try {
    if (editor.value) {
      // 使用 Markdown 扩展获取 Markdown 格式
      // @ts-ignore - tiptap-markdown 扩展的类型定义
      const markdown = editor.value.storage.markdown?.getMarkdown?.() || editor.value.getText()
      await navigator.clipboard.writeText(markdown)
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

// 表格操作
const insertTable = () => editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
const addColumnAfter = () => editor.value?.chain().focus().addColumnAfter().run()
const deleteColumn = () => editor.value?.chain().focus().deleteColumn().run()
const addRowAfter = () => editor.value?.chain().focus().addRowAfter().run()
const deleteRow = () => editor.value?.chain().focus().deleteRow().run()

// 检查是否在表格中
const isInTable = computed(() => editor.value?.isActive('table'))

// 检查是否激活
const isBold = computed(() => editor.value?.isActive('bold'))
const isItalic = computed(() => editor.value?.isActive('italic'))
const isUnderline = computed(() => editor.value?.isActive('underline'))
const isStrike = computed(() => editor.value?.isActive('strike'))
const isCode = computed(() => editor.value?.isActive('code'))

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="h-full flex flex-col relative notion-editor">
    <!-- 顶部工具栏 -->
    <div class="flex items-center gap-1 mb-2 pb-2 border-b-2 border-dashed border-gray-200 flex-wrap">
      <!-- 标题按钮 -->
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

      <div class="w-px h-5 bg-gray-300 mx-1"></div>

      <!-- 文本格式 -->
      <button
        class="toolbar-btn"
        :class="{ 'is-active': isBold }"
        @click="toggleBold"
        title="加粗 (Ctrl+B)"
      >
        <strong>B</strong>
      </button>

      <button
        class="toolbar-btn"
        :class="{ 'is-active': isItalic }"
        @click="toggleItalic"
        title="斜体 (Ctrl+I)"
      >
        <em>I</em>
      </button>

      <button
        class="toolbar-btn"
        :class="{ 'is-active': isUnderline }"
        @click="toggleUnderline"
        title="下划线 (Ctrl+U)"
      >
        <u>U</u>
      </button>

      <button
        class="toolbar-btn"
        :class="{ 'is-active': isStrike }"
        @click="toggleStrike"
        title="删除线"
      >
        <s>S</s>
      </button>

      <button
        class="toolbar-btn"
        :class="{ 'is-active': isCode }"
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

      <div class="w-px h-5 bg-gray-300 mx-1"></div>

      <!-- 表格按钮 -->
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('table') }"
        @click="insertTable"
        title="插入表格"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>

      <!-- 表格操作按钮（仅在表格中显示） -->
      <template v-if="isInTable">
        <!-- 行操作 -->
        <button
          class="toolbar-btn"
          @click="addRowAfter"
          title="在下方插入行"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m-6-6h12" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16" />
          </svg>
        </button>

        <button
          class="toolbar-btn"
          @click="deleteRow"
          title="删除行"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12l12 0" opacity="0.5" />
          </svg>
        </button>

        <div class="w-px h-5 bg-gray-300 mx-1"></div>

        <!-- 列操作 -->
        <button
          class="toolbar-btn"
          @click="addColumnAfter"
          title="在右侧插入列"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m-6-6h12" transform="rotate(90 12 12)" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16" />
          </svg>
        </button>

        <button
          class="toolbar-btn"
          @click="deleteColumn"
          title="删除列"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 20V4" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12" opacity="0.5" />
          </svg>
        </button>
      </template>

      <div class="flex-1"></div>

      <!-- 复制按钮 -->
      <button
        class="toolbar-btn"
        :class="{ 'bg-green-100 border-green-600': copied }"
        @click="copyContent"
        title="复制内容"
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
    <div class="flex-1 overflow-y-auto relative">
      <EditorContent :editor="editor" />

      <!-- 斜杠命令菜单 -->
      <Teleport to="body">
        <div
          v-if="showSlashMenu"
          ref="slashMenuRef"
          class="slash-menu"
          :style="{
            position: 'fixed',
            top: `${slashMenuPosition.top}px`,
            left: `${slashMenuPosition.left}px`,
          }"
        >
          <div
            v-for="(command, index) in slashCommands"
            :key="index"
            class="slash-menu-item"
            :class="{ 'is-selected': index === selectedSlashIndex }"
            @click="executeSlashCommand(index)"
            @mouseenter="selectedSlashIndex = index"
          >
            <span class="slash-menu-icon">{{ command.icon }}</span>
            <span class="slash-menu-title">{{ command.title }}</span>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.toolbar-btn {
  @apply px-2 py-1 text-xs font-handwritten rounded border-2 border-border-primary transition-all flex items-center justify-center min-w-[32px] text-text-primary;
}

.toolbar-btn:hover {
  background-color: var(--color-muted);
  opacity: 0.5;
  transform: scale(1.1);
}

.toolbar-btn.is-active {
  @apply bg-blue-100 border-blue-600;
}

/* TipTap 编辑器样式 */
:deep(.tiptap-editor) {
  font-family: 'Patrick Hand', cursive;
  color: var(--color-text-primary);
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

:deep(.tiptap-editor ul) {
  list-style-type: disc;
}

:deep(.tiptap-editor ol) {
  list-style-type: decimal;
}

:deep(.tiptap-editor li) {
  margin-bottom: 0.25rem;
  display: list-item;
}

:deep(.tiptap-editor ul ul) {
  list-style-type: circle;
}

:deep(.tiptap-editor ul ul ul) {
  list-style-type: square;
}

/* 引用样式 */
:deep(.tiptap-editor blockquote) {
  border-left: 3px solid var(--color-border-primary);
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
  border-top: 2px solid var(--color-border-primary);
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

/* Notion 风格的选中节点 */
:deep(.tiptap-editor .ProseMirror-selectednode) {
  outline: 2px solid #4d7cff;
  outline-offset: 2px;
}

/* 斜杠命令菜单样式 */
.slash-menu {
  z-index: 99999;
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: 4px 4px 0px var(--color-border-primary);
  padding: 0.5rem;
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
}

.slash-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;
  font-family: 'Patrick Hand', cursive;
}

.slash-menu-item:hover,
.slash-menu-item.is-selected {
  background-color: #f5f5f5;
}

.slash-menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-weight: bold;
  color: #666;
}

.slash-menu-title {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text-primary);
}

/* 表格样式 */
:deep(.tiptap-editor table) {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 1rem 0;
  overflow: hidden;
  border: 2px solid var(--color-border-primary);
}

:deep(.tiptap-editor td),
:deep(.tiptap-editor th) {
  min-width: 1em;
  border: 2px solid var(--color-border-primary);
  padding: 0.5rem 0.75rem;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

:deep(.tiptap-editor th) {
  font-weight: bold;
  text-align: left;
  background-color: #f5f5f5;
}

:deep(.tiptap-editor .selectedCell:after) {
  z-index: 2;
  position: absolute;
  content: "";
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(77, 124, 255, 0.1);
  pointer-events: none;
}

:deep(.tiptap-editor .column-resize-handle) {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: -2px;
  width: 4px;
  background-color: #4d7cff;
  pointer-events: none;
}

:deep(.tiptap-editor .tableWrapper) {
  overflow-x: auto;
  margin: 1rem 0;
}
</style>
