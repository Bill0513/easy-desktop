import type { NewsSource } from './types'
import { fetchBaiduNews } from './sources/baidu'
import { fetchGithubNews } from './sources/github'
import { fetchZhihuNews } from './sources/zhihu'

// 新闻源注册表
export const newsSources: Record<string, NewsSource> = {
  baidu: {
    id: 'baidu',
    name: '百度热搜',
    icon: '🔥',
    fetcher: fetchBaiduNews,
  },
  github: {
    id: 'github',
    name: 'GitHub Trending',
    icon: '🐙',
    fetcher: fetchGithubNews,
  },
  zhihu: {
    id: 'zhihu',
    name: '知乎热榜',
    icon: '💡',
    fetcher: fetchZhihuNews,
  },
}

// 获取所有新闻源列表
export function getAllSources() {
  return Object.values(newsSources).map(source => ({
    id: source.id,
    name: source.name,
    icon: source.icon,
  }))
}

// 获取指定新闻源
export function getSource(id: string): NewsSource | undefined {
  return newsSources[id]
}
