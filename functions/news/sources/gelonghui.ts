import type { NewsItem } from '../types'
import { myFetch } from '../utils'
import * as cheerio from 'cheerio'

export async function fetchGelonghuiNews(): Promise<NewsItem[]> {
  const baseURL = 'https://www.gelonghui.com'
  const html = await myFetch('https://www.gelonghui.com/news/')
  const $ = cheerio.load(html)
  const news: NewsItem[] = []

  $('.article-content').each((_, el) => {
    const a = $(el).find('.detail-right>a')
    const url = a.attr('href')
    const title = a.find('h2').text()
    const info = $(el).find('.time > span:nth-child(1)').text()

    if (url && title) {
      news.push({
        id: url,
        title,
        url: baseURL + url,
        extra: {
          info,
        },
      })
    }
  })

  return news
}
