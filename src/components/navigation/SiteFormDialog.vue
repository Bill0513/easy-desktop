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
  category: '其他'
})

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
        category: props.site.category || '其他'
      }
    } else {
      // 新增模式
      formData.value = {
        name: '',
        url: '',
        description: '',
        color: PRESET_COLORS[0],
        category: '其他'
      }
    }
  }
})

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
    category: formData.value.category || '其他'
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
