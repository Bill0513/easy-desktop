<script setup lang="ts">
import { ref } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import {
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Monitor,
  Settings,
  Palette,
  Flame,
  Download,
  Loader2,
  Folder,
  CheckCircle,
  XCircle,
  FileText,
  BookOpen,
  Copy,
  Rocket,
  Keyboard
} from 'lucide-vue-next'

const store = useDesktopStore()
const emit = defineEmits<{
  close: []
}>()

const importText = ref('')
const importStatus = ref<'idle' | 'loading' | 'preview' | 'success' | 'error'>('idle')
const importMessage = ref('')
const isComposing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const previewData = ref<any>(null)
const transformedData = ref<any>(null)

// 外观设置展开状态（主题 + 背景）
const appearanceExpanded = ref(false)
// 数据导入展开状态
const importExpanded = ref(false)
// 新闻源设置展开状态
const newsSourceExpanded = ref(false)

// 新闻源列表
const allSources = [
  { id: 'baidu', name: '百度热搜', icon: '🔥' },
  { id: 'github', name: 'GitHub Trending', icon: '🐙' },
  { id: 'zhihu', name: '知乎热榜', icon: '💡' },
  { id: 'douyin', name: '抖音热搜', icon: '🎵' },
  { id: 'hupu', name: '虎扑', icon: '🏀' },
  { id: 'tieba', name: '百度贴吧', icon: '💬' },
  { id: 'toutiao', name: '今日头条', icon: '📰' },
  { id: 'thepaper', name: '澎湃新闻', icon: '📄' },
  { id: 'chongbuluo', name: '虫部落', icon: '🐛' },
  { id: 'tencent', name: '腾讯新闻', icon: '🐧' },
  { id: 'wallstreetcn', name: '华尔街见闻', icon: '💰' },
  { id: 'zaobao', name: '联合早报', icon: '📰' },
  { id: 'sputniknewscn', name: '卫星通讯社', icon: '🛰️' },
  { id: 'coolapk', name: '酷安', icon: '📱' },
  { id: 'ithome', name: 'IT之家', icon: '💻' },
  { id: 'juejin', name: '稀土掘金', icon: '⛏️' },
  { id: 'sspai', name: '少数派', icon: '✨' },
  { id: 'solidot', name: 'Solidot', icon: '🔧' }
]

// 预设颜色
const presetColors = [
  { name: '纸张色', value: '#fdfbf7' },
  { name: '浅蓝', value: '#e3f2fd' },
  { name: '浅绿', value: '#e8f5e9' },
  { name: '浅粉', value: '#fce4ec' },
  { name: '浅黄', value: '#fffde7' },
  { name: '浅紫', value: '#f3e5f5' },
  { name: '浅灰', value: '#f5f5f5' },
  { name: '浅橙', value: '#fff3e0' },
]

const customColor = ref(store.backgroundColor)

// 暗色主题预设颜色
const darkPresetColors = [
  { name: '深灰', value: '#1a1a1a' },
  { name: '深蓝', value: '#0d1117' },
  { name: '深绿', value: '#0d1b1e' },
  { name: '深紫', value: '#1a1625' },
  { name: '深棕', value: '#1c1410' },
  { name: '纯黑', value: '#000000' },
]

const customDarkColor = ref(store.darkBackgroundColor)

const setPresetColor = (color: string) => {
  store.setBackgroundColor(color)
  customColor.value = color
}

const setCustomColor = () => {
  store.setBackgroundColor(customColor.value)
}

const setDarkPresetColor = (color: string) => {
  store.setDarkBackgroundColor(color)
  customDarkColor.value = color
}

const setCustomDarkColor = () => {
  store.setDarkBackgroundColor(customDarkColor.value)
}

const formatExample1 = `[
  {
    "name": "GitHub",
    "url": "https://github.com",
    "src": "https://example.com/icon.svg",
    "backgroundColor": "#000",
    "category": "工作"
  }
]`

const formatExample2 = `{
  "navConfig": [
    {
      "name": "工作",
      "children": [
        {
          "name": "GitHub",
          "url": "https://github.com",
          "src": "https://example.com/icon.svg",
          "backgroundColor": "#000"
        }
      ]
    }
  ]
}`

