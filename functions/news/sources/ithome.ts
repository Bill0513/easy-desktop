import type { NewsItem } from '../types'
import { myFetch } from '../utils'

export async function fetchIthomeNews(): Promise<NewsItem[]> {
  const html = await myFetch('https://www.ithome.com/list/')

  // 使用正则解析
  const regex = /<li>[\s\S]*?<a[^>]*class="t"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<i>([^<]+)<\/i>/g

  const result: NewsItem[] = []
  let match

  while ((match = regex.exec(html)) !== null) {
    const [, url, title, date] = match
    if (url && title && date) {
      // 过滤广告
      const isAd = url.includes('lapin') || ['神券', '优惠', '补贴', '京东'].some(k => title.includes(k))
      if (!isAd) {
        result.push({
          id: url,
          url,
          title: title.trim(),
          extra: {
            info: date.trim()
          }
        })
      }
    }
  }

  return result.slice(0, 30)
}
