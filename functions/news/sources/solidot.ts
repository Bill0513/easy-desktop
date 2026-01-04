import type { NewsItem } from '../types'
import { myFetch } from '../utils'

export async function fetchSolidotNews(): Promise<NewsItem[]> {
  const baseURL = 'https://www.solidot.org'
  const html = await myFetch(baseURL)

  // 使用正则解析
  const regex = /<div class="block_m">[\s\S]*?<div class="bg_htit">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<div class="talk_time">发表于(.*?)分/g

  const result: NewsItem[] = []
  let match

  while ((match = regex.exec(html)) !== null) {
    const [, url, title, dateStr] = match
    if (url && title) {
      result.push({
        id: url,
        url: baseURL + url,
        title: title.trim(),
        extra: {
          info: dateStr.trim().replace(/[年月]/g, '-').replace('时', ':').replace(/[分日]/g, '')
        }
      })
    }
  }

  return result
}