// 处理文件上传
const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  try {
    importStatus.value = 'loading'
    importMessage.value = '正在读取文件...'

    // 读取文件内容（不管是什么格式）
    const text = await file.text()

    // 直接发送给 AI，让 AI 判断和转换
    importMessage.value = '正在使用 AI 分析和转换数据...'

    const response = await fetch('/api/transform-navigation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: text, isRawText: true })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'AI 转换失败')
    }

    const result = await response.json()
    transformedData.value = result.data
    previewData.value = result.data

    importStatus.value = 'preview'
    importMessage.value = 'AI 已转换数据，请预览确认'

  } catch (error) {
    importStatus.value = 'error'
    importMessage.value = error instanceof Error ? error.message : '处理文件失败，请确保文件包含导航数据'
  } finally {
    // 清空文件输入
    if (target) target.value = ''
  }
}

// 确认导入
const confirmImport = async () => {
  if (!transformedData.value) return

  try {
    const result = await store.importNavigationSites(transformedData.value)

    importStatus.value = 'success'
    let msg = `成功导入 ${result.success} 个网站`
    if (result.categories > 0) {
      msg += `，新增 ${result.categories} 个分类`
    }
    if (result.skipped > 0) {
      msg += `，跳过 ${result.skipped} 个`
    }
    importMessage.value = msg

    // 3秒后重置状态
    setTimeout(() => {
      importStatus.value = 'idle'
      importMessage.value = ''
      previewData.value = null
      transformedData.value = null
    }, 3000)
  } catch (error) {
    importStatus.value = 'error'
    importMessage.value = error instanceof Error ? error.message : '导入失败'
  }
}

// 取消导入
const cancelImport = () => {
  importStatus.value = 'idle'
  importMessage.value = ''
  previewData.value = null
  transformedData.value = null
}

// 触发文件选择
const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleImport = async () => {
  if (!importText.value.trim()) {
    importStatus.value = 'error'
    importMessage.value = '请输入要导入的数据'
    return
  }

  try {
    const data = JSON.parse(importText.value)

    // 调用 store 的导入方法（支持两种格式）
    const result = await store.importNavigationSites(data)

    importStatus.value = 'success'
    let msg = `成功导入 ${result.success} 个网站`
    if (result.categories > 0) {
      msg += `，新增 ${result.categories} 个分类`
    }
    if (result.skipped > 0) {
      msg += `，跳过 ${result.skipped} 个`
    }
    importMessage.value = msg

    // 3秒后清空输入框和状态
    setTimeout(() => {
      importText.value = ''
      importStatus.value = 'idle'
      importMessage.value = ''
    }, 3000)
  } catch (error) {
    importStatus.value = 'error'
    importMessage.value = error instanceof Error ? error.message : '导入失败，请检查数据格式'
  }
}

