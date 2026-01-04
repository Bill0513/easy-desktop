<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDesktopStore } from '@/stores/desktop'

const store = useDesktopStore()

// 搜索引擎配置
const searchEngines = [
  { id: 'google', name: '谷歌', icon: '🔍', url: 'https://www.google.com/search?q=' },
  { id: 'baidu', name: '百度', icon: '🅱️', url: 'https://www.baidu.com/s?wd=' },
  { id: 'bing', name: '必应', icon: '🔎', url: 'https://www.bing.com/search?q=' },
]

const MAX_HISTORY = 10

// State
const searchQuery = ref('')
const showEngineDropdown = ref(false)
const showDropdown = ref(false)
const suggestions = ref<string[]>([])
const selectedIndex = ref(-1)
const inputRef = ref<HTMLInputElement | null>(null)
const isComposing = ref(false)
const isLoadingSuggestions = ref(false)
let suggestionTimer: ReturnType<typeof setTimeout> | null = null

// Computed
const currentEngine = computed(() => {
  return searchEngines.find(e => e.id === store.searchEngine) || searchEngines[0]
})

// 合并显示列表：有输入时显示联想，无输入时显示历史
const displayItems = computed(() => {
  if (searchQuery.value.trim()) {
    // 有输入时，显示联想结果
    return suggestions.value.map(s => ({ text: s, type: 'suggestion' as const }))
  } else {
    // 无输入时，显示历史记录
    return store.searchHistory.map(h => ({ text: h, type: 'history' as const }))
  }
})

// 加载历史记录和搜索引擎偏好
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (suggestionTimer) clearTimeout(suggestionTimer)
})

// 点击外部关闭下拉
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.search-bar-container')) {
    showEngineDropdown.value = false
    showDropdown.value = false
    selectedIndex.value = -1
  }
}

// 切换搜索引擎
function selectEngine(engineId: string) {
  store.searchEngine = engineId
  store.save()
  showEngineDropdown.value = false
  inputRef.value?.focus()
  // 切换引擎后重新获取联想
  if (searchQuery.value.trim()) {
    fetchSuggestions(searchQuery.value)
  }
}

