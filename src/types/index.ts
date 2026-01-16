// 组件类型
export type WidgetType = 'note' | 'todo' | 'text' | 'image' | 'markdown' | 'countdown' | 'random-picker'

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

// 倒计时组件
export interface CountdownWidget extends BaseWidget {
  type: 'countdown'
  targetDate: string  // ISO 日期字符串 YYYY-MM-DD
  description?: string  // 备注/描述
}

// 随机决策器组件
export interface RandomPickerWidget extends BaseWidget {
  type: 'random-picker'
  options: string[]      // 选项列表
  lastResult?: string    // 上次抽取结果
}

// 联合类型
export type Widget = NoteWidget | TodoWidget | TextWidget | ImageWidget | MarkdownWidget | CountdownWidget | RandomPickerWidget

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
  targetDate?: string  // 倒计时目标日期
  description?: string  // 倒计时描述
  options?: string[]   // 随机决策器选项
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
  mindMaps?: MindMapFile[]  // 思维导图数据（存储在 KV 中）
  version: number
  updatedAt: number
}

// Tab 类型
export type TabType = 'desktop' | 'navigation' | 'news' | 'resource-search' | 'file' | 'mindmap'

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

// 文件项
export interface FileItem {
  id: string
  name: string
  type: 'file'
  size: number
  mimeType: string
  url: string  // R2文件名
  parentId: string | null
  order: number
  createdAt: number
  updatedAt: number
  uploadProgress?: number
  uploadError?: string
}

// 文件夹项
export interface FolderItem {
  id: string
  name: string
  type: 'folder'
  parentId: string | null
  order: number
  createdAt: number
  updatedAt: number
  isExpanded?: boolean
}

// 文件系统项联合类型
export type FileSystemItem = FileItem | FolderItem

// 文件视图模式
export type FileViewMode = 'grid' | 'list'

// 文件数据存储格式
export interface FileData {
  files: FileItem[]
  folders: FolderItem[]
  version: number
  updatedAt: number
}

// 思维导图文件元数据
export interface MindMapFile {
  id: string
  name: string
  data: SimpleMindMapNode  // 思维导图数据直接存储在 KV 中
  thumbnail?: string  // 缩略图 (可选)
  lastOpened: number
  createdAt: number
  updatedAt: number
}

// simple-mind-map 节点数据
export interface SimpleMindMapNodeData {
  text: string
  uid?: string
  expand?: boolean
  image?: string
  icon?: string[]
  tag?: string[]
  hyperlink?: string
  note?: string
  [key: string]: any
}

// simple-mind-map 节点
export interface SimpleMindMapNode {
  data: SimpleMindMapNodeData
  children?: SimpleMindMapNode[]
}

// 思维导图数据结构 (simple-mind-map format)
export interface MindMapData {
  root: SimpleMindMapNode
  theme?: string
  layout?: string
}
