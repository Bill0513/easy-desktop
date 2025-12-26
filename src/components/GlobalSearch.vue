<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { Widget } from '@/types'

const store = useDesktopStore()
const searchInput = ref<HTMLInputElement | null>(null)
const resultsContainer = ref<HTMLDivElement | null>(null)
const selectedIndex = ref(0)
const itemRefs = ref<HTMLDivElement[]>([])

// 组件类型名称映射
const typeNames: Record<string, string> = {
  note: '便签',
  todo: '待办',
  bookmark: '书签',
  folder: '文件夹',
  text: '文本',
  image: '图片',
}

// 监听搜索框显示，自动聚焦
watch(() => store.isSearchOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})

// 监听搜索结果变化，重置选中索引
watch(() => store.searchResults, () => {
  selectedIndex.value = 0
  itemRefs.value = []
})

// 监听选中索引变化，自动滚动到可视区域
watch(selectedIndex, () => {
  nextTick(() => {
    scrollSelectedIntoView()
  })
})

// 滚动选中项到可视区域
const scrollSelectedIntoView = () => {
  const container = resultsContainer.value
  const selectedEl = itemRefs.value[selectedIndex.value]
  if (!container || !selectedEl) return

  const containerTop = container.scrollTop
  const containerHeight = container.clientHeight
  const itemTop = selectedEl.offsetTop - container.offsetTop
  const itemHeight = selectedEl.offsetHeight

  // 如果选中项在可视区域上方
  if (itemTop < containerTop) {
    container.scrollTop = itemTop
  }
  // 如果选中项在可视区域下方
  else if (itemTop + itemHeight > containerTop + containerHeight) {
    container.scrollTop = itemTop + itemHeight - containerHeight
  }
}

// 处理键盘事件
const handleKeydown = (e: KeyboardEvent) => {
  const results = store.searchResults

  if (e.key === 'Escape') {
    store.closeSearch()
    return
  }

  if (results.length === 0) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % results.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + results.length) % results.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (results[selectedIndex.value]) {
      store.focusWidget(results[selectedIndex.value].id)
    }
  }
}

// 点击结果
const handleResultClick = (widget: Widget) => {
  store.focusWidget(widget.id)
}

// 外部点击关闭
const handleBackdropClick = () => {
  store.closeSearch()
}

// 高亮匹配文本
const highlightText = (text: string, query: string): string => {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<span class="bg-yellow-200">$1</span>')
}

// 保存元素引用
const setItemRef = (el: HTMLDivElement | null, index: number) => {
  if (el) {
    itemRefs.value[index] = el
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <!-- 遮罩层 -->
    <div
      v-if="store.isSearchOpen"
      class="fixed inset-0 z-[9999] flex items-start justify-center pt-20"
      @click="handleBackdropClick"
    >
      <!-- 搜索框容器 -->
      <div
        class="w-full max-w-2xl mx-4 card-hand-drawn bg-white"
        @click.stop
      >
        <!-- 搜索输入框 -->
        <div class="flex items-center px-4 py-3 border-b-2 border-dashed border-gray-300">
          <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref="searchInput"
            type="text"
            v-model="store.searchQuery"
            placeholder="搜索组件... (Ctrl+F 打开，Esc 关闭)"
            class="flex-1 text-lg outline-none bg-transparent font-handwritten"
            @input="selectedIndex = 0"
          />
          <span class="text-xs text-gray-400 ml-2">{{ store.searchResults.length }} 个结果</span>
        </div>

        <!-- 搜索结果列表 -->
        <div
          v-if="store.searchResults.length > 0"
          ref="resultsContainer"
          class="max-h-80 overflow-y-auto"
        >
          <div
            v-for="(widget, index) in store.searchResults"
            :key="widget.id"
            :ref="(el) => setItemRef(el as HTMLDivElement, index)"
            class="flex items-center px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-yellow-50 transition-colors"
            :class="{ 'bg-yellow-100': index === selectedIndex }"
            @click="handleResultClick(widget)"
            @mouseenter="selectedIndex = index"
          >
            <!-- 类型图标 -->
            <span
              class="w-8 h-8 flex items-center justify-center rounded-lg mr-3 text-sm font-bold text-white"
              :style="{ backgroundColor: ('color' in widget && (widget as any).color) || '#bbdefb' }"
            >
              {{ typeNames[widget.type]?.charAt(0) || widget.type.charAt(0).toUpperCase() }}
            </span>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <div
                class="font-medium text-gray-800 truncate"
                v-html="highlightText(widget.title, store.searchQuery)"
              />
              <div class="text-sm text-gray-500 truncate">
                {{ typeNames[widget.type] }} · {{ widget.isMinimized ? '已最小化' : '在桌面' }}
              </div>
            </div>

            <!-- 快捷键提示 -->
            <span v-if="index === selectedIndex" class="text-xs text-gray-400 ml-2">
              Enter 跳转
            </span>
          </div>
        </div>

        <!-- 空状态 -->
        <div
          v-else-if="store.searchQuery"
          class="px-4 py-8 text-center text-gray-400"
        >
          <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>没有找到匹配的组件</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.card-hand-drawn {
  border-radius: 8px;
  box-shadow: 4px 4px 0px #2d2d2d;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
</style>
