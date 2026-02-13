<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted, type Component, type ComponentPublicInstance } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { Widget } from '@/types'
import draggable from 'vuedraggable'
import {
  StickyNote,
  CheckSquare,
  FileText,
  FileCode,
  Image as ImageIcon,
  Timer,
  Dices,
  CalendarCheck,
  GripVertical,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  NotebookPen
} from 'lucide-vue-next'
import NoteWidget from './widgets/NoteWidget.vue'
import TodoWidget from './widgets/TodoWidget.vue'
import TextWidget from './widgets/TextWidget.vue'
import ImageWidget from './widgets/ImageWidget.vue'
import MarkdownWidgetNotion from './widgets/MarkdownWidgetNotion.vue'
import CountdownWidget from './widgets/CountdownWidget.vue'
import RandomPickerWidget from './widgets/RandomPickerWidget.vue'
import CheckInWidget from './widgets/CheckInWidget.vue'

const store = useDesktopStore()
const isDragging = ref(false)
const isSyncing = computed(() => store.syncStatus === 'syncing')
const currentTime = ref(Date.now())
const scrollContainer = ref<HTMLElement | null>(null)
const highlightedWidgetId = ref<string | null>(null)
const widgetRefs = ref<Record<string, HTMLElement>>({})
let highlightTimer: ReturnType<typeof setTimeout> | null = null
let timer: number | null = null
const SYNC_INTERVAL = 5 * 60 * 1000

const orderedWidgets = computed(() => {
  const byId = new Map(store.widgets.map(widget => [widget.id, widget]))
  const ordered = store.mobileWidgetOrder
    .map(id => byId.get(id))
    .filter((widget): widget is Widget => !!widget)

  const remaining = store.widgets.filter(widget => !store.mobileWidgetOrder.includes(widget.id))
  return [...ordered, ...remaining]
})

const visibleWidgets = computed(() => orderedWidgets.value.filter(w => !w.isMinimized))
const minimizedWidgets = computed(() => orderedWidgets.value.filter(w => w.isMinimized))

const visibleWidgetIds = computed({
  get: () => visibleWidgets.value.map(widget => widget.id),
  set: (ids: string[]) => {
    const minimizedIds = minimizedWidgets.value.map(widget => widget.id)
    store.setMobileWidgetOrder([...ids, ...minimizedIds])
  }
})

const widgetIcons: Record<Widget['type'], Component> = {
  note: StickyNote,
  todo: CheckSquare,
  text: FileText,
  markdown: FileCode,
  image: ImageIcon,
  countdown: Timer,
  'random-picker': Dices,
  'check-in': CalendarCheck
}

const widgetComponents: Record<Widget['type'], Component> = {
  note: NoteWidget,
  todo: TodoWidget,
  text: TextWidget,
  markdown: MarkdownWidgetNotion,
  image: ImageWidget,
  countdown: CountdownWidget,
  'random-picker': RandomPickerWidget,
  'check-in': CheckInWidget
}

const toggleCollapse = (id: string) => {
  store.toggleMobileWidgetCollapsed(id)
}

const isCollapsed = (id: string) => store.isMobileWidgetCollapsed(id)

const handleSync = () => {
  store.syncToCloud()
}

