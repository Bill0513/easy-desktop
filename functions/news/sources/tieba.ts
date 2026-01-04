import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface TiebaResponse {
  data: {
    bang_topic: {
      topic_list: {
        topic_id: string
        topic_name: string
        create_time: number
        topic_url: string
      }[]
    }
  }
}

export async function fetchTiebaNews(): Promise<NewsItem[]> {
  const url = 'https://tieba.baidu.com/hottopic/browse/topicList'
  const html = await myFetch(url)
  const data: TiebaResponse = JSON.parse(html)

  return data.data.bang_topic.topic_list.map(item => ({
    id: item.topic_id,
    title: item.topic_name,
    url: item.topic_url,
  }))
}
