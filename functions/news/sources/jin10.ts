import type { NewsItem } from '../types'
import { myFetch } from '../utils'

interface Jin10Item {
  id: string
  time: string
  data: {
    title?: string
    content?: string
  }
  important: number
  channel: number[]
}

export async function fetchJin10News(): Promise<NewsItem[]> {
  const timestamp = Date.now()
  const url = `https://www.jin10.com/flash_newest.js?t=${timestamp}`

  const rawData = await myFetch(url)

  const jsonStr = rawData
    .replace(/^var\s+newest\s*=\s*/, '')
    .replace(/;*$/, '')
    .trim()

  const data: Jin10Item[] = JSON.parse(jsonStr)

  return data
    .filter(item => (item.data.title || item.data.content) && !item.channel?.includes(5))
    .map(item => {
      const text = (item.data.title || item.data.content)!.replace(/<\/?b>/g, '')
      const match = text.match(/^【([^】]*)】(.*)$/)
      const title = match ? match[1] : text
      const desc = match ? match[2] : undefined

      return {
        id: item.id,
        title,
        url: `https://flash.jin10.com/detail/${item.id}`,
        extra: {
          hover: desc,
          info: item.important ? '✰' : undefined,
        },
      }
    })
}
