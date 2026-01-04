import type { NewsSourceResponse } from '../news/types'
import { getSource } from '../news/registry'
import { NewsCache } from '../news/utils'

// 缓存配置
const TTL = 30 * 60 * 1000 // 30分钟 TTL（强制缓存时间）
const REFRESH_INTERVAL = 10 * 60 * 1000 // 10分钟刷新间隔

interface Env {
  NEWS_CACHE_DB?: D1Database
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context
  const url = new URL(request.url)
  const sourceId = url.searchParams.get('id')
  const latest = url.searchParams.get('latest') === 'true' // 是否强制刷新

  if (!sourceId) {
    return new Response(JSON.stringify({ error: 'Missing source id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const source = getSource(sourceId)
  if (!source) {
    return new Response(JSON.stringify({ error: 'Invalid source id' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const now = Date.now()
    let cache: { items: any[], updated: number } | null = null

    // 尝试使用 D1 数据库缓存
    if (env.NEWS_CACHE_DB) {
      const newsCache = new NewsCache(env.NEWS_CACHE_DB)

      // 首次运行时初始化表（可以通过环境变量控制）
      // await newsCache.init()

      cache = await newsCache.get(sourceId)

      if (cache) {
        // 检查是否在刷新间隔内（内容可能还没更新）
        if (now - cache.updated < REFRESH_INTERVAL) {
          const response: NewsSourceResponse = {
            status: 'success',
            id: source.id,
            name: source.name,
            updatedTime: cache.updated,
            items: cache.items,
          }
          return new Response(JSON.stringify(response), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=600', // 10分钟
              'X-Cache': 'HIT-INTERVAL',
            },
          })
        }

        // 检查是否在 TTL 内（强制使用缓存，除非用户请求最新数据）
        if (!latest && now - cache.updated < TTL) {
          const response: NewsSourceResponse = {
            status: 'success',
            id: source.id,
            name: source.name,
            updatedTime: cache.updated,
            items: cache.items,
          }
          return new Response(JSON.stringify(response), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=1800', // 30分钟
              'X-Cache': 'HIT-TTL',
            },
          })
        }
      }
    }

    // 获取新数据
    try {
      const items = await source.fetcher()
      const response: NewsSourceResponse = {
        status: 'success',
        id: source.id,
        name: source.name,
        updatedTime: now,
        items: items.slice(0, 30), // 限制最多30条
      }

      // 保存到 D1 缓存
      if (env.NEWS_CACHE_DB) {
        const newsCache = new NewsCache(env.NEWS_CACHE_DB)
        await newsCache.set(sourceId, response.items)
      }

      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600', // 10分钟
          'X-Cache': 'MISS',
        },
      })
    } catch (fetchError) {
      console.error(`Error fetching news from ${sourceId}:`, fetchError)

      // 如果获取失败但有旧缓存，返回旧缓存
      if (cache) {
        const response: NewsSourceResponse = {
          status: 'success',
          id: source.id,
          name: source.name,
          updatedTime: cache.updated,
          items: cache.items,
        }
        return new Response(JSON.stringify(response), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300', // 5分钟
            'X-Cache': 'STALE',
          },
        })
      }

      // 没有缓存，返回错误
      throw fetchError
    }
  } catch (error) {
    console.error(`Error in news API for ${sourceId}:`, error)

    const errorResponse: NewsSourceResponse = {
      status: 'error',
      id: source.id,
      name: source.name,
      updatedTime: Date.now(),
      items: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

