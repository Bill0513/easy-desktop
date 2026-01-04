import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface ZhihuResponse {
  data: {
    type: 'hot_list_feed'
    target: {
      title_area: {
        text: string
      }
      excerpt_area: {
        text: string
      }
      metrics_area: {
        text: string
      }
      link: {
        url: string
      }
    }
  }[]
}

export async function fetchZhihuNews(): Promise<NewsItem[]> {
  const url = 'https://www.zhihu.com/api/v3/feed/topstory/hot-list-web?limit=20&desktop=true'
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const res: ZhihuResponse = await response.json()

  return res.data.map((k) => ({
    id: k.target.link.url.match(/(\d+)$/)?.[1] ?? k.target.link.url,
    title: k.target.title_area.text,
    extra: {
      info: k.target.metrics_area.text,
      hover: k.target.excerpt_area.text,
    },
    url: k.target.link.url,
  }))
}
