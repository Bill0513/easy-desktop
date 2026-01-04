import type { NewsItem } from '../types'
import { myFetch } from '../utils'

export async function fetchGithubNews(): Promise<NewsItem[]> {
  const baseURL = 'https://github.com'
  const html = await myFetch('https://github.com/trending?spoken_language_code=')

  // 简单的正则解析 GitHub trending 页面
  const repoPattern = /<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/g
  const starPattern = /<span[^>]*href="[^"]+\/stargazers"[^>]*>([\s\S]*?)<\/span>/g
  const descPattern = /<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/g

  const repos: NewsItem[] = []
  let match
  let index = 0

  while ((match = repoPattern.exec(html)) !== null && index < 25) {
    const url = match[1]
    const title = match[2].replace(/<[^>]+>/g, '').replace(/\n+/g, '').trim()

    // 获取对应的 star 数
    const starMatch = starPattern.exec(html)
    const star = starMatch ? starMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, '').trim() : ''

    // 获取对应的描述
    const descMatch = descPattern.exec(html)
    const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/\n+/g, '').trim() : ''

    if (url && title) {
      repos.push({
        url: `${baseURL}${url}`,
        title,
        id: url,
        extra: {
          info: star ? `✰ ${star}` : undefined,
          hover: desc || undefined,
        },
      })
      index++
    }
  }

  return repos
}
