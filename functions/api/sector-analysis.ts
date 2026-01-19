interface Env {
  NEWS_CACHE_DB?: D1Database
}

// A 股主要板块列表
const SECTORS = [
  '新能源', '光伏', '风电', '储能', '新能源汽车',
  '半导体', '芯片', '集成电路',
  '人工智能', '大模型', '算力',
  '医药', '医疗器械', '生物医药',
  '消费', '白酒', '食品饮料', '家电',
  '房地产', '建筑',
  '金融', '银行', '保险', '券商',
  '军工', '国防',
  '有色金属', '矿产',
  '化工', '材料',
  '机械', '制造',
  '通信', '5G',
  '互联网', '传媒',
  '农业', '种植',
  '环保', '公用事业'
]

interface SectorStats {
  sector: string
  mentionCount: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  totalImportance: number
  avgImportance: number
  positiveRatio: number
  hotScore: number
  sentiment: 'positive' | 'negative' | 'neutral'
  relatedNews: any[]
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const { NEWS_CACHE_DB } = context.env

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

    // 统计各板块数据
    const sectorMap = new Map<string, SectorStats>()

    for (const row of analyses.results) {
      const sectors = JSON.parse(row.sectors as string)
      const sentiment = row.sentiment as 'positive' | 'negative' | 'neutral'
      const importance = row.importance as number

      for (const sector of sectors) {
        if (!sectorMap.has(sector)) {
          sectorMap.set(sector, {
            sector,
            mentionCount: 0,
            positiveCount: 0,
            negativeCount: 0,
            neutralCount: 0,
            totalImportance: 0,
            avgImportance: 0,
            positiveRatio: 0,
            hotScore: 0,
            sentiment: 'neutral',
            relatedNews: []
          })
        }

        const stats = sectorMap.get(sector)!
        stats.mentionCount++
        stats.totalImportance += importance

        if (sentiment === 'positive') stats.positiveCount++
        else if (sentiment === 'negative') stats.negativeCount++
        else stats.neutralCount++

        stats.relatedNews.push({
          newsId: row.news_id,
          title: row.title,
          url: row.url,
          importance: row.importance,
          sentiment: row.sentiment
        })
      }
    }

    // 计算板块指标
    const sectorAnalyses: SectorStats[] = []

    for (const stats of sectorMap.values()) {
      stats.avgImportance = stats.totalImportance / stats.mentionCount
      stats.positiveRatio = stats.positiveCount / stats.mentionCount

      // 热度分数 = 提及次数 * 平均重要性 * (1 + 正面占比)
      stats.hotScore = Math.round(
        stats.mentionCount * stats.avgImportance * (1 + stats.positiveRatio)
      )

      // 整体情绪
      if (stats.positiveRatio > 0.6) stats.sentiment = 'positive'
      else if (stats.positiveRatio < 0.4) stats.sentiment = 'negative'
      else stats.sentiment = 'neutral'

      sectorAnalyses.push(stats)
    }

    // 按热度排序
    sectorAnalyses.sort((a, b) => b.hotScore - a.hotScore)

    return new Response(JSON.stringify({
      status: 'success',
      totalSectors: sectorAnalyses.length,
      sectors: sectorAnalyses,
      updatedAt: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Sector analysis error:', error)
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