const formatCountdown = (ms: number) => {
  if (ms <= 0) return '即将同步'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const syncStatusText = computed(() => {
  if (store.syncStatus === 'syncing') return '同步中...'
  if (store.syncStatus === 'error') return store.syncErrorMessage || '同步失败'

  if (!store.lastSyncTime) {
    return store.hasDirtyData ? '待同步' : '等待首次同步'
  }

  const nextSyncTime = store.lastSyncTime + SYNC_INTERVAL
  const remain = nextSyncTime - currentTime.value
  return `下次同步 ${formatCountdown(remain)}`
})

const handleMinimizeWidget = (id: string) => {
  store.setMobileWidgetCollapsed(id, true)
  store.toggleMinimize(id)
}

const setWidgetRef = (id: string, el: Element | ComponentPublicInstance | null) => {
  if (!el) {
    delete widgetRefs.value[id]
    return
  }

  if (el instanceof HTMLElement) {
    widgetRefs.value[id] = el
  }
}

const scrollAndHighlightWidget = async (id: string) => {
  await nextTick()
  setTimeout(() => {
    const target = widgetRefs.value[id]
    const container = scrollContainer.value
    if (!target || !container) return

    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    highlightedWidgetId.value = id

    if (highlightTimer) {
      clearTimeout(highlightTimer)
    }
    highlightTimer = setTimeout(() => {
      highlightedWidgetId.value = null
    }, 3000)
  }, 80)
}

watch(
  () => store.mobileFocusTarget,
  (target) => {
    if (!target) return
    scrollAndHighlightWidget(target.id)
  },
  { deep: true }
)

onMounted(() => {
  timer = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer !== null) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div ref="scrollContainer" class="h-full overflow-auto mobile-content-space">
    <div class="mobile-desktop-topbar">
      <div class="card-hand-drawn mobile-desktop-topbar-inner bg-bg-secondary">
        <div class="min-w-0 flex-1">
          <h2 class="font-handwritten text-base text-text-primary leading-tight">记录</h2>
          <p class="text-[11px] text-text-secondary leading-tight">移动版卡片视图</p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-xs text-text-secondary font-handwritten">
            {{ syncStatusText }}
          </span>
          <button
            class="mobile-sync-btn"
            :disabled="isSyncing"
            @click="handleSync"
          >
            <RefreshCw :stroke-width="2.5" class="w-4 h-4" :class="isSyncing ? 'animate-spin' : ''" />
          </button>
        </div>
      </div>
    </div>

    <div class="px-3 pt-[72px] pb-8 space-y-3">

      <div
        v-if="visibleWidgets.length === 0"
        class="mobile-empty-state text-center text-text-secondary"
      >
        <div class="flex flex-col items-center gap-3">
          <div class="mobile-empty-illustration">
            <NotebookPen :stroke-width="2.5" class="w-8 h-8 text-text-secondary" />
          </div>
          <p>暂无组件，点击右下角 + 开始添加</p>
        </div>
      </div>

      <draggable
        v-model="visibleWidgetIds"
        handle=".drag-handle-mobile"
        :animation="180"
        :delay="220"
        :delay-on-touch-only="true"
        ghost-class="mobile-drag-ghost"
        drag-class="mobile-drag-item"
        @start="isDragging = true"
        @end="isDragging = false"
      >
        <template #item="{ element: widgetId }">
            <template v-for="widget in visibleWidgets.filter(item => item.id === widgetId)" :key="widget.id">
              <article
                class="card-hand-drawn p-3 bg-bg-secondary mb-3"
                :class="[
                  isDragging ? 'mobile-card-dragging' : '',
                  highlightedWidgetId === widget.id ? 'mobile-widget-highlight' : ''
                ]"
                :ref="(el) => setWidgetRef(widget.id, el)"
              >
              <header class="flex items-center gap-2 mb-3">
                <button class="drag-handle-mobile p-1 rounded-md border-2 border-border-primary/20" title="长按拖拽排序">
                  <GripVertical :stroke-width="2.5" class="w-4 h-4 text-text-secondary" />
                </button>
                <component :is="widgetIcons[widget.type]" :stroke-width="2.5" class="w-4 h-4 text-text-primary flex-shrink-0" />
                <div class="min-w-0 flex-1">
                  <h3 class="font-handwritten text-sm font-medium text-text-primary truncate">{{ widget.title }}</h3>
                </div>
                <button
                  class="px-2 py-1 text-xs border-2 border-border-primary rounded-lg"
                  @click="toggleCollapse(widget.id)"
                >
                  <component :is="isCollapsed(widget.id) ? ChevronDown : ChevronUp" :stroke-width="2.5" class="w-4 h-4" />
                </button>
                <button
                  class="px-2 py-1 text-xs border-2 border-border-primary rounded-lg"
                  @click="handleMinimizeWidget(widget.id)"
                >
                  最小化
                </button>
                <button
                  class="px-2 py-1 text-xs border-2 border-border-primary rounded-lg text-accent"
                  @click="widget.type === 'image' ? store.deleteImageWidget(widget.id) : store.deleteWidget(widget.id)"
                >
                  删除
                </button>
              </header>

              <div v-show="!isCollapsed(widget.id)" class="mobile-widget-content">
                <component :is="widgetComponents[widget.type]" :widget="widget as any" />
              </div>
              </article>
            </template>
        </template>
      </draggable>

    </div>
  </div>
</template>

<style scoped>
.mobile-widget-content {
  min-height: 180px;
  max-height: 62vh;
  overflow: auto;
}

.mobile-desktop-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 8px 10px 6px;
  background: color-mix(in srgb, var(--color-bg-primary) 92%, transparent);
  backdrop-filter: blur(8px);
}

.mobile-desktop-topbar-inner {
  min-height: 56px;
  max-height: 72px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}

.mobile-sync-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border-primary);
  border-radius: 10px;
  color: var(--color-text-primary);
}

.mobile-sync-btn:disabled {
  opacity: 0.55;
}

.mobile-empty-state {
  min-height: calc(100vh - 190px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.mobile-empty-illustration {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  border: 2px solid var(--color-border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-muted) 60%, transparent);
}

.mobile-widget-highlight {
  box-shadow: 0 0 0 3px color-mix(in srgb, #ff4d4d 45%, transparent), 4px 4px 0 0 var(--color-shadow-primary);
  transition: box-shadow 0.2s ease;
}

[data-theme='dark'] .mobile-widget-highlight {
  box-shadow: 0 0 0 3px color-mix(in srgb, #2d5da1 60%, transparent), 4px 4px 0 0 var(--color-shadow-primary);
}

.mobile-card-dragging {
  transition: none;
}

:deep(.mobile-drag-ghost) {
  opacity: 0.35;
}

:deep(.mobile-drag-item) {
  transform: rotate(1deg);
}
</style>
