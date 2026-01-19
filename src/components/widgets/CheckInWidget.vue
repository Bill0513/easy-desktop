<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { CheckInWidget, CheckInRecord } from '@/types'

const props = defineProps<{
  widget: CheckInWidget
}>()

const store = useDesktopStore()

// 当前查看的年月
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth()) // 0-11

// 备注编辑状态
const editingNote = ref(false)
const noteText = ref('')

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

// 打卡
const checkIn = () => {
  if (isTodayCheckedIn.value) return

  const today = getTodayString()
  const newRecord: CheckInRecord = {
    date: today,
    timestamp: Date.now(),
    note: noteText.value.trim() || undefined
  }

  const updatedRecords = [...props.widget.checkInRecords, newRecord]
  store.updateWidget(props.widget.id, { checkInRecords: updatedRecords })

  noteText.value = ''
  editingNote.value = false
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
  const days: Array<{ day: number | null; isCheckedIn: boolean; record?: CheckInRecord }> = []

  // 填充前面的空白
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: null, isCheckedIn: false })
  }

  // 填充当月日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const record = props.widget.checkInRecords.find(r => r.date === dateStr)
    days.push({
      day,
      isCheckedIn: !!record,
      record
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

// 显示日期的备注
const showingNote = ref<CheckInRecord | null>(null)

const showNote = (record?: CheckInRecord) => {
  if (record?.note) {
    showingNote.value = record
  }
}

const hideNote = () => {
  showingNote.value = null
}
</script>

<template>
  <div class="h-full flex flex-col gap-3 overflow-y-auto">
    <!-- 今日打卡区域 -->
    <div class="card-hand-drawn p-4 bg-blue-50">
      <div class="flex items-center justify-between mb-2">
        <span class="font-handwritten text-sm text-pencil/60">
          今天：{{ getTodayString() }}
        </span>
        <span v-if="isTodayCheckedIn" class="text-2xl">✓</span>
      </div>

      <div v-if="isTodayCheckedIn" class="text-center">
        <div class="text-green-600 font-handwritten text-lg mb-1">已打卡</div>
        <div class="text-xs text-gray-500 font-handwritten">
          {{ new Date(todayRecord!.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
        </div>
        <div v-if="todayRecord!.note" class="mt-2 text-sm text-gray-600 font-handwritten italic">
          "{{ todayRecord!.note }}"
        </div>
      </div>

      <div v-else>
        <button
          @click="editingNote = !editingNote"
          class="btn-hand-drawn w-full py-2 bg-green-100 text-pencil mb-2"
        >
          {{ editingNote ? '取消' : '✓ 打卡' }}
        </button>

        <div v-if="editingNote" class="space-y-2">
          <textarea
            v-model="noteText"
            placeholder="添加今日备注（可选）"
            class="input-hand-drawn w-full px-3 py-2 bg-white text-sm"
            rows="2"
          ></textarea>
          <button
            @click="checkIn"
            class="btn-hand-drawn w-full py-2 bg-blue-100 text-pencil"
          >
            确认打卡
          </button>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="card-hand-drawn p-4 bg-yellow-50">
      <div class="text-sm font-handwritten text-pencil/80 mb-2">📊 统计</div>
      <div class="space-y-1 text-sm font-handwritten">
        <div class="flex justify-between">
          <span>连续打卡：</span>
          <span class="font-bold text-orange-600">{{ streakDays }} 天</span>
        </div>
        <div class="flex justify-between">
          <span>总计打卡：</span>
          <span class="font-bold text-blue-600">{{ totalDays }} 天</span>
        </div>
        <div class="flex justify-between">
          <span>本月打卡：</span>
          <span class="font-bold text-green-600">{{ currentMonthDays }} 天</span>
        </div>
      </div>

      <!-- 目标进度条 -->
      <div v-if="widget.goal" class="mt-3">
        <div class="flex justify-between text-xs font-handwritten text-pencil/60 mb-1">
          <span>目标进度</span>
          <span>{{ streakDays }} / {{ widget.goal }} 天</span>
        </div>
        <div class="w-full h-4 bg-gray-200 rounded-full overflow-hidden border-2 border-pencil">
          <div
            class="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
        <div class="text-center text-xs font-handwritten text-pencil/60 mt-1">
          {{ progressPercent }}%
        </div>
      </div>
    </div>

    <!-- 日历 -->
    <div class="card-hand-drawn p-4 bg-white">
      <div class="flex items-center justify-between mb-3">
        <button
          @click="prevMonth"
          class="btn-hand-drawn px-3 py-1 bg-gray-100 text-pencil text-sm"
        >
          ◀
        </button>
        <span class="font-handwritten font-bold text-pencil">
          {{ currentYear }} 年 {{ monthName }}
        </span>
        <button
          @click="nextMonth"
          class="btn-hand-drawn px-3 py-1 bg-gray-100 text-pencil text-sm"
        >
          ▶
        </button>
      </div>

      <!-- 星期标题 -->
      <div class="grid grid-cols-7 gap-1 mb-2">
        <div
          v-for="day in ['日', '一', '二', '三', '四', '五', '六']"
          :key="day"
          class="text-center text-xs font-handwritten text-pencil/60 py-1"
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
            item.isCheckedIn ? 'bg-green-100 border-2 border-green-500 rounded-lg' : 'border border-gray-300 rounded-lg'
          ]"
          @mouseenter="showNote(item.record)"
          @mouseleave="hideNote"
        >
          <span v-if="item.day" :class="item.isCheckedIn ? 'font-bold text-green-700' : 'text-gray-700'">
            {{ item.day }}
          </span>
          <span v-if="item.isCheckedIn" class="absolute top-0 right-0 text-xs">✓</span>
        </div>
      </div>

      <!-- 备注提示 -->
      <div
        v-if="showingNote"
        class="mt-3 p-2 bg-yellow-50 border-2 border-yellow-300 rounded-lg text-sm font-handwritten text-gray-700"
      >
        <div class="font-bold mb-1">{{ showingNote.date }}</div>
        <div class="italic">"{{ showingNote.note }}"</div>
      </div>
    </div>
  </div>
</template>
