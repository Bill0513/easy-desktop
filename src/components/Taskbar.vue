<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import {
  StickyNote,
  CheckSquare,
  FileText,
  Image,
  FileCode,
  Timer
} from 'lucide-vue-next'

const store = useDesktopStore()

// 按类型分组的最小化组件
const groupedMinimizedWidgets = computed(() => {
  const groups: Record<string, typeof store.minimizedWidgets> = {}
  store.minimizedWidgets.forEach(widget => {
    if (!groups[widget.type]) {
      groups[widget.type] = []
    }
    groups[widget.type].push(widget)
  })
  return groups
})

// 类型显示名称
const typeNames: Record<string, string> = {
  note: '便签',
  todo: '待办',
  text: '文本',
  image: '图片',
  markdown: 'Markdown',
  countdown: '倒计时',
}

// 获取组件图标
const getWidgetIcon = (type: string): Component => {
  switch (type) {
    case 'note': return StickyNote
    case 'todo': return CheckSquare
    case 'text': return FileText
    case 'image': return Image
    case 'markdown': return FileCode
    case 'countdown': return Timer
    default: return FileText
  }
}

// 弹窗状态
const popupVisible = ref<string | null>(null)
const popupPosition = ref({ x: 0, y: 0 })

// 悬浮显示弹窗
const showPopup = (type: string, e: MouseEvent) => {
  const widgets = groupedMinimizedWidgets.value[type]
  if (!widgets || widgets.length === 0) return

  popupVisible.value = type
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  popupPosition.value = {
    x: rect.left,
    y: rect.top - widgets.length * 40 - 20,
  }
}

// 隐藏弹窗
const hidePopup = () => {
  popupVisible.value = null
}

// 恢复组件
const restoreWidget = (id: string) => {
  store.toggleMinimize(id)
  store.bringToFront(id)
  store.selectWidget(id)
  hidePopup()
}
</script>

<template>
  <div
    v-if="Object.keys(groupedMinimizedWidgets).length > 0"
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
  >
    <div class="card-hand-drawn px-4 py-2 flex items-center gap-2">
      <!-- 任务栏标题 -->
      <span class="text-sm font-handwritten text-pencil/40 px-2">
        已最小化
      </span>

      <!-- 分隔线 -->
      <div class="w-px h-6 bg-pencil/20"></div>

      <!-- 按类型分组的组件按钮 -->
      <div
        v-for="(widgets, type) in groupedMinimizedWidgets"
        :key="type"
        class="relative"
        @mouseenter="showPopup(type, $event)"
        @mouseleave="hidePopup"
      >
        <button
          class="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 rounded-lg transition-colors group"
        >
          <component :is="getWidgetIcon(type)" :stroke-width="2.5" class="w-5 h-5" />
          <span class="font-handwritten text-sm">
            {{ `${typeNames[type]} (${widgets.length})` }}
          </span>
        </button>

        <!-- 弹出的组件列表 -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="transform opacity-0 translate-y-2"
          enter-to-class="transform opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="transform opacity-100 translate-y-0"
          leave-to-class="transform opacity-0 translate-y-2"
        >
          <div
            v-if="popupVisible === type && widgets.length >= 1"
            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 card-hand-drawn py-2 min-w-[160px]"
            :style="{ left: '50%', transform: 'translateX(-50%)' }"
          >
            <div class="px-3 py-1 border-b border-pencil/20">
              <span class="font-handwritten text-sm text-pencil/60">
                {{ `${typeNames[type]} (${widgets.length})` }}
              </span>
            </div>
            <button
              v-for="widget in widgets"
              :key="widget.id"
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
              @click="restoreWidget(widget.id)"
            >
              <component :is="getWidgetIcon(type)" :stroke-width="2.5" class="w-4 h-4" />
              <span class="flex-1 truncate">{{ widget.title }}</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
