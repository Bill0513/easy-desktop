<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { Widget } from '@/types'
import NoteWidget from './NoteWidget.vue'
import TodoWidget from './TodoWidget.vue'
import BookmarkWidget from './BookmarkWidget.vue'
import FolderWidget from './FolderWidget.vue'
import TextWidget from './TextWidget.vue'
import ImageWidget from './ImageWidget.vue'
import MarkdownWidget from './MarkdownWidget.vue'

const props = defineProps<{
  widget: Widget
}>()

const emit = defineEmits<{
  dragStart: [e: MouseEvent, widget: Widget]
}>()

const store = useDesktopStore()
const isEditingTitle = ref(false)
const titleInput = ref<HTMLInputElement | null>(null)
const editedTitle = ref('')
const showDeleteConfirm = ref(false)

const isSelected = computed(() => store.selectedWidgetId === props.widget.id)

// 文件夹是否有组件正在被拖拽到上面
const isDragOverFolder = computed(() => {
  return props.widget.type === 'folder' &&
    store.draggedWidgetId &&
    store.draggedWidgetId !== props.widget.id
})

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
  if (editedTitle.value.trim() && editedTitle.value !== props.widget.title) {
    store.updateWidget(props.widget.id, { title: editedTitle.value.trim() })
  }
  isEditingTitle.value = false
}

// 按回车保存
const handleTitleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    saveTitle()
  } else if (e.key === 'Escape') {
    isEditingTitle.value = false
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
    case 'bookmark': return BookmarkWidget
    case 'folder': return FolderWidget
    case 'text': return TextWidget
    case 'image': return ImageWidget
    case 'markdown': return MarkdownWidget
    default: return null
  }
})

// 开始拖拽
const handleDragStart = (e: MouseEvent) => {
  emit('dragStart', e, props.widget)
}

// 获取文件夹内有效子组件数量
const folderChildrenCount = computed(() => {
  if (props.widget.type !== 'folder') return 0
  return props.widget.children.filter(id => store.getWidgetById(id)).length
})

// 显示删除确认框
const handleDeleteClick = () => {
  if (props.widget.type === 'folder' && folderChildrenCount.value > 0) {
    showDeleteConfirm.value = true
  } else if (props.widget.type === 'image') {
    store.deleteImageWidget(props.widget.id)
  } else {
    store.deleteWidget(props.widget.id)
  }
}

// 确认删除文件夹及子组件
const confirmDelete = () => {
  store.deleteFolderWithChildren(props.widget.id)
  showDeleteConfirm.value = false
}

// 取消删除
const cancelDelete = () => {
  showDeleteConfirm.value = false
}
</script>

<template>
  <div
    class="absolute transition-all duration-200"
    :class="[
      isSelected ? 'ring-2 ring-bluePen/30' : '',
      widget.isMaximized ? 'rounded-none' : '',
      widget.type === 'folder' ? 'folder-widget' : 'card-hand-drawn',
      isDragOverFolder ? 'ring-4 ring-bluePen/50 ring-offset-2 scale-105' : ''
    ]"
    :style="wrapperStyle"
    :data-widget-id="widget.id"
  >
    <!-- 拖拽手柄（标题栏） -->
    <div
      class="drag-handle h-10 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing select-none"
      :class="[
        'border-b-2 border-pencil/20',
        widget.type === 'folder' ? 'bg-[#e8dcc8]' : 'bg-muted/30',
        !widget.isMaximized && widget.type !== 'folder' ? 'rounded-t-[255px_15px_0_0]' : ''
      ]"
      @mousedown="handleDragStart"
    >
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <!-- 文件夹图标 -->
        <span v-if="widget.type === 'folder'" class="text-lg">📁</span>
        <!-- 图片图标 -->
        <span v-else-if="widget.type === 'image'" class="text-lg">🖼️</span>
        <!-- 拖拽图标 -->
        <svg v-else class="w-4 h-4 text-pencil/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
        </svg>
        <!-- 标题编辑 -->
        <input
          v-if="isEditingTitle"
          ref="titleInput"
          v-model="editedTitle"
          class="flex-1 bg-transparent border-none outline-none font-handwritten text-sm font-medium min-w-0"
          @blur="saveTitle"
          @keydown="handleTitleKeydown"
        />
        <span
          v-else
          class="font-handwritten text-sm font-medium truncate cursor-text hover:text-pencil/80"
          @dblclick="startEditTitle"
        >{{ widget.title }}</span>
        <!-- 文件夹显示子组件数量 -->
        <span v-if="widget.type === 'folder' && widget.children.length > 0" class="text-xs text-pencil/60 flex-shrink-0">
          ({{ widget.children.length }}个项目)
        </span>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-1" @mousedown.stop>
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

    <!-- 文件夹的放置区域提示 -->
    <div
      v-if="widget.type === 'folder'"
      class="absolute inset-0 pointer-events-none z-10 transition-opacity"
      :class="isDragOverFolder ? 'opacity-100' : 'opacity-0'"
      style="top: 2.5rem; height: calc(100% - 2.5rem);"
    >
      <div class="h-full flex items-center justify-center border-2 border-dashed border-bluePen/50 m-4 rounded-lg bg-bluePen/5">
        <div class="text-center">
          <div class="text-4xl mb-2">📁</div>
          <p class="font-handwritten text-bluePen font-medium">拖放到这里</p>
        </div>
      </div>
    </div>

    <!-- 组件内容 -->
    <div
      class="h-[calc(100%-2.5rem)] overflow-auto p-4"
      :class="{ 'pointer-events-none': isDragOverFolder && widget.type === 'folder' }"
    >
      <component :is="widgetComponent" :widget="widget as any" />
    </div>

    <!-- 删除确认对话框 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDeleteConfirm"
          class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
          @click="cancelDelete"
        >
          <div
            class="card-hand-drawn p-6 max-w-sm mx-4"
            @click.stop
          >
            <div class="text-center">
              <div class="text-4xl mb-3">⚠️</div>
              <h3 class="font-handwritten text-lg font-medium mb-2">确认删除</h3>
              <p class="font-handwritten text-sm text-pencil/60 mb-4">
                文件夹内有 {{ folderChildrenCount }} 个组件，删除文件夹将同时删除所有组件。
              </p>
              <p class="font-handwritten text-sm text-pencil/60 mb-4">
                确定要继续吗？
              </p>
              <div class="flex justify-center gap-3">
                <button
                  class="px-4 py-2 font-handwritten text-sm border-2 border-pencil rounded-lg hover:bg-muted/50 transition-colors"
                  @click="cancelDelete"
                >
                  取消
                </button>
                <button
                  class="px-4 py-2 font-handwritten text-sm bg-accent text-white border-2 border-accent rounded-lg hover:bg-accent/80 transition-colors"
                  @click="confirmDelete"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.folder-widget {
  background-color: #fff;
  border: 3px solid #8b7355;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  box-shadow: 4px 4px 0px 0px #8b7355;
}

.folder-widget:hover {
  box-shadow: 6px 6px 0px 0px #8b7355;
}
</style>
