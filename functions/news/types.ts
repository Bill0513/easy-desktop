// 新闻项接口
export interface NewsItem {
  id: string | number
  title: string
  url: string
  extra?: {
    hover?: string  // 悬停显示的描述
    info?: string   // 额外信息(如热度、star数等)
  }
}

// 新闻源响应接口
export interface NewsSourceResponse {
  status: 'success' | 'error'
  id: string
  name: string
  updatedTime: number
  items: NewsItem[]
  error?: string
}

// 新闻源定义
export interface NewsSource {
  id: string
  name: string
  icon: string
  fetcher: () => Promise<NewsItem[]>
}
