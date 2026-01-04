import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface TencentResponse {
  ret: number
  msg: string
  data: {
    tabs: {
      articleList: {
        id: string
        title: string
        desc: string
        link_info: {
          url: string
        }
      }[]
    }[]
  }
}

export async function fetchTencentNews(): Promise<NewsItem[]> {
  const url = 'https://i.news.qq.com/web_backend/v2/getTagInfo?tagId=aEWqxLtdgmQ%3D'
  const html = await myFetch(url, {
    headers: {
      'Referer': 'https://news.qq.com/',
    }
  })

  const data: TencentResponse = JSON.parse(html)

  return data.data.tabs[0].articleList.map(item => ({
    id: item.id,
    title: item.title,
    url: item.link_info.url,
    extra: {
      hover: item.desc
    }
  }))
}
