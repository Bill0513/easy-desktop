interface Env {
  NEWS_CACHE_DB?: D1Database
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const { NEWS_CACHE_DB } = context.env
    const url = new URL(context.request.url)
    const sector = url.searchParams.get('sector')
    const days = parseInt(url.searchParams.get('days') || '7')

    if (!sector) {
      return new Response(JSON.stringify({
        status: 'error',
        error: 'Sector parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const result = await NEWS_CACHE_DB?.prepare(`
      SELECT date, hot_score, sentiment
      FROM sector_history
      WHERE sector = ?
      ORDER BY date DESC
      LIMIT ?
    `).bind(sector, days).all()

    const trends = result?.results?.map((row: any) => ({
      date: row.date,
      hotScore: row.hot_score,
      sentiment: row.sentiment
    })).reverse() || []

    return new Response(JSON.stringify({
      status: 'success',
      sector,
      trends
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Sector trends error:', error)
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
