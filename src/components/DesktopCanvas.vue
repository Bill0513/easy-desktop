<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import WidgetWrapper from './widgets/WidgetWrapper.vue'
import Taskbar from './Taskbar.vue'
import type { Widget } from '@/types'

const store = useDesktopStore()

// 网格吸附配置
const GRID_SIZE = 20

// 拖拽状态
const dragState = ref({
  isDragging: false,
  widgetId: null as string | null,
  startX: 0,
  startY: 0,
  initialX: 0,
  initialY: 0,
})

// 桌面点击 - 取消选中
const handleDesktopClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    store.selectWidget(null)
  }
}

// 开始拖拽
const startDrag = (e: MouseEvent, widget: Widget) => {
  // 最大化时不允许拖拽
  if (widget.isMaximized) return

  e.preventDefault()
  e.stopPropagation()

  store.bringToFront(widget.id)
  store.selectWidget(widget.id)

  // 设置拖拽中的 widget ID（用于拖放到文件夹）
  store.draggedWidgetId = widget.id

  dragState.value = {
    isDragging: true,
    widgetId: widget.id,
    startX: e.clientX,
    startY: e.clientY,
    initialX: widget.x,
    initialY: widget.y,
  }

  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

// 拖拽中
const handleDrag = (e: MouseEvent) => {
  if (!dragState.value.isDragging || !dragState.value.widgetId) return

  const dx = e.clientX - dragState.value.startX
  const dy = e.clientY - dragState.value.startY

  let newX = dragState.value.initialX + dx
  let newY = dragState.value.initialY + dy

  // 网格吸附
  newX = Math.round(newX / GRID_SIZE) * GRID_SIZE
  newY = Math.round(newY / GRID_SIZE) * GRID_SIZE

  // 边界限制
  newX = Math.max(0, Math.min(newX, window.innerWidth - 200))
  newY = Math.max(0, Math.min(newY, window.innerHeight - 100))

  // 使用不保存的方法更新位置，避免拖动时频繁保存导致的卡顿
  store.updatePositionNoSave(dragState.value.widgetId, newX, newY)

  // 只在拖拽开始时检测是否在文件夹上方的逻辑，不在拖拽中频繁更新
  // 这样避免误判
}

// 停止拖拽
const stopDrag = () => {
  const draggedId = dragState.value.widgetId
  const startX = dragState.value.startX
  const initialX = dragState.value.initialX
  const initialY = dragState.value.initialY

  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)

  // 获取拖拽结束时的最终位置
  if (!draggedId) {
    dragState.value.widgetId = null
    return
  }
  
  const draggedWidget = store.getWidgetById(draggedId)
  if (draggedWidget) {
    // 计算拖拽结束时鼠标的位置
    const mouseEndX = startX + (draggedWidget.x - initialX)
    const mouseEndY = dragState.value.startY + (draggedWidget.y - initialY)

    // 检测拖拽结束时鼠标位置是否在文件夹范围内
    const folders = store.widgets.filter(w => w.type === 'folder')
    for (const folder of folders) {
      if (folder.id !== draggedId &&
          mouseEndX >= folder.x && mouseEndX <= folder.x + (folder.width || 280) &&
          mouseEndY >= folder.y && mouseEndY <= folder.y + (folder.height || 200)) {
        // 鼠标释放时在文件夹内，将组件加入文件夹
        store.addToFolder(folder.id, draggedId)
        break
      }
    }
  }

  // 拖拽结束后保存
  store.save()

  store.draggedWidgetId = null
  store.hoveredFolderId = null
  dragState.value = {
    isDragging: false,
    widgetId: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  }
}

// 可见的组件（未最小化的）
const visibleWidgets = computed(() => {
  return store.widgets.filter(w => !w.isMinimized)
})

// 处理粘贴事件
const handlePaste = async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items

  if (!items) return

  for (const item of items) {
    // 处理图片
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) {
        // 上传到 R2
        const formData = new FormData()
        formData.append('file', file)

        try {
          const response = await fetch('/api/image', {
            method: 'POST',
            body: formData,
          })

          if (response.ok) {
            const { url, filename } = await response.json()
            store.createWidget({
              type: 'image',
              src: url,
              filename,
              x: 100,
              y: 100,
            })
          }
        } catch (error) {
          console.error('Upload failed:', error)
        }
      }
      break
    }

    // 处理文本
    if (item.type === 'text/plain') {
      e.preventDefault()
      const text = await new Promise<string>((resolve) => {
        item.getAsString((s) => resolve(s))
      })

      if (text.trim()) {
        store.createWidget({
          type: 'note',
          content: text,
          x: 100,
          y: 100,
        })
      }
      break
    }
  }
}

// 挂载和卸载粘贴事件监听
onMounted(() => {
  document.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})
</script>

<template>
  <div
    class="w-full h-full relative"
    @click="handleDesktopClick"
  >
    <!-- 背景装饰 -->
    <div class="absolute inset-0 pointer-events-none opacity-5">
      <svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2d2d2d" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>

    <!-- 组件列表 -->
    <WidgetWrapper
      v-for="widget in visibleWidgets"
      :key="widget.id"
      :widget="widget"
      @drag-start="startDrag"
    />

    <!-- 任务栏（显示最小化的组件） -->
    <Taskbar />

    <!-- 空状态提示 -->
    <div
      v-if="visibleWidgets.length === 0 && !store.isLoading && store.minimizedWidgets.length === 0"
      class="absolute inset-0 flex items-center justify-center"
    >
      <div class="text-center text-pencil/50">
        <div class="text-6xl mb-4">📋</div>
        <p class="text-2xl font-handwritten">点击上方工具栏添加组件</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div
      v-if="store.isLoading"
      class="absolute inset-0 flex items-center justify-center bg-paper/80"
    >
      <div class="card-hand-drawn p-8 text-center">
        <div class="text-4xl animate-bounce-slow mb-4">📂</div>
        <p class="text-xl font-handwritten">加载中...</p>
      </div>
    </div>
  </div>
</template>
