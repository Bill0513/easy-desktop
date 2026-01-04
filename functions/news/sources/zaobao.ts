import type { NewsItem } from '../types'
import { myFetch } from '../utils'

export async function fetchZaobaoNews(): Promise<NewsItem[]> {
  // 注意：原始实现使用 GB2312 编码，但 Cloudflare Workers 不支持 iconv-lite
  // 这里使用早晨报的代理网站，它已经是 UTF-8 编码
  const base = 'https://www.zaochenbao.com'
  const html = await myFetch(`${base}/realtime/`)

  // 使用正则解析（避免 cheerio 和编码问题）
  const regex = /<a[^>]*class="item"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="eps"[^>]*>([^<]+)<\/div>/g

  const result: NewsItem[] = []
  let match

  while ((match = regex.exec(html)) !== null) {
    const [, url, title] = match
    if (url && title) {
      result.push({
        id: url,
        url: base + url,
        title: title.trim(),
      })
    }
  }

  return result.slice(0, 30)
}
