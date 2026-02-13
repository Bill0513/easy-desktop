<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { WidgetType } from '@/types'
import {
  Plus,
  Minimize2,
  StickyNote,
  CheckSquare,
  FileText,
  FileCode,
  Image,
  Timer,
  Dices,
  CalendarCheck,
  ChevronDown
} from 'lucide-vue-next'

const store = useDesktopStore()
const showSheet = ref(false)
const showMinimizedSheet = ref(false)

const items: { type: WidgetType; name: string; icon: Component }[] = [
  { type: 'note', name: '便签', icon: StickyNote },
  { type: 'todo', name: '待办', icon: CheckSquare },
  { type: 'text', name: '文本', icon: FileText },
  { type: 'markdown', name: 'Markdown', icon: FileCode },
  { type: 'image', name: '图片', icon: Image },
  { type: 'countdown', name: '倒计时', icon: Timer },
  { type: 'random-picker', name: '决策器', icon: Dices },
  { type: 'check-in', name: '打卡', icon: CalendarCheck }
]

const typeMeta: Record<WidgetType, { name: string; icon: Component }> = {
  note: { name: '便签', icon: StickyNote },
  todo: { name: '待办', icon: CheckSquare },
  text: { name: '文本', icon: FileText },
  markdown: { name: 'Markdown', icon: FileCode },
  image: { name: '图片', icon: Image },
  countdown: { name: '倒计时', icon: Timer },
  'random-picker': { name: '决策器', icon: Dices },
  'check-in': { name: '打卡', icon: CalendarCheck }
}

const minimizedGroups = computed(() => {
  const groups = new Map<WidgetType, typeof store.minimizedWidgets>()
  store.minimizedWidgets.forEach(widget => {
    if (!groups.has(widget.type)) {
      groups.set(widget.type, [])
    }
    groups.get(widget.type)!.push(widget)
  })
  return Array.from(groups.entries()).map(([type, widgets]) => ({
    type,
    name: typeMeta[type].name,
    icon: typeMeta[type].icon,
    widgets
  }))
})

const createWidget = (type: WidgetType) => {
  store.createWidget({ type })
  store.save()
  showSheet.value = false
}

const restoreWidget = (id: string) => {
  store.toggleMinimize(id)
  store.setMobileWidgetExpandedExclusive(id)
  store.notifyMobileWidgetRestored(id)
  showMinimizedSheet.value = false
}
</script>

<template>
  <div class="md:hidden">
    <div class="mobile-fab-stack">
      <button
        class="mobile-fab"
        title="新增组件"
        @click="showSheet = true"
      >
        <Plus :stroke-width="2.5" class="w-6 h-6" />
      </button>

      <button
        class="mobile-fab mobile-fab-secondary"
        title="最小化组件"
        @click="showMinimizedSheet = true"
      >
        <Minimize2 :stroke-width="2.5" class="w-6 h-6" />
      </button>
    </div>

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
          v-if="showSheet"
          class="fixed inset-0 z-[10001] bg-black/35"
          @click="showSheet = false"
        >
          <div
            class="mobile-add-sheet card-hand-drawn"
            @click.stop
          >
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-handwritten text-lg text-text-primary">添加组件</h3>
              <button class="text-sm text-text-secondary" @click="showSheet = false">关闭</button>
            </div>

            <div class="grid grid-cols-4 gap-3">
              <button
                v-for="item in items"
                :key="item.type"
                class="p-3 border-2 border-border-primary rounded-xl bg-bg-secondary text-text-primary flex flex-col items-center justify-center gap-1"
                @click="createWidget(item.type)"
              >
                <component :is="item.icon" :stroke-width="2.5" class="w-5 h-5" />
                <span class="text-[11px] leading-tight">{{ item.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showMinimizedSheet"
          class="fixed inset-0 z-[10001] bg-black/35"
          @click="showMinimizedSheet = false"
        >
          <div class="mobile-add-sheet card-hand-drawn" @click.stop>
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-handwritten text-lg text-text-primary">最小化组件</h3>
              <button class="text-sm text-text-secondary" @click="showMinimizedSheet = false">关闭</button>
            </div>

            <div
              v-if="minimizedGroups.length === 0"
              class="text-sm text-text-secondary text-center py-6"
            >
              当前没有最小化组件
            </div>

            <div v-else class="max-h-[52vh] overflow-auto space-y-2">
              <details
                v-for="group in minimizedGroups"
                :key="group.type"
                class="border-2 border-border-primary rounded-xl bg-bg-secondary"
              >
                <summary class="list-none px-3 py-2 flex items-center gap-2 cursor-pointer">
                  <component :is="group.icon" :stroke-width="2.5" class="w-4 h-4 text-text-primary" />
                  <span class="font-handwritten text-sm text-text-primary flex-1">{{ group.name }}</span>
                  <span class="text-xs text-text-secondary">{{ group.widgets.length }}</span>
                  <ChevronDown :stroke-width="2.5" class="w-4 h-4 text-text-secondary accordion-chevron" />
                </summary>

                <div class="px-3 pb-3 space-y-2">
                  <button
                    v-for="widget in group.widgets"
                    :key="widget.id"
                    class="w-full text-left px-3 py-2 border-2 border-border-primary/20 rounded-lg bg-muted/30 text-text-primary text-sm"
                    @click="restoreWidget(widget.id)"
                  >
                    {{ widget.title }}
                  </button>
                </div>
              </details>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.mobile-fab-stack {
  position: fixed;
  right: 14px;
  bottom: calc(86px + env(safe-area-inset-bottom, 0px));
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-fab {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 2px solid var(--color-border-primary);
  background: #ff4d4d;
  color: #fff;
  box-shadow: 4px 4px 0 0 var(--color-shadow-primary);
}

[data-theme='dark'] .mobile-fab {
  background: #2d5da1;
}

.mobile-fab-secondary {
  background: #e5e0d8;
  color: var(--color-text-primary);
}

[data-theme='dark'] .mobile-fab-secondary {
  background: #3a3a3a;
}

.mobile-add-sheet {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  padding: 14px;
  border-radius: 16px;
}

details[open] .accordion-chevron {
  transform: rotate(180deg);
}

.accordion-chevron {
  transition: transform 0.15s ease;
}
</style>
