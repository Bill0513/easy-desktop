import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface SspaiResponse {
  data: {
    id: number
    title: string
  }[]
}

export async function fetchSspaiNews(): Promise<NewsItem[]> {
  const timestamp = Date.now()
  const limit = 30
  const url = `https://sspai.com/api/v1/article/tag/page/get?limit=${limit}&offset=0&created_at=${timestamp}&tag=%E7%83%AD%E9%97%A8%E6%96%87%E7%AB%A0&released=false`

  const html = await myFetch(url)
  const data: SspaiResponse = JSON.parse(html)

  return data.data.map(item => {
    const url = `https://sspai.com/post/${item.id}`
    return {
      id: item.id.toString(),
      title: item.title,
      url,
    }
  })
}
