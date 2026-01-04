import type { NewsItem } from '../types'
import { myFetch } from '../utils'

export async function fetchHupuNews(): Promise<NewsItem[]> {
  const html = await myFetch('https://bbs.hupu.com/topic-daily-hot')

  // 正则表达式匹配热榜项
  const regex = /<li class="bbs-sl-web-post-body">[\s\S]*?<a href="(\/[^"]+?\.html)"[^>]*?class="p-title"[^>]*>([^<]+)<\/a>/g

  const result: NewsItem[] = []
  let match

  while ((match = regex.exec(html)) !== null) {
    const [, path, title] = match
    const url = `https://bbs.hupu.com${path}`

    result.push({
      id: path,
      title: title.trim(),
      url,
    })
  }

  return result
}
