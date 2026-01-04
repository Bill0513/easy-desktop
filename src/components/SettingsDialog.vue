<script setup lang="ts">
import { ref } from 'vue'
import { useDesktopStore } from '@/stores/desktop'

const store = useDesktopStore()
const emit = defineEmits<{
  close: []
}>()

const importText = ref('')
const importStatus = ref<'idle' | 'success' | 'error'>('idle')
const importMessage = ref('')
const isComposing = ref(false)

const formatExample1 = `[
  {
    "name": "GitHub",
    "url": "https://github.com",
    "description": "代码托管平台",
    "category": "工作"
  }
]`

const formatExample2 = `{
  "navConfig": [
    {
      "name": "工作",
      "children": [
        { "name": "GitHub", "url": "https://github.com" }
      ]
    }
  ]
}`

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
      class="fixed inset-0 z-[20000] flex items-center justify-center bg-pencil/30 backdrop-blur-sm"
      @click.self="handleClose"
    >
      <div
        class="card-hand-drawn w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 m-4"
        style="box-shadow: 8px 8px 0px #2d2d2d;"
      >
      <!-- 标题栏 -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-handwritten text-2xl font-bold text-pencil">⚙️ 设置</h2>
        <button
          class="btn-hand-drawn px-3 py-1 text-sm"
          @click="handleClose"
        >
          关闭
        </button>
      </div>

      <!-- 网站导入功能 -->
      <div class="space-y-4">
        <div class="border-2 border-pencil/20 rounded-lg p-4 wobbly">
          <h3 class="font-handwritten text-xl font-semibold text-pencil mb-3">
            📥 网站导入
          </h3>

          <p class="font-handwritten text-sm text-pencil/70 mb-4">
            支持两种格式导入：简单数组格式或 navConfig 格式（带分类）。
          </p>

          <!-- 格式说明 -->
          <div class="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="font-handwritten text-xs font-medium text-pencil">
                  格式1：简单数组
                </label>
                <button
                  class="btn-hand-drawn px-2 py-1 text-xs"
                  @click="copyFormat(formatExample1)"
                >
                  📋 复制
                </button>
              </div>
              <pre class="bg-muted/30 border-2 border-pencil/20 rounded p-2 text-xs overflow-x-auto wobbly-sm font-mono h-32">{{ formatExample1 }}</pre>
            </div>
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="font-handwritten text-xs font-medium text-pencil">
                  格式2：navConfig（带分类）
                </label>
                <button
                  class="btn-hand-drawn px-2 py-1 text-xs"
                  @click="copyFormat(formatExample2)"
                >
                  📋 复制
                </button>
              </div>
              <pre class="bg-muted/30 border-2 border-pencil/20 rounded p-2 text-xs overflow-x-auto wobbly-sm font-mono h-32">{{ formatExample2 }}</pre>
            </div>
          </div>

          <!-- 字段说明 -->
          <div class="mb-4 bg-blue/10 border-2 border-blue/30 rounded p-3 wobbly-sm">
            <p class="font-handwritten text-sm text-pencil mb-2">
              <strong>字段说明：</strong>
            </p>
            <ul class="font-handwritten text-xs text-pencil/80 space-y-1 list-disc list-inside">
              <li><code class="bg-pencil/10 px-1 rounded">name</code>（必填）：网站名称</li>
              <li><code class="bg-pencil/10 px-1 rounded">url</code>（必填）：网站地址</li>
              <li><code class="bg-pencil/10 px-1 rounded">src</code>（选填）：图标URL</li>
              <li><code class="bg-pencil/10 px-1 rounded">backgroundColor</code>（选填）：背景色</li>
              <li>navConfig 格式会自动创建分类</li>
            </ul>
          </div>

          <!-- 导入文本框 -->
          <div class="mb-4">
            <label class="font-handwritten text-sm font-medium text-pencil mb-2 block">
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
              class="btn-hand-drawn px-6 py-2 bg-accent text-paper hover:bg-accent/90"
              @click="handleImport"
            >
              🚀 开始导入
            </button>
          </div>
        </div>

        <!-- 未来可以在这里添加更多设置项 -->
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
