interface Env {
  AI?: any
  NEWS_CACHE_DB?: D1Database
}

interface NewsItem {
  id: string | number
  title: string
  url: string
  source: string
}

interface AIAnalysisResult {
  relevant: boolean
  importance: number
  sentiment: 'positive' | 'negative' | 'neutral'
  sectors: string[]
  keywords: string[]
  summary: string
}

// 金融新闻源列表
const FINANCIAL_SOURCES = ['xueqiu', 'jin10', 'gelonghui', 'fastbull', 'mktnews', 'wallstreetcn', '36kr']

// 智能重试函数
async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries) throw error
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
    }
  }
  throw new Error('Retry failed')
}

// 批量分析函数
async function analyzeBatch(batch: NewsItem[], AI: any): Promise<any[]> {
  const analyses: any[] = []

  try {
    const prompt = `你是专业的 A 股投资分析师。批量分析以下 ${batch.length} 条新闻是否与 A 股市场相关：

${batch.map((n, idx) => `${idx + 1}. [${n.source}] ${n.title}`).join('\n\n')}

对每条新闻返回 JSON 数组（只返回 JSON，不要其他内容）：
[
  {
    "index": 1,
    "relevant": true/false,
    "importance": 1-10,
    "sentiment": "positive/negative/neutral",
    "sectors": ["板块1", "板块2"],
    "keywords": ["关键词1", "关键词2"],
    "summary": "一句话总结"
  }
]`

    const response = await AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048
    })

    const content = (response as any).response
    const jsonMatch = content.match(/\[[\s\S]*\]/)

    if (jsonMatch) {
      const batchResults: any[] = JSON.parse(jsonMatch[0])

      for (const result of batchResults) {
        if (result.relevant && result.index && result.index <= batch.length) {
          const news = batch[result.index - 1]
          analyses.push({
            news,
            result
          })
        }
      }
    }
  } catch (error) {
    console.error('Batch analysis error:', error)
  }

  return analyses
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const { AI, NEWS_CACHE_DB } = context.env

    // 检查是否有最近的分析结果（1小时内）
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const cachedAnalyses = await NEWS_CACHE_DB
      ?.prepare('SELECT * FROM news_analysis WHERE analyzed_at > ? ORDER BY importance DESC')
      .bind(oneHourAgo)
      .all()

    if (cachedAnalyses && cachedAnalyses.results && cachedAnalyses.results.length > 0) {
      // 返回缓存的分析结果
      const analyses = cachedAnalyses.results.map((row: any) => ({
        newsId: row.news_id,
        title: row.title,
        url: row.url,
        source: row.source,
        relevant: row.relevant === 1,
        importance: row.importance,
        sentiment: row.sentiment,
        sectors: JSON.parse(row.sectors),
        keywords: JSON.parse(row.keywords),
        summary: row.summary,
        analyzedAt: row.analyzed_at
      }))

      return new Response(JSON.stringify({
        status: 'success',
        cached: true,
        totalNews: analyses.length,
        analyzedNews: analyses.length,
        analyses
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 1. 收集金融新闻并追踪源状态（带智能重试）
    const allNews: NewsItem[] = []
    const sourceStats: any[] = []

    for (const sourceId of FINANCIAL_SOURCES) {
      try {
        const cached = await fetchWithRetry(async () => {
          const result = await NEWS_CACHE_DB
            ?.prepare('SELECT data FROM news_cache WHERE id = ?')
            .bind(sourceId)
            .first()
          if (!result || !result.data) throw new Error('No cached data')
          return result
        })

        const items = JSON.parse(cached.data as string)
        const newsCount = Math.min(items.length, 10)

        items.slice(0, 10).forEach((item: any) => {
          allNews.push({
            id: `${sourceId}-${item.id}`,
            title: item.title,
            url: item.url,
            source: sourceId
          })
        })

        sourceStats.push({
          source: sourceId,
          status: 'success',
          count: newsCount
        })
      } catch (error) {
        console.error(`Failed to fetch news from ${sourceId}:`, error)
        sourceStats.push({
          source: sourceId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          count: 0
        })
      }
    }

    // 2. 并发批量 AI 分析新闻
    const analyses: any[] = []
    const BATCH_SIZE = 10
    const CONCURRENT_BATCHES = 2

    const batches: NewsItem[][] = []
    for (let i = 0; i < allNews.length; i += BATCH_SIZE) {
      batches.push(allNews.slice(i, i + BATCH_SIZE))
    }

    // 分组并发处理
    for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
      const batchGroup = batches.slice(i, i + CONCURRENT_BATCHES)
      const results = await Promise.all(
        batchGroup.map(batch => analyzeBatch(batch, AI))
      )

      // 合并结果并存储到数据库
      for (const batchResults of results) {
        for (const { news, result } of batchResults) {
          const analysisData = {
            newsId: news.id,
            title: news.title,
            url: news.url,
            source: news.source,
            relevant: result.relevant,
            importance: result.importance,
            sentiment: result.sentiment,
            sectors: result.sectors,
            keywords: result.keywords,
            summary: result.summary,
            analyzedAt: Date.now()
          }

          analyses.push(analysisData)

          // 存储到数据库
          try {
            await NEWS_CACHE_DB?.prepare(`
              INSERT OR REPLACE INTO news_analysis
              (id, news_id, title, url, source, relevant, importance, sentiment, sectors, keywords, summary, analyzed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              news.id,
              news.id,
              news.title,
              news.url,
              news.source,
              1,
              result.importance,
              result.sentiment,
              JSON.stringify(result.sectors),
              JSON.stringify(result.keywords),
              result.summary,
              Date.now()
            ).run()
          } catch (dbError) {
            console.error('Failed to store analysis:', dbError)
          }
        }
      }
    }

    return new Response(JSON.stringify({
      status: 'success',
      cached: false,
      totalNews: allNews.length,
      analyzedNews: analyses.length,
      sourceStats,
      analyses: analyses.sort((a, b) => b.importance - a.importance)
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI analysis error:', error)
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
