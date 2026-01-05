// 组件类型
export type WidgetType = 'note' | 'todo' | 'text' | 'image' | 'markdown'

// 待办事项项
export interface TodoItem {
  id: string
  text: string
  completed: boolean
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
  offsetX: number
  offsetY: number
  uploadProgress?: number  // 上传进度 0-100
  uploadError?: string  // 上传错误信息
}

// Markdown组件
export interface MarkdownWidget extends BaseWidget {
  type: 'markdown'
  content: string
}

// 联合类型
export type Widget = NoteWidget | TodoWidget | TextWidget | ImageWidget | MarkdownWidget

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

// 存储数据格式（包含桌面组件和导航站数据）
export interface DesktopData {
  widgets: Widget[]
  maxZIndex: number
  navigationSites?: NavigationSite[]  // 导航站数据
  categories?: string[]  // 导航站分类
  enabledNewsSources?: string[]  // 启用的新闻源ID列表
  searchHistory?: string[]  // 搜索历史
  searchEngine?: string  // 搜索引擎偏好
  version: number
  updatedAt: number
}

// Tab 类型
export type TabType = 'desktop' | 'navigation' | 'news' | 'resource-search' | 'file'

// 新闻项
export interface NewsItem {
  id: string | number
  title: string
  url: string
  extra?: {
    hover?: string  // 悬停显示的描述
    info?: string   // 额外信息(如热度、star数等)
  }
}

// 新闻源
export interface NewsSource {
  id: string
  name: string
  icon: string
  items: NewsItem[]
  lastUpdated: number
  status?: 'loading' | 'success' | 'error'
  error?: string
}

// 新闻数据缓存
export interface NewsCache {
  sources: NewsSource[]
  version: number
  updatedAt: number
}

// 导航站网站
export interface NavigationSite {
  id: string
  name: string
  url: string
  icon?: string  // 自动获取的图标URL
  description: string
  color: string  // 预制颜色（图标获取失败时使用）
  category?: string  // 预留分类字段
  order: number  // 排序
  createdAt: number
  updatedAt: number
}

// 导航站数据存储
export interface NavigationData {
  sites: NavigationSite[]
  version: number
  updatedAt: number
}
