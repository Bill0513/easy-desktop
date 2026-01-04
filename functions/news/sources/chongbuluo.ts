import type { NewsItem } from '../types'
import { myFetch } from '../utils'

export async function fetchChongbuluoNews(): Promise<NewsItem[]> {
  const baseUrl = 'https://www.chongbuluo.com/'
  const html = await myFetch(`${baseUrl}forum.php?mod=guide&view=hot`)

  // 简单的正则解析（避免使用 cheerio）
  const regex = /<td class="common">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*class="[^"]*xst[^"]*"[^>]*>([^<]+)<\/a>/g

  const result: NewsItem[] = []
  let match

  while ((match = regex.exec(html)) !== null) {
    const [, url, title] = match
    if (url && title) {
      result.push({
        id: baseUrl + url,
        url: baseUrl + url,
        title: title.trim(),
      })
    }
  }

  return result
}
