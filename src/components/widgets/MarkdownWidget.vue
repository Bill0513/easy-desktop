<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { MarkdownWidget } from '@/types'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Code from '@editorjs/code'
import Quote from '@editorjs/quote'
import Delimiter from '@editorjs/delimiter'
import InlineCode from '@editorjs/inline-code'
import Marker from '@editorjs/marker'
import Underline from '@editorjs/underline'

const props = defineProps<{
  widget: MarkdownWidget
}>()

const store = useDesktopStore()
const editorContainer = ref<HTMLElement | null>(null)
let editor: EditorJS | null = null
const copied = ref(false)

// 初始化 Editor.js
const initEditor = async () => {
  if (!editorContainer.value) return

  try {
    // 解析现有的 markdown 内容为 Editor.js 数据格式
    let initialData = props.widget.content

    // 如果内容是字符串（旧的 markdown 格式），转换为 Editor.js 格式
    if (typeof initialData === 'string') {
      initialData = {
        time: Date.now(),
        blocks: parseMarkdownToBlocks(initialData)
      }
    }

    editor = new EditorJS({
      holder: editorContainer.value,
      tools: {
        header: {
          class: Header,
          inlineToolbar: ['marker', 'link'],
          config: {
            placeholder: '输入标题',
            levels: [1, 2, 3, 4, 5, 6],
            defaultLevel: 2
          }
        },
        list: {
          class: List,
          inlineToolbar: true,
          config: {
            defaultStyle: 'unordered'
          }
        },
        code: {
          class: Code,
          config: {
            placeholder: '输入代码'
          }
        },
        quote: {
          class: Quote,
          inlineToolbar: true,
          config: {
            quotePlaceholder: '输入引用',
            captionPlaceholder: '引用来源'
          }
        },
        delimiter: Delimiter,
        inlineCode: {
          class: InlineCode,
          shortcut: 'CMD+SHIFT+M'
        },
        marker: {
          class: Marker,
          shortcut: 'CMD+SHIFT+M'
        },
        underline: {
          class: Underline,
          shortcut: 'CMD+U'
        }
      },
      data: initialData,
      onChange: async () => {
        if (editor) {
          const outputData = await editor.save()
          props.widget.content = outputData
          store.save()
        }
      },
      placeholder: '点击开始编辑，输入 / 查看所有命令',
      minHeight: 200
    })

    await editor.isReady
  } catch (error) {
    console.error('Editor.js 初始化失败:', error)
  }
}

// 简单的 Markdown 转 Editor.js blocks 的函数
const parseMarkdownToBlocks = (markdown: string) => {
  if (!markdown || markdown.trim() === '') {
    return []
  }

  const lines = markdown.split('\n')
  const blocks: any[] = []
  let currentBlock: any = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 标题
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      blocks.push({
        type: 'header',
        data: {
          text: headerMatch[2],
          level: headerMatch[1].length
        }
      })
      continue
    }

    // 代码块
    if (line.trim().startsWith('```')) {
      if (currentBlock && currentBlock.type === 'code') {
        blocks.push(currentBlock)
        currentBlock = null
      } else {
        currentBlock = {
          type: 'code',
          data: {
            code: ''
          }
        }
      }
      continue
    }

    if (currentBlock && currentBlock.type === 'code') {
      currentBlock.data.code += (currentBlock.data.code ? '\n' : '') + line
      continue
    }

    // 引用
    if (line.trim().startsWith('>')) {
      blocks.push({
        type: 'quote',
        data: {
          text: line.replace(/^>\s*/, ''),
          caption: ''
        }
      })
      continue
    }

    // 分隔线
    if (line.trim().match(/^[-*_]{3,}$/)) {
      blocks.push({
        type: 'delimiter',
        data: {}
      })
      continue
    }

    // 列表
    const listMatch = line.match(/^[\s]*[-*+]\s+(.+)$/)
    if (listMatch) {
      if (currentBlock && currentBlock.type === 'list') {
        currentBlock.data.items.push(listMatch[1])
      } else {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = {
          type: 'list',
          data: {
            style: 'unordered',
            items: [listMatch[1]]
          }
        }
      }
      continue
    }

    const orderedListMatch = line.match(/^[\s]*\d+\.\s+(.+)$/)
    if (orderedListMatch) {
      if (currentBlock && currentBlock.type === 'list') {
        currentBlock.data.items.push(orderedListMatch[1])
      } else {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = {
          type: 'list',
          data: {
            style: 'ordered',
            items: [orderedListMatch[1]]
          }
        }
      }
      continue
    }

    // 如果有未完成的列表块，先保存
    if (currentBlock && currentBlock.type === 'list' && line.trim() !== '') {
      blocks.push(currentBlock)
      currentBlock = null
    }

    // 段落
    if (line.trim() !== '') {
      blocks.push({
        type: 'paragraph',
        data: {
          text: line
        }
      })
    }
  }

  // 保存最后一个块
  if (currentBlock) {
    blocks.push(currentBlock)
  }

  return blocks
}

