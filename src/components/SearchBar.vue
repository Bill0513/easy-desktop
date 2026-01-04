<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// 搜索引擎配置
const searchEngines = [
  { id: 'google', name: '谷歌', icon: '🔍', url: 'https://www.google.com/search?q=' },
  { id: 'baidu', name: '百度', icon: '🅱️', url: 'https://www.baidu.com/s?wd=' },
  { id: 'bing', name: '必应', icon: '🔎', url: 'https://www.bing.com/search?q=' },
]

const HISTORY_KEY = 'cloud-desktop-search-history'
const ENGINE_KEY = 'cloud-desktop-search-engine'
const MAX_HISTORY = 10

// State
const searchQuery = ref('')
const selectedEngine = ref('google')
const showEngineDropdown = ref(false)
const showHistoryDropdown = ref(false)
const searchHistory = ref<string[]>([])
const selectedIndex = ref(-1)
const inputRef = ref<HTMLInputElement | null>(null)
const isComposing = ref(false)

// Computed
const currentEngine = computed(() => {
  return searchEngines.find(e => e.id === selectedEngine.value) || searchEngines[0]
})

const filteredHistory = computed(() => {
  if (!searchQuery.value.trim()) {
    return searchHistory.value
  }
  return searchHistory.value.filter(item =>
    item.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 加载历史记录和搜索引擎偏好
onMounted(() => {
  const savedHistory = localStorage.getItem(HISTORY_KEY)
  if (savedHistory) {
    searchHistory.value = JSON.parse(savedHistory)
  }
  const savedEngine = localStorage.getItem(ENGINE_KEY)
  if (savedEngine && searchEngines.some(e => e.id === savedEngine)) {
    selectedEngine.value = savedEngine
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 点击外部关闭下拉
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.search-bar-container')) {
    showEngineDropdown.value = false
    showHistoryDropdown.value = false
    selectedIndex.value = -1
  }
}

// 切换搜索引擎
function selectEngine(engineId: string) {
  selectedEngine.value = engineId
  localStorage.setItem(ENGINE_KEY, engineId)
  showEngineDropdown.value = false
  inputRef.value?.focus()
}

// 执行搜索
function doSearch(query?: string) {
  const q = (query || searchQuery.value).trim()
  if (!q) return

  // 添加到历史记录
  const newHistory = [q, ...searchHistory.value.filter(h => h !== q)].slice(0, MAX_HISTORY)
  searchHistory.value = newHistory
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))

  // 打开搜索结果
  const url = currentEngine.value.url + encodeURIComponent(q)
  window.open(url, '_blank')

  // 清空输入
  searchQuery.value = ''
  showHistoryDropdown.value = false
  selectedIndex.value = -1
}

// 选择历史记录
function selectHistory(item: string) {
  searchQuery.value = item
  doSearch(item)
}

// 删除历史记录
function deleteHistory(item: string, e: Event) {
  e.stopPropagation()
  searchHistory.value = searchHistory.value.filter(h => h !== item)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory.value))
}

// 清空所有历史
function clearAllHistory(e: Event) {
  e.stopPropagation()
  searchHistory.value = []
  localStorage.removeItem(HISTORY_KEY)
}

// 键盘导航
function handleKeydown(e: KeyboardEvent) {
  if (isComposing.value) return

  const items = filteredHistory.value

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      if (!showHistoryDropdown.value && items.length > 0) {
        showHistoryDropdown.value = true
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
        selectHistory(items[selectedIndex.value])
      } else {
        doSearch()
      }
      break
    case 'Escape':
      showHistoryDropdown.value = false
      showEngineDropdown.value = false
      selectedIndex.value = -1
      break
    case 'Tab':
      // Tab 切换搜索引擎
      if (e.shiftKey) {
        e.preventDefault()
        const currentIndex = searchEngines.findIndex(e => e.id === selectedEngine.value)
        const prevIndex = (currentIndex - 1 + searchEngines.length) % searchEngines.length
        selectEngine(searchEngines[prevIndex].id)
      }
      break
  }
}

// 输入时显示历史
function handleInput() {
  if (searchHistory.value.length > 0) {
    showHistoryDropdown.value = true
  }
  selectedIndex.value = -1
}

// 聚焦时显示历史
function handleFocus() {
  if (searchHistory.value.length > 0) {
    showHistoryDropdown.value = true
  }
}

// 监听选中项变化，滚动到可见区域
watch(selectedIndex, (index) => {
  if (index >= 0) {
    const item = document.querySelector(`.history-item-${index}`)
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
          :class="{ 'bg-muted/50': engine.id === selectedEngine }"
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

      <!-- 搜索历史下拉 -->
      <div
        v-if="showHistoryDropdown && filteredHistory.length > 0"
        class="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-pencil z-50 max-h-[200px] overflow-y-auto"
        :style="{
          borderRadius: '15px 125px 15px 125px / 125px 15px 125px 15px',
          boxShadow: '3px 3px 0px 0px #2d2d2d'
        }"
      >
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-pencil/20">
          <span class="text-xs text-pencil/60 font-handwritten">搜索历史</span>
          <button
            class="text-xs text-accent hover:underline font-handwritten"
            @click="clearAllHistory"
          >
            清空
          </button>
        </div>
        <button
          v-for="(item, index) in filteredHistory"
          :key="item"
          :class="[
            'w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors font-handwritten text-sm text-left',
            `history-item-${index}`,
            { 'bg-muted/50': index === selectedIndex }
          ]"
          @click="selectHistory(item)"
        >
          <span class="truncate flex-1">{{ item }}</span>
          <span
            class="text-pencil/40 hover:text-accent ml-2 text-xs"
            @click="deleteHistory(item, $event)"
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
