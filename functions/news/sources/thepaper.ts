import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface ThepaperResponse {
  data: {
    hotNews: {
      contId: string
      name: string
      pubTimeLong: string
    }[]
  }
}

export async function fetchThepaperNews(): Promise<NewsItem[]> {
  const url = 'https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar'
  const html = await myFetch(url)
  const data: ThepaperResponse = JSON.parse(html)

  return data.data.hotNews.map(item => ({
    id: item.contId,
    title: item.name,
    url: `https://www.thepaper.cn/newsDetail_forward_${item.contId}`,
  }))
}
