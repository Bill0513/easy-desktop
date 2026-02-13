import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Widget, NoteWidget, TodoWidget, TextWidget, ImageWidget, MarkdownWidget, CountdownWidget, RandomPickerWidget, CheckInWidget, CreateWidgetParams, TodoItem, DesktopData, TabType, NewsSource, NewsCache, NavigationSite, FileItem, FolderItem, FileViewMode, MindMapFile, SimpleMindMapNode, ThemeMode } from '@/types'
import { indexedDB as idb } from '@/utils/indexedDB'

const TAB_STORAGE_KEY = 'cloud-desktop-active-tab'
const NEWS_CACHE_KEY = 'cloud-desktop-news-cache'
const MOBILE_LAYOUT_STORAGE_KEY = 'cloud-desktop-mobile-layout'
const DESKTOP_DATA_KEY = 'desktop-data' // IndexedDB 中的主数据键
const TEXT_CODE_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'js', 'jsx', 'ts', 'tsx', 'json', 'vue',
  'css', 'scss', 'less', 'html', 'htm', 'py', 'sql', 'sh', 'bash',
  'yml', 'yaml', 'xml', 'c', 'cpp', 'h', 'hpp', 'java', 'go', 'rs', 'php'
])

// 默认组件颜色
const DEFAULT_COLORS = ['#fff9c4', '#ffcdd2', '#c8e6c9', '#bbdefb', '#ffe0b2', '#f3e5f5']

