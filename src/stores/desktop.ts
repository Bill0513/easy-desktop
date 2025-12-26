import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Widget, NoteWidget, TodoWidget, BookmarkWidget, FolderWidget, TextWidget, ImageWidget, MarkdownWidget, CreateWidgetParams, TodoItem, Bookmark, DesktopData, TabType, NewsSource, NewsCache } from '@/types'

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
  const hoveredFolderId = ref<string | null>(null)
  const maximizeState = ref<Record<string, { x: number; y: number; width: number; height: number }>>({})
  const isSearchOpen = ref(false)
  const searchQuery = ref('')

  // Tab state
  const activeTab = ref<TabType>('desktop')

  // News state
  const newsSources = ref<NewsSource[]>([])
  const isLoadingNews = ref(false)
  const enabledSources = ref<Set<string>>(new Set(['github', 'baidu', 'zhihu', 'weibo']))

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
    const folderChildrenIds = new Set<string>()
    widgets.value.forEach(w => {
      if (w.type === 'folder') {
        w.children.forEach(childId => folderChildrenIds.add(childId))
      }
    })
    return widgets.value.filter(w => w.isMinimized && !folderChildrenIds.has(w.id))
  })

  const searchResults = computed(() => {
    if (!searchQuery.value.trim()) return []
    const query = searchQuery.value.toLowerCase()

    return widgets.value.filter(widget => {
      if (widget.title.toLowerCase().includes(query)) return true

      switch (widget.type) {
        case 'note':
        case 'text':
        case 'markdown':
          return widget.content.toLowerCase().includes(query)
        case 'todo':
          return widget.items.some(item => item.text.toLowerCase().includes(query))
        case 'bookmark':
          return widget.bookmarks.some(b =>
            b.title.toLowerCase().includes(query) ||
            b.url.toLowerCase().includes(query)
          )
        default:
          return false
      }
    })
  })

  // Actions
  async function init() {
    isLoading.value = true
    try {
      const cloudData = await loadFromCloud()
      if (cloudData && cloudData.widgets) {
        widgets.value = cloudData.widgets
        maxZIndex.value = cloudData.maxZIndex || 100
      } else {
        const localData = localStorage.getItem(STORAGE_KEY)
        if (localData) {
          const parsed = JSON.parse(localData)
          widgets.value = parsed.widgets || []
          maxZIndex.value = parsed.maxZIndex || 100
        } else {
          widgets.value = []
          maxZIndex.value = 100
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      const localData = localStorage.getItem(STORAGE_KEY)
      if (localData) {
        const parsed = JSON.parse(localData)
        widgets.value = parsed.widgets || []
        maxZIndex.value = parsed.maxZIndex || 100
      } else {
        widgets.value = []
        maxZIndex.value = 100
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
        version: 1,
        updatedAt: Date.now()
      }
      await fetch('/api/desktop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
    } catch (error) {
      console.error('Failed to save to cloud:', error)
    }
  }

  function saveToLocal() {
    const data: DesktopData = {
      widgets: widgets.value,
      maxZIndex: maxZIndex.value,
      version: 1,
      updatedAt: Date.now()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  async function save() {
    saveToLocal()
    await saveToCloud()
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

      case 'bookmark': {
        const bookmark: BookmarkWidget = {
          ...base,
          type: 'bookmark',
          title: params.title ?? `书签-${randomSuffix}`,
          bookmarks: [],
        }
        widgets.value.push(bookmark)
        return bookmark
      }

      case 'folder': {
        const folder: FolderWidget = {
          ...base,
          type: 'folder',
          title: params.title ?? `文件夹-${randomSuffix}`,
          children: [],
          isOpen: false,
          width: params.width ?? 560,
          height: params.height ?? 400,
        }
        widgets.value.push(folder)
        return folder
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

  function deleteFolderWithChildren(folderId: string) {
    const folder = getWidgetById.value(folderId)
    if (folder?.type === 'folder') {
      folder.children.forEach(childId => {
        const childIndex = widgets.value.findIndex(w => w.id === childId)
        if (childIndex !== -1) {
          widgets.value.splice(childIndex, 1)
        }
      })
      const folderIndex = widgets.value.findIndex(w => w.id === folderId)
      if (folderIndex !== -1) {
        widgets.value.splice(folderIndex, 1)
      }
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
      widget.items.push(item)
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

  function addBookmark(widgetId: string, title: string, url: string) {
    const widget = getWidgetById.value(widgetId)
    if (widget?.type === 'bookmark') {
      const bookmark: Bookmark = {
        id: uuidv4(),
        title,
        url,
      }
      widget.bookmarks.push(bookmark)
      widget.updatedAt = Date.now()
      save()
    }
  }

  function deleteBookmark(widgetId: string, bookmarkId: string) {
    const widget = getWidgetById.value(widgetId)
    if (widget?.type === 'bookmark') {
      widget.bookmarks = widget.bookmarks.filter(b => b.id !== bookmarkId)
      widget.updatedAt = Date.now()
      save()
    }
  }

  function addToFolder(folderId: string, widgetId: string) {
    const folder = getWidgetById.value(folderId)
    if (folder?.type === 'folder' && !folder.children.includes(widgetId)) {
      folder.children.push(widgetId)
      const widget = getWidgetById.value(widgetId)
      if (widget) {
        widget.isMinimized = true
      }
      folder.updatedAt = Date.now()
      save()
    }
  }

  function removeFromFolder(folderId: string, widgetId: string) {
    const folder = getWidgetById.value(folderId)
    if (folder?.type === 'folder') {
      folder.children = folder.children.filter(id => id !== widgetId)
      const widget = getWidgetById.value(widgetId)
      if (widget) {
        widget.isMinimized = false
      }
      folder.updatedAt = Date.now()
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
      // Mock data - 后期替换为真实 API
      const mockSources: NewsSource[] = [
        {
          id: 'github',
          name: 'GitHub Trending',
          icon: '🐙',
          lastUpdated: Date.now(),
          items: Array.from({ length: 15 }, (_, i) => ({
            id: `github-${i}`,
            title: `Awesome Project ${i + 1} - A revolutionary new framework`,
            url: `https://github.com/trending/${i}`,
            time: `${i + 1}小时前`
          }))
        },
        {
          id: 'baidu',
          name: '百度热搜',
          icon: '🔥',
          lastUpdated: Date.now(),
          items: Array.from({ length: 15 }, (_, i) => ({
            id: `baidu-${i}`,
            title: `热点新闻 ${i + 1} - 今日重大事件报道`,
            url: `https://www.baidu.com/s?wd=news${i}`,
            time: `${i * 2}分钟前`
          }))
        },
        {
          id: 'zhihu',
          name: '知乎热榜',
          icon: '💡',
          lastUpdated: Date.now(),
          items: Array.from({ length: 15 }, (_, i) => ({
            id: `zhihu-${i}`,
            title: `如何看待 ${i + 1} 这个问题？`,
            url: `https://www.zhihu.com/question/${i}`,
            time: `${i * 3}分钟前`
          }))
        },
        {
          id: 'weibo',
          name: '微博热搜',
          icon: '📱',
          lastUpdated: Date.now(),
          items: Array.from({ length: 15 }, (_, i) => ({
            id: `weibo-${i}`,
            title: `#热门话题${i + 1}# 网友热议中`,
            url: `https://weibo.com/hot/${i}`,
            time: `${i * 5}分钟前`
          }))
        }
      ]

      newsSources.value = mockSources
      saveNewsCache()
    } catch (error) {
      console.error('Failed to fetch news:', error)
    } finally {
      isLoadingNews.value = false
    }
  }

  async function fetchNewsBySource(sourceId: string) {
    try {
      // Mock data - 后期替换为真实 API
      const sourceIndex = newsSources.value.findIndex(s => s.id === sourceId)
      if (sourceIndex === -1) return

      const mockData = {
        github: {
          name: 'GitHub Trending',
          icon: '🐙',
          items: Array.from({ length: 15 }, (_, i) => ({
            id: `github-${Date.now()}-${i}`,
            title: `Awesome Project ${i + 1} - A revolutionary new framework`,
            url: `https://github.com/trending/${i}`,
            time: `${i + 1}小时前`
          }))
        },
        baidu: {
          name: '百度热搜',
          icon: '🔥',
          items: Array.from({ length: 15 }, (_, i) => ({
            id: `baidu-${Date.now()}-${i}`,
            title: `热点新闻 ${i + 1} - 今日重大事件报道`,
            url: `https://www.baidu.com/s?wd=news${i}`,
            time: `${i * 2}分钟前`
          }))
        },
        zhihu: {
          name: '知乎热榜',
          icon: '💡',
          items: Array.from({ length: 15 }, (_, i) => ({
            id: `zhihu-${Date.now()}-${i}`,
            title: `如何看待 ${i + 1} 这个问题？`,
            url: `https://www.zhihu.com/question/${i}`,
            time: `${i * 3}分钟前`
          }))
        },
        weibo: {
          name: '微博热搜',
          icon: '📱',
          items: Array.from({ length: 15 }, (_, i) => ({
            id: `weibo-${Date.now()}-${i}`,
            title: `#热门话题${i + 1}# 网友热议中`,
            url: `https://weibo.com/hot/${i}`,
            time: `${i * 5}分钟前`
          }))
        }
      }

      const data = mockData[sourceId as keyof typeof mockData]
      if (data) {
        newsSources.value[sourceIndex] = {
          id: sourceId,
          name: data.name,
          icon: data.icon,
          lastUpdated: Date.now(),
          items: data.items
        }
        saveNewsCache()
      }
    } catch (error) {
      console.error('Failed to fetch news by source:', error)
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
    return newsSources.value.filter(source => enabledSources.value.has(source.id))
  })

  async function initNews() {
    const hasCached = loadNewsCache()
    if (!hasCached) {
      await fetchNews()
    }
  }

  return {
    // State
    widgets,
    maxZIndex,
    isLoading,
    selectedWidgetId,
    draggedWidgetId,
    hoveredFolderId,
    maximizeState,
    isSearchOpen,
    searchQuery,
    activeTab,
    newsSources,
    isLoadingNews,
    enabledSources,
    filteredNewsSources,
    // Getters
    getWidgetById,
    sortedWidgets,
    topWidget,
    minimizedWidgets,
    searchResults,
    // Actions
    init,
    loadFromCloud,
    saveToCloud,
    saveToLocal,
    save,
    createWidget,
    deleteWidget,
    deleteFolderWithChildren,
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
    addBookmark,
    deleteBookmark,
    addToFolder,
    removeFromFolder,
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
  }
})
