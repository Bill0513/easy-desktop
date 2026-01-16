<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { Widget } from '@/types'
import NoteWidget from './NoteWidget.vue'
import TodoWidget from './TodoWidget.vue'
import TextWidget from './TextWidget.vue'
import ImageWidget from './ImageWidget.vue'
import MarkdownWidgetNotion from './MarkdownWidgetNotion.vue'
import CountdownWidget from './CountdownWidget.vue'
import HandDrawnDialog from '../HandDrawnDialog.vue'

const props = defineProps<{
  widget: Widget
}>()

const emit = defineEmits<{
  dragStart: [e: MouseEvent, widget: Widget]
}>()

const store = useDesktopStore()

// 点击组件任意位置提升层级
const handleWidgetMouseDown = () => {
  store.bringToFront(props.widget.id)
  store.selectWidget(props.widget.id)
}

const isEditingTitle = ref(false)
const titleInput = ref<HTMLInputElement | null>(null)
const editedTitle = ref('')
const isSavingTitle = ref(false)
const widgetContentRef = ref<any>(null)

// 尺寸调整状态
const isResizing = ref(false)
const resizeState = ref({
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
})

const isSelected = computed(() => store.selectedWidgetId === props.widget.id)

// 开始编辑标题
const startEditTitle = () => {
  editedTitle.value = props.widget.title
  isEditingTitle.value = true
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

// 保存标题
const saveTitle = () => {
  if (isSavingTitle.value) return
  isSavingTitle.value = true

  if (editedTitle.value.trim() && editedTitle.value !== props.widget.title) {
    store.updateWidget(props.widget.id, { title: editedTitle.value.trim() })
  }

  isEditingTitle.value = false
  isSavingTitle.value = false
}

// 按回车保存
const handleTitleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    saveTitle()
  } else if (e.key === 'Escape') {
    isEditingTitle.value = false
    isSavingTitle.value = false
  }
}

// 组件样式
const wrapperStyle = computed(() => {
  if (props.widget.isMaximized) {
    return {
      left: '20px',
      top: '100px',
      width: 'calc(100% - 40px)',
      height: 'calc(100% - 160px)',
      zIndex: props.widget.zIndex,
      backgroundColor: props.widget.type === 'note' ? (props.widget as any).color || '#fff9c4' : undefined,
    }
  }
  return {
    left: `${props.widget.x}px`,
    top: `${props.widget.y}px`,
    width: `${props.widget.width}px`,
    height: `${props.widget.height}px`,
    zIndex: props.widget.zIndex,
    backgroundColor: props.widget.type === 'note' ? (props.widget as any).color || '#fff9c4' : undefined,
  }
})

// 获取对应的组件
const widgetComponent = computed(() => {
  switch (props.widget.type) {
    case 'note': return NoteWidget
    case 'todo': return TodoWidget
    case 'text': return TextWidget
    case 'image': return ImageWidget
    case 'markdown': return MarkdownWidgetNotion
    case 'countdown': return CountdownWidget
    default: return null
  }
})

// 开始拖拽
const handleDragStart = (e: MouseEvent) => {
  emit('dragStart', e, props.widget)
}

// 确认对话框状态
const showDeleteConfirm = ref(false)

// 判断组件是否包含用户数据
const hasUserData = computed(() => {
  switch (props.widget.type) {
    case 'note':
      // 便签：检查是否有内容
      return !!(props.widget as any).content?.trim()
    case 'todo':
      // 待办：检查是否有待办项
      return (props.widget as any).items?.length > 0
    case 'text':
      // 文本：检查是否有内容
      return !!(props.widget as any).content?.trim()
    case 'markdown':
      // Markdown：检查是否有内容
      return !!(props.widget as any).content?.trim()
    case 'image':
      // 图片：始终认为有数据
      return true
    case 'countdown':
      // 倒计时：检查是否设置了目标日期
      return !!(props.widget as any).targetDate
    default:
      return false
  }
})

// 删除组件
const handleDeleteClick = () => {
  // 如果组件包含用户数据，显示确认对话框
  if (hasUserData.value) {
    showDeleteConfirm.value = true
  } else {
    // 没有数据，直接删除
    performDelete()
  }
}

// 执行删除操作
const performDelete = () => {
  if (props.widget.type === 'image') {
    store.deleteImageWidget(props.widget.id)
  } else {
    store.deleteWidget(props.widget.id)
  }
}

// 确认删除
const handleConfirmDelete = () => {
  performDelete()
  showDeleteConfirm.value = false
}

// 取消删除
const handleCancelDelete = () => {
  showDeleteConfirm.value = false
}

