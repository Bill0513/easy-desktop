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
  currentX: 0,
  currentY: 0,
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

  dragState.value = {
    isDragging: true,
    widgetId: widget.id,
    startX: e.clientX,
    startY: e.clientY,
    initialX: widget.x,
    initialY: widget.y,
    currentX: e.clientX,
    currentY: e.clientY,
  }

  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)

  // 启动 requestAnimationFrame 循环
  if (rafId === null) {
    rafId = requestAnimationFrame(updateDragPosition)
  }
}

// 拖拽中
const handleDrag = (e: MouseEvent) => {
  if (!dragState.value.isDragging || !dragState.value.widgetId) return

  // 更新当前鼠标位置
  dragState.value.currentX = e.clientX
  dragState.value.currentY = e.clientY
}

// 使用 requestAnimationFrame 优化拖拽渲染
let rafId: number | null = null
const updateDragPosition = () => {
  if (!dragState.value.isDragging || !dragState.value.widgetId) {
    rafId = null
    return
  }

  const dx = dragState.value.currentX - dragState.value.startX
  const dy = dragState.value.currentY - dragState.value.startY

  // 考虑缩放比例：鼠标移动距离需要除以缩放比例
  const scale = store.canvasScale / 100
  let newX = dragState.value.initialX + dx / scale
  let newY = dragState.value.initialY + dy / scale

  // 网格吸附
  newX = Math.round(newX / GRID_SIZE) * GRID_SIZE
  newY = Math.round(newY / GRID_SIZE) * GRID_SIZE

  // 边界限制（考虑缩放后的实际可用空间）
  const maxX = (window.innerWidth / scale) - 200
  const maxY = (window.innerHeight / scale) - 100
  newX = Math.max(0, Math.min(newX, maxX))
  newY = Math.max(0, Math.min(newY, maxY))

  // 使用不保存的方法更新位置，避免拖动时频繁保存导致的卡顿
  store.updatePositionNoSave(dragState.value.widgetId, newX, newY)

  // 继续下一帧
  rafId = requestAnimationFrame(updateDragPosition)
}

// 停止拖拽
const stopDrag = () => {
  const draggedId = dragState.value.widgetId

  // 取消 requestAnimationFrame
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)

  // 拖拽结束后保存
  if (draggedId) {
    store.save()
  }

  dragState.value = {
    isDragging: false,
    widgetId: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    currentX: 0,
    currentY: 0,
  }
}

// 可见的组件（未最小化的）
const visibleWidgets = computed(() => {
  return store.widgets.filter(w => !w.isMinimized)
})

// 处理粘贴事件 - 只在桌面空白区域粘贴时创建 widget
const handlePaste = async (e: ClipboardEvent) => {
  // 只在桌面 tab 下处理粘贴
  if (store.activeTab !== 'desktop') return

  // 检查当前焦点元素，如果在可编辑元素上，不拦截粘贴事件
  const activeElement = document.activeElement
  if (activeElement) {
    const tagName = activeElement.tagName.toLowerCase()
    const isEditable =
      tagName === 'input' ||
      tagName === 'textarea' ||
      (activeElement as HTMLElement).isContentEditable

    // 如果焦点在可编辑元素上，让浏览器处理默认粘贴行为
    if (isEditable) {
      return
    }

    // 检查是否在富文本编辑器内（通过检查父元素）
    let element = activeElement as HTMLElement
    while (element) {
      if (element.classList?.contains('ProseMirror') ||
          element.classList?.contains('tiptap-editor')) {
        return
      }
      element = element.parentElement as HTMLElement
    }
  }

  const items = e.clipboardData?.items

  if (!items) return

  for (const item of items) {
    // 处理图片
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) {
        // 立即创建图片组件，显示上传进度
        const widget = store.createWidget({
          type: 'image',
          src: '',  // 先不设置 src
          filename: file.name,
          x: 100,
          y: 100,
        })

        // 使用 XMLHttpRequest 上传以跟踪进度
        const formData = new FormData()
        formData.append('file', file)

        const xhr = new XMLHttpRequest()

        // 监听上传进度
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100)
            store.updateWidget(widget.id, { uploadProgress: progress })
          }
        })

        // 监听上传完成
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const { filename } = JSON.parse(xhr.responseText)
              store.updateWidget(widget.id, {
                src: filename,
                uploadProgress: undefined,
              })
            } catch (error) {
              store.updateWidget(widget.id, {
                uploadError: '解析响应失败',
                uploadProgress: undefined,
              })
            }
          } else {
            store.updateWidget(widget.id, {
              uploadError: `上传失败: ${xhr.status}`,
              uploadProgress: undefined,
            })
          }
        })

        // 监听上传错误
        xhr.addEventListener('error', () => {
          store.updateWidget(widget.id, {
            uploadError: '网络错误',
            uploadProgress: undefined,
          })
        })

        // 发送请求
        xhr.open('POST', '/api/image')
        xhr.send(formData)
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
    class="w-full h-full relative desktop-canvas overflow-hidden"
    @click="handleDesktopClick"
  >
    <!-- 缩放容器 -->
    <div
      class="w-full h-full origin-top-left transition-transform duration-200"
      :style="{
        transform: `scale(${store.canvasScale / 100})`
      }"
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

    <!-- 任务栏（显示最小化的组件）- 不受缩放影响 -->
    <Taskbar />

    <!-- 缩放控制 - 右下角 -->
    <div class="fixed bottom-4 right-4 z-[9999] card-hand-drawn px-4 py-3 flex items-center gap-3">
      <span class="font-handwritten text-sm text-pencil/60">缩放</span>
      <input
        type="range"
        min="30"
        max="150"
        step="10"
        :value="store.canvasScale"
        @input="(e) => store.setCanvasScale(Number((e.target as HTMLInputElement).value))"
        class="scale-slider"
      />
      <span class="font-handwritten text-sm font-bold text-pencil min-w-[3rem] text-right">{{ store.canvasScale }}%</span>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滑块样式 */
.scale-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 128px;
  height: 8px;
  background: #e5e0d8;
  border-radius: 4px;
  border: 2px solid #2d2d2d;
  outline: none;
  cursor: pointer;
  position: relative;
}

.scale-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #2d2d2d;
  border: 2px solid #fdfbf7;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 2px 2px 0px rgba(45, 45, 45, 0.3);
  transition: all 0.2s;
  margin-top: -6px;
}

.scale-slider::-webkit-slider-thumb:hover {
  background: #1a1a1a;
  transform: scale(1.15);
}

.scale-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #2d2d2d;
  border: 2px solid #fdfbf7;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 2px 2px 0px rgba(45, 45, 45, 0.3);
  transition: all 0.2s;
  border: none;
}

.scale-slider::-moz-range-thumb:hover {
  background: #1a1a1a;
  transform: scale(1.15);
}

.scale-slider::-webkit-slider-runnable-track {
  height: 8px;
  background: #e5e0d8;
  border-radius: 4px;
}

.scale-slider::-moz-range-track {
  height: 8px;
  background: #e5e0d8;
  border-radius: 4px;
}
</style>
