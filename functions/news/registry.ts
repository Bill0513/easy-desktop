import type { NewsSource } from './types'
import { fetchBaiduNews } from './sources/baidu'
import { fetchGithubNews } from './sources/github'
import { fetchZhihuNews } from './sources/zhihu'
import { fetchDouyinNews } from './sources/douyin'
import { fetchHupuNews } from './sources/hupu'
import { fetchTiebaNews } from './sources/tieba'
import { fetchToutiaoNews } from './sources/toutiao'
import { fetchThepaperNews } from './sources/thepaper'
import { fetchChongbuluoNews } from './sources/chongbuluo'
import { fetchTencentNews } from './sources/tencent'
import { fetchWallstreetcnNews } from './sources/wallstreetcn'
import { fetchZaobaoNews } from './sources/zaobao'
import { fetchSputniknewscnNews } from './sources/sputniknewscn'
import { fetchCoolapkNews } from './sources/coolapk'
import { fetchIthomeNews } from './sources/ithome'
import { fetchJuejinNews } from './sources/juejin'
import { fetchSspaiNews } from './sources/sspai'
import { fetchSolidotNews } from './sources/solidot'

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
  douyin: {
    id: 'douyin',
    name: '抖音热搜',
    icon: '🎵',
    fetcher: fetchDouyinNews,
  },
  hupu: {
    id: 'hupu',
    name: '虎扑',
    icon: '🏀',
    fetcher: fetchHupuNews,
  },
  tieba: {
    id: 'tieba',
    name: '百度贴吧',
    icon: '💬',
    fetcher: fetchTiebaNews,
  },
  toutiao: {
    id: 'toutiao',
    name: '今日头条',
    icon: '📰',
    fetcher: fetchToutiaoNews,
  },
  thepaper: {
    id: 'thepaper',
    name: '澎湃新闻',
    icon: '📄',
    fetcher: fetchThepaperNews,
  },
  chongbuluo: {
    id: 'chongbuluo',
    name: '虫部落',
    icon: '🐛',
    fetcher: fetchChongbuluoNews,
  },
  tencent: {
    id: 'tencent',
    name: '腾讯新闻',
    icon: '🐧',
    fetcher: fetchTencentNews,
  },
  wallstreetcn: {
    id: 'wallstreetcn',
    name: '华尔街见闻',
    icon: '💰',
    fetcher: fetchWallstreetcnNews,
  },
  zaobao: {
    id: 'zaobao',
    name: '联合早报',
    icon: '📰',
    fetcher: fetchZaobaoNews,
  },
  sputniknewscn: {
    id: 'sputniknewscn',
    name: '卫星通讯社',
    icon: '🛰️',
    fetcher: fetchSputniknewscnNews,
  },
  coolapk: {
    id: 'coolapk',
    name: '酷安',
    icon: '📱',
    fetcher: fetchCoolapkNews,
  },
  ithome: {
    id: 'ithome',
    name: 'IT之家',
    icon: '💻',
    fetcher: fetchIthomeNews,
  },
  juejin: {
    id: 'juejin',
    name: '稀土掘金',
    icon: '⛏️',
    fetcher: fetchJuejinNews,
  },
  sspai: {
    id: 'sspai',
    name: '少数派',
    icon: '✨',
    fetcher: fetchSspaiNews,
  },
  solidot: {
    id: 'solidot',
    name: 'Solidot',
    icon: '🔧',
    fetcher: fetchSolidotNews,
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
