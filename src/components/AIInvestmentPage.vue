<script setup lang="ts">
import { ref, computed } from 'vue'
import { TrendingUp, Sparkles, AlertCircle, CheckCircle, XCircle } from 'lucide-vue-next'
import { useDesktopStore } from '@/stores/desktop'
import { generateLinePath, sectorTrendsToPoints, getSentimentLabel, getSentimentColor } from '@/utils/chartHelpers'

const store = useDesktopStore()
const isAnalyzing = ref(false)
const analysisResult = ref<any>(null)
const error = ref<string | null>(null)
const isCached = ref(false)
const sectorAnalysis = ref<any>(null)
const selectedSectorForTrend = ref<string | null>(null)
const sourceStats = ref<any[]>([])

const handleAnalyze = async () => {
  isAnalyzing.value = true
  error.value = null
  analysisResult.value = null
  isCached.value = false
  sectorAnalysis.value = null
  sourceStats.value = []

  try {
    const response = await fetch('/api/ai-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const data = await response.json()

    if (data.status === 'success') {
      analysisResult.value = data
      isCached.value = data.cached || false
      sourceStats.value = data.sourceStats || []

      // 获取板块分析
      const sectorResponse = await fetch('/api/sector-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const sectorData = await sectorResponse.json()
      if (sectorData.status === 'success') {
        sectorAnalysis.value = sectorData
      }
    } else {
      error.value = data.error || '分析失败'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '网络错误'
  } finally {
    isAnalyzing.value = false
  }
}

const getSourceName = (sourceId: string) => {
  const names: Record<string, string> = {
    xueqiu: '雪球',
    jin10: '金十数据',
    gelonghui: '格隆汇',
    fastbull: '快讯',
    mktnews: '市场新闻',
    wallstreetcn: '华尔街见闻',
    '36kr': '36氪'
  }
  return names[sourceId] || sourceId
}

const handleGenerateInsights = async () => {
  await store.fetchInsights()
  await store.fetchSentimentHistory(30)
}

const handleShowSectorTrend = async (sector: string) => {
  selectedSectorForTrend.value = sector
  await store.fetchSectorTrends(sector, 7)
}

const sectorTrendPath = computed(() => {
  if (!selectedSectorForTrend.value) return ''
  const trends = store.sectorTrends.get(selectedSectorForTrend.value)
  if (!trends || trends.length === 0) return ''
  const points = sectorTrendsToPoints(trends)
  return generateLinePath(points, 400, 200, 40)
})

const sentimentBars = computed(() => {
  return store.sentimentHistory.map((point: any) => ({
    date: point.date.slice(5),
    height: point.sentimentIndex,
    color: point.sentimentIndex >= 70 ? '#22c55e' : point.sentimentIndex >= 30 ? '#6b7280' : '#ef4444'
  }))
})

const getSentimentText = (sentiment: string) => {
  if (sentiment === 'positive') return '利好'
  if (sentiment === 'negative') return '利空'
  return '中性'
}
</script>

<template>
  <div class="w-full h-full overflow-auto bg-paper p-8">
    <div class="max-w-6xl mx-auto">
      <!-- 页面标题 -->
      <div class="flex items-center gap-3 mb-8">
        <TrendingUp :stroke-width="2.5" class="w-10 h-10 text-accent" />
        <div>
          <h1 class="font-handwritten text-4xl font-bold text-pencil">AI 投资助手</h1>
          <p class="font-handwritten text-sm text-pencil/60 mt-1">基于 Cloudflare Workers AI 的 A 股投资分析</p>
        </div>
      </div>

      <!-- 开发中提示 -->
      <div class="card-hand-drawn p-8 mb-6" style="box-shadow: 4px 4px 0px #2d2d2d;">
        <div class="flex items-start gap-4">
          <Sparkles :stroke-width="2.5" class="w-8 h-8 text-blue-pen flex-shrink-0 mt-1" />
          <div>
            <h2 class="font-handwritten text-2xl font-bold text-pencil mb-3">功能开发中</h2>
            <p class="font-handwritten text-base text-pencil/80 mb-4">
              AI 投资助手正在开发中，将为您提供以下功能：
            </p>
            <ul class="space-y-2 font-handwritten text-pencil/70">
              <li class="flex items-start gap-2">
                <span class="text-accent">•</span>
                <span>📰 智能新闻筛选：自动过滤与 A 股相关的重要新闻</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-accent">•</span>
                <span>📊 板块热度分析：实时追踪各板块的市场热度和情绪</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-accent">•</span>
                <span>💎 潜力板块挖掘：基于政策和趋势分析潜在机会</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-accent">•</span>
                <span>⚠️ 风险提示：及时发现负面新闻集中的板块</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-accent">•</span>
                <span>📅 事件日历：追踪即将发布的重要数据和政策</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 免责声明 -->
      <div class="card-hand-drawn p-6 bg-yellow-50" style="box-shadow: 4px 4px 0px #2d2d2d;">
        <div class="flex items-start gap-3">
          <AlertCircle :stroke-width="2.5" class="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 class="font-handwritten text-lg font-bold text-pencil mb-2">免责声明</h3>
            <p class="font-handwritten text-sm text-pencil/70">
              本工具提供的所有分析和建议仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。请根据自身情况做出独立判断，并承担相应的投资风险。
            </p>
          </div>
        </div>
      </div>

      <!-- 测试按钮 -->
      <div class="mt-8 flex justify-center">
        <button
          class="btn-hand-drawn px-8 py-4 font-handwritten text-lg font-bold"
          :disabled="isAnalyzing"
          @click="handleAnalyze"
        >
          <span v-if="!isAnalyzing">🚀 开始分析</span>
          <span v-else>⏳ 分析中...</span>
        </button>
      </div>

      <!-- 加载提示 -->
      <div v-if="isAnalyzing" class="mt-6 card-hand-drawn p-6 bg-blue-50" style="box-shadow: 4px 4px 0px #2d2d2d;">
        <div class="flex items-center gap-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-pen"></div>
          <div>
            <h3 class="font-handwritten text-lg font-bold text-pencil mb-1">AI 正在分析中</h3>
            <p class="font-handwritten text-sm text-pencil/70">正在收集金融新闻并使用 AI 进行智能分析，请稍候...</p>
          </div>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="mt-6 card-hand-drawn p-6 bg-red-50" style="box-shadow: 4px 4px 0px #2d2d2d;">
        <div class="flex items-start gap-3">
          <XCircle :stroke-width="2.5" class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 class="font-handwritten text-lg font-bold text-pencil mb-2">分析失败</h3>
            <p class="font-handwritten text-sm text-pencil/70">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- 分析结果 -->
      <div v-if="analysisResult" class="mt-8 space-y-6">
        <!-- 统计信息 -->
        <div class="card-hand-drawn p-6" style="box-shadow: 4px 4px 0px #2d2d2d;">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <CheckCircle :stroke-width="2.5" class="w-8 h-8 text-green-600" />
              <h2 class="font-handwritten text-2xl font-bold text-pencil">分析完成</h2>
            </div>
            <div v-if="isCached" class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded font-handwritten text-sm">
              📦 缓存结果（1小时内）
            </div>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <div class="font-handwritten text-3xl font-bold text-accent">{{ analysisResult.totalNews }}</div>
              <div class="font-handwritten text-sm text-pencil/60">总新闻数</div>
            </div>
            <div class="text-center">
              <div class="font-handwritten text-3xl font-bold text-blue-pen">{{ analysisResult.analyzedNews }}</div>
              <div class="font-handwritten text-sm text-pencil/60">A股相关</div>
            </div>
            <div class="text-center">
              <div class="font-handwritten text-3xl font-bold text-green-600">{{ analysisResult.analyses.filter((a: any) => a.importance >= 7).length }}</div>
              <div class="font-handwritten text-sm text-pencil/60">重要新闻</div>
            </div>
          </div>
        </div>

        <!-- 新闻源状态 -->
        <div v-if="sourceStats.length > 0" class="card-hand-drawn p-6" style="box-shadow: 4px 4px 0px #2d2d2d;">
          <h3 class="font-handwritten text-xl font-bold text-pencil mb-4">📡 新闻源状态</h3>
          <div class="flex flex-wrap gap-3">
            <div
              v-for="stat in sourceStats"
              :key="stat.source"
              class="card-hand-drawn px-4 py-2 flex items-center gap-2"
              :class="{
                'bg-green-50': stat.status === 'success',
                'bg-red-50': stat.status === 'failed'
              }"
              style="box-shadow: 2px 2px 0px #2d2d2d;"
            >
              <span v-if="stat.status === 'success'" class="text-green-600 text-lg">✓</span>
              <span v-else class="text-red-600 text-lg">✗</span>
              <div>
                <div class="font-handwritten text-sm font-bold text-pencil">{{ getSourceName(stat.source) }}</div>
                <div class="font-handwritten text-xs text-pencil/60">
                  <span v-if="stat.status === 'success'">{{ stat.count }} 条</span>
                  <span v-else class="text-red-600">{{ stat.error }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 新闻列表 -->
        <div class="card-hand-drawn p-6" style="box-shadow: 4px 4px 0px #2d2d2d;">
          <h3 class="font-handwritten text-xl font-bold text-pencil mb-4">📰 新闻分析结果</h3>
          <div class="space-y-4 max-h-[600px] overflow-y-auto">
            <div
              v-for="analysis in analysisResult.analyses"
              :key="analysis.newsId"
              class="card-hand-drawn p-4 hover:shadow-lg transition-shadow"
              style="box-shadow: 2px 2px 0px #2d2d2d;"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <a
                    :href="analysis.url"
                    target="_blank"
                    class="font-handwritten text-lg font-bold text-pencil hover:text-accent transition-colors"
                  >
                    {{ analysis.title }}
                  </a>
                  <p class="font-handwritten text-sm text-pencil/70 mt-2">{{ analysis.summary }}</p>
                  <div class="flex flex-wrap gap-2 mt-3">
                    <span
                      v-for="sector in analysis.sectors"
                      :key="sector"
                      class="px-2 py-1 bg-blue-100 text-blue-800 rounded font-handwritten text-xs"
                    >
                      {{ sector }}
                    </span>
                    <span
                      v-for="keyword in analysis.keywords"
                      :key="keyword"
                      class="px-2 py-1 bg-gray-100 text-gray-700 rounded font-handwritten text-xs"
                    >
                      {{ keyword }}
                    </span>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-2 flex-shrink-0">
                  <div class="font-handwritten text-2xl font-bold text-accent">{{ analysis.importance }}</div>
                  <div class="font-handwritten text-xs text-pencil/60">重要性</div>
                  <div :class="['font-handwritten text-sm font-bold', getSentimentColor(analysis.sentiment)]">
                    {{ getSentimentText(analysis.sentiment) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 板块分析 -->
        <div v-if="sectorAnalysis" class="card-hand-drawn p-6" style="box-shadow: 4px 4px 0px #2d2d2d;">
          <h3 class="font-handwritten text-xl font-bold text-pencil mb-4">📊 板块热力分析</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div
              v-for="sector in sectorAnalysis.sectors.slice(0, 12)"
              :key="sector.sector"
              class="card-hand-drawn p-4 hover:scale-105 transition-transform cursor-pointer"
              :class="{
                'bg-red-50': sector.sentiment === 'positive',
                'bg-green-50': sector.sentiment === 'negative',
                'bg-gray-50': sector.sentiment === 'neutral'
              }"
              style="box-shadow: 2px 2px 0px #2d2d2d;"
              @click="handleShowSectorTrend(sector.sector)"
            >
              <div class="text-center">
                <div class="font-handwritten text-lg font-bold text-pencil mb-1">{{ sector.sector }}</div>
                <div class="font-handwritten text-3xl font-bold text-accent mb-1">{{ sector.hotScore }}</div>
                <div class="font-handwritten text-xs text-pencil/60 mb-2">热度分数</div>
                <div class="flex justify-center gap-2 text-xs">
                  <span class="text-green-600">👍 {{ sector.positiveCount }}</span>
                  <span class="text-red-600">👎 {{ sector.negativeCount }}</span>
                  <span class="text-gray-600">➖ {{ sector.neutralCount }}</span>
                </div>
                <div class="mt-2 font-handwritten text-xs text-pencil/70">
                  提及 {{ sector.mentionCount }} 次
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Generate Insights Button -->
        <div v-if="sectorAnalysis" class="flex justify-center">
          <button
            class="btn-hand-drawn px-8 py-4 font-handwritten text-lg font-bold"
            :disabled="store.isGeneratingInsights"
            @click="handleGenerateInsights"
          >
            <span v-if="!store.isGeneratingInsights">✨ 生成投资洞察</span>
            <span v-else>⏳ 生成中...</span>
          </button>
        </div>

        <!-- Investment Insights Cards -->
        <div v-if="store.aiInsights" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Market Summary -->
          <div class="card-hand-drawn p-6 bg-blue-50" style="box-shadow: 4px 4px 0px #2d2d2d;">
            <h3 class="font-handwritten text-xl font-bold text-pencil mb-3 flex items-center gap-2">
              📰 市场要闻
            </h3>
            <p class="font-handwritten text-base text-pencil/80">{{ store.aiInsights.marketSummary }}</p>
          </div>

          <!-- Hot Sectors -->
          <div class="card-hand-drawn p-6 bg-red-50" style="box-shadow: 4px 4px 0px #2d2d2d;">
            <h3 class="font-handwritten text-xl font-bold text-pencil mb-3 flex items-center gap-2">
              🔥 热门板块
            </h3>
            <ul class="space-y-2">
              <li v-for="(item, i) in store.aiInsights.hotSectors" :key="i" class="font-handwritten text-sm text-pencil/80 flex items-start gap-2">
                <span class="text-accent">•</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <!-- Potential Sectors -->
          <div class="card-hand-drawn p-6 bg-green-50" style="box-shadow: 4px 4px 0px #2d2d2d;">
            <h3 class="font-handwritten text-xl font-bold text-pencil mb-3 flex items-center gap-2">
              💎 潜力板块
            </h3>
            <ul class="space-y-2">
              <li v-for="(item, i) in store.aiInsights.potentialSectors" :key="i" class="font-handwritten text-sm text-pencil/80 flex items-start gap-2">
                <span class="text-accent">•</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <!-- Risk Alerts -->
          <div class="card-hand-drawn p-6 bg-yellow-50" style="box-shadow: 4px 4px 0px #2d2d2d;">
            <h3 class="font-handwritten text-xl font-bold text-pencil mb-3 flex items-center gap-2">
              ⚠️ 风险提示
            </h3>
            <ul class="space-y-2">
              <li v-for="(item, i) in store.aiInsights.riskAlerts" :key="i" class="font-handwritten text-sm text-pencil/80 flex items-start gap-2">
                <span class="text-accent">•</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Market Sentiment Gauge -->
        <div v-if="store.aiInsights" class="card-hand-drawn p-6" style="box-shadow: 4px 4px 0px #2d2d2d;">
          <h3 class="font-handwritten text-xl font-bold text-pencil mb-6">📊 市场情绪指数</h3>

          <div class="max-w-md mx-auto">
            <!-- Gauge Bar -->
            <div class="relative h-12 mb-8">
              <div class="h-8 rounded-full overflow-hidden border-[3px] border-pencil"
                   style="background: linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #22c55e 100%); border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;">
              </div>

              <!-- Pointer -->
              <div class="absolute top-0 h-12 w-1 bg-pencil transition-all duration-500"
                   :style="{ left: `${store.marketSentiment}%`, transform: 'translateX(-50%)' }">
                <div class="w-4 h-4 bg-pencil rounded-full -mt-2 -ml-1.5"></div>
              </div>
            </div>

            <!-- Value and Label -->
            <div class="text-center">
              <div class="font-handwritten text-5xl font-bold text-pencil mb-2">{{ store.marketSentiment }}</div>
              <div class="font-handwritten text-lg" :class="getSentimentColor(store.marketSentiment)">
                {{ getSentimentLabel(store.marketSentiment) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Sector Trend Chart -->
        <div v-if="selectedSectorForTrend && store.sectorTrends.get(selectedSectorForTrend)" class="card-hand-drawn p-6" style="box-shadow: 4px 4px 0px #2d2d2d;">
          <h3 class="font-handwritten text-xl font-bold text-pencil mb-4">📈 {{ selectedSectorForTrend }} 热度趋势（7天）</h3>

          <svg viewBox="0 0 400 200" class="w-full h-48 border-2 border-pencil" style="border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;">
            <!-- Grid lines -->
            <line x1="40" y1="180" x2="380" y2="180" stroke="#2d2d2d" stroke-width="2" stroke-dasharray="5,5"/>
            <line x1="40" y1="20" x2="40" y2="180" stroke="#2d2d2d" stroke-width="2" stroke-dasharray="5,5"/>

            <!-- Data line -->
            <path
              v-if="sectorTrendPath"
              :d="sectorTrendPath"
              stroke="#ff4d4d"
              stroke-width="3"
              fill="none"
            />

            <!-- Data points -->
            <template v-if="selectedSectorForTrend && store.sectorTrends.get(selectedSectorForTrend)">
              <circle
                v-for="(point, i) in sectorTrendsToPoints(store.sectorTrends.get(selectedSectorForTrend) || [])"
                :key="i"
                :cx="40 + (i / ((store.sectorTrends.get(selectedSectorForTrend)?.length || 1) - 1 || 1)) * 340"
                :cy="40 + (1 - point.y) * 140"
                r="6"
                fill="#ff4d4d"
              />
            </template>
          </svg>
        </div>

        <!-- Market Sentiment History -->
        <div v-if="store.sentimentHistory.length > 0" class="card-hand-drawn p-6" style="box-shadow: 4px 4px 0px #2d2d2d;">
          <h3 class="font-handwritten text-xl font-bold text-pencil mb-4">📊 市场情绪趋势（30天）</h3>

          <div class="flex items-end justify-between gap-1 h-48 border-2 border-pencil p-4" style="border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;">
            <div
              v-for="bar in sentimentBars"
              :key="bar.date"
              class="flex-1 border-2 border-pencil transition-all hover:opacity-80"
              :style="{
                height: `${bar.height}%`,
                backgroundColor: bar.color,
                borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px'
              }"
              :title="`${bar.date}: ${bar.height}`"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