// 复制内容
const copyContent = async () => {
  try {
    if (editor) {
      const outputData = await editor.save()
      // 将 Editor.js 数据转换为 Markdown
      const markdown = blocksToMarkdown(outputData.blocks)
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

// 将 Editor.js blocks 转换为 Markdown
const blocksToMarkdown = (blocks: any[]): string => {
  return blocks.map(block => {
    switch (block.type) {
      case 'header':
        return '#'.repeat(block.data.level) + ' ' + block.data.text
      case 'paragraph':
        return block.data.text
      case 'list':
        return block.data.items.map((item: string, index: number) => {
          if (block.data.style === 'ordered') {
            return `${index + 1}. ${item}`
          }
          return `- ${item}`
        }).join('\n')
      case 'code':
        return '```\n' + block.data.code + '\n```'
      case 'quote':
        return '> ' + block.data.text + (block.data.caption ? '\n> — ' + block.data.caption : '')
      case 'delimiter':
        return '---'
      default:
        return ''
    }
  }).join('\n\n')
}

onMounted(() => {
  initEditor()
})

onBeforeUnmount(() => {
  if (editor) {
    editor.destroy()
    editor = null
  }
})

// 监听 widget 内容变化（外部更新）
watch(() => props.widget.content, (newContent) => {
  if (editor && newContent) {
    // 如果是字符串，需要重新初始化
    if (typeof newContent === 'string') {
      editor.destroy()
      initEditor()
    }
  }
})
</script>

<template>
  <div class="h-full flex flex-col relative">
    <!-- 工具栏 -->
    <div class="flex justify-end mb-2 relative z-10">
      <!-- 复制按钮 -->
      <button
        class="px-2 py-1 text-xs font-handwritten rounded border-2 border-pencil hover:bg-muted/50 transition-colors flex items-center gap-1"
        :class="{ 'bg-green-100 border-green-600': copied }"
        @click="copyContent"
        title="复制为 Markdown"
      >
        <svg v-if="!copied" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <svg v-else class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>{{ copied ? '已复制' : '复制' }}</span>
      </button>
    </div>

    <!-- Editor.js 容器 -->
    <div
      ref="editorContainer"
      class="flex-1 editor-container"
      style="overflow-y: auto; overflow-x: hidden;"
    />
  </div>
</template>

<style scoped>
/* Editor.js 容器样式 */
.editor-container {
  font-family: 'Patrick Hand', cursive;
  color: #2d2d2d;
  position: relative;
}

/* 自定义 Editor.js 样式 */
:deep(.codex-editor) {
  font-family: 'Patrick Hand', cursive;
}

:deep(.codex-editor__redactor) {
  padding-bottom: 100px !important;
}

/* 修复工具栏被遮挡的问题 */
:deep(.ce-toolbar) {
  z-index: 1000;
  position: absolute;
  pointer-events: none;
}

:deep(.ce-toolbar__content) {
  pointer-events: auto;
}

:deep(.ce-toolbar__plus),
:deep(.ce-toolbar__actions) {
  pointer-events: auto;
}

/* 工具箱弹出位置调整 */
:deep(.ce-popover) {
  z-index: 10001;
  pointer-events: auto;
}

:deep(.ce-popover__container) {
  z-index: 10001;
}

:deep(.ce-toolbox) {
  z-index: 10001;
  pointer-events: auto;
}

:deep(.ce-block__content) {
  max-width: 100%;
  margin-left: 70px;
}

:deep(.ce-toolbar__content) {
  max-width: 100%;
}

:deep(.ce-toolbar__actions.ce-toolbar__actions--opened) {
  position: revert;
}

:deep(.ce-paragraph) {
  font-size: 0.95rem;
  line-height: 1.6;
}

:deep(.ce-header) {
  font-weight: bold;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

:deep(.ce-code__textarea) {
  background-color: #f5f5f5;
  border-radius: 0.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

:deep(.ce-quote) {
  border-left: 3px solid #2d2d2d;
  padding-left: 1rem;
  font-style: italic;
  color: #666;
}

:deep(.ce-delimiter) {
  border-top: 2px solid #2d2d2d;
  margin: 1rem 0;
}

/* 手绘风格的工具栏 */
:deep(.ce-toolbar__plus),
:deep(.ce-toolbar__settings-btn) {
  border-radius: 8px;
  transition: all 0.2s;
}

:deep(.ce-toolbar__plus:hover),
:deep(.ce-toolbar__settings-btn:hover) {
  background-color: #f5f5f5;
}

/* 手绘风格的内联工具栏 */
:deep(.ce-inline-toolbar) {
  border-radius: 8px;
  box-shadow: 2px 2px 0px #2d2d2d;
}

:deep(.ce-inline-tool) {
  border-radius: 4px;
}

:deep(.ce-inline-tool:hover) {
  background-color: #f5f5f5;
}
</style>
