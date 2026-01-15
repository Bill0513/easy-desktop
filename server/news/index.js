import * as cheerio from 'cheerio'

// 新闻源配置
const NEWS_SOURCES = {
  github: {
    id: 'github',
    name: 'GitHub Trending',
    icon: '🐙',
    url: 'https://github.com/trending',
  },
  baidu: {
    id: 'baidu',
    name: '百度热搜',
    icon: '🔥',
    url: 'https://top.baidu.com/board?tab=realtime',
  },
  zhihu: {
    id: 'zhihu',
    name: '知乎热榜',
    icon: '💡',
    url: 'https://www.zhihu.com/hot',
  },
}

// 抓取 GitHub Trending
async function fetchGithubNews() {
  try {
    const response = await fetch('https://github.com/trending')
    const html = await response.text()
    const $ = cheerio.load(html)

    const items = []
    $('article.Box-row').each((i, el) => {
      if (i >= 25) return false

      const $el = $(el)
      const title = $el.find('h2 a').text().trim().replace(/\s+/g, ' ')
      const url = 'https://github.com' + $el.find('h2 a').attr('href')
      const description = $el.find('p').text().trim()
      const stars = $el.find('.d-inline-block.float-sm-right span').first().text().trim()

      items.push({
        id: `github-${i}`,
        title,
        url,
        extra: `${description} | ⭐ ${stars}`,
      })
    })

    return items
  } catch (error) {
    console.error('Failed to fetch GitHub news:', error)
    return []
  }
}

// 抓取百度热搜
async function fetchBaiduNews() {
  try {
    const response = await fetch('https://top.baidu.com/board?tab=realtime')
    const html = await response.text()
    const $ = cheerio.load(html)

    const items = []
    $('.category-wrap_iQLoo .c-single-text-ellipsis').each((i, el) => {
      if (i >= 25) return false

      const $el = $(el)
      const title = $el.text().trim()
      const url = $el.attr('href') || '#'

      items.push({
        id: `baidu-${i}`,
        title,
        url,
        extra: `热度 ${i + 1}`,
      })
    })

    return items
  } catch (error) {
    console.error('Failed to fetch Baidu news:', error)
    return []
  }
}

// 抓取知乎热榜
async function fetchZhihuNews() {
  try {
    const response = await fetch('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=25')
    const data = await response.json()

    const items = data.data.map((item, i) => ({
      id: `zhihu-${i}`,
      title: item.target.title,
      url: `https://www.zhihu.com/question/${item.target.id}`,
      extra: `热度 ${item.detail_text}`,
    }))

    return items
  } catch (error) {
    console.error('Failed to fetch Zhihu news:', error)
    return []
  }
}

// 新闻源映射
const NEWS_FETCHERS = {
  github: fetchGithubNews,
  baidu: fetchBaiduNews,
  zhihu: fetchZhihuNews,
}

// 获取所有新闻
export async function fetchAllNews(sources = Object.keys(NEWS_FETCHERS)) {
  const results = {}

  for (const sourceId of sources) {
    const fetcher = NEWS_FETCHERS[sourceId]
    if (fetcher) {
      try {
        results[sourceId] = await fetcher()
      } catch (error) {
        console.error(`Failed to fetch ${sourceId}:`, error)
        results[sourceId] = []
      }
    }
  }

  return results
}

// 获取新闻源列表
export function getNewsSources() {
  return Object.values(NEWS_SOURCES)
}
