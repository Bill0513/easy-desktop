import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface BaiduResponse {
  data: {
    cards: {
      content: {
        isTop?: boolean
        word: string
        rawUrl: string
        desc?: string
      }[]
    }[]
  }
}

export async function fetchBaiduNews(): Promise<NewsItem[]> {
  const rawData = await myFetch('https://top.baidu.com/board?tab=realtime')
  const jsonStr = rawData.match(/<!--s-data:(.*?)-->/s)

  if (!jsonStr || !jsonStr[1]) {
    throw new Error('Failed to parse Baidu data')
  }

  const data: BaiduResponse = JSON.parse(jsonStr[1])

  return data.data.cards[0].content
    .filter(k => !k.isTop)
    .map((k) => ({
      id: k.rawUrl,
      title: k.word,
      url: k.rawUrl,
      extra: {
        hover: k.desc,
      },
    }))
}
