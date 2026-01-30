<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import {
  StickyNote,
  CheckSquare,
  FileText,
  Image,
  FileCode,
  Timer,
  Dices,
  CalendarCheck,
  Minimize2,
  LayoutGrid,
  AlertTriangle
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
  'random-picker': '决策器',
  'check-in': '打卡',
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
    case 'random-picker': return Dices
    case 'check-in': return CalendarCheck
    default: return FileText
  }
}

// 弹窗状态
const popupVisible = ref<string | null>(null)
const popupPosition = ref({ x: 0, y: 0 })

// 超出范围组件弹窗状态
const outOfViewPopupVisible = ref(false)

// 预览状态
const previewWidget = ref<typeof store.widgets[0] | null>(null)
const previewPosition = ref<'left' | 'right'>('right')
const previewPopupRef = ref<HTMLElement | null>(null)
const outOfViewPopupRef = ref<HTMLElement | null>(null)

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

// 显示超出范围组件弹窗
const showOutOfViewPopup = () => {
  outOfViewPopupVisible.value = true
}

// 隐藏弹窗
const hidePopup = () => {
  popupVisible.value = null
}

// 隐藏超出范围组件弹窗
const hideOutOfViewPopup = () => {
  outOfViewPopupVisible.value = false
}

// 显示组件预览
const showPreview = (widget: typeof store.widgets[0], _e: MouseEvent, popupRef?: HTMLElement | null) => {
  previewWidget.value = widget

  // 计算预览框应该显示在左侧还是右侧
  const targetPopup = popupRef || previewPopupRef.value
  if (targetPopup) {
    const popupRect = targetPopup.getBoundingClientRect()
    const screenWidth = window.innerWidth
    const previewWidth = 300 // 预览框宽度
    const gap = 16 // 间距

    // 如果右侧空间足够，优先放右侧
    if (popupRect.right + previewWidth + gap < screenWidth) {
      previewPosition.value = 'right'
    } else {
      previewPosition.value = 'left'
    }
  }
}

// 隐藏组件预览
const hidePreview = () => {
  previewWidget.value = null
}

// 恢复组件
const restoreWidget = (id: string) => {
  store.toggleMinimize(id)
  store.bringToFront(id)
  store.selectWidget(id)
  hidePopup()
}

// 重置组件位置
const resetWidget = (id: string) => {
  store.resetWidgetPosition(id)
  hideOutOfViewPopup()
}

// 一键最小化所有组件
const minimizeAll = () => {
  const visibleWidgets = store.widgets.filter(w => !w.isMinimized && !w.isMaximized)
  visibleWidgets.forEach(widget => {
    store.toggleMinimize(widget.id)
  })
}

// 一键整理
const arrangeAll = () => {
  store.arrangeWidgets()
}
</script>

