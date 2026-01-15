import express from 'express'
import { newsCache } from '../db.js'
import { fetchAllNews } from '../news/index.js'

const router = express.Router()

// GET - 获取新闻数据
router.get('/', async (req, res) => {
  try {
    const { source } = req.query

    if (source) {
      // 获取特定来源的新闻
      const cacheKey = `news:${source}`
      const cached = newsCache.get(cacheKey)

      // 缓存有效期 5 分钟
      const CACHE_TTL = 5 * 60 * 1000

      if (cached && (Date.now() - cached.updated < CACHE_TTL)) {
        return res.json(JSON.parse(cached.data))
      }

      // 缓存过期或不存在，重新获取
      const news = await fetchAllNews([source])
      const newsData = news[source] || []

      newsCache.put(cacheKey, newsData)
      res.json(newsData)
    } else {
      // 获取所有新闻源
      const allNews = await fetchAllNews()
      res.json(allNews)
    }
  } catch (error) {
    console.error('Failed to fetch news:', error)
    res.status(500).json({ error: 'Failed to fetch news' })
  }
})

// POST - 初始化新闻缓存（兼容性端点）
router.post('/init-cache', (req, res) => {
  res.json({ success: true, message: 'Cache initialized' })
})

export default router
