<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { CheckInWidget, CheckInRecord } from '@/types'
import { Flame, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trophy } from 'lucide-vue-next'

const props = defineProps<{
  widget: CheckInWidget
}>()

const store = useDesktopStore()

// 当前查看的年月
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth()) // 0-11

// 获取今天的日期字符串 YYYY-MM-DD
const getTodayString = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

// 今天是否已打卡
const todayRecord = computed(() => {
  const today = getTodayString()
  return props.widget.checkInRecords.find(r => r.date === today)
})

const isTodayCheckedIn = computed(() => !!todayRecord.value)

// 点击日期打卡
const handleDayClick = (day: number | null) => {
  if (!day) return

  const year = currentYear.value
  const month = currentMonth.value
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // 只允许打卡今天
  const today = getTodayString()
  if (dateStr !== today) return

  // 如果今天已打卡，不重复打卡
  if (isTodayCheckedIn.value) return

  const newRecord: CheckInRecord = {
    date: dateStr,
    timestamp: Date.now()
  }

  const updatedRecords = [...props.widget.checkInRecords, newRecord]
  store.updateWidget(props.widget.id, { checkInRecords: updatedRecords })
}

// 计算连续打卡天数
const streakDays = computed(() => {
  const records = [...props.widget.checkInRecords].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  if (records.length === 0) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < records.length; i++) {
    const recordDate = new Date(records[i].date)
    recordDate.setHours(0, 0, 0, 0)

    const expectedDate = new Date(today)
    expectedDate.setDate(today.getDate() - streak)

    if (recordDate.getTime() === expectedDate.getTime()) {
      streak++
    } else {
      break
    }
  }

  return streak
})

// 总打卡天数
const totalDays = computed(() => props.widget.checkInRecords.length)

// 本月打卡天数
const currentMonthDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  return props.widget.checkInRecords.filter(r => {
    const date = new Date(r.date)
    return date.getFullYear() === year && date.getMonth() === month
  }).length
})

// 生成日历数据
const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value

  // 获取当月第一天是星期几（0-6，0是周日）
  const firstDay = new Date(year, month, 1).getDay()

  // 获取当月有多少天
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // 生成日历数组
  const days: Array<{ day: number | null; isCheckedIn: boolean; record?: CheckInRecord; isToday: boolean }> = []

  // 填充前面的空白
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: null, isCheckedIn: false, isToday: false })
  }

  const today = getTodayString()

  // 填充当月日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const record = props.widget.checkInRecords.find(r => r.date === dateStr)
    days.push({
      day,
      isCheckedIn: !!record,
      record,
      isToday: dateStr === today
    })
  }

  return days
})

// 上一月
const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

// 下一月
const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

// 月份名称
const monthName = computed(() => {
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  return months[currentMonth.value]
})

// 进度百分比
const progressPercent = computed(() => {
  if (!props.widget.goal) return 0
  return Math.min(100, Math.round((streakDays.value / props.widget.goal) * 100))
})
</script>

<template>
  <div class="h-full flex flex-col gap-3 overflow-y-auto">
    <!-- 日历 -->
    <div class="card-hand-drawn p-4 bg-bg-secondary">
      <!-- 统计信息 - 平铺成一行 -->
      <div class="flex items-center justify-around mb-4 pb-3 border-b-2 border-border-primary/10">
        <!-- 连续打卡 -->
        <div class="flex flex-col items-center gap-1">
          <Flame :size="20" :stroke-width="2.5" class="text-orange-600" />
          <span class="font-handwritten text-lg font-bold text-orange-600">{{ streakDays }}</span>
        </div>

        <!-- 总计打卡 -->
        <div class="flex flex-col items-center gap-1">
          <Trophy :size="20" :stroke-width="2.5" class="text-blue-600" />
          <span class="font-handwritten text-lg font-bold text-blue-600">{{ totalDays }}</span>
        </div>

        <!-- 本月打卡 -->
        <div class="flex flex-col items-center gap-1">
          <CalendarIcon :size="20" :stroke-width="2.5" class="text-green-600" />
          <span class="font-handwritten text-lg font-bold text-green-600">{{ currentMonthDays }}</span>
        </div>
      </div>

      <div class="flex items-center justify-between mb-3">
        <button
          @click="prevMonth"
          class="btn-hand-drawn px-2 py-1 bg-gray-100 text-text-primary text-sm flex items-center"
        >
          <ChevronLeft :size="16" :stroke-width="2.5" />
        </button>
        <div class="flex items-center gap-2 font-handwritten font-bold text-text-primary">
          <CalendarIcon :size="18" :stroke-width="2.5" />
          <span>{{ currentYear }} 年 {{ monthName }}</span>
        </div>
        <button
          @click="nextMonth"
          class="btn-hand-drawn px-2 py-1 bg-gray-100 text-text-primary text-sm flex items-center"
        >
          <ChevronRight :size="16" :stroke-width="2.5" />
        </button>
      </div>

      <!-- 星期标题 -->
      <div class="grid grid-cols-7 gap-1 mb-2">
        <div
          v-for="day in ['日', '一', '二', '三', '四', '五', '六']"
          :key="day"
          class="text-center text-xs font-handwritten text-text-secondary py-1"
        >
          {{ day }}
        </div>
      </div>

      <!-- 日期格子 -->
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="(item, index) in calendarDays"
          :key="index"
          class="aspect-square flex items-center justify-center text-sm font-handwritten relative"
          :class="[
            item.day ? 'cursor-pointer hover:bg-gray-100' : '',
            item.isCheckedIn ? 'bg-green-100 border-2 border-green-500 rounded-lg' : 'border border-gray-300 rounded-lg',
            item.isToday && !item.isCheckedIn ? 'hover:bg-yellow-100' : ''
          ]"
          @click="handleDayClick(item.day)"
        >
          <span v-if="item.day" :class="item.isCheckedIn ? 'font-bold text-green-700' : 'text-text-primary'">
            {{ item.day }}
          </span>
          <span v-if="item.isCheckedIn" class="absolute top-0 right-0 text-xs">✓</span>
          <!-- 今天未打卡显示红色小圆点 -->
          <span v-if="item.isToday && !item.isCheckedIn" class="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </div>
      </div>

      <!-- 目标进度条 -->
      <div v-if="widget.goal" class="mt-4 pt-3 border-t-2 border-border-primary/10">
        <div class="flex justify-between text-xs font-handwritten text-text-secondary mb-1">
          <span>目标进度</span>
          <span>{{ streakDays }} / {{ widget.goal }} 天</span>
        </div>
        <div class="w-full h-4 bg-gray-200 rounded-full overflow-hidden border-2 border-border-primary">
          <div
            class="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
        <div class="text-center text-xs font-handwritten text-text-secondary mt-1">
          {{ progressPercent }}%
        </div>
      </div>
    </div>
  </div>
</template>
