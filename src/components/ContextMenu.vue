<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'

const store = useDesktopStore()

const visible = ref(false)
const position = ref({ x: 0, y: 0 })
const targetWidgetId = ref<string | null>(null)

const show = (e: MouseEvent) => {
  // 只在桌面 tab 下显示菜单
  if (store.activeTab !== 'desktop') {
    return
  }

  e.preventDefault()

  // 检查是否点击在组件上
  const target = e.target as HTMLElement
  const widgetEl = target.closest('[data-widget-id]')

  if (widgetEl) {
    targetWidgetId.value = widgetEl.getAttribute('data-widget-id')
    store.selectWidget(targetWidgetId.value)
  } else {
    targetWidgetId.value = null
    store.selectWidget(null)
  }

  position.value = { x: e.clientX, y: e.clientY }
  visible.value = true
}

const hide = () => {
  visible.value = false
  targetWidgetId.value = null
}

const bringToFront = () => {
  if (targetWidgetId.value) {
    store.bringToFront(targetWidgetId.value)
  }
  hide()
}

const toggleMinimize = () => {
  if (targetWidgetId.value) {
    store.toggleMinimize(targetWidgetId.value)
  }
  hide()
}

const deleteWidget = () => {
  if (targetWidgetId.value) {
    store.deleteWidget(targetWidgetId.value)
  }
  hide()
}

onMounted(() => {
  document.addEventListener('contextmenu', show)
  document.addEventListener('click', hide)
})

onUnmounted(() => {
  document.removeEventListener('contextmenu', show)
  document.removeEventListener('click', hide)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="visible"
        class="fixed z-[100] card-hand-drawn py-1 min-w-[160px]"
        :style="{ left: position.x + 'px', top: position.y + 'px' }"
      >
        <!-- 置顶 -->
        <button
          class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
          @click="bringToFront"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
          </svg>
          置顶显示
        </button>

        <!-- 最小化/还原 -->
        <button
          class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
          @click="toggleMinimize"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
          最小化/还原
        </button>

        <!-- 分隔线 -->
        <div class="my-1 border-t border-pencil/20"></div>

        <!-- 删除 -->
        <button
          class="w-full px-4 py-2 text-left font-handwritten text-sm text-accent hover:bg-accent/10 flex items-center gap-2"
          @click="deleteWidget"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          删除
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
