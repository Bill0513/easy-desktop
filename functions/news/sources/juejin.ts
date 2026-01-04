import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface JuejinResponse {
  data: {
    content: {
      title: string
      content_id: string
    }
  }[]
}

export async function fetchJuejinNews(): Promise<NewsItem[]> {
  const url = 'https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot&spider=0'
  const html = await myFetch(url)
  const data: JuejinResponse = JSON.parse(html)

  return data.data.map(item => {
    const url = `https://juejin.cn/post/${item.content.content_id}`
    return {
      id: item.content.content_id,
      title: item.content.title,
      url,
    }
  })
}
