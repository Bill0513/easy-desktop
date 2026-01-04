import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Widget, NoteWidget, TodoWidget, TextWidget, ImageWidget, MarkdownWidget, CreateWidgetParams, TodoItem, DesktopData, TabType, NewsSource, NewsCache, NavigationSite } from '@/types'

const STORAGE_KEY = 'cloud-desktop-data'
const TAB_STORAGE_KEY = 'cloud-desktop-active-tab'
const NEWS_CACHE_KEY = 'cloud-desktop-news-cache'

// 默认组件颜色
const DEFAULT_COLORS = ['#fff9c4', '#ffcdd2', '#c8e6c9', '#bbdefb', '#ffe0b2', '#f3e5f5']

export const useDesktopStore = defineStore('desktop', () => {
  // State
  const widgets = ref<Widget[]>([])
  const maxZIndex = ref(100)
  const isLoading = ref(false)
  const selectedWidgetId = ref<string | null>(null)
  const draggedWidgetId = ref<string | null>(null)
  const maximizeState = ref<Record<string, { x: number; y: number; width: number; height: number }>>({})
  const isSearchOpen = ref(false)
  const searchQuery = ref('')

  // Tab state
  const activeTab = ref<TabType>('desktop')

  // News state
  const newsSources = ref<NewsSource[]>([])
  const isLoadingNews = ref(false)
  const enabledSources = ref<Set<string>>(new Set([
    'github', 'baidu', 'zhihu', 'douyin', 'hupu', 'tieba',
    'toutiao', 'thepaper', 'chongbuluo', 'tencent', 'wallstreetcn',
    'zaobao', 'sputniknewscn', 'coolapk', 'ithome', 'juejin',
    'sspai', 'solidot'
  ]))

  // Navigation state
  const navigationSites = ref<NavigationSite[]>([])
  const isLoadingNavigation = ref(false)
  const navigationCategories = ref<string[]>(['工作', '学习', '其他'])
  const selectedCategory = ref<string>('全部')

  // Sync state
  const syncStatus = ref<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const lastSyncTime = ref<number | null>(null)
  const syncErrorMessage = ref<string>('')
  const isCloudInitialized = ref(false) // 标记是否已从云端成功加载过数据

  // Getters
  const getWidgetById = computed(() => {
    return (id: string): Widget | undefined => {
      return widgets.value.find(w => w.id === id)
    }
  })

  const sortedWidgets = computed(() => {
    return [...widgets.value].sort((a, b) => a.zIndex - b.zIndex)
  })

  const topWidget = computed(() => {
    if (widgets.value.length === 0) return null
    return widgets.value.reduce((max, w) => w.zIndex > max.zIndex ? w : max, widgets.value[0])
  })

  const minimizedWidgets = computed(() => {
    return widgets.value.filter(w => w.isMinimized)
  })

  const searchResults = computed(() => {
    if (!searchQuery.value.trim()) return []
    const query = searchQuery.value.toLowerCase()

    // 全局搜索：同时搜索桌面组件和导航网站
    const widgetResults = widgets.value.filter(widget => {
      if (widget.title.toLowerCase().includes(query)) return true

      switch (widget.type) {
        case 'note':
        case 'text':
        case 'markdown':
          return widget.content.toLowerCase().includes(query)
        case 'todo':
          return widget.items.some(item => item.text.toLowerCase().includes(query))
        default:
          return false
      }
    })

    const siteResults = navigationSites.value.filter(site =>
      site.name.toLowerCase().includes(query) ||
      site.url.toLowerCase().includes(query) ||
      site.description.toLowerCase().includes(query)
    )

    // 合并结果：桌面组件在前，导航网站在后
    return [...widgetResults, ...siteResults]
  })

  // 排序后的导航站网站
  const sortedNavigationSites = computed(() => {
    return [...navigationSites.value].sort((a, b) => a.order - b.order)
  })

  // 所有分类（包括"全部"）
  const allCategories = computed(() => {
    return ['全部', ...navigationCategories.value]
  })

  // 根据选中分类过滤网站
  const filteredNavigationSites = computed(() => {
    if (selectedCategory.value === '全部') {
      return sortedNavigationSites.value
    }
    return sortedNavigationSites.value.filter(site => site.category === selectedCategory.value)
  })

  // Actions
  async function init() {
    isLoading.value = true
    try {
      const cloudData = await loadFromCloud()
      // 如果云端有数据（即使 widgets 为空数组），优先使用云端数据
      if (cloudData && cloudData.widgets !== undefined) {
        widgets.value = cloudData.widgets
        maxZIndex.value = cloudData.maxZIndex || 100
        // 加载导航站数据
        if (cloudData.navigationSites !== undefined) {
          navigationSites.value = cloudData.navigationSites
        }
        // 加载分类数据
        if (cloudData.categories !== undefined) {
          navigationCategories.value = cloudData.categories
        }
        // 标记已从云端成功加载
        isCloudInitialized.value = true
        // 同步云端数据到本地存储
        saveToLocal()
      } else {
        // 云端无数据，尝试从本地加载
        const localData = localStorage.getItem(STORAGE_KEY)
        if (localData) {
          const parsed = JSON.parse(localData)
          widgets.value = parsed.widgets || []
          maxZIndex.value = parsed.maxZIndex || 100
          // 加载导航站数据
          if (parsed.navigationSites !== undefined) {
            navigationSites.value = parsed.navigationSites
          }
          // 加载分类数据
          if (parsed.categories !== undefined) {
            navigationCategories.value = parsed.categories
          }
          // 如果本地有数据，标记为已初始化（允许后续同步到云端）
          if (parsed.widgets && parsed.widgets.length > 0) {
            isCloudInitialized.value = true
          }
        } else {
          widgets.value = []
          maxZIndex.value = 100
          // 新用户，没有任何数据，标记为已初始化
          isCloudInitialized.value = true
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      const localData = localStorage.getItem(STORAGE_KEY)
      if (localData) {
        const parsed = JSON.parse(localData)
        widgets.value = parsed.widgets || []
        maxZIndex.value = parsed.maxZIndex || 100
        // 加载导航站数据
        if (parsed.navigationSites !== undefined) {
          navigationSites.value = parsed.navigationSites
        }
        // 加载分类数据
        if (parsed.categories !== undefined) {
          navigationCategories.value = parsed.categories
        }
        // 从本地加载成功，标记为已初始化
        if (parsed.widgets && parsed.widgets.length > 0) {
          isCloudInitialized.value = true
        }
      } else {
        widgets.value = []
        maxZIndex.value = 100
        // 加载失败且无本地数据，不标记为已初始化，防止空数据同步
        isCloudInitialized.value = false
      }
    } finally {
      isLoading.value = false
    }
  }

  async function loadFromCloud(): Promise<DesktopData | null> {
    try {
      const response = await fetch('/api/desktop')
      if (response.ok) {
        return await response.json()
      }
    } catch {
      // Offline or API unavailable
    }
    return null
  }

  async function saveToCloud() {
    try {
      const data: DesktopData = {
        widgets: widgets.value,
        maxZIndex: maxZIndex.value,
        navigationSites: navigationSites.value,
        categories: navigationCategories.value,
        version: 1,
        updatedAt: Date.now()
      }
      const response = await fetch('/api/desktop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      // 处理数据冲突
      if (response.status === 409) {
        const conflictData = await response.json()

        // 空数据保护：服务端拒绝空数据覆盖
        if (conflictData.reason === 'empty_data_protection') {
          console.warn('空数据保护：服务端拒绝空数据覆盖，使用服务端数据')

          // 使用服务器的数据
          if (conflictData.serverData) {
            widgets.value = conflictData.serverData.widgets || []
            maxZIndex.value = conflictData.serverData.maxZIndex || 100
            navigationSites.value = conflictData.serverData.navigationSites || []
            navigationCategories.value = conflictData.serverData.categories || ['工作', '学习', '其他']

            // 同步到本地存储
            saveToLocal()

            // 标记为已初始化
            isCloudInitialized.value = true
          }

          throw new Error('空数据保护：已自动使用服务器数据')
        }

        // 时间戳冲突：服务器有更新的数据
        console.warn('数据冲突：服务器有更新的数据', {
          clientTimestamp: conflictData.clientTimestamp ? new Date(conflictData.clientTimestamp).toLocaleString() : 'unknown',
          serverTimestamp: conflictData.serverTimestamp ? new Date(conflictData.serverTimestamp).toLocaleString() : 'unknown'
        })

        // 使用服务器的最新数据
        if (conflictData.serverData) {
          widgets.value = conflictData.serverData.widgets || []
          maxZIndex.value = conflictData.serverData.maxZIndex || 100
          navigationSites.value = conflictData.serverData.navigationSites || []
          navigationCategories.value = conflictData.serverData.categories || ['工作', '学习', '其他']

          // 同步到本地存储
          saveToLocal()

          // 抛出错误，让调用者知道发生了冲突
          throw new Error('数据冲突：已自动使用服务器最新数据')
        }
      }

      if (!response.ok) {
        throw new Error('Failed to save to cloud')
      }
    } catch (error) {
      console.error('Failed to save to cloud:', error)
      throw error
    }
  }

  function saveToLocal() {
    const data: DesktopData = {
      widgets: widgets.value,
      maxZIndex: maxZIndex.value,
      navigationSites: navigationSites.value,
      categories: navigationCategories.value,
      version: 1,
      updatedAt: Date.now()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  // 只保存到本地，不同步到云端
  function save() {
    saveToLocal()
  }

  // 手动同步到云端
  async function syncToCloud() {
    if (syncStatus.value === 'syncing') {
      return // 防止重复同步
    }

    // 安全检查：如果未从云端成功初始化，不允许同步（防止空数据覆盖云端数据）
    if (!isCloudInitialized.value) {
      console.warn('未从云端成功加载数据，跳过同步以防止数据丢失')
      syncStatus.value = 'error'
      syncErrorMessage.value = '数据未初始化，无法同步'
      setTimeout(() => {
        if (syncStatus.value === 'error') {
          syncStatus.value = 'idle'
        }
      }, 5000)
      return
    }

    syncStatus.value = 'syncing'
    syncErrorMessage.value = ''

    try {
      await saveToCloud()
      syncStatus.value = 'success'
      lastSyncTime.value = Date.now()

      // 3秒后重置状态
      setTimeout(() => {
        if (syncStatus.value === 'success') {
          syncStatus.value = 'idle'
        }
      }, 3000)
    } catch (error) {
      syncStatus.value = 'error'
      syncErrorMessage.value = error instanceof Error ? error.message : '同步失败'

      // 5秒后重置错误状态
      setTimeout(() => {
        if (syncStatus.value === 'error') {
          syncStatus.value = 'idle'
        }
      }, 5000)
    }
  }

  // 页面关闭前同步（使用sendBeacon确保数据发送）
  function syncBeforeUnload() {
    // 安全检查：如果未从云端成功初始化，不允许同步
    if (!isCloudInitialized.value) {
      console.warn('未从云端成功加载数据，跳过关闭前同步以防止数据丢失')
      return
    }

    const data: DesktopData = {
      widgets: widgets.value,
      maxZIndex: maxZIndex.value,
      navigationSites: navigationSites.value,
      categories: navigationCategories.value,
      version: 1,
      updatedAt: Date.now()
    }

    // 使用sendBeacon发送数据，即使页面关闭也能完成
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    navigator.sendBeacon('/api/desktop', blob)
  }

  function createWidget(params: CreateWidgetParams): Widget {
    const now = Date.now()
    const id = uuidv4()
    const x = params.x ?? Math.random() * 400 + 50
    const y = params.y ?? Math.random() * 300 + 50
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()

    const base = {
      id,
      x,
      y,
      width: params.width ?? 280,
      height: params.height ?? 200,
      zIndex: ++maxZIndex.value,
      isMinimized: false,
      isMaximized: false,
      createdAt: now,
      updatedAt: now,
    }

    switch (params.type) {
      case 'note': {
        const note: NoteWidget = {
          ...base,
          type: 'note',
          title: params.title ?? `便签-${randomSuffix}`,
          content: params.content ?? '',
          color: params.color ?? DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
        }
        widgets.value.push(note)
        return note
      }

      case 'todo': {
        const todo: TodoWidget = {
          ...base,
          type: 'todo',
          title: params.title ?? `待办-${randomSuffix}`,
          items: [],
          width: params.width ?? 560,
          height: params.height ?? 400,
        }
        widgets.value.push(todo)
        return todo
      }

      case 'text': {
        const text: TextWidget = {
          ...base,
          type: 'text',
          title: params.title ?? `文本-${randomSuffix}`,
          content: params.content ?? '',
          width: params.width ?? 560,
          height: params.height ?? 400,
        }
        widgets.value.push(text)
        return text
      }

      case 'image': {
        const image: ImageWidget = {
          ...base,
          type: 'image',
          title: params.title ?? `图片-${randomSuffix}`,
          src: params.src ?? '',
          filename: params.filename ?? '',
          scale: params.scale ?? 1,
          offsetX: 0,
          offsetY: 0,
          width: params.width ?? 400,
          height: params.height ?? 300,
        }
        widgets.value.push(image)
        return image
      }

      case 'markdown': {
        const markdown: MarkdownWidget = {
          ...base,
          type: 'markdown',
          title: params.title ?? `Markdown-${randomSuffix}`,
          content: params.content ?? '',
          width: params.width ?? 840,
          height: params.height ?? 600,
        }
        widgets.value.push(markdown)
        return markdown
      }

      default:
        throw new Error(`Unknown widget type: ${params.type}`)
    }
  }

  function deleteWidget(id: string) {
    const index = widgets.value.findIndex(w => w.id === id)
    if (index !== -1) {
      widgets.value.splice(index, 1)
      save()
    }
  }

  function updateWidget(id: string, updates: Partial<Widget>) {
    const widget = getWidgetById.value(id)
    if (widget) {
      Object.assign(widget, updates, { updatedAt: Date.now() })
      save()
    }
  }

  function updatePositionNoSave(id: string, x: number, y: number) {
    const widget = getWidgetById.value(id)
    if (widget) {
      widget.x = x
      widget.y = y
      widget.updatedAt = Date.now()
    }
  }

  function updatePosition(id: string, x: number, y: number) {
    const widget = getWidgetById.value(id)
    if (widget) {
      widget.x = x
      widget.y = y
      widget.updatedAt = Date.now()
      save()
    }
  }

  function bringToFront(id: string) {
    const widget = getWidgetById.value(id)
    if (widget) {
      widget.zIndex = ++maxZIndex.value
      save()
    }
  }

  function toggleMinimize(id: string) {
    const widget = getWidgetById.value(id)
    if (widget) {
      widget.isMinimized = !widget.isMinimized
      save()
    }
  }

  function toggleMaximize(id: string) {
    const widget = getWidgetById.value(id)
    if (!widget) return

    if (widget.isMaximized) {
      const saved = maximizeState.value[id]
      if (saved) {
        widget.x = saved.x
        widget.y = saved.y
        widget.width = saved.width
        widget.height = saved.height
      }
      widget.isMaximized = false
    } else {
      maximizeState.value[id] = {
        x: widget.x,
        y: widget.y,
        width: widget.width,
        height: widget.height,
      }
      widget.isMaximized = true
    }
    save()
  }

  function addTodoItem(widgetId: string, text: string) {
    const widget = getWidgetById.value(widgetId)
    if (widget?.type === 'todo') {
      const item: TodoItem = {
        id: uuidv4(),
        text,
        completed: false,
      }
      widget.items.unshift(item)
      widget.updatedAt = Date.now()
      save()
    }
  }

  function toggleTodoItem(widgetId: string, itemId: string) {
    const widget = getWidgetById.value(widgetId)
    if (widget?.type === 'todo') {
      const item = widget.items.find(i => i.id === itemId)
      if (item) {
        item.completed = !item.completed
        widget.updatedAt = Date.now()
        save()
      }
    }
  }

  function updateTodoItem(widgetId: string, itemId: string, text: string) {
    const widget = getWidgetById.value(widgetId)
    if (widget?.type === 'todo') {
      const item = widget.items.find(i => i.id === itemId)
      if (item) {
        item.text = text
        widget.updatedAt = Date.now()
        save()
      }
    }
  }

  function deleteTodoItem(widgetId: string, itemId: string) {
    const widget = getWidgetById.value(widgetId)
    if (widget?.type === 'todo') {
      widget.items = widget.items.filter(i => i.id !== itemId)
      widget.updatedAt = Date.now()
      save()
    }
  }

  function reorderTodoItems(widgetId: string, newItems: TodoItem[]) {
    const widget = getWidgetById.value(widgetId)
    if (widget?.type === 'todo') {
      widget.items = newItems
      widget.updatedAt = Date.now()
      save()
    }
  }

  function selectWidget(id: string | null) {
    selectedWidgetId.value = id
  }

  async function deleteImageWidget(id: string) {
    const widget = getWidgetById.value(id)
    if (widget?.type === 'image' && widget.filename) {
      try {
        await fetch('/api/image', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: widget.filename }),
        })
      } catch (error) {
        console.error('Failed to delete image from R2:', error)
      }
    }
    deleteWidget(id)
  }

  function openSearch() {
    isSearchOpen.value = true
    searchQuery.value = ''
  }

  function closeSearch() {
    isSearchOpen.value = false
    searchQuery.value = ''
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function focusWidget(id: string) {
    const widget = getWidgetById.value(id)
    if (widget) {
      // 自动切换到桌面 tab
      if (activeTab.value !== 'desktop') {
        setActiveTab('desktop')
      }
      widget.isMinimized = false
      widget.zIndex = ++maxZIndex.value
      save()
    }
    closeSearch()
  }

  // Tab actions
  function setActiveTab(tab: TabType) {
    activeTab.value = tab
    localStorage.setItem(TAB_STORAGE_KEY, tab)
  }

  function loadActiveTab() {
    const saved = localStorage.getItem(TAB_STORAGE_KEY)
    if (saved === 'desktop' || saved === 'news') {
      activeTab.value = saved
    }
  }

  // News actions
  function loadNewsCache() {
    try {
      const cached = localStorage.getItem(NEWS_CACHE_KEY)
      if (cached) {
        const data: NewsCache = JSON.parse(cached)
        newsSources.value = data.sources
        return true
      }
    } catch (error) {
      console.error('Failed to load news cache:', error)
    }
    return false
  }

  function saveNewsCache() {
    try {
      const cache: NewsCache = {
        sources: newsSources.value,
        version: 1,
        updatedAt: Date.now()
      }
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.error('Failed to save news cache:', error)
    }
  }

  async function fetchNews() {
    isLoadingNews.value = true
    try {
      // 获取所有新闻源
      const sourceIds = [
        'baidu', 'github', 'zhihu', 'douyin', 'hupu', 'tieba',
        'toutiao', 'thepaper', 'chongbuluo', 'tencent', 'wallstreetcn',
        'zaobao', 'sputniknewscn', 'coolapk', 'ithome', 'juejin',
        'sspai', 'solidot'
      ]
      const promises = sourceIds.map(id => fetchNewsBySource(id))
      await Promise.all(promises)
      saveNewsCache()
    } catch (error) {
      console.error('Failed to fetch news:', error)
    } finally {
      isLoadingNews.value = false
    }
  }

  async function fetchNewsBySource(sourceId: string) {
    try {
      // 查找或创建新闻源
      let sourceIndex = newsSources.value.findIndex(s => s.id === sourceId)

      if (sourceIndex === -1) {
        // 如果不存在,创建一个新的
        const sourceInfo = {
          baidu: { name: '百度热搜', icon: '🔥' },
          github: { name: 'GitHub Trending', icon: '🐙' },
          zhihu: { name: '知乎热榜', icon: '💡' },
          douyin: { name: '抖音热搜', icon: '🎵' },
          hupu: { name: '虎扑', icon: '🏀' },
          tieba: { name: '百度贴吧', icon: '💬' },
          toutiao: { name: '今日头条', icon: '📰' },
          thepaper: { name: '澎湃新闻', icon: '📄' },
          chongbuluo: { name: '虫部落', icon: '🐛' },
          tencent: { name: '腾讯新闻', icon: '🐧' },
          wallstreetcn: { name: '华尔街见闻', icon: '💰' },
          zaobao: { name: '联合早报', icon: '📰' },
          sputniknewscn: { name: '卫星通讯社', icon: '🛰️' },
          coolapk: { name: '酷安', icon: '📱' },
          ithome: { name: 'IT之家', icon: '💻' },
          juejin: { name: '稀土掘金', icon: '⛏️' },
          sspai: { name: '少数派', icon: '✨' },
          solidot: { name: 'Solidot', icon: '🔧' },
        }[sourceId]

        if (!sourceInfo) return

        newsSources.value.push({
          id: sourceId,
          name: sourceInfo.name,
          icon: sourceInfo.icon,
          items: [],
          lastUpdated: 0,
          status: 'loading'
        })
        sourceIndex = newsSources.value.length - 1
      } else {
        // 更新状态为加载中
        newsSources.value[sourceIndex].status = 'loading'
      }

      // 调用 API 获取新闻
      const response = await fetch(`/api/news?id=${sourceId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === 'success') {
        newsSources.value[sourceIndex] = {
          id: data.id,
          name: data.name,
          icon: newsSources.value[sourceIndex].icon,
          lastUpdated: data.updatedTime,
          items: data.items,
          status: 'success'
        }
      } else {
        newsSources.value[sourceIndex].status = 'error'
        newsSources.value[sourceIndex].error = data.error || 'Unknown error'
      }

      saveNewsCache()
    } catch (error) {
      console.error(`Failed to fetch news from ${sourceId}:`, error)
      const sourceIndex = newsSources.value.findIndex(s => s.id === sourceId)
      if (sourceIndex !== -1) {
        newsSources.value[sourceIndex].status = 'error'
        newsSources.value[sourceIndex].error = error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  function toggleNewsSource(sourceId: string) {
    if (enabledSources.value.has(sourceId)) {
      enabledSources.value.delete(sourceId)
    } else {
      enabledSources.value.add(sourceId)
    }
  }

  const filteredNewsSources = computed(() => {
    // 所有新闻源的信息
    const sourceInfo: Record<string, { name: string; icon: string }> = {
      baidu: { name: '百度热搜', icon: '🔥' },
      github: { name: 'GitHub Trending', icon: '🐙' },
      zhihu: { name: '知乎热榜', icon: '💡' },
      douyin: { name: '抖音热搜', icon: '🎵' },
      hupu: { name: '虎扑', icon: '🏀' },
      tieba: { name: '百度贴吧', icon: '💬' },
      toutiao: { name: '今日头条', icon: '📰' },
      thepaper: { name: '澎湃新闻', icon: '📄' },
      chongbuluo: { name: '虫部落', icon: '🐛' },
      tencent: { name: '腾讯新闻', icon: '🐧' },
      wallstreetcn: { name: '华尔街见闻', icon: '💰' },
      zaobao: { name: '联合早报', icon: '📰' },
      sputniknewscn: { name: '卫星通讯社', icon: '🛰️' },
      coolapk: { name: '酷安', icon: '📱' },
      ithome: { name: 'IT之家', icon: '💻' },
      juejin: { name: '稀土掘金', icon: '⛏️' },
      sspai: { name: '少数派', icon: '✨' },
      solidot: { name: 'Solidot', icon: '🔧' },
    }

    // 对于所有启用的源，返回已有数据或创建空卡片
    return Array.from(enabledSources.value).map(sourceId => {
      const existing = newsSources.value.find(s => s.id === sourceId)
      if (existing) return existing

      // 创建空的新闻源卡片
      const info = sourceInfo[sourceId]
      if (!info) return null

      return {
        id: sourceId,
        name: info.name,
        icon: info.icon,
        items: [],
        lastUpdated: 0,
        status: 'loading' as const
      }
    }).filter(Boolean) as typeof newsSources.value
  })

  async function initNews() {
    const hasCached = loadNewsCache()
    if (!hasCached) {
      await fetchNews()
    }
  }

  // Navigation Actions
  function saveNavigationData() {
    // 导航站数据通过统一的 save() 保存
    save()
  }

  async function fetchSiteIcon(url: string): Promise<string | undefined> {
    try {
      // 尝试获取网站的 favicon
      const urlObj = new URL(url)
      const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`

      // 简单检查 favicon 是否存在
      const response = await fetch(faviconUrl, { method: 'HEAD' })
      if (response.ok) {
        return faviconUrl
      }
    } catch (error) {
      console.error('Failed to fetch site icon:', error)
    }
    return undefined
  }

  async function addNavigationSite(params: {
    name: string
    url: string
    description: string
    color: string
    category?: string
    icon?: string
  }) {
    const id = uuidv4()
    const now = Date.now()

    // 如果没有传入图标，尝试获取网站图标
    const icon = params.icon || await fetchSiteIcon(params.url)

    const site: NavigationSite = {
      id,
      name: params.name,
      url: params.url,
      icon,
      description: params.description,
      color: params.color,
      category: params.category || '其他',  // 默认为"其他"
      order: navigationSites.value.length,
      createdAt: now,
      updatedAt: now
    }

    navigationSites.value.push(site)
    saveNavigationData()
    return site
  }

  async function updateNavigationSite(id: string, updates: Partial<NavigationSite>) {
    const site = navigationSites.value.find(s => s.id === id)
    if (site) {
      // 如果 URL 改变了，重新获取图标
      if (updates.url && updates.url !== site.url) {
        updates.icon = await fetchSiteIcon(updates.url)
      }

      Object.assign(site, updates, { updatedAt: Date.now() })
      saveNavigationData()
    }
  }

  function deleteNavigationSite(id: string) {
    const index = navigationSites.value.findIndex(s => s.id === id)
    if (index !== -1) {
      navigationSites.value.splice(index, 1)
      // 重新排序
      navigationSites.value.forEach((site, idx) => {
        site.order = idx
      })
      saveNavigationData()
    }
  }

  function reorderNavigationSites(fromIndex: number, toIndex: number) {
    const sites = [...navigationSites.value]
    const [removed] = sites.splice(fromIndex, 1)
    sites.splice(toIndex, 0, removed)

    // 更新 order
    sites.forEach((site, idx) => {
      site.order = idx
    })

    navigationSites.value = sites
    saveNavigationData()
  }

  function initNavigation() {
    // 导航站数据现在从 init() 中统一加载，无需单独初始化
  }

  // 分类管理方法
  function saveCategories() {
    // 分类数据通过统一的 save() 保存
    save()
  }

  function selectCategory(category: string) {
    selectedCategory.value = category
  }

  function addCategory(name: string): { success: boolean; error?: string } {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return { success: false, error: '分类名称不能为空' }
    }

    if (trimmedName === '全部') {
      return { success: false, error: '"全部"是保留名称，不能使用' }
    }

    if (navigationCategories.value.includes(trimmedName)) {
      return { success: false, error: '该分类已存在' }
    }

    navigationCategories.value.push(trimmedName)
    saveCategories()
    return { success: true }
  }

  function deleteCategory(name: string): { success: boolean; error?: string } {
    // 检查是否有网站使用该分类
    const sitesUsingCategory = navigationSites.value.filter(site => site.category === name)
    if (sitesUsingCategory.length > 0) {
      return { success: false, error: `该分类下还有 ${sitesUsingCategory.length} 个网站，无法删除` }
    }

    const index = navigationCategories.value.indexOf(name)
    if (index !== -1) {
      navigationCategories.value.splice(index, 1)
      saveCategories()

      // 如果当前选中的分类被删除，切换到"全部"
      if (selectedCategory.value === name) {
        selectedCategory.value = '全部'
      }
    }

    return { success: true }
  }

  // 批量导入网站（支持两种格式）
  // 格式1: 简单数组 [{ name, url, description?, category? }]
  // 格式2: navConfig格式 { navConfig: [{ name: '分类名', children: [...] }] }
  async function importNavigationSites(data: unknown): Promise<{ success: number; skipped: number; categories: number }> {
    let successCount = 0
    let skippedCount = 0
    let categoriesCount = 0

    // 预制颜色列表
    const defaultColors = ['#ffcdd2', '#f8bbd0', '#e1bee7', '#d1c4e9', '#c5cae9', '#bbdefb', '#b3e5fc', '#b2ebf2', '#b2dfdb', '#c8e6c9', '#dcedc8', '#f0f4c3', '#fff9c4', '#ffecb3', '#ffe0b2', '#ffccbc']

    // 转换后的网站列表
    interface ImportSite {
      name: string
      url: string
      description?: string
      category?: string
      icon?: string
      color?: string
    }
    let sitesToImport: ImportSite[] = []

    // 检测数据格式并转换
    if (data && typeof data === 'object' && 'navConfig' in data) {
      // navConfig 格式
      const navConfig = (data as { navConfig: Array<{ name: string; children?: unknown[] }> }).navConfig

      for (const category of navConfig) {
        const categoryName = category.name || '其他'

        // 自动添加新分类（排除默认分类和"全部"）
        if (categoryName !== '全部' && !navigationCategories.value.includes(categoryName)) {
          navigationCategories.value.push(categoryName)
          categoriesCount++
        }

        // 处理该分类下的网站
        if (Array.isArray(category.children)) {
          for (const item of category.children) {
            const site = item as Record<string, unknown>

            // 跳过组件类型（如倒计时、备忘录等）
            if (site.type === 'component') continue

            // 只处理有 url 的项目
            if (typeof site.url === 'string' && site.url) {
              sitesToImport.push({
                name: (site.name as string) || '',
                url: site.url,
                description: '',
                category: categoryName,
                icon: (site.src as string) || undefined,
                color: (site.backgroundColor as string) || undefined
              })
            }
          }
        }
      }
    } else if (Array.isArray(data)) {
      // 简单数组格式
      sitesToImport = data as ImportSite[]
    } else {
      throw new Error('数据格式错误：必须是数组格式或包含 navConfig 的对象')
    }

    // 导入网站
    for (const siteData of sitesToImport) {
      // 验证必填字段
      if (!siteData.name || !siteData.url) {
        skippedCount++
        continue
      }

      // 检查 URL 是否已存在（去重）
      const existingSite = navigationSites.value.find(s => s.url === siteData.url)
      if (existingSite) {
        skippedCount++
        continue
      }

      // 验证 URL 格式
      if (!siteData.url.startsWith('http://') && !siteData.url.startsWith('https://')) {
        skippedCount++
        continue
      }

      // 使用原有颜色或随机选择
      const color = siteData.color && siteData.color !== 'transparent'
        ? siteData.color
        : defaultColors[Math.floor(Math.random() * defaultColors.length)]

      // 添加网站
      try {
        const newSite: NavigationSite = {
          id: uuidv4(),
          name: siteData.name,
          url: siteData.url,
          icon: siteData.icon || undefined,
          description: siteData.description || '',
          color,
          category: siteData.category || '其他',
          order: navigationSites.value.length,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        navigationSites.value.push(newSite)
        successCount++
      } catch (error) {
        console.error('Failed to import site:', siteData, error)
        skippedCount++
      }
    }

    // 保存数据
    if (successCount > 0) {
      save()
      syncToCloud()
    }

    return { success: successCount, skipped: skippedCount, categories: categoriesCount }
  }

  return {
    // State
    widgets,
    maxZIndex,
    isLoading,
    selectedWidgetId,
    draggedWidgetId,
    maximizeState,
    isSearchOpen,
    searchQuery,
    activeTab,
    newsSources,
    isLoadingNews,
    enabledSources,
    filteredNewsSources,
    navigationSites,
    isLoadingNavigation,
    navigationCategories,
    selectedCategory,
    syncStatus,
    lastSyncTime,
    syncErrorMessage,
    // Getters
    getWidgetById,
    sortedWidgets,
    topWidget,
    minimizedWidgets,
    searchResults,
    sortedNavigationSites,
    allCategories,
    filteredNavigationSites,
    // Actions
    init,
    loadFromCloud,
    saveToCloud,
    saveToLocal,
    save,
    syncToCloud,
    syncBeforeUnload,
    createWidget,
    deleteWidget,
    updateWidget,
    updatePositionNoSave,
    updatePosition,
    bringToFront,
    toggleMinimize,
    toggleMaximize,
    addTodoItem,
    toggleTodoItem,
    updateTodoItem,
    deleteTodoItem,
    reorderTodoItems,
    selectWidget,
    deleteImageWidget,
    openSearch,
    closeSearch,
    setSearchQuery,
    focusWidget,
    setActiveTab,
    loadActiveTab,
    fetchNews,
    fetchNewsBySource,
    toggleNewsSource,
    initNews,
    addNavigationSite,
    updateNavigationSite,
    deleteNavigationSite,
    reorderNavigationSites,
    initNavigation,
    selectCategory,
    addCategory,
    importNavigationSites,
    deleteCategory,
  }
})
