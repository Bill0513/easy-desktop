interface Env {
  AI?: any
  NEWS_CACHE_DB?: D1Database
}

interface Insights {
  marketSummary: string
  hotSectors: string[]
  potentialSectors: string[]
  riskAlerts: string[]
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const { AI, NEWS_CACHE_DB } = context.env

    // 获取最近1小时的新闻分析
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const analyses = await NEWS_CACHE_DB
      ?.prepare('SELECT * FROM news_analysis WHERE analyzed_at > ?')
      .bind(oneHourAgo)
      .all()

    if (!analyses || !analyses.results || analyses.results.length === 0) {
      return new Response(JSON.stringify({
        status: 'error',
        error: '没有可用的新闻分析数据，请先运行新闻分析'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 统计板块数据
    const sectorMap = new Map<string, any>()
    let positiveCount = 0
    let negativeCount = 0
    let neutralCount = 0
    let totalImportance = 0

    for (const row of analyses.results) {
      const sectors = JSON.parse(row.sectors as string)
      const sentiment = row.sentiment as string
      const importance = row.importance as number

      totalImportance += importance

      if (sentiment === 'positive') positiveCount++
      else if (sentiment === 'negative') negativeCount++
      else neutralCount++

      for (const sector of sectors) {
        if (!sectorMap.has(sector)) {
          sectorMap.set(sector, { count: 0, importance: 0 })
        }
        const stats = sectorMap.get(sector)
        stats.count++
        stats.importance += importance
      }
    }

    // 计算市场情绪指数
    const totalNews = analyses.results.length
    const avgImportance = totalImportance / totalNews
    const sentimentIndex = Math.max(0, Math.min(100, Math.round(
      50 + ((positiveCount - negativeCount) / totalNews * 30) + (avgImportance / 10 * 20)
    )))

    // 获取前5热门板块
    const topSectors = Array.from(sectorMap.entries())
      .map(([sector, stats]) => ({
        sector,
        score: stats.count * stats.importance
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    // 构建 AI prompt
    const prompt = `你是专业的A股投资分析师。基于以下新闻分析数据，生成投资洞察：

【数据】
- 总新闻数: ${totalNews}
- 正面新闻: ${positiveCount}
- 负面新闻: ${negativeCount}
- 中性新闻: ${neutralCount}
- 热门板块: ${topSectors.map(s => `${s.sector}(热度${s.score})`).join(', ')}

请生成以下内容（JSON格式，只返回JSON）：
{
  "marketSummary": "一句话总结当前市场状态（20字内）",
  "hotSectors": ["板块1及原因（15字内）", "板块2及原因", "板块3及原因"],
  "potentialSectors": ["潜力板块1及原因（15字内）", "潜力板块2及原因"],
  "riskAlerts": ["风险提示1（15字内）", "风险提示2"]
}`

    const response = await AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512
    })

    const content = (response as any).response
    const jsonMatch = content.match(/\{[\s\S]*\}/)

    let insights: Insights

    if (jsonMatch) {
      insights = JSON.parse(jsonMatch[0])
    } else {
      // 降级方案
      insights = {
        marketSummary: sentimentIndex > 60 ? '市场情绪偏乐观' : sentimentIndex < 40 ? '市场情绪偏谨慎' : '市场情绪中性',
        hotSectors: topSectors.slice(0, 3).map(s => `${s.sector}板块热度较高`),
        potentialSectors: topSectors.slice(3, 5).map(s => `${s.sector}板块值得关注`),
        riskAlerts: ['注意市场波动风险', '关注政策变化']
      }
    }

    return new Response(JSON.stringify({
      status: 'success',
      insights,
      marketSentiment: sentimentIndex,
      updatedAt: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Generate insights error:', error)
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
