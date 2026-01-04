import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface CoolapkResponse {
  data: {
    id: string
    message: string
    editor_title: string
    url: string
    targetRow: {
      subTitle: string
    }
  }[]
}

// 生成酷安 API 所需的请求头
async function genCoolapkHeaders() {
  // 简化版本，使用固定的 User-Agent
  return {
    'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 13; 2211133C Build/TKQ1.220905.001) (#Build; HONOR; CMA-AN00; Mate60Pro; 13) +CoolMarket/13.3.2-2307261-universal',
    'X-App-Id': 'com.coolapk.market',
    'X-App-Token': 'v3',
    'X-Sdk-Int': '33',
    'X-Sdk-Locale': 'zh-CN',
  }
}

export async function fetchCoolapkNews(): Promise<NewsItem[]> {
  const url = 'https://api.coolapk.com/v6/page/dataList?url=%2Ffeed%2FstatList%3FcacheExpires%3D300%26statType%3Dday%26sortField%3Ddetailnum%26title%3D%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&title=%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&subTitle=&page=1'

  const html = await myFetch(url, {
    headers: await genCoolapkHeaders()
  })

  const data: CoolapkResponse = JSON.parse(html)

  if (!data.data || !data.data.length) {
    throw new Error('Failed to fetch Coolapk news')
  }

  return data.data
    .filter(item => item.id)
    .map(item => {
      // 提取纯文本标题（去除 HTML 标签）
      const title = item.editor_title || item.message.replace(/<[^>]+>/g, '').split('\n')[0]

      return {
        id: item.id,
        title: title.trim(),
        url: `https://www.coolapk.com${item.url}`,
        extra: {
          info: item.targetRow?.subTitle
        }
      }
    })
}
