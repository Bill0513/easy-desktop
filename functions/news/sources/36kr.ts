import type { NewsItem } from '../types'
import { myFetch } from '../utils'
import * as cheerio from 'cheerio'

export async function fetch36krNews(): Promise<NewsItem[]> {
  const baseURL = 'https://www.36kr.com'
  const url = `${baseURL}/newsflashes`
  const html = await myFetch(url)
  const $ = cheerio.load(html)
  const news: NewsItem[] = []

  $('.newsflash-item').each((_, el) => {
    const $el = $(el)
    const $a = $el.find('a.item-title')
    const url = $a.attr('href')
    const title = $a.text()

    if (url && title) {
      news.push({
        id: url,
        title,
        url: `${baseURL}${url}`,
      })
    }
  })

  return news
}
