<script setup lang="ts">
import { ref } from 'vue'
import { TrendingUp, Sparkles, AlertCircle, CheckCircle, XCircle } from 'lucide-vue-next'

const isAnalyzing = ref(false)
const analysisResult = ref<any>(null)
const error = ref<string | null>(null)
const isCached = ref(false)
const sectorAnalysis = ref<any>(null)

const handleAnalyze = async () => {
  isAnalyzing.value = true
  error.value = null
  analysisResult.value = null
  isCached.value = false
  sectorAnalysis.value = null

  try {
    const response = await fetch('/api/ai-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const data = await response.json()

    if (data.status === 'success') {
      analysisResult.value = data
      isCached.value = data.cached || false

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

const getSentimentColor = (sentiment: string) => {
  if (sentiment === 'positive') return 'text-green-600'
  if (sentiment === 'negative') return 'text-red-600'
  return 'text-gray-600'
}

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
      </div>
    </div>
  </div>
</template>
