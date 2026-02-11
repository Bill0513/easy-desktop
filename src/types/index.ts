// 组件类型
export type WidgetType = 'note' | 'todo' | 'text' | 'image' | 'markdown' | 'countdown' | 'random-picker' | 'check-in'

// 主题模式类型
export type ThemeMode = 'light' | 'dark' | 'system'

// 待办事项项
export interface TodoItem {
  id: string
  text: string
  completed: boolean
  priority?: number  // 优先级 1-3 (1=高, 2=中, 3=低)
}

// 打卡记录
export interface CheckInRecord {
  date: string // YYYY-MM-DD 格式
  timestamp: number // 打卡时间戳
  note?: string // 打卡备注
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

// 打卡组件
export interface CheckInWidget extends BaseWidget {
  type: 'check-in'
  checkInRecords: CheckInRecord[]  // 打卡记录
  goal?: number  // 目标天数（可选）
  category?: string  // 分类（可选）
}

// 联合类型
export type Widget = NoteWidget | TodoWidget | TextWidget | ImageWidget | MarkdownWidget | CountdownWidget | RandomPickerWidget | CheckInWidget

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
  goal?: number        // 打卡目标天数
  category?: string    // 打卡分类
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
  backgroundColor?: string  // 背景颜色
  themeMode?: ThemeMode  // 主题模式
  darkBackgroundColor?: string  // 暗色主题背景颜色
  mindMaps?: MindMapFile[]  // 思维导图数据（存储在 KV 中）
  codeSnippets?: CodeSnippet[]  // 代码片段数据
  version: number
  updatedAt: number
}

// Tab 类型
export type TabType = 'desktop' | 'navigation' | 'news' | 'file' | 'mindmap'

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
  language?: string
  tags?: string[]
  description?: string
  isTextEditable?: boolean
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

// 代码片段
export interface CodeSnippet {
  id: string
  title: string
  code: string
  language: string      // javascript, python, sql, html, css, etc.
  description?: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

// AI 投资助手相关类型

// 新闻分析结果
export interface NewsAnalysis {
  id: string
  newsId: string | number
  title: string
  url: string
  relevant: boolean           // 是否与 A 股相关
  importance: number          // 重要性评分 1-10
  sentiment: 'positive' | 'negative' | 'neutral'  // 情绪
  sectors: string[]           // 涉及的板块
  keywords: string[]          // 关键词
  summary: string             // 一句话总结
  analyzedAt: number
}

// 板块分析
export interface SectorAnalysis {
  sector: string              // 板块名称
  hotScore: number            // 热度分数 0-100
  mentionCount: number        // 被提及次数
  positiveRatio: number       // 正面新闻占比 0-1
  sentiment: 'positive' | 'negative' | 'neutral'  // 整体情绪
  impact: 'short' | 'medium' | 'long'  // 影响周期
  relatedNews: NewsAnalysis[] // 相关新闻
  updatedAt: number
}

// 投资洞察
export interface InvestmentInsight {
  id: string
  type: 'summary' | 'hot-sectors' | 'potential-sectors' | 'risk-alert' | 'upcoming-events'
  title: string
  content: string
  sectors?: string[]          // 相关板块
  importance: number          // 重要性 1-10
  createdAt: number
}

// AI 分析状态
export interface AIAnalysisState {
  isAnalyzing: boolean
  lastAnalyzedAt: number | null
  newsAnalyses: NewsAnalysis[]
  sectorAnalyses: SectorAnalysis[]
  insights: InvestmentInsight[]
  error: string | null
}

// AI 生成的投资洞察
export interface AIInsights {
  marketSummary: string
  hotSectors: string[]
  potentialSectors: string[]
  riskAlerts: string[]
}

// 板块趋势数据点
export interface SectorTrendPoint {
  date: string
  hotScore: number
  sentiment: string
}

// 市场情绪历史数据点
export interface MarketSentimentPoint {
  date: string
  sentimentIndex: number
  totalNews: number
}