const copyFormat = (format: string) => {
  navigator.clipboard.writeText(format)
  importMessage.value = '格式示例已复制到剪贴板'
  importStatus.value = 'success'
  setTimeout(() => {
    importStatus.value = 'idle'
    importMessage.value = ''
  }, 2000)
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[20000] flex items-center justify-center bg-border-primary/30 backdrop-blur-sm"
      @click.self="handleClose"
    >
      <div
        class="card-hand-drawn w-full max-w-3xl max-h-[80vh] flex flex-col m-4"
        style="box-shadow: 8px 8px 0px var(--color-border-primary);"
      >
        <!-- 固定标题栏 -->
        <div class="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b-2 border-border-primary/20">
          <h2 class="font-handwritten text-2xl font-bold text-text-primary flex items-center gap-2">
            <Settings :size="24" :stroke-width="2.5" class="text-text-primary" />
            设置
          </h2>
          <button
            class="btn-hand-drawn px-3 py-1 text-sm"
            @click="handleClose"
          >
            关闭
          </button>
        </div>

        <!-- 可滚动内容区域 -->
        <div class="flex-1 overflow-y-auto p-6 pt-4">
          <!-- 外观设置（主题 + 背景） -->
          <div class="mb-4">
            <button
              class="w-full border-2 border-border-primary/20 rounded-lg p-4 wobbly hover:bg-muted/30 transition-colors flex items-center justify-between"
              @click="appearanceExpanded = !appearanceExpanded"
            >
              <h3 class="font-handwritten text-xl font-semibold text-text-primary flex items-center gap-2">
                <Palette :size="20" :stroke-width="2.5" class="text-text-primary" />
                外观设置
              </h3>
              <ChevronDown v-if="!appearanceExpanded" :size="20" :stroke-width="2.5" class="text-text-primary" />
              <ChevronUp v-else :size="20" :stroke-width="2.5" class="text-text-primary" />
            </button>

            <div v-if="appearanceExpanded" class="mt-3 border-2 border-border-primary/20 rounded-lg p-4 wobbly space-y-4">
              <!-- 主题模式选择 -->
              <div>
                <label class="font-handwritten text-sm font-medium text-text-primary mb-2 block">
                  主题模式
                </label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    class="card-hand-drawn px-4 py-3 flex flex-col items-center gap-2 transition-all hover:scale-105"
                    :style="{
                      background: store.themeMode === 'light' ? '#4d7cff' : 'var(--color-bg-secondary)',
                      color: store.themeMode === 'light' ? '#fdfbf7' : 'var(--color-text-primary)',
                      boxShadow: '2px 2px 0px var(--color-border-primary)'
                    }"
                    @click="store.setThemeMode('light')"
                  >
                    <Sun :size="24" :stroke-width="2.5" />
                    <span class="font-handwritten text-sm font-medium">亮色</span>
                  </button>
                  <button
                    class="card-hand-drawn px-4 py-3 flex flex-col items-center gap-2 transition-all hover:scale-105"
                    :style="{
                      background: store.themeMode === 'dark' ? '#4d7cff' : 'var(--color-bg-secondary)',
                      color: store.themeMode === 'dark' ? '#fdfbf7' : 'var(--color-text-primary)',
                      boxShadow: '2px 2px 0px var(--color-border-primary)'
                    }"
                    @click="store.setThemeMode('dark')"
                  >
                    <Moon :size="24" :stroke-width="2.5" />
                    <span class="font-handwritten text-sm font-medium">暗色</span>
                  </button>
                  <button
                    class="card-hand-drawn px-4 py-3 flex flex-col items-center gap-2 transition-all hover:scale-105"
                    :style="{
                      background: store.themeMode === 'system' ? '#4d7cff' : 'var(--color-bg-secondary)',
                      color: store.themeMode === 'system' ? '#fdfbf7' : 'var(--color-text-primary)',
                      boxShadow: '2px 2px 0px var(--color-border-primary)'
                    }"
                    @click="store.setThemeMode('system')"
                  >
                    <Monitor :size="24" :stroke-width="2.5" />
                    <span class="font-handwritten text-sm font-medium">跟随系统</span>
                  </button>
                </div>
              </div>

              <!-- 当前生效主题提示 -->
              <div
                v-if="store.themeMode === 'system'"
                class="bg-muted/30 border-2 border-border-primary/30 rounded-lg p-3 wobbly-sm"
              >
                <p class="font-handwritten text-sm text-text-primary">
                  当前系统主题：<strong>{{ store.effectiveTheme === 'dark' ? '暗色' : '亮色' }}</strong>
                </p>
              </div>

              <!-- 亮色主题背景色设置 -->
              <div>
                <label class="font-handwritten text-sm font-medium text-text-primary mb-2 block">
                  亮色主题背景色
                </label>
                <div class="grid grid-cols-4 gap-2 mb-3">
                  <button
                    v-for="color in presetColors"
                    :key="color.value"
                    class="flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105"
                    :class="store.backgroundColor === color.value ? 'border-bluePen bg-bluePen/10' : 'border-border-primary/20 hover:border-border-primary/40'"
                    @click="setPresetColor(color.value)"
                  >
                    <div
                      class="w-12 h-12 rounded-lg border-2 border-border-primary"
                      :style="{ backgroundColor: color.value }"
                    />
                    <span class="text-xs font-handwritten text-text-primary">{{ color.name }}</span>
                  </button>
                </div>

                <div class="flex gap-2 items-center">
                  <input
                    v-model="customColor"
                    type="color"
                    class="w-16 h-16 rounded-lg border-2 border-border-primary cursor-pointer"
                    @change="setCustomColor"
                  />
                  <div class="flex-1">
                    <input
                      v-model="customColor"
                      type="text"
                      class="input-hand-drawn w-full px-3 py-2 text-sm font-mono"
                      placeholder="#fdfbf7"
                      @blur="setCustomColor"
                    />
                    <p class="text-xs text-text-secondary font-handwritten mt-1">
                      输入十六进制颜色代码或使用颜色选择器
                    </p>
                  </div>
                </div>
              </div>

              <!-- 暗色主题背景色设置 -->
              <div>
                <label class="font-handwritten text-sm font-medium text-text-primary mb-2 block">
                  暗色主题背景色
                </label>

                <!-- 预设颜色 -->
                <div class="grid grid-cols-3 gap-2 mb-3">
                  <button
                    v-for="color in darkPresetColors"
                    :key="color.value"
                    class="flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105"
                    :class="store.darkBackgroundColor === color.value ? 'border-bluePen bg-bluePen/10' : 'border-border-primary/20 hover:border-border-primary/40'"
                    @click="setDarkPresetColor(color.value)"
                  >
                    <div
                      class="w-12 h-12 rounded-lg border-2 border-border-primary"
                      :style="{ backgroundColor: color.value }"
                    />
                    <span class="text-xs font-handwritten text-text-primary">{{ color.name }}</span>
                  </button>
                </div>

                <!-- 自定义颜色 -->
                <div class="flex gap-2 items-center">
                  <input
                    v-model="customDarkColor"
                    type="color"
                    class="w-16 h-16 rounded-lg border-2 border-border-primary cursor-pointer"
                    @change="setCustomDarkColor"
                  />
                  <div class="flex-1">
                    <input
                      v-model="customDarkColor"
                      type="text"
                      class="input-hand-drawn w-full px-3 py-2 text-sm font-mono"
                      placeholder="#1a1a1a"
                      @blur="setCustomDarkColor"
                    />
                    <p class="text-xs text-text-secondary font-handwritten mt-1">
                      输入十六进制颜色代码或使用颜色选择器
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 新闻源设置 -->
          <div class="mb-4">
            <button
              class="w-full border-2 border-border-primary/20 rounded-lg p-4 wobbly hover:bg-muted/30 transition-colors flex items-center justify-between"
              @click="newsSourceExpanded = !newsSourceExpanded"
            >
              <h3 class="font-handwritten text-xl font-semibold text-text-primary flex items-center gap-2">
                <Flame :size="20" :stroke-width="2.5" class="text-text-primary" />
                新闻源设置
              </h3>
              <ChevronDown v-if="!newsSourceExpanded" :size="20" :stroke-width="2.5" class="text-text-primary" />
              <ChevronUp v-else :size="20" :stroke-width="2.5" class="text-text-primary" />
            </button>

            <div v-if="newsSourceExpanded" class="mt-3 border-2 border-border-primary/20 rounded-lg p-4 wobbly space-y-3">
              <p class="font-handwritten text-sm text-text-secondary">
                选择要显示的新闻源，点击按钮启用或禁用
              </p>

              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                <button
                  v-for="source in allSources"
                  :key="source.id"
                  class="card-hand-drawn px-3 py-2 flex items-center gap-2 transition-all hover:scale-105"
                  :style="{
                    background: store.enabledSources.has(source.id) ? '#ff4d4d' : 'var(--color-bg-secondary)',
                    color: store.enabledSources.has(source.id) ? '#fdfbf7' : 'var(--color-text-primary)',
                    boxShadow: '2px 2px 0px var(--color-border-primary)'
                  }"
                  @click="store.toggleNewsSource(source.id)"
                >
                  <span class="text-base">{{ source.icon }}</span>
                  <span class="font-handwritten text-sm font-medium flex-1 text-left">{{ source.name }}</span>
                  <span v-if="store.enabledSources.has(source.id)" class="text-sm">✓</span>
                </button>
              </div>

              <div class="bg-muted/30 border-2 border-border-primary/30 rounded-lg p-3 wobbly-sm">
                <p class="font-handwritten text-xs text-text-secondary">
                  已启用 {{ store.enabledSources.size }} / {{ allSources.length }} 个新闻源
                </p>
              </div>
            </div>
          </div>

          <!-- 网站导入功能 -->
          <div class="space-y-4">
            <button
              class="w-full border-2 border-border-primary/20 rounded-lg p-4 wobbly hover:bg-muted/30 transition-colors flex items-center justify-between"
              @click="importExpanded = !importExpanded"
            >
              <h3 class="font-handwritten text-xl font-semibold text-text-primary flex items-center gap-2">
                <Download :size="20" :stroke-width="2.5" class="text-text-primary" />
                网站导入
              </h3>
              <ChevronDown v-if="!importExpanded" :size="20" :stroke-width="2.5" class="text-text-primary" />
              <ChevronUp v-else :size="20" :stroke-width="2.5" class="text-text-primary" />
            </button>

            <div v-if="importExpanded" class="border-2 border-border-primary/20 rounded-lg p-4 wobbly">

          <p class="font-handwritten text-sm text-text-secondary mb-4">
            上传包含导航数据的文件，AI 将自动识别并转换为合适的格式。支持 JSON、HTML 等多种格式。
          </p>

          <!-- 隐藏的文件输入 -->
          <input
            ref="fileInput"
            type="file"
            accept=".json,.html,.txt,.xml"
            class="hidden"
            @change="handleFileUpload"
          />

          <!-- 上传按钮 -->
          <div v-if="importStatus !== 'preview'" class="mb-4">
            <button
              @click="triggerFileUpload"
              class="btn-hand-drawn px-6 py-3 bg-blue-100 text-text-primary w-full flex items-center justify-center gap-2"
              :disabled="importStatus === 'loading'"
            >
              <Loader2 v-if="importStatus === 'loading'" :size="20" :stroke-width="2.5" class="animate-spin" />
              <FileText v-else :size="20" :stroke-width="2.5" />
              <span v-if="importStatus === 'loading'">AI 正在分析...</span>
              <span v-else>选择文件上传（支持 JSON/HTML/TXT 等）</span>
            </button>
          </div>

          <!-- 预览界面 -->
          <div v-if="importStatus === 'preview' && previewData" class="space-y-4">
            <div class="card-hand-drawn p-4 bg-green-50 border-2 border-green-400">
              <h4 class="font-handwritten font-bold text-text-primary mb-2 flex items-center gap-2">
                <CheckCircle :size="20" :stroke-width="2.5" class="text-green-600" />
                AI 转换完成
              </h4>
              <p class="font-handwritten text-sm text-text-secondary">
                {{ importMessage }}
              </p>
            </div>

            <!-- 预览数据 -->
            <div class="max-h-96 overflow-y-auto">
              <div class="card-hand-drawn p-4 bg-bg-secondary">
                <h5 class="font-handwritten font-semibold text-text-primary mb-3">预览数据：</h5>

                <!-- navConfig 格式预览 -->
                <div v-if="previewData.navConfig" class="space-y-3">
                  <div
                    v-for="(category, idx) in previewData.navConfig"
                    :key="idx"
                    class="border-2 border-border-primary/20 rounded-lg p-3 wobbly-sm"
                  >
                    <div class="font-handwritten font-bold text-text-primary mb-2 flex items-center gap-2">
                      <Folder :size="16" :stroke-width="2.5" />
                      {{ category.name }} ({{ category.children?.length || 0 }} 个网站)
                    </div>
                    <div class="space-y-1 pl-4">
                      <div
                        v-for="(site, siteIdx) in category.children?.slice(0, 3)"
                        :key="siteIdx"
                        class="text-sm font-handwritten text-text-secondary"
                      >
                        • {{ site.name }} - {{ site.url }}
                      </div>
                      <div
                        v-if="category.children && category.children.length > 3"
                        class="text-xs font-handwritten text-text-secondary"
                      >
                        ... 还有 {{ category.children.length - 3 }} 个
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 简单数组格式预览 -->
                <div v-else-if="Array.isArray(previewData)" class="space-y-2">
                  <div
                    v-for="(site, idx) in previewData.slice(0, 5)"
                    :key="idx"
                    class="border-2 border-border-primary/20 rounded-lg p-2 wobbly-sm"
                  >
                    <div class="font-handwritten text-sm text-text-primary">
                      {{ site.name }} - {{ site.url }}
                    </div>
                    <div v-if="site.category" class="text-xs font-handwritten text-text-secondary">
                      分类: {{ site.category }}
                    </div>
                  </div>
                  <div
                    v-if="previewData.length > 5"
                    class="text-xs font-handwritten text-text-secondary text-center"
                  >
                    ... 还有 {{ previewData.length - 5 }} 个网站
                  </div>
                </div>
              </div>
            </div>

            <!-- 确认和取消按钮 -->
            <div class="flex gap-3">
              <button
                @click="confirmImport"
                class="btn-hand-drawn flex-1 px-6 py-3 bg-green-100 text-text-primary flex items-center justify-center gap-2"
              >
                <CheckCircle :size="20" :stroke-width="2.5" />
                确认导入
              </button>
              <button
                @click="cancelImport"
                class="btn-hand-drawn flex-1 px-6 py-3 bg-gray-100 text-text-primary flex items-center justify-center gap-2"
              >
                <XCircle :size="20" :stroke-width="2.5" />
                取消
              </button>
            </div>
          </div>

          <!-- 状态消息 -->
          <div
            v-if="importMessage && importStatus !== 'preview'"
            class="mb-4 p-3 rounded wobbly-sm"
            :class="[
              importStatus === 'success' ? 'bg-green-100 border-2 border-green-400 text-green-800' : '',
              importStatus === 'error' ? 'bg-red-100 border-2 border-red-400 text-red-800' : '',
              importStatus === 'loading' ? 'bg-blue-100 border-2 border-blue-400 text-blue-800' : ''
            ]"
          >
            <p class="font-handwritten text-sm">{{ importMessage }}</p>
          </div>

          <!-- 格式说明（折叠） -->
          <details class="mb-4">
            <summary class="font-handwritten text-sm font-medium text-text-primary cursor-pointer hover:text-bluePen flex items-center gap-2">
              <BookOpen :size="16" :stroke-width="2.5" />
              查看支持的格式示例
            </summary>
          <div class="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="font-handwritten text-xs font-medium text-text-primary">
                  格式1：简单数组
                </label>
                <button
                  class="btn-hand-drawn px-2 py-1 text-xs flex items-center gap-1"
                  @click="copyFormat(formatExample1)"
                >
                  <Copy :size="14" :stroke-width="2.5" />
                  复制
                </button>
              </div>
              <pre class="bg-muted/30 border-2 border-border-primary/20 rounded p-2 text-xs text-text-primary overflow-x-auto wobbly-sm font-mono h-32">{{ formatExample1 }}</pre>
            </div>
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="font-handwritten text-xs font-medium text-text-primary">
                  格式2：navConfig（带分类）
                </label>
                <button
                  class="btn-hand-drawn px-2 py-1 text-xs flex items-center gap-1"
                  @click="copyFormat(formatExample2)"
                >
                  <Copy :size="14" :stroke-width="2.5" />
                  复制
                </button>
              </div>
              <pre class="bg-muted/30 border-2 border-border-primary/20 rounded p-2 text-xs text-text-primary overflow-x-auto wobbly-sm font-mono h-32">{{ formatExample2 }}</pre>
            </div>
          </div>

          <!-- 字段说明 -->
          <div class="bg-blue/10 border-2 border-blue/30 rounded p-3 wobbly-sm">
            <p class="font-handwritten text-sm text-text-primary mb-2">
              <strong>字段说明：</strong>
            </p>
            <ul class="font-handwritten text-xs text-text-secondary space-y-1 list-disc list-inside">
              <li><code class="bg-pencil/10 px-1 rounded">name</code>（必填）：网站名称</li>
              <li><code class="bg-pencil/10 px-1 rounded">url</code>（必填）：网站地址</li>
              <li><code class="bg-pencil/10 px-1 rounded">src</code>（选填）：图标URL</li>
              <li><code class="bg-pencil/10 px-1 rounded">backgroundColor</code>（选填）：背景色</li>
              <li>navConfig 格式会自动创建分类</li>
            </ul>
          </div>
          </details>

          <!-- 手动输入方式（保留原有功能） -->
          <details v-if="importStatus !== 'preview'">
            <summary class="font-handwritten text-sm font-medium text-text-primary cursor-pointer hover:text-bluePen mb-2 flex items-center gap-2">
              <Keyboard :size="16" :stroke-width="2.5" />
              或手动粘贴 JSON 数据
            </summary>
          <div class="mb-4 mt-3">
            <label class="font-handwritten text-sm font-medium text-text-primary mb-2 block">
              粘贴您的数据：
            </label>
            <textarea
              v-model="importText"
              class="input-hand-drawn w-full h-48 p-3 text-sm font-mono resize-none"
              placeholder="在此粘贴 JSON 格式的网站数据..."
              @compositionstart="isComposing = true"
              @compositionend="isComposing = false"
            />
            </div>

            <!-- 状态消息 -->
            <div
              v-if="importMessage"
              class="mb-4 p-3 rounded wobbly-sm"
              :class="[
                importStatus === 'success' ? 'bg-green-100 border-2 border-green-400 text-green-800' : '',
                importStatus === 'error' ? 'bg-red-100 border-2 border-red-400 text-red-800' : ''
              ]"
            >
              <p class="font-handwritten text-sm">{{ importMessage }}</p>
            </div>

            <!-- 导入按钮 -->
            <div class="flex justify-end">
              <button
                class="btn-hand-drawn px-6 py-2 bg-accent text-paper hover:bg-accent/90 flex items-center gap-2"
                @click="handleImport"
              >
                <Rocket :size="18" :stroke-width="2.5" />
                开始导入
              </button>
            </div>
          </details>
          </div>

          <!-- 未来可以在这里添加更多设置项 -->
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<style scoped>
code {
  font-family: 'Courier New', monospace;
}
</style>
