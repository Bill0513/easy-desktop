<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { CountdownWidget } from '@/types'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const props = defineProps<{
  widget: CountdownWidget
}>()

const store = useDesktopStore()
const isEditingDate = ref(false)
const isEditingDescription = ref(false)
const descriptionInput = ref<HTMLTextAreaElement | null>(null)

// 计算剩余天数
const daysRemaining = computed(() => {
  if (!props.widget.targetDate) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const target = new Date(props.widget.targetDate)
  target.setHours(0, 0, 0, 0)

  const diffTime = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
})

// 是否已到期
const isExpired = computed(() => {
  return daysRemaining.value !== null && daysRemaining.value < 0
})

// 是否是今天
const isToday = computed(() => {
  return daysRemaining.value === 0
})

// 格式化目标日期显示
const formattedDate = computed(() => {
  if (!props.widget.targetDate) return '未设置'

  const date = new Date(props.widget.targetDate)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
})

// 更新目标日期
const updateTargetDate = (date: Date | null) => {
  if (date) {
    const dateStr = date.toISOString().split('T')[0]
    store.updateWidget(props.widget.id, { targetDate: dateStr })
  }
  isEditingDate.value = false
}

// 更新描述
const updateDescription = () => {
  store.save()
  isEditingDescription.value = false
}

// 开始编辑描述
const startEditDescription = () => {
  isEditingDescription.value = true
  setTimeout(() => {
    descriptionInput.value?.focus()
  }, 0)
}

// 定时刷新（每分钟更新一次，确保跨天时更新）
let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  refreshTimer = setInterval(() => {
    // 触发重新计算
  }, 60000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 倒计时显示区域 -->
    <div
      class="flex-1 flex flex-col items-center justify-center text-center"
      :class="{ 'text-accent': isExpired }"
    >
      <!-- 剩余天数 -->
      <div v-if="widget.targetDate" class="mb-2">
        <template v-if="isExpired">
          <div class="text-5xl font-bold font-handwritten text-accent">已到期</div>
          <div class="text-lg font-handwritten text-accent/70 mt-1">
            已过去 {{ Math.abs(daysRemaining!) }} 天
          </div>
        </template>
        <template v-else-if="isToday">
          <div class="text-5xl font-bold font-handwritten text-bluePen">今天</div>
          <div class="text-lg font-handwritten text-pencil/70 mt-1">就是今天！</div>
        </template>
        <template v-else>
          <div class="text-6xl font-bold font-handwritten text-bluePen">{{ daysRemaining }}</div>
          <div class="text-lg font-handwritten text-pencil/70 mt-1">天</div>
        </template>
      </div>
      <div v-else class="text-2xl font-handwritten text-pencil/50">
        点击下方设置日期
      </div>

      <!-- 目标日期 -->
      <div class="mt-4 text-sm font-handwritten text-pencil/60">
        {{ formattedDate }}
      </div>
    </div>

    <!-- 描述区域 -->
    <div class="mt-2 border-t border-pencil/20 pt-2">
      <div
        v-if="!isEditingDescription"
        class="text-sm font-handwritten text-pencil/70 cursor-pointer hover:text-pencil min-h-[24px] px-1"
        @dblclick="startEditDescription"
        :title="widget.description ? '双击编辑' : '双击添加备注'"
      >
        {{ widget.description || '双击添加备注...' }}
      </div>
      <textarea
        v-else
        ref="descriptionInput"
        v-model="widget.description"
        class="w-full text-sm font-handwritten bg-white/50 border border-pencil/30 rounded px-2 py-1 outline-none focus:border-bluePen resize-none"
        rows="2"
        placeholder="添加备注..."
        @blur="updateDescription"
        @keydown.enter.prevent="updateDescription"
      />
    </div>

    <!-- 日期选择器 -->
    <div class="mt-2 flex justify-center">
      <VueDatePicker
        :model-value="widget.targetDate ? new Date(widget.targetDate) : null"
        @update:model-value="updateTargetDate"
        :enable-time-picker="false"
        auto-apply
        :format="'yyyy-MM-dd'"
        placeholder="选择目标日期"
        :teleport="true"
      >
        <template #trigger>
          <button
            class="px-3 py-1.5 text-sm font-handwritten rounded border-2 border-pencil hover:bg-muted/50 transition-colors flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{{ widget.targetDate ? '修改日期' : '设置日期' }}</span>
          </button>
        </template>
      </VueDatePicker>
    </div>
  </div>
</template>

<style scoped>
/* 自定义日期选择器样式以匹配手绘风格 */
:deep(.dp__theme_light) {
  --dp-background-color: #fdfbf7;
  --dp-text-color: #2d2d2d;
  --dp-hover-color: #f0ebe3;
  --dp-hover-text-color: #2d2d2d;
  --dp-primary-color: #4d7cff;
  --dp-primary-text-color: #fff;
  --dp-secondary-color: #f0ebe3;
  --dp-border-color: #2d2d2d;
  --dp-menu-border-color: #2d2d2d;
  --dp-border-color-hover: #4d7cff;
  --dp-font-family: 'Patrick Hand', cursive;
}

:deep(.dp__input) {
  font-family: 'Patrick Hand', cursive;
  border-radius: 125px 15px 125px 15px / 15px 125px 15px 125px;
  border-width: 2px;
}

:deep(.dp__menu) {
  border-radius: 15px;
  border-width: 2px;
  box-shadow: 4px 4px 0px #2d2d2d;
}
</style>
