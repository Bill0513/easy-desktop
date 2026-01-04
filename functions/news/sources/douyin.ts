import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface DouyinResponse {
  data: {
    word_list: {
      sentence_id: string
      word: string
      event_time: string
      hot_value: string
    }[]
  }
}

export async function fetchDouyinNews(): Promise<NewsItem[]> {
  const url = 'https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1'

  // 先获取 cookie
  const cookieResponse = await fetch('https://login.douyin.com/')
  const cookies = cookieResponse.headers.get('set-cookie') || ''

  const html = await myFetch(url, {
    headers: {
      'Cookie': cookies,
    }
  })

  const data: DouyinResponse = JSON.parse(html)

  return data.data.word_list.map(item => ({
    id: item.sentence_id,
    title: item.word,
    url: `https://www.douyin.com/hot/${item.sentence_id}`,
    extra: {
      info: item.hot_value
    }
  }))
}