// Toast 容器引用
let toastContainerRef: any = null

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
  const mobileWidgetOrder = ref<string[]>([])
  const mobileCollapsedWidgets = ref<Record<string, boolean>>({})
  const mobileFocusTarget = ref<{ id: string; token: number } | null>(null)

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

  // Search state (搜索栏)
  const searchHistory = ref<string[]>([])
  const searchEngine = ref<string>('google')

  // Background state
  const backgroundColor = ref<string>('#fdfbf7') // 默认纸张色

  // Theme state
  const themeMode = ref<ThemeMode>('system') // 主题模式：light, dark, system
  const darkBackgroundColor = ref<string>('#1a1a1a') // 暗色主题背景色
  let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null // 系统主题监听器

  // File state
  const files = ref<FileItem[]>([])
  const folders = ref<FolderItem[]>([])
  const currentFolderId = ref<string | null>(null)
  const fileViewMode = ref<FileViewMode>('grid')
  const isLoadingFiles = ref(false)
  const previewFile = ref<FileItem | null>(null)
  const showFileUploadDialog = ref(false)
  const fileSortBy = ref<'name' | 'size' | 'date'>('name')
  const fileSortOrder = ref<'asc' | 'desc'>('asc')
  const clipboard = ref<{ items: (FileItem | FolderItem)[]; operation: 'copy' | 'cut' } | null>(null)
  const selectedFileIds = ref<Set<string>>(new Set())

  // Sync state
  const syncStatus = ref<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const lastSyncTime = ref<number | null>(null)
  const syncErrorMessage = ref<string>('')
  const isCloudInitialized = ref(false) // 标记是否已从云端成功加载过数据
  const hasDirtyData = ref(false) // 标记是否有未同步到云端的数据

  // File sync state
  const fileSyncStatus = ref<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const lastFileSyncTime = ref<number | null>(null)
  const fileSyncErrorMessage = ref<string>('')
  const isFileCloudInitialized = ref(false) // 标记文件是否已从云端成功加载过数据
  const hasFileDirtyData = ref(false) // 标记文件是否有未同步到云端的数据

  // Mind map state
  const mindMaps = ref<MindMapFile[]>([])
  const currentMindMapId = ref<string | null>(null)
  const isLoadingMindMap = ref(false)

  // Canvas scale state (30% - 150%)
  const canvasScale = ref<number>(100)
  const lastArrangedScale = ref<number | null>(null) // 记录一键整理后的最佳缩放比例

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

  // 超出可视范围的组件
  const outOfViewWidgets = computed(() => {
    const scaleFactor = canvasScale.value / 100
    const viewportWidth = window.innerWidth / scaleFactor
    const viewportHeight = window.innerHeight / scaleFactor

    return widgets.value.filter(w =>
      !w.isMinimized &&
      !w.isMaximized &&
      (w.x + w.width > viewportWidth || w.y + w.height > viewportHeight)
    )
  })

  const searchResults = computed(() => {
    if (!searchQuery.value.trim()) return []
    const query = searchQuery.value.toLowerCase()

    // 全局搜索：同时搜索桌面组件、导航网站、文件、思维导图和代码片段
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

    const fileResults = files.value.filter(file =>
      file.name.toLowerCase().includes(query) ||
      file.language?.toLowerCase().includes(query) ||
      file.description?.toLowerCase().includes(query) ||
      file.tags?.some(tag => tag.toLowerCase().includes(query))
    )

    const folderResults = folders.value.filter(folder =>
      folder.name.toLowerCase().includes(query)
    )

    const mindMapResults = mindMaps.value.filter(mindMap =>
      mindMap.name.toLowerCase().includes(query)
    )

    // 合并结果：桌面组件在前，导航网站在后，文件和文件夹、思维导图最后
    return [...widgetResults, ...siteResults, ...folderResults, ...fileResults, ...mindMapResults]
  })

  // 当前文件夹下的项目（文件+文件夹）
  const currentFolderItems = computed(() => {
    const folderItems = folders.value.filter(f => f.parentId === currentFolderId.value)
    const fileItems = files.value.filter(f => f.parentId === currentFolderId.value)

    // 排序函数
    const sortItems = (items: (FileItem | FolderItem)[]) => {
      return items.sort((a, b) => {
        let comparison = 0

        switch (fileSortBy.value) {
          case 'name':
            comparison = a.name.localeCompare(b.name, 'zh-CN')
            break
          case 'size':
            // 文件夹大小视为 0
            const sizeA = a.type === 'file' ? a.size : 0
            const sizeB = b.type === 'file' ? b.size : 0
            comparison = sizeA - sizeB
            break
          case 'date':
            comparison = a.updatedAt - b.updatedAt
            break
        }

        return fileSortOrder.value === 'asc' ? comparison : -comparison
      })
    }

    // 分别排序文件夹和文件
    const sortedFolders = sortItems([...folderItems])
    const sortedFiles = sortItems([...fileItems])

    // 文件夹在前，文件在后
    return [...sortedFolders, ...sortedFiles]
  })

  // 面包屑路径
  const breadcrumbPath = computed(() => {
    const path: FolderItem[] = []
    let currentId = currentFolderId.value

    while (currentId) {
      const folder = folders.value.find(f => f.id === currentId)
      if (!folder) break
      path.unshift(folder)
      currentId = folder.parentId
    }

    return path
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

  // 计算实际生效的主题
  const effectiveTheme = computed<'light' | 'dark'>(() => {
    if (themeMode.value === 'system') {
      return detectSystemTheme()
    }
    return themeMode.value
  })

  // 检测系统主题
  function detectSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }

  // 应用主题到 DOM
  function applyTheme() {
    const theme = effectiveTheme.value
    document.documentElement.setAttribute('data-theme', theme)

    // 应用背景色
    const bgColor = theme === 'dark' ? darkBackgroundColor.value : backgroundColor.value
    document.documentElement.style.setProperty('--color-bg-primary', bgColor)
  }

  // 初始化主题系统
  function initTheme() {
    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemThemeListener = () => {
      if (themeMode.value === 'system') {
        applyTheme()
      }
    }
    mediaQuery.addEventListener('change', systemThemeListener)

    // 应用初始主题
    applyTheme()
  }

  // 设置主题模式
  function setThemeMode(mode: ThemeMode) {
    themeMode.value = mode
    applyTheme()
    save()
  }

  // 设置暗色主题背景色
  function setDarkBackgroundColor(color: string) {
    darkBackgroundColor.value = color
    if (effectiveTheme.value === 'dark') {
      applyTheme()
    }
    save()
  }

  // Actions
  function saveMobileLayout() {
    if (typeof window === 'undefined') return

    localStorage.setItem(MOBILE_LAYOUT_STORAGE_KEY, JSON.stringify({
      order: mobileWidgetOrder.value,
      collapsed: mobileCollapsedWidgets.value
    }))
  }

  function loadMobileLayout() {
    if (typeof window === 'undefined') return

    try {
      const raw = localStorage.getItem(MOBILE_LAYOUT_STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.order)) {
        mobileWidgetOrder.value = parsed.order.filter((id: unknown) => typeof id === 'string')
      }
      if (parsed.collapsed && typeof parsed.collapsed === 'object') {
        mobileCollapsedWidgets.value = parsed.collapsed
      }
    } catch (error) {
      console.warn('Failed to load mobile layout:', error)
    }
  }

  function syncMobileLayoutWithWidgets() {
    const existingIds = widgets.value.map(widget => widget.id)
    const existingSet = new Set(existingIds)

    const orderedIds = mobileWidgetOrder.value.filter(id => existingSet.has(id))
    const missingIds = existingIds.filter(id => !orderedIds.includes(id))
    mobileWidgetOrder.value = [...orderedIds, ...missingIds]

    const nextCollapsed: Record<string, boolean> = {}
    Object.entries(mobileCollapsedWidgets.value).forEach(([id, collapsed]) => {
      if (collapsed && existingSet.has(id)) {
        nextCollapsed[id] = true
      }
    })
    mobileCollapsedWidgets.value = nextCollapsed

    saveMobileLayout()
  }

  function setMobileWidgetOrder(order: string[]) {
    mobileWidgetOrder.value = [...order]
    syncMobileLayoutWithWidgets()
  }

  function setMobileWidgetExpandedExclusive(id: string) {
    const nextCollapsed: Record<string, boolean> = {}
    widgets.value.forEach(widget => {
      if (widget.id !== id) {
        nextCollapsed[widget.id] = true
      }
    })
    mobileCollapsedWidgets.value = nextCollapsed
    saveMobileLayout()
  }

  function setMobileWidgetCollapsed(id: string, collapsed: boolean) {
    if (collapsed) {
      mobileCollapsedWidgets.value[id] = true
      saveMobileLayout()
      return
    }

    setMobileWidgetExpandedExclusive(id)
  }

  function toggleMobileWidgetCollapsed(id: string) {
    if (mobileCollapsedWidgets.value[id]) {
      setMobileWidgetExpandedExclusive(id)
    } else {
      mobileCollapsedWidgets.value[id] = true
      saveMobileLayout()
    }
  }

  function isMobileWidgetCollapsed(id: string): boolean {
    return !!mobileCollapsedWidgets.value[id]
  }

  function notifyMobileWidgetRestored(id: string) {
    mobileFocusTarget.value = {
      id,
      token: Date.now()
    }
  }

  async function init() {
    isLoading.value = true
    try {
      // 初始化 IndexedDB
      await idb.init()

      // 优先从云端加载数据
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
        // 加载启用的新闻源
        if (cloudData.enabledNewsSources !== undefined) {
          enabledSources.value = new Set(cloudData.enabledNewsSources)
        }
        // 加载搜索历史和搜索引擎
        if (cloudData.searchHistory !== undefined) {
          searchHistory.value = cloudData.searchHistory
        }
        if (cloudData.searchEngine !== undefined) {
          searchEngine.value = cloudData.searchEngine
        }
        // 加载背景颜色
        if (cloudData.backgroundColor !== undefined) {
          backgroundColor.value = cloudData.backgroundColor
        }
        // 加载主题设置
        if (cloudData.themeMode !== undefined) {
          themeMode.value = cloudData.themeMode
        }
        if (cloudData.darkBackgroundColor !== undefined) {
          darkBackgroundColor.value = cloudData.darkBackgroundColor
        }
        // 加载思维导图历史记录
        if (cloudData.mindMaps !== undefined) {
          mindMaps.value = cloudData.mindMaps
        }
        // 标记已从云端成功加载
        isCloudInitialized.value = true

        // 保存到 IndexedDB 作为本地缓存（标记为干净数据）
        await saveToLocal(false)
      } else {
        // 云端无数据，尝试从 IndexedDB 加载
        const localData = await idb.get(DESKTOP_DATA_KEY)
        if (localData) {
          widgets.value = localData.widgets || []
          maxZIndex.value = localData.maxZIndex || 100
          navigationSites.value = localData.navigationSites || []
          navigationCategories.value = localData.categories || ['工作', '学习', '其他']
          enabledSources.value = new Set(localData.enabledNewsSources || [])
          searchHistory.value = localData.searchHistory || []
          searchEngine.value = localData.searchEngine || 'google'
          backgroundColor.value = localData.backgroundColor || '#fdfbf7'
          themeMode.value = localData.themeMode || 'system'
          darkBackgroundColor.value = localData.darkBackgroundColor || '#1a1a1a'
          mindMaps.value = localData.mindMaps || []

          // 如果本地有数据，标记为已初始化（允许后续同步到云端）
          isCloudInitialized.value = true
        } else {
          // 本地也无数据，使用默认值
          widgets.value = []
          maxZIndex.value = 100
          navigationSites.value = []
          navigationCategories.value = ['工作', '学习', '其他']
          enabledSources.value = new Set([
            'github', 'baidu', 'zhihu', 'douyin', 'hupu', 'tieba',
            'toutiao', 'thepaper', 'chongbuluo', 'tencent', 'wallstreetcn',
            'zaobao', 'sputniknewscn', 'coolapk', 'ithome', 'juejin',
            'sspai', 'solidot'
          ])
          searchHistory.value = []
          searchEngine.value = 'google'
          mindMaps.value = []

          // 标记为已初始化
          isCloudInitialized.value = true
        }
      }

      // 检查是否有脏数据
      hasDirtyData.value = await idb.hasDirtyData()

      // 设置初始的最后同步时间（表示数据已加载）
      if (!lastSyncTime.value) {
        lastSyncTime.value = Date.now()
      }

      // 初始化主题系统
      initTheme()
      loadMobileLayout()
      syncMobileLayoutWithWidgets()
    } catch (error) {
      console.error('Failed to init:', error)
      // 初始化失败，不标记为已初始化
      isCloudInitialized.value = false
    } finally {
      isLoading.value = false
    }

    // 加载当前激活的标签页（从 localStorage，这是临时 UI 状态）
    const savedTab = localStorage.getItem(TAB_STORAGE_KEY)
    if (savedTab === 'desktop' || savedTab === 'navigation' || savedTab === 'news' || savedTab === 'file' || savedTab === 'mindmap') {
      activeTab.value = savedTab as TabType
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
        enabledNewsSources: Array.from(enabledSources.value),
        searchHistory: searchHistory.value,
        searchEngine: searchEngine.value,
        backgroundColor: backgroundColor.value,
        themeMode: themeMode.value,
        darkBackgroundColor: darkBackgroundColor.value,
        mindMaps: mindMaps.value,
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

  // 保存数据到 IndexedDB（本地缓存）
  async function saveToLocal(isDirty: boolean = true) {
    try {
      const data: DesktopData = {
        widgets: widgets.value,
        maxZIndex: maxZIndex.value,
        navigationSites: navigationSites.value,
        categories: navigationCategories.value,
        enabledNewsSources: Array.from(enabledSources.value),
        searchHistory: searchHistory.value,
        searchEngine: searchEngine.value,
        backgroundColor: backgroundColor.value,
        themeMode: themeMode.value,
        darkBackgroundColor: darkBackgroundColor.value,
        mindMaps: mindMaps.value,
        version: 1,
        updatedAt: Date.now()
      }

      await idb.set(DESKTOP_DATA_KEY, data, isDirty)

      // 更新脏数据标记
      if (isDirty) {
        hasDirtyData.value = true
      } else {
        hasDirtyData.value = await idb.hasDirtyData()
      }
    } catch (error) {
      console.error('Failed to save to IndexedDB:', error)
    }
  }

  // 防抖定时器
  let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null

  // 保存数据（只写 IndexedDB，不触发云同步）
  function save() {
    // 清除之前的定时器
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer)
    }

    // 设置新的定时器，500ms 后执行本地保存
    saveDebounceTimer = setTimeout(async () => {
      await saveToLocal(true) // 标记为脏数据
      saveDebounceTimer = null
    }, 500)
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

    // 如果没有脏数据，更新检查时间后直接返回
    if (!hasDirtyData.value) {
      // 更新最后同步时间（表示已检查过）
      lastSyncTime.value = Date.now()
      // 不显示 toast，因为这是自动检查
      return
    }

    syncStatus.value = 'syncing'
    syncErrorMessage.value = ''

    try {
      await saveToCloud()
      syncStatus.value = 'success'
      lastSyncTime.value = Date.now()

      // 同步成功后，标记数据为干净
      await idb.markClean(DESKTOP_DATA_KEY)
      hasDirtyData.value = false

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
      enabledNewsSources: Array.from(enabledSources.value),
      searchHistory: searchHistory.value,
      searchEngine: searchEngine.value,
      mindMaps: mindMaps.value,
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

    const registerWidget = <T extends Widget>(widget: T): T => {
      widgets.value.push(widget)
      mobileWidgetOrder.value = [widget.id, ...mobileWidgetOrder.value.filter(id => id !== widget.id)]
      saveMobileLayout()
      return widget
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
        return registerWidget(note)
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
        return registerWidget(todo)
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
        return registerWidget(text)
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
        return registerWidget(image)
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
        return registerWidget(markdown)
      }

      case 'countdown': {
        const countdown: CountdownWidget = {
          ...base,
          type: 'countdown',
          title: params.title ?? `倒计时-${randomSuffix}`,
          targetDate: params.targetDate ?? '',
          description: params.description ?? '',
          width: params.width ?? 280,
          height: params.height ?? 320,
        }
        return registerWidget(countdown)
      }

      case 'random-picker': {
        const randomPicker: RandomPickerWidget = {
          ...base,
          type: 'random-picker',
          title: params.title ?? `决策器-${randomSuffix}`,
          options: params.options ?? [],
          width: params.width ?? 300,
          height: params.height ?? 380,
        }
        return registerWidget(randomPicker)
      }

      case 'check-in': {
        const checkIn: CheckInWidget = {
          ...base,
          type: 'check-in',
          title: params.title ?? `打卡-${randomSuffix}`,
          checkInRecords: [],
          goal: params.goal,
          category: params.category,
          width: params.width ?? 360,
          height: params.height ?? 480,
        }
        return registerWidget(checkIn)
      }

      default:
        throw new Error(`Unknown widget type: ${params.type}`)
    }
  }

  function deleteWidget(id: string) {
    const index = widgets.value.findIndex(w => w.id === id)
    if (index !== -1) {
      widgets.value.splice(index, 1)
      mobileWidgetOrder.value = mobileWidgetOrder.value.filter(widgetId => widgetId !== id)
      delete mobileCollapsedWidgets.value[id]
      saveMobileLayout()
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
        priority: undefined  // 默认无优先级
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

  function toggleTodoPriority(widgetId: string, itemId: string) {
    const widget = getWidgetById.value(widgetId)
    if (widget?.type === 'todo') {
      const item = widget.items.find(i => i.id === itemId)
      if (item) {
        // 循环切换优先级: undefined -> 1 -> 2 -> 3 -> undefined
        if (item.priority === undefined) {
          item.priority = 1
        } else if (item.priority === 1) {
          item.priority = 2
        } else if (item.priority === 2) {
          item.priority = 3
        } else {
          item.priority = undefined
        }
        widget.updatedAt = Date.now()
        save()
      }
    }
  }

  function selectWidget(id: string | null) {
    selectedWidgetId.value = id
  }

  // 一键整理：重新排列非最小化的组件，避免重叠，并智能调整缩放
  // 使用改进的 Shelf Packing 算法（按高度排序）
  function arrangeWidgets() {
    const PADDING = 20
    const TOP_TOOLBAR_HEIGHT = 80 // 顶部工具栏高度（视口坐标）
    const BOTTOM_TASKBAR_HEIGHT = 80 // 底部最小化栏高度（视口坐标）
    const visibleWidgets = widgets.value.filter(w => !w.isMinimized && !w.isMaximized)

    if (visibleWidgets.length === 0) return

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // 智能缩放算法：找到能放下最多组件的最佳缩放比例
    const bestScale = findOptimalScale(visibleWidgets, viewportWidth, viewportHeight, TOP_TOOLBAR_HEIGHT, BOTTOM_TASKBAR_HEIGHT, PADDING)

    // 记录最佳缩放比例
    lastArrangedScale.value = bestScale

    // 应用最佳缩放比例
    if (bestScale !== canvasScale.value) {
      setCanvasScale(bestScale)
    }

    // 使用最佳缩放比例重新计算可用空间
    const finalScale = bestScale / 100

    // 计算画布坐标系中的起始位置和可用空间
    // 工具栏和任务栏是固定定位，不受缩放影响，所以需要转换到画布坐标系
    const startY = TOP_TOOLBAR_HEIGHT / finalScale + PADDING
    const availableWidth = viewportWidth / finalScale - PADDING * 2
    const availableHeight = (viewportHeight - TOP_TOOLBAR_HEIGHT - BOTTOM_TASKBAR_HEIGHT) / finalScale - PADDING * 2

    // 使用 Shelf Packing 算法排列组件
    packWidgetsWithShelfAlgorithm(visibleWidgets, PADDING, startY, availableWidth, availableHeight, PADDING)

    save()
  }

  // Shelf Packing 算法：按高度排序，优化空间利用率
  function packWidgetsWithShelfAlgorithm(
    widgets: Widget[],
    startX: number,
    startY: number,
    availableWidth: number,
    availableHeight: number,
    padding: number
  ) {
    // 1. 按高度降序排序（高的组件优先放置）
    const sortedWidgets = [...widgets].sort((a, b) => b.height - a.height)

    // 2. 使用 Shelf 算法排列
    let currentX = startX
    let currentY = startY
    let currentShelfHeight = 0

    for (const widget of sortedWidgets) {
      // 如果当前行放不下，换行（创建新的 shelf）
      if (currentX + widget.width > startX + availableWidth && currentX > startX) {
        // 移动到下一行
        currentX = startX
        currentY += currentShelfHeight + padding
        currentShelfHeight = 0
      }

      // 检查是否超出底部边界
      if (currentY + widget.height > startY + availableHeight) {
        // 超出边界，停止放置（理论上不应该发生，因为已经计算了最佳缩放）
        console.warn('Widget exceeds available height:', widget.id)
        break
      }

      // 放置组件
      widget.x = currentX
      widget.y = currentY
      widget.updatedAt = Date.now()

      // 更新当前位置和行高
      currentX += widget.width + padding
      currentShelfHeight = Math.max(currentShelfHeight, widget.height)
    }
  }

  // 智能缩放算法：找到能放下最多组件的最佳缩放比例
  function findOptimalScale(
    widgets: Widget[],
    viewportWidth: number,
    viewportHeight: number,
    topHeight: number,
    bottomHeight: number,
    padding: number
  ): number {
    // 可选的缩放比例（从 100% 到 30%，步长 10%）
    const scaleOptions = [100, 90, 80, 70, 60, 50, 40, 30]

    // 按高度降序排序（与实际排列算法一致）
    const sortedWidgets = [...widgets].sort((a, b) => b.height - a.height)

    let bestScale = 100
    let maxFittedWidgets = 0

    for (const scale of scaleOptions) {
      const scaleFactor = scale / 100

      // 计算在该缩放比例下的可用空间（画布坐标系）
      const startX = padding
      const startY = topHeight / scaleFactor + padding
      const availableWidth = viewportWidth / scaleFactor - padding * 2
      const availableHeight = (viewportHeight - topHeight - bottomHeight) / scaleFactor - padding * 2

      // 模拟 Shelf Packing 排列，计算能放下多少组件
      let currentX = startX
      let currentY = startY
      let currentShelfHeight = 0
      let fittedCount = 0

      for (const widget of sortedWidgets) {
        // 如果当前行放不下，换行
        if (currentX + widget.width > startX + availableWidth && currentX > startX) {
          currentX = startX
          currentY += currentShelfHeight + padding
          currentShelfHeight = 0
        }

        // 检查是否超出底部边界
        if (currentY + widget.height > startY + availableHeight) {
          // 超出边界，停止计数
          break
        }

        // 该组件可以放下
        fittedCount++
        currentX += widget.width + padding
        currentShelfHeight = Math.max(currentShelfHeight, widget.height)
      }

      // 如果这个缩放比例能放下更多组件，更新最佳缩放
      if (fittedCount > maxFittedWidgets) {
        maxFittedWidgets = fittedCount
        bestScale = scale
      }

      // 如果能放下所有组件，优先选择较大的缩放比例
      if (fittedCount === widgets.length) {
        return scale
      }
    }

    return bestScale
  }

  // 适应窗口：调整缩放以适应所有可见组件
  function fitToWindow() {
    const PADDING = 20
    const TOP_TOOLBAR_HEIGHT = 80
    const BOTTOM_TASKBAR_HEIGHT = 80
    const visibleWidgets = widgets.value.filter(w => !w.isMinimized && !w.isMaximized)

    if (visibleWidgets.length === 0) {
      showToast('没有可见的组件', 'info')
      return
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // 计算最佳缩放比例
    const bestScale = findOptimalScale(
      visibleWidgets,
      viewportWidth,
      viewportHeight,
      TOP_TOOLBAR_HEIGHT,
      BOTTOM_TASKBAR_HEIGHT,
      PADDING
    )

    setCanvasScale(bestScale)
    showToast(`已调整到最佳缩放比例 ${bestScale}%`, 'success', 2000)
  }

  // 重置组件位置到可视范围内
  function resetWidgetPosition(id: string) {
    const widget = getWidgetById.value(id)
    if (!widget) return

    const PADDING = 20
    const TOP_TOOLBAR_HEIGHT = 80
    const scaleFactor = canvasScale.value / 100
    const viewportWidth = window.innerWidth / scaleFactor
    const viewportHeight = window.innerHeight / scaleFactor

    // 计算安全的起始位置（避开工具栏）
    const startY = TOP_TOOLBAR_HEIGHT / scaleFactor + PADDING

    // 将组件放置在可视范围内的中心位置
    const centerX = (viewportWidth - widget.width) / 2
    const centerY = startY + (viewportHeight - startY - widget.height) / 2

    // 确保不超出边界
    widget.x = Math.max(PADDING, Math.min(centerX, viewportWidth - widget.width - PADDING))
    widget.y = Math.max(startY, Math.min(centerY, viewportHeight - widget.height - PADDING))
    widget.updatedAt = Date.now()

    // 提升到最前面
    widget.zIndex = ++maxZIndex.value

    save()
    showToast(`已将"${widget.title}"移动到可视范围`, 'success', 2000)
  }

  // 设置缩放比 (30% - 150%)
  function setCanvasScale(scale: number) {
    const oldScale = canvasScale.value
    canvasScale.value = Math.max(30, Math.min(150, scale))

    // 如果放大且有组件超出范围，显示提示
    if (scale > oldScale && scale > (lastArrangedScale.value || 100)) {
      // 检查是否有组件超出可视范围
      const scaleFactor = scale / 100
      const viewportWidth = window.innerWidth / scaleFactor
      const viewportHeight = window.innerHeight / scaleFactor

      const outOfViewWidgets = widgets.value.filter(w =>
        !w.isMinimized &&
        !w.isMaximized &&
        (w.x + w.width > viewportWidth || w.y + w.height > viewportHeight)
      )

      if (outOfViewWidgets.length > 0) {
        showToast(
          `${outOfViewWidgets.length} 个组件超出可视范围，查看底部警告图标或点击"适应"按钮`,
          'warning',
          5000
        )
      }
    }
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
    if (saved === 'desktop' || saved === 'navigation' || saved === 'news' || saved === 'file' || saved === 'mindmap') {
      activeTab.value = saved
    }
  }

  // Background actions
  function setBackgroundColor(color: string) {
    backgroundColor.value = color
    save()
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
    save()
  }

  // 带时间检查的新闻刷新（只刷新超过指定时间的源）
  async function refreshNewsWithCheck(maxAge: number) {
    const now = Date.now()
    const sourcesToRefresh: string[] = []

    // 检查每个启用的源是否需要刷新
    for (const sourceId of enabledSources.value) {
      const source = newsSources.value.find(s => s.id === sourceId)
      // 如果源不存在，或者上次更新时间超过 maxAge，则需要刷新
      if (!source || !source.lastUpdated || (now - source.lastUpdated) > maxAge) {
        sourcesToRefresh.push(sourceId)
      }
    }

    if (sourcesToRefresh.length === 0) {
      console.log('All news sources are up to date')
      return
    }

    console.log(`Refreshing ${sourcesToRefresh.length} news sources:`, sourcesToRefresh)
    isLoadingNews.value = true

    try {
      const promises = sourcesToRefresh.map(id => fetchNewsBySource(id))
      await Promise.all(promises)
      saveNewsCache()
    } catch (error) {
      console.error('Failed to refresh news:', error)
    } finally {
      isLoadingNews.value = false
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
    // 获取当前过滤后的网站列表
    const filtered = filteredNavigationSites.value
    if (fromIndex < 0 || fromIndex >= filtered.length || toIndex < 0 || toIndex >= filtered.length) {
      return
    }

    // 获取要移动的网站
    const movedSite = filtered[fromIndex]
    const targetSite = filtered[toIndex]

    // 在完整列表中找到这两个网站的实际索引
    const allSites = [...navigationSites.value].sort((a, b) => a.order - b.order)
    const actualFromIndex = allSites.findIndex(s => s.id === movedSite.id)
    const actualToIndex = allSites.findIndex(s => s.id === targetSite.id)

    if (actualFromIndex === -1 || actualToIndex === -1) {
      return
    }

    // 移动网站
    const [removed] = allSites.splice(actualFromIndex, 1)
    allSites.splice(actualToIndex, 0, removed)

    // 更新 order
    allSites.forEach((site, idx) => {
      site.order = idx
    })

    navigationSites.value = allSites
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

  // File Management Actions

  // 创建文件夹
  function createFolder(name: string, parentId: string | null = null): FolderItem {
    const folder: FolderItem = {
      id: uuidv4(),
      name,
      type: 'folder',
      parentId,
      order: folders.value.filter(f => f.parentId === parentId).length,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    folders.value.push(folder)
    saveFilesLocal()
    return folder
  }

  // 删除文件夹（递归删除子文件夹和文件）
  async function deleteFolder(id: string) {
    // 查找所有子文件夹
    const childFolders = folders.value.filter(f => f.parentId === id)

    // 递归删除子文件夹
    for (const childFolder of childFolders) {
      await deleteFolder(childFolder.id)
    }

    // 查找并删除该文件夹下的所有文件
    const childFiles = files.value.filter(f => f.parentId === id)
    for (const file of childFiles) {
      await deleteFile(file.id)
    }

    // 删除文件夹本身
    const index = folders.value.findIndex(f => f.id === id)
    if (index !== -1) {
      folders.value.splice(index, 1)
      saveFilesLocal()
    }
  }

  // 删除文件（同时删除 R2 和元数据）
  async function deleteFile(id: string) {
    const file = files.value.find(f => f.id === id)
    if (file && file.url) {
      try {
        // 从 R2 删除文件
        await fetch('/api/file', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.url }),
        })
      } catch (error) {
        console.error('Failed to delete file from R2:', error)
      }
    }

    // 从元数据中删除
    const index = files.value.findIndex(f => f.id === id)
    if (index !== -1) {
      files.value.splice(index, 1)
      saveFilesLocal()
    }
  }

  // 重命名文件或文件夹
  function renameItem(id: string, newName: string, itemType: 'file' | 'folder') {
    if (itemType === 'folder') {
      const folder = folders.value.find(f => f.id === id)
      if (folder) {
        folder.name = newName
        folder.updatedAt = Date.now()
        saveFilesLocal()
      }
    } else {
      const file = files.value.find(f => f.id === id)
      if (file) {
        file.name = newName
        file.updatedAt = Date.now()
        saveFilesLocal()
      }
    }
  }

  // 拖拽排序
  function reorderFileItems(items: (FileItem | FolderItem)[]) {
    items.forEach((item, index) => {
      if (item.type === 'folder') {
        const folder = folders.value.find(f => f.id === item.id)
        if (folder) {
          folder.order = index
          folder.updatedAt = Date.now()
        }
      } else {
        const file = files.value.find(f => f.id === item.id)
        if (file) {
          file.order = index
          file.updatedAt = Date.now()
        }
      }
    })
    saveFilesLocal()
  }

  function getFileExtension(filename: string): string {
    const parts = filename.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
  }

  function inferLanguageFromFilename(filename: string): string {
    const extension = getFileExtension(filename)
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      sql: 'sql',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      less: 'less',
      vue: 'vue',
      sh: 'bash',
      bash: 'bash',
      json: 'json',
      yml: 'yaml',
      yaml: 'yaml',
      md: 'markdown',
      markdown: 'markdown',
      java: 'java',
      go: 'go',
      rs: 'rust',
      php: 'php',
      xml: 'xml',
      txt: 'text',
    }
    return languageMap[extension] || extension || 'text'
  }

  function isTextCodeFilename(filename: string): boolean {
    return TEXT_CODE_EXTENSIONS.has(getFileExtension(filename))
  }

  function isTextCodeFileItem(file: FileItem): boolean {
    if (file.isTextEditable) return true
    if (file.mimeType.startsWith('text/')) return true
    return isTextCodeFilename(file.name)
  }

  // 上传单个文件
  async function uploadFile(file: File, parentId: string | null = null): Promise<FileItem> {
    // 验证文件大小（20MB）
    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      throw new Error(`文件大小超过 20MB 限制（${Math.round(file.size / 1024 / 1024)}MB）`)
    }

    // 创建文件项（显示上传进度）
    const fileItem: FileItem = {
      id: uuidv4(),
      name: file.name,
      type: 'file',
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      url: '', // 上传成功后填充
      parentId,
      order: files.value.filter(f => f.parentId === parentId).length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      uploadProgress: 0
    }

    files.value.push(fileItem)

    try {
      // 使用 XMLHttpRequest 上传以支持进度监听
      const formData = new FormData()
      formData.append('file', file)

      const response = await new Promise<{ success: boolean; filename: string; size: number; mimeType: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100)
            fileItem.uploadProgress = progress
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'))
        })

        xhr.open('POST', '/api/file')
        xhr.send(formData)
      })

      // 更新文件项
      fileItem.url = response.filename
      fileItem.size = response.size
      fileItem.mimeType = response.mimeType
      fileItem.isTextEditable = isTextCodeFilename(file.name)
      fileItem.language = fileItem.isTextEditable ? inferLanguageFromFilename(file.name) : fileItem.language
      fileItem.uploadProgress = undefined
      saveFilesLocal()

      return fileItem
    } catch (error) {
      // 上传失败，删除文件项
      const index = files.value.findIndex(f => f.id === fileItem.id)
      if (index !== -1) {
        files.value.splice(index, 1)
      }
      throw error
    }
  }

  async function createTextFile(params: {
    name: string
    content?: string
    parentId?: string | null
    tags?: string[]
    description?: string
  }): Promise<FileItem> {
    const name = params.name.trim()
    const parentId = params.parentId ?? null
    if (!name) {
      throw new Error('文件名不能为空')
    }
    if (!isTextCodeFilename(name)) {
      throw new Error('仅支持创建文本/代码文件')
    }

    const duplicated = files.value.some(file => file.parentId === parentId && file.name === name)
    if (duplicated) {
      throw new Error('同目录下已存在同名文件')
    }

    const content = params.content || ''
    const source = new File([content], name, { type: 'text/plain;charset=utf-8' })
    const item = await uploadFile(source, parentId)
    item.isTextEditable = true
    item.language = inferLanguageFromFilename(name)
    item.tags = params.tags || []
    item.description = params.description || ''
    item.updatedAt = Date.now()
    saveFilesLocal()
    return item
  }

  async function updateTextFileContent(fileId: string, content: string): Promise<FileItem> {
    const target = files.value.find(file => file.id === fileId)
    if (!target) {
      throw new Error('文件不存在')
    }
    if (!isTextCodeFileItem(target)) {
      throw new Error('仅支持文本/代码文件编辑')
    }

    const oldUrl = target.url
    const source = new File([content], target.name, { type: 'text/plain;charset=utf-8' })
    const uploaded = await uploadFile(source, target.parentId)

    target.url = uploaded.url
    target.size = uploaded.size
    target.mimeType = uploaded.mimeType
    target.language = target.language || inferLanguageFromFilename(target.name)
    target.isTextEditable = true
    target.updatedAt = Date.now()

    const tmpIndex = files.value.findIndex(file => file.id === uploaded.id)
    if (tmpIndex !== -1) {
      files.value.splice(tmpIndex, 1)
    }

    if (oldUrl) {
      fetch('/api/file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: oldUrl }),
      }).catch((error) => {
        console.error('Failed to delete old file version:', error)
      })
    }

    saveFilesLocal()
    return target
  }

  // 批量上传文件
  async function uploadFiles(fileList: FileList, parentId: string | null = null): Promise<{ success: number; failed: number }> {
    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < fileList.length; i++) {
      try {
        await uploadFile(fileList[i], parentId)
        successCount++
      } catch (error) {
        console.error('Failed to upload file:', fileList[i].name, error)
        failedCount++
      }
    }

    return { success: successCount, failed: failedCount }
  }

  // 上传文件夹
  async function uploadFolder(fileList: FileList): Promise<{ success: number; failed: number }> {
    // 解析文件夹结构
    const folderMap = new Map<string, string | null>() // path -> folderId
    folderMap.set('', currentFolderId.value) // 根路径映射到当前文件夹

    // 收集所有文件夹路径
    const folderPaths = new Set<string>()
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i] as File & { webkitRelativePath?: string }
      if (file.webkitRelativePath) {
        const pathParts = file.webkitRelativePath.split('/')
        // 移除文件名，只保留文件夹路径
        pathParts.pop()

        // 添加所有层级的路径
        let currentPath = ''
        for (const part of pathParts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part
          folderPaths.add(currentPath)
        }
      }
    }

    // 按路径深度排序，确保父文件夹先创建
    const sortedPaths = Array.from(folderPaths).sort((a, b) => {
      const depthA = a.split('/').length
      const depthB = b.split('/').length
      return depthA - depthB
    })

    // 创建所有文件夹
    for (const path of sortedPaths) {
      const pathParts = path.split('/')
      const folderName = pathParts[pathParts.length - 1]
      const parentPath = pathParts.slice(0, -1).join('/')
      const parentId = folderMap.get(parentPath) || null

      const folder = createFolder(folderName, parentId)
      folderMap.set(path, folder.id)
    }

    // 上传所有文件
    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i] as File & { webkitRelativePath?: string }
      if (file.webkitRelativePath) {
        const pathParts = file.webkitRelativePath.split('/')
        pathParts.pop() // 移除文件名
        const folderPath = pathParts.join('/')
        const parentId = folderMap.get(folderPath) || null

        try {
          await uploadFile(file, parentId)
          successCount++
        } catch (error) {
          console.error('Failed to upload file:', file.name, error)
          failedCount++
        }
      }
    }

    return { success: successCount, failed: failedCount }
  }

  // 保存文件数据到 localStorage
  function saveFilesLocal() {
    const data = {
      files: files.value,
      folders: folders.value,
      version: 1,
      updatedAt: Date.now()
    }
    localStorage.setItem('cloud-desktop-files', JSON.stringify(data))
  }

  // 从云端加载文件数据
  async function loadFilesFromCloud() {
    try {
      const response = await fetch('/api/file-metadata')
      if (response.ok) {
        const data = await response.json()
        if (data) {
          files.value = data.files || []
          folders.value = data.folders || []
          return true
        }
      }
    } catch (error) {
      console.error('Failed to load files from cloud:', error)
    }
    return false
  }

  // 同步文件数据到云端
  async function saveFilesToCloud() {
    try {
      const data = {
        files: files.value,
        folders: folders.value,
        version: 1,
        updatedAt: Date.now()
      }

      const response = await fetch('/api/file-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.status === 409) {
        // 数据冲突，使用服务器数据
        const conflictData = await response.json()
        if (conflictData.serverData) {
          files.value = conflictData.serverData.files || []
          folders.value = conflictData.serverData.folders || []
          saveFilesLocal()
        }
        throw new Error('数据冲突：已自动使用服务器最新数据')
      }

      if (!response.ok) {
        throw new Error('Failed to save files to cloud')
      }
    } catch (error) {
      console.error('Failed to save files to cloud:', error)
      throw error
    }
  }

  // 手动同步文件到云端（带状态管理）
  async function syncFilesToCloud() {
    if (fileSyncStatus.value === 'syncing') {
      return // 防止重复同步
    }

    // 安全检查：如果未从云端成功初始化，不允许同步（防止空数据覆盖云端数据）
    if (!isFileCloudInitialized.value) {
      console.warn('文件数据未从云端成功加载，跳过同步以防止数据丢失')
      fileSyncStatus.value = 'error'
      fileSyncErrorMessage.value = '文件数据未初始化，无法同步'
      setTimeout(() => {
        if (fileSyncStatus.value === 'error') {
          fileSyncStatus.value = 'idle'
        }
      }, 5000)
      return
    }

    // 如果没有脏数据，更新检查时间后直接返回
    if (!hasFileDirtyData.value) {
      // 更新最后同步时间（表示已检查过）
      lastFileSyncTime.value = Date.now()
      // 不显示 toast，因为这是自动检查
      return
    }

    fileSyncStatus.value = 'syncing'
    fileSyncErrorMessage.value = ''

    try {
      await saveFilesToCloud()
      fileSyncStatus.value = 'success'
      lastFileSyncTime.value = Date.now()

      // 同步成功后，标记数据为干净
      hasFileDirtyData.value = false

      // 3秒后重置状态
      setTimeout(() => {
        if (fileSyncStatus.value === 'success') {
          fileSyncStatus.value = 'idle'
        }
      }, 3000)
    } catch (error) {
      fileSyncStatus.value = 'error'
      fileSyncErrorMessage.value = error instanceof Error ? error.message : '文件同步失败'

      // 5秒后重置错误状态
      setTimeout(() => {
        if (fileSyncStatus.value === 'error') {
          fileSyncStatus.value = 'idle'
        }
      }, 5000)
    }
  }

  // 页面关闭前同步文件（使用sendBeacon确保数据发送）
  function syncFilesBeforeUnload() {
    // 安全检查：如果未从云端成功初始化，不允许同步
    if (!isFileCloudInitialized.value) {
      console.warn('文件数据未从云端成功加载，跳过关闭前同步以防止数据丢失')
      return
    }

    const data = {
      files: files.value,
      folders: folders.value,
      version: 1,
      updatedAt: Date.now()
    }

    // 使用sendBeacon发送数据，即使页面关闭也能完成
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    navigator.sendBeacon('/api/file-metadata', blob)
  }

  // 初始化文件数据
  async function initFiles() {
    isLoadingFiles.value = true
    try {
      // 先尝试从云端加载
      const cloudLoaded = await loadFilesFromCloud()

      if (cloudLoaded) {
        // 标记已从云端成功加载
        isFileCloudInitialized.value = true
        // 同步到本地
        saveFilesLocal()
      } else {
        // 云端无数据，尝试从本地加载
        const localData = localStorage.getItem('cloud-desktop-files')
        if (localData) {
          const parsed = JSON.parse(localData)
          files.value = parsed.files || []
          folders.value = parsed.folders || []
          // 如果本地有数据，标记为已初始化（允许后续同步到云端）
          if ((parsed.files && parsed.files.length > 0) || (parsed.folders && parsed.folders.length > 0)) {
            isFileCloudInitialized.value = true
          }
        } else {
          // 新用户，没有任何数据，标记为已初始化
          isFileCloudInitialized.value = true
        }
      }
    } catch (error) {
      console.error('Failed to init files:', error)
      // 加载失败，尝试从本地恢复
      const localData = localStorage.getItem('cloud-desktop-files')
      if (localData) {
        const parsed = JSON.parse(localData)
        files.value = parsed.files || []
        folders.value = parsed.folders || []
        // 从本地加载成功，标记为已初始化
        if ((parsed.files && parsed.files.length > 0) || (parsed.folders && parsed.folders.length > 0)) {
          isFileCloudInitialized.value = true
        }
      } else {
        // 加载失败且无本地数据，不标记为已初始化，防止空数据同步
        isFileCloudInitialized.value = false
      }
    } finally {
      isLoadingFiles.value = false
    }

    // 设置初始的最后同步时间（表示数据已加载）
    if (!lastFileSyncTime.value && isFileCloudInitialized.value) {
      lastFileSyncTime.value = Date.now()
    }
  }

  // 文件选择操作
  function toggleFileSelection(id: string) {
    if (selectedFileIds.value.has(id)) {
      selectedFileIds.value.delete(id)
    } else {
      selectedFileIds.value.add(id)
    }
  }

  function selectAllFiles() {
    selectedFileIds.value.clear()
    currentFolderItems.value.forEach(item => {
      selectedFileIds.value.add(item.id)
    })
  }

  function clearFileSelection() {
    selectedFileIds.value.clear()
  }

  // 复制操作
  function copyFiles(ids: string[]) {
    const items: (FileItem | FolderItem)[] = []
    ids.forEach(id => {
      const file = files.value.find(f => f.id === id)
      if (file) {
        items.push(file)
      } else {
        const folder = folders.value.find(f => f.id === id)
        if (folder) items.push(folder)
      }
    })

    if (items.length > 0) {
      clipboard.value = { items, operation: 'copy' }
    }
  }

  // 剪切操作
  function cutFiles(ids: string[]) {
    const items: (FileItem | FolderItem)[] = []
    ids.forEach(id => {
      const file = files.value.find(f => f.id === id)
      if (file) {
        items.push(file)
      } else {
        const folder = folders.value.find(f => f.id === id)
        if (folder) items.push(folder)
      }
    })

    if (items.length > 0) {
      clipboard.value = { items, operation: 'cut' }
    }
  }

  // 粘贴操作
  async function pasteFiles() {
    if (!clipboard.value) return

    const { items, operation } = clipboard.value
    const targetFolderId = currentFolderId.value

    for (const item of items) {
      if (operation === 'copy') {
        // 复制文件或文件夹
        if (item.type === 'file') {
          const newFile: FileItem = {
            ...item,
            id: uuidv4(),
            name: `${item.name} (副本)`,
            parentId: targetFolderId,
            order: files.value.filter(f => f.parentId === targetFolderId).length,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
          files.value.push(newFile)
        } else {
          const newFolder: FolderItem = {
            ...item,
            id: uuidv4(),
            name: `${item.name} (副本)`,
            parentId: targetFolderId,
            order: folders.value.filter(f => f.parentId === targetFolderId).length,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
          folders.value.push(newFolder)
        }
      } else {
        // 剪切（移动）文件或文件夹
        if (item.type === 'file') {
          const file = files.value.find(f => f.id === item.id)
          if (file) {
            file.parentId = targetFolderId
            file.order = files.value.filter(f => f.parentId === targetFolderId).length
            file.updatedAt = Date.now()
          }
        } else {
          const folder = folders.value.find(f => f.id === item.id)
          if (folder) {
            folder.parentId = targetFolderId
            folder.order = folders.value.filter(f => f.parentId === targetFolderId).length
            folder.updatedAt = Date.now()
          }
        }
      }
    }

    // 剪切操作后清空剪贴板
    if (operation === 'cut') {
      clipboard.value = null
    }

    saveFilesLocal()
  }

  const usedFileLanguages = computed(() => {
    const languages = new Set<string>()
    files.value.forEach(file => {
      if (file.language) {
        languages.add(file.language)
      }
    })
    return Array.from(languages).sort()
  })

  const usedFileTags = computed(() => {
    const tags = new Set<string>()
    files.value.forEach(file => {
      file.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  })

  function updateFileMetadata(id: string, updates: Partial<Pick<FileItem, 'language' | 'tags' | 'description'>>) {
    const file = files.value.find(item => item.id === id)
    if (!file) return

    if (updates.language !== undefined) file.language = updates.language
    if (updates.tags !== undefined) file.tags = updates.tags
    if (updates.description !== undefined) file.description = updates.description
    file.updatedAt = Date.now()
    saveFilesLocal()
  }

  // Mind Map Actions

  function loadMindMaps() {
    // 思维导图数据现在从 init() 中统一加载，无需单独初始化
    // 保留此方法以保持向后兼容，但不执行任何操作
  }

  function saveMindMaps() {
    // 使用统一的 save() 方法保存到 localStorage 和 KV
    save()
  }

  // 创建新的思维导图
  function createMindMap(name: string): MindMapFile {
    const now = Date.now()
    const id = uuidv4()

    const defaultData: SimpleMindMapNode = {
      data: {
        text: name,
        expand: true,
        uid: id
      },
      children: []
    }

    const mindMapFile: MindMapFile = {
      id,
      name,
      data: defaultData,
      lastOpened: now,
      createdAt: now,
      updatedAt: now
    }

    mindMaps.value.unshift(mindMapFile)
    saveMindMaps()

    return mindMapFile
  }

  // 加载思维导图数据
  function loadMindMap(id: string): SimpleMindMapNode | null {
    const mindMap = mindMaps.value.find(m => m.id === id)
    if (!mindMap) return null

    // 更新最后打开时间
    mindMap.lastOpened = Date.now()
    saveMindMaps()

    return mindMap.data
  }

  // 保存思维导图数据
  function saveMindMap(id: string, data: SimpleMindMapNode): boolean {
    const mindMap = mindMaps.value.find(m => m.id === id)
    if (!mindMap) return false

    mindMap.data = data
    mindMap.updatedAt = Date.now()
    saveMindMaps()

    return true
  }

  // 更新思维导图名称
  function renameMindMap(id: string, newName: string): boolean {
    const mindMap = mindMaps.value.find(m => m.id === id)
    if (!mindMap) return false

    mindMap.name = newName
    mindMap.updatedAt = Date.now()
    saveMindMaps()

    return true
  }

  // 删除思维导图
  function deleteMindMap(id: string) {
    const index = mindMaps.value.findIndex(m => m.id === id)
    if (index !== -1) {
      mindMaps.value.splice(index, 1)
      saveMindMaps()
    }
  }

  // Toast 相关方法
  function setToastContainer(container: any) {
    toastContainerRef = container
  }

  function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 3000) {
    if (toastContainerRef && toastContainerRef.addToast) {
      toastContainerRef.addToast({ message, type, duration })
    }
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
    mobileWidgetOrder,
    mobileCollapsedWidgets,
    mobileFocusTarget,
    activeTab,
    newsSources,
    isLoadingNews,
    enabledSources,
    filteredNewsSources,
    navigationSites,
    isLoadingNavigation,
    navigationCategories,
    selectedCategory,
    searchHistory,
    searchEngine,
    backgroundColor,
    themeMode,
    darkBackgroundColor,
    effectiveTheme,
    syncStatus,
    lastSyncTime,
    syncErrorMessage,
    hasDirtyData,
    // File sync state
    fileSyncStatus,
    lastFileSyncTime,
    fileSyncErrorMessage,
    hasFileDirtyData,
    // File state
    files,
    folders,
    currentFolderId,
    fileViewMode,
    isLoadingFiles,
    previewFile,
    showFileUploadDialog,
    fileSortBy,
    fileSortOrder,
    clipboard,
    selectedFileIds,
    // Mind map state
    mindMaps,
    currentMindMapId,
    isLoadingMindMap,
    // Canvas scale state
    canvasScale,
    lastArrangedScale,
    // Getters
    getWidgetById,
    sortedWidgets,
    topWidget,
    minimizedWidgets,
    outOfViewWidgets,
    searchResults,
    sortedNavigationSites,
    allCategories,
    filteredNavigationSites,
    // File getters
    currentFolderItems,
    breadcrumbPath,
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
    toggleTodoPriority,
    selectWidget,
    arrangeWidgets,
    setCanvasScale,
    fitToWindow,
    resetWidgetPosition,
    deleteImageWidget,
    openSearch,
    closeSearch,
    setSearchQuery,
    setMobileWidgetOrder,
    setMobileWidgetExpandedExclusive,
    setMobileWidgetCollapsed,
    toggleMobileWidgetCollapsed,
    isMobileWidgetCollapsed,
    notifyMobileWidgetRestored,
    focusWidget,
    setActiveTab,
    loadActiveTab,
    setBackgroundColor,
    setThemeMode,
    setDarkBackgroundColor,
    applyTheme,
    fetchNews,
    fetchNewsBySource,
    toggleNewsSource,
    refreshNewsWithCheck,
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
    // File actions
    createFolder,
    deleteFolder,
    deleteFile,
    renameItem,
    reorderFileItems,
    uploadFile,
    uploadFiles,
    uploadFolder,
    createTextFile,
    updateTextFileContent,
    updateFileMetadata,
    isTextCodeFileItem,
    inferLanguageFromFilename,
    saveFilesLocal,
    loadFilesFromCloud,
    saveFilesToCloud,
    syncFilesToCloud,
    syncFilesBeforeUnload,
    initFiles,
    toggleFileSelection,
    selectAllFiles,
    clearFileSelection,
    copyFiles,
    cutFiles,
    pasteFiles,
    usedFileLanguages,
    usedFileTags,
    // Mind map actions
    loadMindMaps,
    createMindMap,
    loadMindMap,
    saveMindMap,
    renameMindMap,
    deleteMindMap,
    // Toast actions
    setToastContainer,
    showToast,
  }
})