// 获取搜索联想（使用百度 JSONP 接口）
function fetchSuggestions(query: string) {
  if (!query.trim()) {
    suggestions.value = []
    return
  }

  isLoadingSuggestions.value = true

  // 清理之前的回调
  const callbackName = `baiduSuggestion_${Date.now()}`

  // 创建 JSONP 回调
  ;(window as any)[callbackName] = (data: { s: string[] }) => {
    suggestions.value = data.s || []
    isLoadingSuggestions.value = false
    // 清理
    delete (window as any)[callbackName]
    const script = document.getElementById(callbackName)
    if (script) script.remove()
  }

  // 创建 script 标签
  const script = document.createElement('script')
  script.id = callbackName
  script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=${callbackName}`
  script.onerror = () => {
    isLoadingSuggestions.value = false
    delete (window as any)[callbackName]
    script.remove()
  }
  document.head.appendChild(script)

  // 超时处理
  setTimeout(() => {
    if ((window as any)[callbackName]) {
      isLoadingSuggestions.value = false
      delete (window as any)[callbackName]
      const s = document.getElementById(callbackName)
      if (s) s.remove()
    }
  }, 3000)
}

// 执行搜索
function doSearch(query?: string) {
  const q = (query || searchQuery.value).trim()
  if (!q) return

  // 添加到历史记录
  const newHistory = [q, ...store.searchHistory.filter(h => h !== q)].slice(0, MAX_HISTORY)
  store.searchHistory = newHistory
  store.save()

  // 打开搜索结果
  const url = currentEngine.value.url + encodeURIComponent(q)
  window.open(url, '_blank')

  // 清空输入
  searchQuery.value = ''
  suggestions.value = []
  showDropdown.value = false
  selectedIndex.value = -1
}

// 选择下拉项
function selectItem(item: string) {
  searchQuery.value = item
  doSearch(item)
}

// 删除历史记录
function deleteHistory(item: string, e: Event) {
  e.stopPropagation()
  store.searchHistory = store.searchHistory.filter(h => h !== item)
  store.save()
}

// 清空所有历史
function clearAllHistory(e: Event) {
  e.stopPropagation()
  store.searchHistory = []
  store.save()
}

// 键盘导航
function handleKeydown(e: KeyboardEvent) {
  if (isComposing.value) return

  const items = displayItems.value

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      if (!showDropdown.value && items.length > 0) {
        showDropdown.value = true
      }
      selectedIndex.value = Math.min(selectedIndex.value + 1, items.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
      break
    case 'Enter':
      e.preventDefault()
      if (selectedIndex.value >= 0 && selectedIndex.value < items.length) {
        selectItem(items[selectedIndex.value].text)
      } else {
        doSearch()
      }
      break
    case 'Escape':
      showDropdown.value = false
      showEngineDropdown.value = false
      selectedIndex.value = -1
      break
    case 'Tab':
      // Tab 切换搜索引擎
      if (e.shiftKey) {
        e.preventDefault()
        const currentIndex = searchEngines.findIndex(e => e.id === store.searchEngine)
        const prevIndex = (currentIndex - 1 + searchEngines.length) % searchEngines.length
        selectEngine(searchEngines[prevIndex].id)
      }
      break
  }
}

// 输入时获取联想
function handleInput() {
  selectedIndex.value = -1

  // 防抖获取联想
  if (suggestionTimer) clearTimeout(suggestionTimer)

  if (searchQuery.value.trim()) {
    showDropdown.value = true
    suggestionTimer = setTimeout(() => {
      fetchSuggestions(searchQuery.value)
    }, 200)
  } else {
    suggestions.value = []
    // 无输入时显示历史
    if (store.searchHistory.length > 0) {
      showDropdown.value = true
    }
  }
}

// 聚焦时显示下拉
function handleFocus() {
  if (searchQuery.value.trim()) {
    if (suggestions.value.length > 0) {
      showDropdown.value = true
    }
  } else if (store.searchHistory.length > 0) {
    showDropdown.value = true
  }
}

// 监听选中项变化，滚动到可见区域
watch(selectedIndex, (index) => {
  if (index >= 0) {
    const item = document.querySelector(`.dropdown-item-${index}`)
    item?.scrollIntoView({ block: 'nearest' })
  }
})
</script>

<template>
  <div class="search-bar-container relative flex items-center gap-1">
    <!-- 搜索引擎选择器 -->
    <div class="relative">
      <button
        class="flex items-center gap-1 px-2 py-1.5 bg-white border-2 border-pencil hover:bg-muted/30 transition-colors"
        :style="{ borderRadius: '125px 15px 125px 15px / 15px 125px 15px 125px' }"
        @click="showEngineDropdown = !showEngineDropdown"
      >
        <span class="text-base">{{ currentEngine.icon }}</span>
        <svg class="w-3 h-3 text-pencil/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <!-- 搜索引擎下拉 -->
      <div
        v-if="showEngineDropdown"
        class="absolute top-full left-0 mt-1 bg-white border-2 border-pencil z-50 min-w-[100px]"
        :style="{
          borderRadius: '15px 125px 15px 125px / 125px 15px 125px 15px',
          boxShadow: '3px 3px 0px 0px #2d2d2d'
        }"
      >
        <button
          v-for="engine in searchEngines"
          :key="engine.id"
          class="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors font-handwritten text-sm"
          :class="{ 'bg-muted/50': engine.id === store.searchEngine }"
          @click="selectEngine(engine.id)"
        >
          <span>{{ engine.icon }}</span>
          <span>{{ engine.name }}</span>
        </button>
      </div>
    </div>

    <!-- 搜索输入框 -->
    <div class="relative flex-1">
      <input
        ref="inputRef"
        v-model="searchQuery"
        type="text"
        placeholder="搜索..."
        class="w-full px-3 py-1.5 bg-white border-2 border-pencil font-handwritten text-sm focus:outline-none focus:border-bluePen focus:ring-2 focus:ring-bluePen/20"
        :style="{ borderRadius: '125px 15px 125px 15px / 15px 125px 15px 125px' }"
        @input="handleInput"
        @focus="handleFocus"
        @keydown="handleKeydown"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
      />

      <!-- 下拉列表（联想/历史） -->
      <div
        v-if="showDropdown && displayItems.length > 0"
        class="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-pencil z-50 max-h-[280px] overflow-y-auto"
        :style="{
          borderRadius: '15px 125px 15px 125px / 125px 15px 125px 15px',
          boxShadow: '3px 3px 0px 0px #2d2d2d'
        }"
      >
        <!-- 标题栏 -->
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-pencil/20">
          <span class="text-xs text-pencil/60 font-handwritten flex items-center gap-1">
            <template v-if="searchQuery.trim()">
              搜索建议
              <span v-if="isLoadingSuggestions" class="inline-block w-3 h-3 border-2 border-pencil/30 border-t-pencil rounded-full animate-spin"></span>
            </template>
            <template v-else>搜索历史</template>
          </span>
          <button
            v-if="!searchQuery.trim()"
            class="text-xs text-accent hover:underline font-handwritten"
            @click="clearAllHistory"
          >
            清空
          </button>
        </div>

        <!-- 列表项 -->
        <button
          v-for="(item, index) in displayItems"
          :key="item.text"
          :class="[
            'w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors font-handwritten text-sm text-left',
            `dropdown-item-${index}`,
            { 'bg-muted/50': index === selectedIndex }
          ]"
          @click="selectItem(item.text)"
        >
          <span class="flex items-center gap-2 truncate flex-1">
            <!-- 图标区分类型 -->
            <span v-if="item.type === 'history'" class="text-pencil/40 text-xs">🕐</span>
            <span v-else class="text-pencil/40 text-xs">🔍</span>
            <span class="truncate">{{ item.text }}</span>
          </span>
          <!-- 历史记录可删除 -->
          <span
            v-if="item.type === 'history'"
            class="text-pencil/40 hover:text-accent ml-2 text-xs flex-shrink-0"
            @click="deleteHistory(item.text, $event)"
          >✕</span>
        </button>
      </div>
    </div>

    <!-- 搜索按钮 -->
    <button
      class="flex items-center justify-center w-8 h-8 bg-accent text-white border-2 border-pencil hover:bg-accent/80 transition-colors"
      :style="{
        borderRadius: '125px 15px 125px 15px / 15px 125px 15px 125px',
        boxShadow: '2px 2px 0px 0px #2d2d2d'
      }"
      @click="doSearch()"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    </button>
  </div>
</template>
