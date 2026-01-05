<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FileItem } from '@/types'
import VueOfficeDocx from '@vue-office/docx'
import VueOfficeExcel from '@vue-office/excel'
import VueOfficePdf from '@vue-office/pdf'
import '@vue-office/docx/lib/index.css'
import '@vue-office/excel/lib/index.css'

const props = defineProps<{
  file: FileItem | null
}>()

const emit = defineEmits<{
  close: []
}>()

// 文件内容
const fileContent = ref<string>('')
const isLoading = ref(false)
const loadError = ref<string>('')

// 文件类型判断
const fileType = computed(() => {
  if (!props.file) return 'unknown'

  const mimeType = props.file.mimeType.toLowerCase()
  const fileName = props.file.name.toLowerCase()

  // 图片
  if (mimeType.startsWith('image/')) return 'image'

  // 视频
  if (mimeType.startsWith('video/')) return 'video'

  // 音频
  if (mimeType.startsWith('audio/')) return 'audio'

  // PDF
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) return 'pdf'

  // Word
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')) return 'docx'

  // Excel
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileName.endsWith('.xlsx')) return 'xlsx'

  // 文本
  if (mimeType.startsWith('text/') ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.json') ||
      fileName.endsWith('.js') ||
      fileName.endsWith('.ts') ||
      fileName.endsWith('.vue') ||
      fileName.endsWith('.css') ||
      fileName.endsWith('.html')) return 'text'

  return 'unknown'
})

// 文件 URL
const fileUrl = computed(() => {
  if (!props.file) return ''

  // 所有文件都存储在 R2，使用完整域名访问
  const imageDomain = import.meta.env.VITE_IMAGE_DOMAIN || 'https://sunkkk.de5.net'
  return `${imageDomain}/${props.file.url}`
})

// 加载文件内容（用于文本预览）
const loadTextContent = async () => {
  if (!props.file) return

  isLoading.value = true
  loadError.value = ''

  try {
    const response = await fetch(fileUrl.value)
    if (!response.ok) throw new Error('Failed to load file')

    const text = await response.text()
    fileContent.value = text
  } catch (error) {
    loadError.value = '加载文件失败'
    console.error('Failed to load text content:', error)
  } finally {
    isLoading.value = false
  }
}

// 监听文件变化
watch(() => props.file, (newFile) => {
  if (newFile && fileType.value === 'text') {
    loadTextContent()
  }
}, { immediate: true })

// 下载文件
const handleDownload = () => {
  if (!props.file) return

  const link = document.createElement('a')
  link.href = fileUrl.value
  link.download = props.file.name
  link.click()
}

// 关闭对话框
const handleClose = () => {
  emit('close')
}

// 阻止事件冒泡
const handleContentClick = (e: Event) => {
  e.stopPropagation()
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="file"
        class="fixed inset-0 z-[10000] flex items-center justify-center bg-pencil/80"
        @click="handleClose"
      >
        <div
          class="card-hand-drawn bg-paper max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col"
          style="box-shadow: 8px 8px 0px #2d2d2d;"
          @click="handleContentClick"
        >
          <!-- 标题栏 -->
          <div class="flex items-center justify-between p-4 border-b-2 border-pencil/20">
            <h2 class="font-handwritten text-xl text-pencil truncate flex-1" :title="file.name">
              {{ file.name }}
            </h2>
            <div class="flex items-center gap-2 ml-4">
              <button
                class="btn-hand-drawn px-3 py-1 text-sm"
                @click="handleDownload"
              >
                💾 下载
              </button>
              <button
                class="btn-hand-drawn px-3 py-1 text-sm"
                @click="handleClose"
              >
                ✕ 关闭
              </button>
            </div>
          </div>

          <!-- 预览内容 -->
          <div class="flex-1 overflow-auto p-4">
            <!-- 加载中 -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center h-full">
              <div class="text-4xl mb-4">⏳</div>
              <p class="font-handwritten text-pencil/60">加载中...</p>
            </div>

            <!-- 加载错误 -->
            <div v-else-if="loadError" class="flex flex-col items-center justify-center h-full">
              <div class="text-4xl mb-4">❌</div>
              <p class="font-handwritten text-pencil/60">{{ loadError }}</p>
            </div>

            <!-- 图片预览 -->
            <div v-else-if="fileType === 'image'" class="flex items-center justify-center h-full">
              <img :src="fileUrl" :alt="file.name" class="max-w-full max-h-full object-contain" />
            </div>

            <!-- 视频预览 -->
            <div v-else-if="fileType === 'video'" class="flex items-center justify-center h-full">
              <video :src="fileUrl" controls class="max-w-full max-h-full">
                您的浏览器不支持视频播放
              </video>
            </div>

            <!-- 音频预览 -->
            <div v-else-if="fileType === 'audio'" class="flex items-center justify-center h-full">
              <audio :src="fileUrl" controls class="w-full max-w-md">
                您的浏览器不支持音频播放
              </audio>
            </div>

            <!-- PDF 预览 -->
            <div v-else-if="fileType === 'pdf'" class="h-full">
              <VueOfficePdf :src="fileUrl" />
            </div>

            <!-- Word 预览 -->
            <div v-else-if="fileType === 'docx'" class="h-full overflow-auto">
              <VueOfficeDocx :src="fileUrl" />
            </div>

            <!-- Excel 预览 -->
            <div v-else-if="fileType === 'xlsx'" class="h-full overflow-auto">
              <VueOfficeExcel :src="fileUrl" />
            </div>

            <!-- 文本预览 -->
            <div v-else-if="fileType === 'text'" class="h-full">
              <pre class="font-mono text-sm text-pencil whitespace-pre-wrap break-words p-4 bg-muted/20 rounded">{{ fileContent }}</pre>
            </div>

            <!-- 不支持预览 -->
            <div v-else class="flex flex-col items-center justify-center h-full">
              <div class="text-6xl mb-4">📄</div>
              <h3 class="font-handwritten text-xl text-pencil mb-2">无法预览此文件</h3>
              <p class="font-handwritten text-pencil/60 mb-4">
                文件类型：{{ file.mimeType }}
              </p>
              <button
                class="btn-hand-drawn px-4 py-2"
                @click="handleDownload"
              >
                💾 下载文件
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 确保预览内容不会溢出 */
.overflow-auto {
  scrollbar-width: thin;
  scrollbar-color: #ccc #f1f1f1;
}

.overflow-auto::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
</style>
