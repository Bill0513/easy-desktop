interface Env {
  NEWS_CACHE_DB?: D1Database
}

interface SectorData {
  sector: string
  hotScore: number
  mentionCount: number
  positiveRatio: number
  sentiment: string
}

interface SaveHistoryRequest {
  sectors: SectorData[]
  marketSentiment: number
  totalNews: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  avgImportance: number
  date: string
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const { NEWS_CACHE_DB } = context.env
    const data: SaveHistoryRequest = await context.request.json()

    const now = Date.now()
    let saved = 0

    // 保存板块历史
    for (const sector of data.sectors) {
      const id = `${sector.sector}-${data.date}`
      await NEWS_CACHE_DB?.prepare(`
        INSERT OR REPLACE INTO sector_history
        (id, sector, date, hot_score, mention_count, positive_ratio, sentiment, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        sector.sector,
        data.date,
        sector.hotScore,
        sector.mentionCount,
        sector.positiveRatio,
        sector.sentiment,
        now
      ).run()
      saved++
    }

    // 保存市场情绪
    await NEWS_CACHE_DB?.prepare(`
      INSERT OR REPLACE INTO market_sentiment_history
      (date, sentiment_index, total_news, positive_count, negative_count, neutral_count, avg_importance, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.date,
      data.marketSentiment,
      data.totalNews,
      data.positiveCount,
      data.negativeCount,
      data.neutralCount,
      data.avgImportance,
      now
    ).run()

    return new Response(JSON.stringify({
      status: 'success',
      saved: saved + 1
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Save history error:', error)
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
