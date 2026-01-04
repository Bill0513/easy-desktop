import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface ToutiaoResponse {
  data: {
    ClusterIdStr: string
    Title: string
    HotValue: string
    Image: {
      url: string
    }
    LabelUri?: {
      url: string
    }
  }[]
}

export async function fetchToutiaoNews(): Promise<NewsItem[]> {
  const url = 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc'
  const html = await myFetch(url)
  const data: ToutiaoResponse = JSON.parse(html)

  return data.data.map(item => ({
    id: item.ClusterIdStr,
    title: item.Title,
    url: `https://www.toutiao.com/trending/${item.ClusterIdStr}/`,
    extra: {
      info: item.HotValue
    }
  }))
}
