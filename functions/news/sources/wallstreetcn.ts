import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface WallstreetcnItem {
  uri: string
  id: number
  title?: string
  content_text: string
  content_short: string
  display_time: number
}

interface LiveResponse {
  data: {
    items: WallstreetcnItem[]
  }
}

export async function fetchWallstreetcnNews(): Promise<NewsItem[]> {
  // 快讯（实时）
  const apiUrl = 'https://api-one.wallstcn.com/apiv1/content/lives?channel=global-channel&limit=30'
  const html = await myFetch(apiUrl)
  const data: LiveResponse = JSON.parse(html)

  return data.data.items.map(item => ({
    id: item.id.toString(),
    title: item.title || item.content_text,
    url: item.uri,
    extra: {
      info: new Date(item.display_time * 1000).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }))
}