<template>
  <div
    v-if="Object.keys(groupedMinimizedWidgets).length > 0 || store.widgets.some(w => !w.isMinimized && !w.isMaximized) || store.outOfViewWidgets.length > 0"
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]"
  >
    <div class="card-hand-drawn px-4 py-2 flex items-center gap-2">
      <!-- 超出范围组件提示 -->
      <div
        v-if="store.outOfViewWidgets.length > 0"
        class="relative"
        @mouseenter="showOutOfViewPopup"
        @mouseleave="hideOutOfViewPopup"
      >
        <button
          class="flex items-center gap-1.5 px-2 py-1.5 hover:bg-muted/50 rounded-lg transition-colors group relative animate-pulse-slow"
          title="有组件超出可视范围"
        >
          <AlertTriangle :stroke-width="2.5" class="w-5 h-5 text-red-500 animate-breathe" />
          <span class="font-handwritten text-xs font-bold text-red-500">
            {{ store.outOfViewWidgets.length }}
          </span>
        </button>

        <!-- 超出范围组件列表弹窗 -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="transform opacity-0 translate-y-2"
          enter-to-class="transform opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="transform opacity-100 translate-y-0"
          leave-to-class="transform opacity-0 translate-y-2"
        >
          <div
            v-if="outOfViewPopupVisible && store.outOfViewWidgets.length > 0"
            ref="outOfViewPopupRef"
            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 card-hand-drawn py-2 min-w-[200px] z-[10000]"
          >
            <div class="px-3 py-1 border-b border-border-primary/20">
              <span class="font-handwritten text-sm text-text-secondary">
                超出可视范围 ({{ store.outOfViewWidgets.length }})
              </span>
            </div>
            <!-- 添加滚动容器，最多显示10个组件 -->
            <div
              class="overflow-y-auto"
              :style="{ maxHeight: store.outOfViewWidgets.length > 10 ? '400px' : 'none' }"
            >
              <button
                v-for="widget in store.outOfViewWidgets"
                :key="widget.id"
                class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
                @click="resetWidget(widget.id)"
                @mouseenter="showPreview(widget, $event, outOfViewPopupRef)"
                @mouseleave="hidePreview"
              >
                <component :is="getWidgetIcon(widget.type)" :stroke-width="2.5" class="w-4 h-4 text-text-primary" />
                <span class="flex-1 truncate text-text-primary">{{ widget.title }}</span>
              </button>
            </div>

            <!-- 预览框 -->
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div
                v-if="previewWidget && outOfViewPopupVisible"
                class="absolute top-0 card-hand-drawn p-4 w-[300px] z-[10001] pointer-events-none"
                :style="{
                  [previewPosition === 'right' ? 'left' : 'right']: '100%',
                  [previewPosition === 'right' ? 'marginLeft' : 'marginRight']: '16px'
                }"
              >
                <div class="font-handwritten text-sm font-bold mb-2 text-text-primary">
                  {{ previewWidget.title }}
                </div>
                <div class="text-xs text-text-secondary space-y-1">
                  <div>类型: {{ typeNames[previewWidget.type] }}</div>
                  <div v-if="previewWidget.type === 'note' || previewWidget.type === 'text'">
                    <div class="mt-2 p-2 bg-muted/30 rounded max-h-[200px] overflow-y-auto">
                      {{ (previewWidget as any).content || '(空)' }}
                    </div>
                  </div>
                  <div v-else-if="previewWidget.type === 'todo'">
                    <div class="mt-2 space-y-1">
                      <div
                        v-for="(item, idx) in (previewWidget as any).items?.slice(0, 5) || []"
                        :key="idx"
                        class="flex items-center gap-2 text-xs"
                      >
                        <span>{{ item.checked ? '☑' : '☐' }}</span>
                        <span :class="{ 'line-through text-text-secondary': item.checked }">
                          {{ item.text }}
                        </span>
                      </div>
                      <div v-if="(previewWidget as any).items?.length > 5" class="text-text-secondary/70">
                        ...还有 {{ (previewWidget as any).items.length - 5 }} 项
                      </div>
                    </div>
                  </div>
                  <div v-else-if="previewWidget.type === 'image'">
                    <div class="mt-2">
                      <img
                        v-if="(previewWidget as any).src"
                        :src="`/api/image?filename=${(previewWidget as any).src}`"
                        class="w-full h-auto max-h-[200px] object-contain rounded"
                        alt="预览"
                      />
                    </div>
                  </div>
                  <div v-else-if="previewWidget.type === 'markdown'">
                    <div class="mt-2 p-2 bg-muted/30 rounded max-h-[200px] overflow-y-auto text-xs">
                      {{ (previewWidget as any).content?.slice(0, 200) || '(空)' }}
                      <span v-if="(previewWidget as any).content?.length > 200">...</span>
                    </div>
                  </div>
                  <div v-else-if="previewWidget.type === 'countdown'">
                    <div class="mt-2 p-2 bg-muted/30 rounded">
                      <div class="text-xs">目标时间: {{ (previewWidget as any).targetDate }}</div>
                    </div>
                  </div>
                  <div v-else-if="previewWidget.type === 'check-in'">
                    <div class="mt-2 p-2 bg-muted/30 rounded">
                      <div class="text-xs">已打卡: {{ (previewWidget as any).checkedDates?.length || 0 }} 天</div>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </Transition>
      </div>

      <!-- 分隔线 -->
      <div v-if="store.outOfViewWidgets.length > 0 && (Object.keys(groupedMinimizedWidgets).length > 0 || store.widgets.some(w => !w.isMinimized && !w.isMaximized))" class="w-px h-6 bg-border-primary/20"></div>

      <!-- 一键整理按钮 -->
      <button
        v-if="store.widgets.some(w => !w.isMinimized && !w.isMaximized)"
        @click="arrangeAll"
        class="p-1.5 hover:bg-muted/50 rounded-lg transition-all hover:scale-110 group"
        title="一键整理"
      >
        <LayoutGrid :stroke-width="2.5" class="w-5 h-5 text-text-primary" />
      </button>

      <!-- 一键最小化按钮 -->
      <button
        v-if="store.widgets.some(w => !w.isMinimized && !w.isMaximized)"
        @click="minimizeAll"
        class="p-1.5 hover:bg-muted/50 rounded-lg transition-all hover:scale-110 group"
        title="最小化全部"
      >
        <Minimize2 :stroke-width="2.5" class="w-5 h-5 text-text-primary" />
      </button>

      <!-- 分隔线 -->
      <div v-if="Object.keys(groupedMinimizedWidgets).length > 0 && store.widgets.some(w => !w.isMinimized && !w.isMaximized)" class="w-px h-6 bg-border-primary/20"></div>

      <!-- 任务栏标题 -->
      <span v-if="Object.keys(groupedMinimizedWidgets).length > 0" class="text-sm font-handwritten text-text-secondary px-2">
        已最小化
      </span>

      <!-- 分隔线 -->
      <div v-if="Object.keys(groupedMinimizedWidgets).length > 0" class="w-px h-6 bg-border-primary/20"></div>

      <!-- 按类型分组的组件按钮 -->
      <div
        v-for="(widgets, type) in groupedMinimizedWidgets"
        :key="type"
        class="relative"
        @mouseenter="showPopup(type, $event)"
        @mouseleave="hidePopup"
      >
        <button
          class="flex items-center gap-1.5 px-2 py-1.5 hover:bg-muted/50 rounded-lg transition-all hover:scale-110 group relative"
        >
          <component :is="getWidgetIcon(type)" :stroke-width="2.5" class="w-5 h-5 text-text-primary" />
          <span class="font-handwritten text-xs font-bold text-text-primary">
            {{ widgets.length }}
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
            ref="previewPopupRef"
            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 card-hand-drawn py-2 min-w-[160px] z-[10000]"
            :style="{ left: '50%', transform: 'translateX(-50%)' }"
          >
            <div class="px-3 py-1 border-b border-border-primary/20">
              <span class="font-handwritten text-sm text-text-secondary">
                {{ `${typeNames[type]} (${widgets.length})` }}
              </span>
            </div>
            <!-- 添加滚动容器，最多显示10个组件 -->
            <div
              class="overflow-y-auto"
              :style="{ maxHeight: widgets.length > 10 ? '400px' : 'none' }"
            >
              <button
                v-for="widget in widgets"
                :key="widget.id"
                class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
                @click="restoreWidget(widget.id)"
                @mouseenter="showPreview(widget, $event)"
                @mouseleave="hidePreview"
              >
                <component :is="getWidgetIcon(type)" :stroke-width="2.5" class="w-4 h-4 text-text-primary" />
                <span class="flex-1 truncate text-text-primary">{{ widget.title }}</span>
              </button>
            </div>

            <!-- 预览框 -->
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div
                v-if="previewWidget && popupVisible === type"
                class="absolute top-0 card-hand-drawn p-4 w-[300px] z-[10001] pointer-events-none"
                :style="{
                  [previewPosition === 'right' ? 'left' : 'right']: '100%',
                  [previewPosition === 'right' ? 'marginLeft' : 'marginRight']: '16px'
                }"
              >
                <div class="font-handwritten text-sm font-bold mb-2 text-text-primary">
                  {{ previewWidget.title }}
                </div>
                <div class="text-xs text-text-secondary space-y-1">
                  <div>类型: {{ typeNames[previewWidget.type] }}</div>
                  <div v-if="previewWidget.type === 'note' || previewWidget.type === 'text'">
                    <div class="mt-2 p-2 bg-muted/30 rounded max-h-[200px] overflow-y-auto">
                      {{ (previewWidget as any).content || '(空)' }}
                    </div>
                  </div>
                  <div v-else-if="previewWidget.type === 'todo'">
                    <div class="mt-2 space-y-1">
                      <div
                        v-for="(item, idx) in (previewWidget as any).items?.slice(0, 5) || []"
                        :key="idx"
                        class="flex items-center gap-2 text-xs"
                      >
                        <span>{{ item.checked ? '☑' : '☐' }}</span>
                        <span :class="{ 'line-through text-text-secondary': item.checked }">
                          {{ item.text }}
                        </span>
                      </div>
                      <div v-if="(previewWidget as any).items?.length > 5" class="text-text-secondary/70">
                        ...还有 {{ (previewWidget as any).items.length - 5 }} 项
                      </div>
                    </div>
                  </div>
                  <div v-else-if="previewWidget.type === 'image'">
                    <div class="mt-2">
                      <img
                        v-if="(previewWidget as any).src"
                        :src="`/api/image?filename=${(previewWidget as any).src}`"
                        class="w-full h-auto max-h-[200px] object-contain rounded"
                        alt="预览"
                      />
                    </div>
                  </div>
                  <div v-else-if="previewWidget.type === 'markdown'">
                    <div class="mt-2 p-2 bg-muted/30 rounded max-h-[200px] overflow-y-auto text-xs">
                      {{ (previewWidget as any).content?.slice(0, 200) || '(空)' }}
                      <span v-if="(previewWidget as any).content?.length > 200">...</span>
                    </div>
                  </div>
                  <div v-else-if="previewWidget.type === 'countdown'">
                    <div class="mt-2 p-2 bg-muted/30 rounded">
                      <div class="text-xs">目标时间: {{ (previewWidget as any).targetDate }}</div>
                    </div>
                  </div>
                  <div v-else-if="previewWidget.type === 'check-in'">
                    <div class="mt-2 p-2 bg-muted/30 rounded">
                      <div class="text-xs">已打卡: {{ (previewWidget as any).checkedDates?.length || 0 }} 天</div>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
