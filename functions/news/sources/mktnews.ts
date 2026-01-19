import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface MktnewsItem {
  id: string
  time: string
  important: number
  data: {
    title: string
    content: string
  }
}

interface MktnewsResponse {
  status: number
  data: MktnewsItem[]
}

export async function fetchMktnewsNews(): Promise<NewsItem[]> {
  const html = await myFetch('https://api.mktnews.net/api/flash?type=0&limit=50')
  const data: MktnewsResponse = JSON.parse(html)

  return data.data
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .map(item => ({
      id: item.id,
      title: item.data.title || item.data.content.match(/^【([^】]*)】(.*)$/)?.[1] || item.data.content,
      url: `https://mktnews.net/flashDetail.html?id=${item.id}`,
      extra: {
        info: item.important === 1 ? 'Important' : undefined,
        hover: item.data.content,
      },
    }))
}
