interface Env {
  NEWS_CACHE_DB?: D1Database
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const { NEWS_CACHE_DB } = context.env
    const url = new URL(context.request.url)
    const days = parseInt(url.searchParams.get('days') || '30')

    const result = await NEWS_CACHE_DB?.prepare(`
      SELECT date, sentiment_index, total_news
      FROM market_sentiment_history
      ORDER BY date DESC
      LIMIT ?
    `).bind(days).all()

    const history = result?.results?.map((row: any) => ({
      date: row.date,
      sentimentIndex: row.sentiment_index,
      totalNews: row.total_news
    })).reverse() || []

    return new Response(JSON.stringify({
      status: 'success',
      history
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Market sentiment error:', error)
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
