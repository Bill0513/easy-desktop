// 组件类型
export type WidgetType = 'note' | 'todo' | 'bookmark' | 'folder' | 'text' | 'image' | 'markdown'

// 待办事项项
export interface TodoItem {
  id: string
  text: string
  completed: boolean
}

// 书签
export interface Bookmark {
  id: string
  title: string
  url: string
  favicon?: string
}

// 组件基础接口
export interface BaseWidget {
  id: string
  type: WidgetType
  title: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  isMinimized: boolean
  isMaximized: boolean
  createdAt: number
  updatedAt: number
}

// 便签组件
export interface NoteWidget extends BaseWidget {
  type: 'note'
  content: string
  color: string
}

// 待办组件
export interface TodoWidget extends BaseWidget {
  type: 'todo'
  items: TodoItem[]
}

// 书签组件
export interface BookmarkWidget extends BaseWidget {
  type: 'bookmark'
  bookmarks: Bookmark[]
}

// 文件夹组件（可包含其他组件）
export interface FolderWidget extends BaseWidget {
  type: 'folder'
  children: string[] // 子组件 ID 列表
  isOpen: boolean
}

// 文本组件
export interface TextWidget extends BaseWidget {
  type: 'text'
  content: string
}

// 图片组件
export interface ImageWidget extends BaseWidget {
  type: 'image'
  src: string
  filename: string
  scale: number
}

// Markdown组件
export interface MarkdownWidget extends BaseWidget {
  type: 'markdown'
  content: string
}

// 联合类型
export type Widget = NoteWidget | TodoWidget | BookmarkWidget | FolderWidget | TextWidget | ImageWidget | MarkdownWidget

// 组件创建参数
export interface CreateWidgetParams {
  type: WidgetType
  title?: string
  x?: number
  y?: number
  width?: number
  height?: number
  content?: string
  color?: string
  src?: string
  filename?: string
  scale?: number
}

// 拖拽状态
export interface DragState {
  isDragging: boolean
  widgetId: string | null
  startX: number
  startY: number
  offsetX: number
  offsetY: number
}

// 存储数据格式
export interface DesktopData {
  widgets: Widget[]
  maxZIndex: number
  version: number
  updatedAt: number
}
