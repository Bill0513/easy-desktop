interface Env {
  NEWS_CACHE_DB?: D1Database
}

async function initDatabase(env: Env): Promise<Response> {
  try {
    const { NEWS_CACHE_DB } = env

    // 创建新闻分析表
    await NEWS_CACHE_DB?.prepare(`
      CREATE TABLE IF NOT EXISTS news_analysis (
        id TEXT PRIMARY KEY,
        news_id TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        source TEXT NOT NULL,
        relevant INTEGER NOT NULL,
        importance INTEGER NOT NULL,
        sentiment TEXT NOT NULL,
        sectors TEXT NOT NULL,
        keywords TEXT NOT NULL,
        summary TEXT NOT NULL,
        analyzed_at INTEGER NOT NULL
      )
    `).run()

    // 创建索引
    await NEWS_CACHE_DB?.prepare(`
      CREATE INDEX IF NOT EXISTS idx_analyzed_at ON news_analysis(analyzed_at DESC)
    `).run()

    await NEWS_CACHE_DB?.prepare(`
      CREATE INDEX IF NOT EXISTS idx_importance ON news_analysis(importance DESC)
    `).run()

    return new Response(JSON.stringify({
      status: 'success',
      message: 'AI analysis database initialized'
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Database initialization error:', error)
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  return initDatabase(context.env)
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  return initDatabase(context.env)
}