// 下载图片
const handleDownloadImage = () => {
  if (props.widget.type === 'image') {
    const imageWidget = props.widget as any
    if (!imageWidget.src) return

    const imageDomain = import.meta.env.VITE_IMAGE_DOMAIN || 'https://sunkkk.de5.net'
    const imageUrl = `${imageDomain}/${imageWidget.src}`

    const link = document.createElement('a')
    link.href = imageUrl
    link.download = imageWidget.filename || 'image'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// 是否显示尺寸调整手柄（仅 note、text、markdown、todo、countdown 组件）
const showResizeHandle = computed(() => {
  return ['note', 'text', 'markdown', 'todo', 'countdown'].includes(props.widget.type) && !props.widget.isMaximized
})

// 开始调整尺寸
const startResize = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()

  isResizing.value = true
  resizeState.value = {
    startX: e.clientX,
    startY: e.clientY,
    startWidth: props.widget.width,
    startHeight: props.widget.height,
  }

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

// 调整尺寸中
const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return

  const dx = e.clientX - resizeState.value.startX
  const dy = e.clientY - resizeState.value.startY

  const newWidth = Math.max(200, resizeState.value.startWidth + dx)
  const newHeight = Math.max(150, resizeState.value.startHeight + dy)

  store.updateWidget(props.widget.id, {
    width: newWidth,
    height: newHeight,
  })
}

// 停止调整尺寸
const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  store.save()
}
</script>

<template>
  <div
    class="absolute transition-all duration-200 card-hand-drawn"
    :class="[
      isSelected ? 'ring-2 ring-bluePen/30' : '',
      widget.isMaximized ? 'rounded-none' : '',
      widget.type === 'markdown' ? 'overflow-visible' : ''
    ]"
    :style="wrapperStyle"
    :data-widget-id="widget.id"
    @mousedown="handleWidgetMouseDown"
  >
    <!-- 拖拽手柄（标题栏） -->
    <div
      class="drag-handle h-10 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing select-none border-b-2 border-pencil/20 bg-muted/30 rounded-t-[255px_15px_0_0]"
      :class="[
        widget.isMaximized ? 'rounded-t-none' : ''
      ]"
      @mousedown="handleDragStart"
    >
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <!-- 图片图标 -->
        <span v-if="widget.type === 'image'" class="text-lg">🖼️</span>
        <!-- 拖拽图标 -->
        <svg v-else class="w-4 h-4 text-pencil/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
        </svg>
        <!-- 标题编辑 -->
        <input
          v-if="isEditingTitle"
          ref="titleInput"
          v-model="editedTitle"
          class="flex-1 bg-white border-2 border-pencil px-2 py-1 outline-none font-handwritten text-sm font-medium min-w-0 focus:ring-2 focus:ring-bluePen/30 focus:border-bluePen transition-all"
          style="border-radius: 125px 15px 125px 15px / 15px 125px 15px 125px; box-shadow: 2px 2px 0px 0px #2d2d2d;"
          @blur="saveTitle"
          @keydown="handleTitleKeydown"
          @mousedown.stop
        />
        <span
          v-else
          class="flex-1 font-handwritten text-sm font-medium truncate cursor-text hover:text-bluePen transition-colors"
          @dblclick.stop="startEditTitle"
        >{{ widget.title }}</span>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-1" @mousedown.stop>
        <!-- 下载按钮（仅图片组件） -->
        <button
          v-if="widget.type === 'image'"
          class="w-6 h-6 flex items-center justify-center hover:bg-black/10 rounded transition-colors"
          @click="handleDownloadImage"
          title="下载图片"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </button>

        <!-- 最小化 -->
        <button
          class="w-6 h-6 flex items-center justify-center hover:bg-black/10 rounded transition-colors"
          @click="store.toggleMinimize(widget.id)"
          title="最小化"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>

        <!-- 最大化 -->
        <button
          class="w-6 h-6 flex items-center justify-center hover:bg-black/10 rounded transition-colors"
          @click="store.toggleMaximize(widget.id)"
          :title="widget.isMaximized ? '还原' : '最大化'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!widget.isMaximized" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        </button>

        <!-- 关闭 -->
        <button
          class="w-6 h-6 flex items-center justify-center hover:bg-accent/20 text-accent rounded transition-colors"
          @click="handleDeleteClick"
          title="关闭"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 组件内容 -->
    <div
      class="h-[calc(100%-2.5rem)] p-4"
      :class="widget.type === 'markdown' ? 'markdown-content-wrapper' : 'overflow-auto'"
    >
      <component :is="widgetComponent" :widget="widget as any" ref="widgetContentRef" />
    </div>

    <!-- 尺寸调整手柄 -->
    <div
      v-if="showResizeHandle"
      class="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-20 group"
      @mousedown="startResize"
    >
      <!-- 视觉指示器 -->
      <div class="absolute bottom-1 right-1 w-4 h-4 flex items-end justify-end">
        <svg class="w-3 h-3 text-pencil/40 group-hover:text-pencil/70 transition-colors" fill="currentColor" viewBox="0 0 16 16">
          <path d="M14 14V8h-2v4H8v2h6zM6 14v-2H2V8H0v6h6z"/>
        </svg>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <HandDrawnDialog
      :show="showDeleteConfirm"
      type="confirm"
      title="确认删除"
      :message="`确定要删除「${widget.title}」吗？删除后将无法恢复。`"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
      @close="handleCancelDelete"
    />
  </div>
</template>

<style scoped>
/* Markdown 组件内容区域特殊处理 */
.markdown-content-wrapper {
  overflow: auto;
  position: relative;
}
</style>
