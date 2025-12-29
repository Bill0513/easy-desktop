<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { NavigationSite } from '@/types'

const props = defineProps<{
  show: boolean
  site?: NavigationSite  // 如果有，表示编辑模式
}>()

const emit = defineEmits<{
  close: []
  submit: [data: {
    name: string
    url: string
    description: string
    color: string
    category?: string
    icon?: string
  }]
}>()

const store = useDesktopStore()
// 预制颜色
const PRESET_COLORS = [
  '#ff4d4d',  // 红色
  '#4d7cff',  // 蓝色
  '#4dff88',  // 绿色
  '#ffa64d',  // 橙色
  '#ff4dff',  // 紫色
  '#4dffff',  // 青色
  '#ffeb3b',  // 黄色
  '#e91e63',  // 粉红
  '#9c27b0',  // 深紫
  '#00bcd4',  // 天蓝
  '#8bc34a',  // 浅绿
  '#ff9800',  // 深橙
  '#795548',  // 棕色
  '#607d8b',  // 蓝灰
  '#f44336',  // 深红
  '#3f51b5',  // 靛蓝
]

// 表单数据
const formData = ref({
  name: '',
  url: '',
  description: '',
  color: PRESET_COLORS[0],
  category: '其他',
  icon: undefined as string | undefined
})

// 是否正在获取图标
const isFetchingIcon = ref(false)
// 获取图标的结果提示
const iconFetchResult = ref<'success' | 'error' | null>(null)

// 监听 props 变化，初始化表单
watch(() => props.show, (show) => {
  if (show) {
    if (props.site) {
      // 编辑模式
      formData.value = {
        name: props.site.name,
        url: props.site.url,
        description: props.site.description,
        color: props.site.color,
        category: props.site.category || '其他',
        icon: props.site.icon
      }
    } else {
      // 新增模式
      formData.value = {
        name: '',
        url: '',
        description: '',
        color: PRESET_COLORS[0],
        category: '其他',
        icon: undefined
      }
    }
  }
})

// 获取网站图标
const fetchIcon = async () => {
  if (!formData.value.url.trim()) {
    return
  }

  isFetchingIcon.value = true
  iconFetchResult.value = null

  try {
    // 规范化 URL
    let url = formData.value.url.trim()
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url
    }

    const urlObj = new URL(url)
    const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`

    // 检查 favicon 是否存在
    const response = await fetch(faviconUrl, { method: 'HEAD' })
    if (response.ok) {
      formData.value.icon = faviconUrl
      iconFetchResult.value = 'success'
    } else {
      iconFetchResult.value = 'error'
    }
  } catch (error) {
    console.error('Failed to fetch icon:', error)
    iconFetchResult.value = 'error'
  } finally {
    isFetchingIcon.value = false
    // 3秒后清除提示
    setTimeout(() => {
      iconFetchResult.value = null
    }, 3000)
  }
}

// 提交表单
const handleSubmit = () => {
  if (!formData.value.name.trim() || !formData.value.url.trim()) {
    return
  }

  // 规范化 URL，确保包含协议
  let url = formData.value.url.trim()
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url
  }

  emit('submit', {
    name: formData.value.name.trim(),
    url: url,
    description: formData.value.description.trim(),
    color: formData.value.color,
    category: formData.value.category || '其他',
    icon: formData.value.icon
  })
}

// 关闭弹窗
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
        @click="handleClose"
      >
        <div
          class="card-hand-drawn p-6 max-w-md w-full mx-4"
          @click.stop
        >
          <h3 class="font-handwritten text-xl font-medium mb-4">
            {{ site ? '编辑网站' : '添加网站' }}
          </h3>

          <div class="space-y-4">
            <!-- 网站名称 -->
            <div>
              <label class="block font-handwritten text-sm mb-1">网站名称 *</label>
              <input
                v-model="formData.name"
                type="text"
                class="input-hand-drawn w-full"
                placeholder="例如：GitHub"
                maxlength="20"
              />
            </div>

            <!-- 网站URL -->
            <div>
              <label class="block font-handwritten text-sm mb-1">网站地址 *</label>
              <input
                v-model="formData.url"
                type="url"
                class="input-hand-drawn w-full"
                placeholder="https://github.com"
              />
            </div>

            <!-- 网站图标 -->
            <div>
              <label class="block font-handwritten text-sm mb-2">网站图标</label>
              <div class="flex items-center gap-3">
                <!-- 图标预览 -->
                <div
                  class="w-16 h-16 border-2 border-pencil rounded-lg flex items-center justify-center overflow-hidden"
                  style="border-radius: 125px 15px 125px 15px / 15px 125px 15px 125px; box-shadow: 2px 2px 0px #2d2d2d;"
                >
                  <img
                    v-if="formData.icon"
                    :src="formData.icon"
                    alt="图标"
                    class="w-full h-full object-cover"
                    @error="formData.icon = undefined"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-white font-handwritten text-xl font-bold"
                    :style="{ backgroundColor: formData.color }"
                  >
                    {{ formData.name.charAt(0).toUpperCase() || '?' }}
                  </div>
                </div>
                <!-- 获取图标按钮 -->
                <div class="flex-1">
                  <button
                    type="button"
                    class="btn-hand-drawn px-4 py-2 text-sm flex items-center gap-2"
                    :disabled="!formData.url.trim() || isFetchingIcon"
                    @click="fetchIcon"
                  >
                    <svg v-if="!isFetchingIcon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span v-if="isFetchingIcon">获取中...</span>
                    <span v-else>获取图标</span>
                  </button>
                  <!-- 状态提示 -->
                  <p v-if="iconFetchResult === 'success'" class="text-xs text-green-600 mt-2 font-handwritten">
                    ✓ 获取成功
                  </p>
                  <p v-else-if="iconFetchResult === 'error'" class="text-xs text-accent mt-2 font-handwritten">
                    ✗ 获取失败
                  </p>
                  <p v-else class="text-xs text-pencil/60 mt-2 font-handwritten">
                    {{ formData.icon ? '已获取图标' : '未获取图标，将使用预制颜色' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 网站描述 -->
            <div>
              <label class="block font-handwritten text-sm mb-1">网站描述</label>
              <textarea
                v-model="formData.description"
                class="input-hand-drawn w-full resize-none"
                rows="2"
                placeholder="简单描述这个网站..."
                maxlength="100"
              />
            </div>

            <!-- 预制颜色 -->
            <div>
              <label class="block font-handwritten text-sm mb-2">预制颜色（图标获取失败时使用）</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="color in PRESET_COLORS"
                  :key="color"
                  class="w-10 h-10 rounded-lg border-2 transition-all"
                  :class="formData.color === color ? 'border-pencil scale-110' : 'border-pencil/30'"
                  :style="{ backgroundColor: color }"
                  @click="formData.color = color"
                />
              </div>
            </div>

            <!-- 分类 -->
            <div>
              <label class="block font-handwritten text-sm mb-1">分类</label>
              <select
                v-model="formData.category"
                class="input-hand-drawn w-full"
              >
                <option v-for="category in store.navigationCategories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </div>
          </div>

          <!-- 按钮 -->
          <div class="flex justify-end gap-3 mt-6">
            <button
              class="px-4 py-2 font-handwritten text-sm border-2 border-pencil rounded-lg hover:bg-muted/50 transition-colors"
              @click="handleClose"
            >
              取消
            </button>
            <button
              class="btn-hand-drawn px-4 py-2 text-sm"
              :disabled="!formData.name.trim() || !formData.url.trim()"
              @click="handleSubmit"
            >
              {{ site ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
