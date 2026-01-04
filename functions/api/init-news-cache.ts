import { NewsCache } from '../news/utils'

interface Env {
  NEWS_CACHE_DB: D1Database
}

export async function onRequest(context: { env: Env }): Promise<Response> {
  const { env } = context

  if (!env.NEWS_CACHE_DB) {
    return new Response(JSON.stringify({ error: 'NEWS_CACHE_DB not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const newsCache = new NewsCache(env.NEWS_CACHE_DB)
    await newsCache.init()

    return new Response(JSON.stringify({ success: true, message: 'News cache table initialized' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to initialize news cache table',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
