import type { NewsItem } from '../types'
import { myFetch } from '../utils'
import * as cheerio from 'cheerio'

export async function fetchFastbullNews(): Promise<NewsItem[]> {
  const baseURL = 'https://www.fastbull.com'
  const html = await myFetch(`${baseURL}/cn/express-news`)
  const $ = cheerio.load(html)
  const news: NewsItem[] = []

  $('.news-list').each((_, el) => {
    const a = $(el).find('.title_name')
    const url = a.attr('href')
    const titleText = a.text()
    const title = titleText.match(/【(.+)】/)?.[1] ?? titleText
    const date = $(el).attr('data-date')

    if (url && title && date) {
      news.push({
        id: url,
        title: title.length < 4 ? titleText : title,
        url: baseURL + url,
      })
    }
  })

  return news
}
