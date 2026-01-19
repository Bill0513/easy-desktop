import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface StockItem {
  code: string
  name: string
  percent: number
  exchange: string
  ad: number
}

interface StockResponse {
  data: {
    items: StockItem[]
  }
}

export async function fetchXueqiuNews(): Promise<NewsItem[]> {
  const url = 'https://stock.xueqiu.com/v5/stock/hot_stock/list.json?size=30&_type=10&type=10'

  // 获取 cookie
  const cookieResponse = await fetch('https://xueqiu.com/hq')
  const cookies = cookieResponse.headers.getSetCookie()

  const html = await myFetch(url, {
    headers: {
      cookie: cookies.join('; '),
    },
  })

  const data: StockResponse = JSON.parse(html)

  return data.data.items
    .filter(item => !item.ad)
    .map(item => ({
      id: item.code,
      title: item.name,
      url: `https://xueqiu.com/s/${item.code}`,
      extra: {
        info: `${item.percent}% ${item.exchange}`,
      },
    }))
}
