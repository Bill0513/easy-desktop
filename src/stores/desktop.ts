import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import type { Widget, NoteWidget, TodoWidget, BookmarkWidget, FolderWidget, TextWidget, CreateWidgetParams, TodoItem, Bookmark, DesktopData } from '@/types'

const STORAGE_KEY = 'cloud-desktop-data'

// 默认组件颜色
const DEFAULT_COLORS = ['#fff9c4', '#ffcdd2', '#c8e6c9', '#bbdefb', '#ffe0b2', '#f3e5f5']

export const useDesktopStore = defineStore('desktop', {
  state: () => ({
    widgets: [] as Widget[],
    maxZIndex: 100,
    isLoading: false,
    selectedWidgetId: null as string | null,
    draggedWidgetId: null as string | null,
    hoveredFolderId: null as string | null,
    // 记录最大化前的位置
    maximizeState: {} as Record<string, { x: number; y: number; width: number; height: number }>,
  }),

  getters: {
    getWidgetById: (state) => (id: string) => {
      return state.widgets.find(w => w.id === id)
    },

    sortedWidgets: (state) => {
      return [...state.widgets].sort((a, b) => a.zIndex - b.zIndex)
    },

    topWidget: (state) => {
      if (state.widgets.length === 0) return null
      return state.widgets.reduce((max, w) => w.zIndex > max.zIndex ? w : max, state.widgets[0])
    },

    minimizedWidgets: (state) => {
      // 获取所有文件夹的children IDs
      const folderChildrenIds = new Set<string>()
      state.widgets.forEach(w => {
        if (w.type === 'folder') {
          w.children.forEach(childId => folderChildrenIds.add(childId))
        }
      })
      // 返回不在任何文件夹中的最小化组件
      return state.widgets.filter(w => w.isMinimized && !folderChildrenIds.has(w.id))
    },
  },

  actions: {
    // 初始化加载数据
    async init() {
      this.isLoading = true
      try {
        // 尝试从 Cloudflare KV 加载
        const cloudData = await this.loadFromCloud()
        if (cloudData && cloudData.widgets) {
          this.widgets = cloudData.widgets
          this.maxZIndex = cloudData.maxZIndex || 100
        } else {
          // 回退到本地存储
          const localData = localStorage.getItem(STORAGE_KEY)
          if (localData) {
            const parsed = JSON.parse(localData)
            this.widgets = parsed.widgets || []
            this.maxZIndex = parsed.maxZIndex || 100
          } else {
            // 确保初始化为空数组
            this.widgets = []
            this.maxZIndex = 100
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        const localData = localStorage.getItem(STORAGE_KEY)
        if (localData) {
          const parsed = JSON.parse(localData)
          this.widgets = parsed.widgets || []
          this.maxZIndex = parsed.maxZIndex || 100
        } else {
          // 确保初始化为空数组
          this.widgets = []
          this.maxZIndex = 100
        }
      } finally {
        this.isLoading = false
      }
    },

    // 从 Cloudflare KV 加载
    async loadFromCloud(): Promise<DesktopData | null> {
      try {
        const response = await fetch('/api/desktop')
        if (response.ok) {
          return await response.json()
        }
      } catch {
        // 离线或 API 不可用
      }
      return null
    },

    // 保存到 Cloudflare KV
    async saveToCloud() {
      try {
        const data: DesktopData = {
          widgets: this.widgets,
          maxZIndex: this.maxZIndex,
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
    },

    // 保存到本地存储
    saveToLocal() {
      const data: DesktopData = {
        widgets: this.widgets,
        maxZIndex: this.maxZIndex,
        version: 1,
        updatedAt: Date.now()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },

    // 保存（同时尝试云端和本地）
    async save() {
      this.saveToLocal()
      await this.saveToCloud()
    },

    // 创建新组件
    createWidget(params: CreateWidgetParams): Widget {
      const now = Date.now()
      const id = uuidv4()
      const x = params.x ?? Math.random() * 400 + 50
      const y = params.y ?? Math.random() * 300 + 50

      // 生成4位随机大写字母
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()

      const base = {
        id,
        x,
        y,
        width: params.width ?? 280,
        height: params.height ?? 200,
        zIndex: ++this.maxZIndex,
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
          this.widgets.push(note)
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
          this.widgets.push(todo)
          return todo
        }

        case 'bookmark': {
          const bookmark: BookmarkWidget = {
            ...base,
            type: 'bookmark',
            title: params.title ?? `书签-${randomSuffix}`,
            bookmarks: [],
          }
          this.widgets.push(bookmark)
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
          this.widgets.push(folder)
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
          this.widgets.push(text)
          return text
        }

        default:
          throw new Error(`Unknown widget type: ${params.type}`)
      }
    },

    // 删除组件
    deleteWidget(id: string) {
      const index = this.widgets.findIndex(w => w.id === id)
      if (index !== -1) {
        this.widgets.splice(index, 1)
        this.save()
      }
    },

    // 删除文件夹及所有子组件
    deleteFolderWithChildren(folderId: string) {
      const folder = this.getWidgetById(folderId)
      if (folder?.type === 'folder') {
        // 删除所有子组件
        folder.children.forEach(childId => {
          const childIndex = this.widgets.findIndex(w => w.id === childId)
          if (childIndex !== -1) {
            this.widgets.splice(childIndex, 1)
          }
        })
        // 删除文件夹本身
        const folderIndex = this.widgets.findIndex(w => w.id === folderId)
        if (folderIndex !== -1) {
          this.widgets.splice(folderIndex, 1)
        }
        this.save()
      }
    },

    // 更新组件
    updateWidget(id: string, updates: Partial<Widget>) {
      const widget = this.getWidgetById(id)
      if (widget) {
        Object.assign(widget, updates, { updatedAt: Date.now() })
        this.save()
      }
    },

    // 更新位置（不自动保存，用于拖拽时频繁更新）
    updatePositionNoSave(id: string, x: number, y: number) {
      const widget = this.getWidgetById(id)
      if (widget) {
        widget.x = x
        widget.y = y
        widget.updatedAt = Date.now()
      }
    },

    // 更新位置
    updatePosition(id: string, x: number, y: number) {
      const widget = this.getWidgetById(id)
      if (widget) {
        widget.x = x
        widget.y = y
        widget.updatedAt = Date.now()
        this.save()
      }
    },

    // 置顶
    bringToFront(id: string) {
      const widget = this.getWidgetById(id)
      if (widget) {
        widget.zIndex = ++this.maxZIndex
        this.save()
      }
    },

    // 切换最小化
    toggleMinimize(id: string) {
      const widget = this.getWidgetById(id)
      if (widget) {
        widget.isMinimized = !widget.isMinimized
        this.save()
      }
    },

    // 切换最大化
    toggleMaximize(id: string) {
      const widget = this.getWidgetById(id)
      if (!widget) return

      if (widget.isMaximized) {
        // 还原 - 恢复之前的位置
        const saved = this.maximizeState[id]
        if (saved) {
          widget.x = saved.x
          widget.y = saved.y
          widget.width = saved.width
          widget.height = saved.height
        }
        widget.isMaximized = false
      } else {
        // 最大化 - 保存当前的位置
        this.maximizeState[id] = {
          x: widget.x,
          y: widget.y,
          width: widget.width,
          height: widget.height,
        }
        // 设置为最大化，组件内部会处理边距
        widget.isMaximized = true
      }
      this.save()
    },

    // 添加待办事项
    addTodoItem(widgetId: string, text: string) {
      const widget = this.getWidgetById(widgetId)
      if (widget?.type === 'todo') {
        const item: TodoItem = {
          id: uuidv4(),
          text,
          completed: false,
        }
        widget.items.push(item)
        widget.updatedAt = Date.now()
        this.save()
      }
    },

    // 切换待办完成状态
    toggleTodoItem(widgetId: string, itemId: string) {
      const widget = this.getWidgetById(widgetId)
      if (widget?.type === 'todo') {
        const item = widget.items.find(i => i.id === itemId)
        if (item) {
          item.completed = !item.completed
          widget.updatedAt = Date.now()
          this.save()
        }
      }
    },

    // 删除待办事项
    deleteTodoItem(widgetId: string, itemId: string) {
      const widget = this.getWidgetById(widgetId)
      if (widget?.type === 'todo') {
        widget.items = widget.items.filter(i => i.id !== itemId)
        widget.updatedAt = Date.now()
        this.save()
      }
    },

    // 添加书签
    addBookmark(widgetId: string, title: string, url: string) {
      const widget = this.getWidgetById(widgetId)
      if (widget?.type === 'bookmark') {
        const bookmark: Bookmark = {
          id: uuidv4(),
          title,
          url,
        }
        widget.bookmarks.push(bookmark)
        widget.updatedAt = Date.now()
        this.save()
      }
    },

    // 删除书签
    deleteBookmark(widgetId: string, bookmarkId: string) {
      const widget = this.getWidgetById(widgetId)
      if (widget?.type === 'bookmark') {
        widget.bookmarks = widget.bookmarks.filter(b => b.id !== bookmarkId)
        widget.updatedAt = Date.now()
        this.save()
      }
    },

    // 将组件添加到文件夹
    addToFolder(folderId: string, widgetId: string) {
      const folder = this.getWidgetById(folderId)
      if (folder?.type === 'folder' && !folder.children.includes(widgetId)) {
        folder.children.push(widgetId)
        // 隐藏被收纳的组件
        const widget = this.getWidgetById(widgetId)
        if (widget) {
          widget.isMinimized = true
        }
        folder.updatedAt = Date.now()
        this.save()
      }
    },

    // 从文件夹移除
    removeFromFolder(folderId: string, widgetId: string) {
      const folder = this.getWidgetById(folderId)
      if (folder?.type === 'folder') {
        folder.children = folder.children.filter(id => id !== widgetId)
        // 显示被移除的组件
        const widget = this.getWidgetById(widgetId)
        if (widget) {
          widget.isMinimized = false
        }
        folder.updatedAt = Date.now()
        this.save()
      }
    },

    // 设置选中的组件
    selectWidget(id: string | null) {
      this.selectedWidgetId = id
    },
  },
})
