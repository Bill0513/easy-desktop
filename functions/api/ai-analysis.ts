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

    // 1. 收集金融新闻
    const allNews: NewsItem[] = []

    for (const sourceId of FINANCIAL_SOURCES) {
      try {
        const cached = await NEWS_CACHE_DB
          ?.prepare('SELECT data FROM news_cache WHERE id = ?')
          .bind(sourceId)
          .first()

        if (cached && cached.data) {
          const items = JSON.parse(cached.data as string)
          items.slice(0, 10).forEach((item: any) => {
            allNews.push({
              id: `${sourceId}-${item.id}`,
              title: item.title,
              url: item.url,
              source: sourceId
            })
          })
        }
      } catch (error) {
        console.error(`Failed to fetch news from ${sourceId}:`, error)
      }
    }

    // 2. AI 分析新闻（限制为前15条以减少调用）
    const analyses = []

    for (const news of allNews.slice(0, 15)) {
      try {
        const prompt = `你是一位专业的 A 股投资分析师。请分析以下新闻是否与 A 股市场相关，并提取关键信息。

新闻标题：${news.title}

请以 JSON 格式返回（只返回 JSON，不要其他内容）：
{
  "relevant": true/false,
  "importance": 1-10,
  "sentiment": "positive/negative/neutral",
  "sectors": ["板块1", "板块2"],
  "keywords": ["关键词1", "关键词2"],
  "summary": "一句话总结"
}`

        const response = await AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 512
        })

        const content = (response as any).response
        const jsonMatch = content.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          const analysis: AIAnalysisResult = JSON.parse(jsonMatch[0])

          if (analysis.relevant) {
            analyses.push({
              newsId: news.id,
              title: news.title,
              url: news.url,
              source: news.source,
              ...analysis,
              analyzedAt: Date.now()
            })

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
                analysis.importance,
                analysis.sentiment,
                JSON.stringify(analysis.sectors),
                JSON.stringify(analysis.keywords),
                analysis.summary,
                Date.now()
              ).run()
            } catch (dbError) {
              console.error('Failed to store analysis:', dbError)
            }
          }
        }
      } catch (error) {
        console.error(`Failed to analyze news ${news.id}:`, error)
      }
    }

    return new Response(JSON.stringify({
      status: 'success',
      cached: false,
      totalNews: allNews.length,
      analyzedNews: analyses.length,
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
