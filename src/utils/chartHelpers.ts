import type { SectorTrendPoint, MarketSentimentPoint } from '@/types'

/**
 * 生成 SVG 折线图路径
 * @param data 数据点数组
 * @param width SVG 宽度
 * @param height SVG 高度
 * @param padding 内边距
 * @returns SVG path 字符串
 */
export function generateLinePath(
  data: { x: number; y: number }[],
  width: number = 400,
  height: number = 200,
  padding: number = 40
): string {
  if (data.length === 0) return ''

  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * chartWidth
    const y = padding + (1 - point.y) * chartHeight
    return { x, y }
  })

  const pathParts = points.map((point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`
    }
    return `L ${point.x} ${point.y}`
  })

  return pathParts.join(' ')
}

/**
 * 将板块趋势数据转换为图表坐标
 * @param trends 板块趋势数据
 * @returns 坐标点数组
 */
export function sectorTrendsToPoints(trends: SectorTrendPoint[]): { x: number; y: number }[] {
  if (trends.length === 0) return []

  const maxScore = Math.max(...trends.map(t => t.hotScore), 1)

  return trends.map((trend, index) => ({
    x: index,
    y: trend.hotScore / maxScore
  }))
}

/**
 * 将市场情绪数据转换为图表坐标
 * @param history 市场情绪历史数据
 * @returns 坐标点数组
 */
export function sentimentHistoryToPoints(history: MarketSentimentPoint[]): { x: number; y: number }[] {
  return history.map((point, index) => ({
    x: index,
    y: point.sentimentIndex / 100
  }))
}

/**
 * 获取情绪标签
 * @param sentimentIndex 情绪指数 0-100
 * @returns 情绪标签
 */
export function getSentimentLabel(sentimentIndex: number): string {
  if (sentimentIndex >= 70) return '利好'
  if (sentimentIndex >= 30) return '中性'
  return '利空'
}

/**
 * 获取情绪颜色
 * @param sentimentIndex 情绪指数 0-100
 * @returns Tailwind 颜色类
 */
export function getSentimentColor(sentimentIndex: number): string {
  if (sentimentIndex >= 70) return 'text-green-600'
  if (sentimentIndex >= 30) return 'text-gray-600'
  return 'text-red-600'
}
