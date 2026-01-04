import type { NewsItem } from '../types'
import { myFetch } from '../utils'

export async function fetchSputniknewscnNews(): Promise<NewsItem[]> {
  const html = await myFetch('https://sputniknews.cn/services/widget/lenta/')

  // 使用正则解析
  const regex = /<div class="lenta__item">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<div class="lenta__item-text">([^<]+)<\/div>[\s\S]*?<div class="lenta__item-date"[^>]*data-unixtime="([^"]+)"/g

  const result: NewsItem[] = []
  let match

  while ((match = regex.exec(html)) !== null) {
    const [, url, title, timestamp] = match
    if (url && title && timestamp) {
      result.push({
        id: url,
        url: `https://sputniknews.cn${url}`,
        title: title.trim(),
        extra: {
          info: new Date(Number(timestamp) * 1000).toLocaleDateString('zh-CN')
        }
      })
    }
  }

  return result
}
