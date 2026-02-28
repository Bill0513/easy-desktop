<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { Widget, NavigationSite, FileItem, FolderItem } from '@/types'

const store = useDesktopStore()
const searchInput = ref<HTMLInputElement | null>(null)
const resultsContainer = ref<HTMLDivElement | null>(null)
const selectedIndex = ref(0)
const itemRefs = ref<HTMLDivElement[]>([])

// 检测是否为暗色模式
const isDarkMode = computed(() => {
  return store.effectiveTheme === 'dark'
})

// 组件类型名称映射
const typeNames: Record<string, string> = {
  note: '便签',
  todo: '待办',
  bookmark: '书签',
  folder: '文件夹',
  text: '文本',
  image: '图片',
  markdown: 'Markdown',
  file: '文件',
}

// 类型守卫
const isWidget = (item: Widget | NavigationSite | FileItem | FolderItem): item is Widget => {
  return 'type' in item && 'title' in item && !('mimeType' in item) && !('data' in item) && !('code' in item)
}

const isNavigationSite = (item: Widget | NavigationSite | FileItem | FolderItem): item is NavigationSite => {
  return 'name' in item && 'url' in item && 'description' in item
}

const isFileItem = (item: Widget | NavigationSite | FileItem | FolderItem): item is FileItem => {
  return 'type' in item && item.type === 'file' && 'mimeType' in item
}

const isFolderItem = (item: Widget | NavigationSite | FileItem | FolderItem): item is FolderItem => {
  return 'type' in item && item.type === 'folder' && !('mimeType' in item)
}

// 获取显示标题
const getItemTitle = (item: Widget | NavigationSite | FileItem | FolderItem): string => {
  if (isWidget(item)) return item.title
  if (isNavigationSite(item)) return item.name
  if (isFileItem(item) || isFolderItem(item)) return item.name
  return ''
}

// 获取显示类型
const getItemType = (item: Widget | NavigationSite | FileItem | FolderItem): string => {
  if (isWidget(item)) return typeNames[item.type] || item.type
  if (isNavigationSite(item)) return '网站'
  if (isFolderItem(item)) return '文件夹'
  if (isFileItem(item)) return '文件'
  return ''
}

// 获取显示状态
const getItemStatus = (item: Widget | NavigationSite | FileItem | FolderItem): string => {
  if (isWidget(item)) return item.isMinimized ? '已最小化' : '在桌面'
  if (isNavigationSite(item)) return item.url
  if (isFileItem(item)) return `${Math.round(item.size / 1024)} KB`
  if (isFolderItem(item)) return '文件夹'
  return ''
}

// 获取显示颜色
const getItemColor = (item: Widget | NavigationSite | FileItem | FolderItem): string => {
  if (isWidget(item) && 'color' in item) return (item as any).color
  if (isNavigationSite(item)) return item.color
  return '#bbdefb'
}

// 获取类型首字母
const getItemTypeInitial = (item: Widget | NavigationSite | FileItem | FolderItem): string => {
  if (isWidget(item)) return typeNames[item.type]?.charAt(0) || item.type.charAt(0).toUpperCase()
  if (isNavigationSite(item)) return item.name.charAt(0).toUpperCase()
  if (isFolderItem(item)) return '📁'
  if (isFileItem(item)) return '📄'
  return '?'
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
    const selectedItem = results[selectedIndex.value]
    if (selectedItem) {
      handleResultClick(selectedItem)
    }
  }
}

// 点击结果
const handleResultClick = (item: Widget | NavigationSite | FileItem | FolderItem) => {
  if (isWidget(item)) {
    store.focusWidget(item.id)
  } else if (isNavigationSite(item)) {
    // 打开网站
    let url = item.url
    // 如果 URL 不包含协议，自动添加 https://
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url
    }
    window.open(url, '_blank')
    store.closeSearch()
  } else if (isFolderItem(item)) {
    // 切换到文件tab并导航到该文件夹
    store.setActiveTab('file')
    store.currentFolderId = item.id
    store.closeSearch()
  } else if (isFileItem(item)) {
    // 切换到文件tab并导航到文件所在文件夹
    store.setActiveTab('file')
    store.currentFolderId = item.parentId
    // TODO: 打开文件预览
    store.closeSearch()
  }
}

// 外部点击关闭
const handleBackdropClick = () => {
  store.closeSearch()
}

// 高亮匹配文本
const highlightText = (text: string, query: string): string => {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query})`, 'gi')
  const highlightClass = isDarkMode.value
    ? 'bg-yellow-600 text-white font-semibold'
    : 'bg-yellow-200 text-gray-900 font-semibold'
  return text.replace(regex, `<span class="${highlightClass}">$1</span>`)
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
        class="w-full max-w-2xl mx-4 card-hand-drawn bg-bg-secondary"
        @click.stop
      >
        <!-- 搜索输入框 -->
        <div class="flex items-center px-4 py-3 border-b-2 border-dashed border-border-primary/30">
          <svg class="w-5 h-5 text-text-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref="searchInput"
            type="text"
            v-model="store.searchQuery"
            placeholder="搜索组件... (Ctrl+F 打开，Esc 关闭)"
            class="flex-1 text-lg outline-none bg-transparent font-handwritten text-text-primary"
            @input="selectedIndex = 0"
          />
          <span class="text-xs text-text-secondary ml-2">{{ store.searchResults.length }} 个结果</span>
        </div>

        <!-- 搜索结果列表 -->
        <div
          v-if="store.searchResults.length > 0"
          ref="resultsContainer"
          class="max-h-80 overflow-y-auto"
        >
          <div
            v-for="(item, index) in store.searchResults"
            :key="item.id"
            :ref="(el) => setItemRef(el as HTMLDivElement, index)"
            class="flex items-center px-4 py-3 cursor-pointer border-b border-border-primary/10 transition-colors"
            :class="[
              index === selectedIndex
                ? (isDarkMode ? 'bg-bluePen/30 hover:bg-bluePen/40' : 'bg-bluePen/15 hover:bg-bluePen/20')
                : 'hover:bg-muted/30'
            ]"
            @click="handleResultClick(item)"
            @mouseenter="selectedIndex = index"
          >
            <!-- 类型图标 -->
            <span
              class="w-8 h-8 flex items-center justify-center rounded-lg mr-3 text-sm font-bold text-white"
              :style="{ backgroundColor: getItemColor(item) }"
            >
              {{ getItemTypeInitial(item) }}
            </span>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <div
                class="font-medium text-text-primary truncate"
                v-html="highlightText(getItemTitle(item), store.searchQuery)"
              />
              <div class="text-sm text-text-secondary truncate">
                {{ getItemType(item) }} · {{ getItemStatus(item) }}
              </div>
            </div>

            <!-- 快捷键提示 -->
            <span v-if="index === selectedIndex" class="text-xs text-text-secondary ml-2">
              Enter 跳转
            </span>
          </div>
        </div>

        <!-- 空状态 -->
        <div
          v-else-if="store.searchQuery"
          class="px-4 py-8 text-center text-text-secondary"
        >
          <svg class="w-12 h-12 mx-auto mb-2 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: var(--color-scrollbar-track);
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: var(--color-scrollbar-thumb);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: var(--color-muted);
}
</style>
