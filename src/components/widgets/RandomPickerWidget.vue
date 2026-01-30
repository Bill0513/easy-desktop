<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { RandomPickerWidget } from '@/types'

const props = defineProps<{
  widget: RandomPickerWidget
}>()

const store = useDesktopStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isSpinning = ref(false)
const currentRotation = ref(0)
const showResult = ref(false)
const resultText = ref('')
const showOptionsDialog = ref(false)
const newOption = ref('')
const editingOptions = ref<string[]>([])

// 马卡龙色系
const WHEEL_COLORS = [
  '#FFB3BA', // 粉红
  '#BAFFC9', // 薄荷绿
  '#BAE1FF', // 天蓝
  '#FFFFBA', // 柠檬黄
  '#FFD9BA', // 杏色
  '#E0BBE4', // 淡紫
  '#C9C9FF', // 淡蓝紫
  '#FFDFBA', // 浅橙
]

// 获取选项对应的颜色
const getColor = (index: number) => {
  return WHEEL_COLORS[index % WHEEL_COLORS.length]
}

// 绘制手绘风格的转盘
const drawWheel = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const options = props.widget.options
  if (options.length === 0) return

  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const radius = Math.min(centerX, centerY) - 10

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 保存状态并应用旋转
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate((currentRotation.value * Math.PI) / 180)
  ctx.translate(-centerX, -centerY)

  const sliceAngle = (2 * Math.PI) / options.length

  // 绘制每个扇形
  options.forEach((option, index) => {
    const startAngle = index * sliceAngle - Math.PI / 2
    const endAngle = startAngle + sliceAngle

    // 绘制扇形
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, startAngle, endAngle)
    ctx.closePath()

    // 填充颜色
    ctx.fillStyle = getColor(index)
    ctx.fill()

    // 手绘风格边框
    ctx.strokeStyle = 'var(--color-border-primary)' in document.documentElement.style
      ? getComputedStyle(document.documentElement).getPropertyValue('--color-border-primary').trim() || '#2d2d2d'
      : '#2d2d2d'
    ctx.lineWidth = 2
    ctx.stroke()

    // 绘制文字
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(startAngle + sliceAngle / 2)

    // 文字位置
    const textRadius = radius * 0.65
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'var(--color-text-primary)' in document.documentElement.style
      ? getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim() || '#2d2d2d'
      : '#2d2d2d'
    ctx.font = '14px "Patrick Hand", cursive'

    // 截断过长的文字
    const maxLength = 8
    const displayText = option.length > maxLength
      ? option.substring(0, maxLength) + '...'
      : option

    ctx.fillText(displayText, textRadius, 0)
    ctx.restore()
  })

  // 绘制中心圆
  ctx.beginPath()
  ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI)
  ctx.fillStyle = 'var(--color-bg-primary)' in document.documentElement.style
    ? getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary').trim() || '#fdfbf7'
    : '#fdfbf7'
  ctx.fill()
  ctx.strokeStyle = 'var(--color-border-primary)' in document.documentElement.style
    ? getComputedStyle(document.documentElement).getPropertyValue('--color-border-primary').trim() || '#2d2d2d'
    : '#2d2d2d'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.restore()

  // 绘制指针（不随转盘旋转）
  drawPointer(ctx, centerX, 10)
}

// 绘制指针
const drawPointer = (ctx: CanvasRenderingContext2D, centerX: number, topY: number) => {
  ctx.beginPath()
  ctx.moveTo(centerX, topY + 25)
  ctx.lineTo(centerX - 12, topY)
  ctx.lineTo(centerX + 12, topY)
  ctx.closePath()
  ctx.fillStyle = '#ff4d4d'
  ctx.fill()
  ctx.strokeStyle = 'var(--color-border-primary)' in document.documentElement.style
    ? getComputedStyle(document.documentElement).getPropertyValue('--color-border-primary').trim() || '#2d2d2d'
    : '#2d2d2d'
  ctx.lineWidth = 2
  ctx.stroke()
}

// 缓动函数（先快后慢）
const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3)
}

// 开始旋转
const spin = () => {
  if (isSpinning.value || props.widget.options.length < 2) return

  isSpinning.value = true
  showResult.value = false

  // 随机选择结果
  const options = props.widget.options
  const resultIndex = Math.floor(Math.random() * options.length)
  resultText.value = options[resultIndex]

  // 计算目标角度
  // 每个选项占的角度
  const sliceAngle = 360 / options.length
  // 目标选项的中心角度（从顶部开始，顺时针）
  const targetAngle = resultIndex * sliceAngle + sliceAngle / 2

  // 归一化当前角度到 0-360 范围
  const normalizedCurrent = currentRotation.value % 360

  // 旋转多圈后停在目标位置
  // 增加随机性：8-15圈，并且在目标角度附近随机偏移
  const extraRotations = 8 + Math.floor(Math.random() * 8)
  const angleOffset = (Math.random() - 0.5) * (sliceAngle * 0.3) // 在扇形范围内随机偏移
  const totalRotation = extraRotations * 360 + (360 - normalizedCurrent) + (360 - targetAngle) + angleOffset

  const startRotation = currentRotation.value
  const duration = 4000 // 4秒
  const startTime = Date.now()

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeOutCubic(progress)

    currentRotation.value = startRotation + totalRotation * easedProgress

    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      // 动画结束
      isSpinning.value = false
      showResult.value = true
      // 保存结果
      store.updateWidget(props.widget.id, { lastResult: resultText.value })
    }
  }

  requestAnimationFrame(animate)
}

// 打开选项编辑对话框
const openOptionsDialog = () => {
  editingOptions.value = [...props.widget.options]
  newOption.value = ''
  showOptionsDialog.value = true
}

// 添加选项
const addOption = () => {
  if (newOption.value.trim()) {
    editingOptions.value.push(newOption.value.trim())
    newOption.value = ''
  }
}

// 删除选项
const removeOption = (index: number) => {
  editingOptions.value.splice(index, 1)
}

// 保存选项
const saveOptions = () => {
  store.updateWidget(props.widget.id, { options: editingOptions.value })
  showOptionsDialog.value = false
}

// 取消编辑
const cancelEdit = () => {
  showOptionsDialog.value = false
}

// 监听选项变化重绘
watch(
  () => props.widget.options,
  () => {
    nextTick(() => drawWheel())
  },
  { deep: true }
)

// 监听旋转角度变化重绘
watch(currentRotation, () => {
  drawWheel()
})

// 初始化
onMounted(() => {
  nextTick(() => drawWheel())
})

// 计算是否可以旋转
const canSpin = computed(() => {
  return props.widget.options.length >= 2 && !isSpinning.value
})
</script>

<template>
  <div class="h-full flex flex-col items-center justify-between py-2">
    <!-- 转盘区域 -->
    <div class="relative flex-1 flex items-center justify-center w-full">
      <canvas
        ref="canvasRef"
        width="240"
        height="240"
        class="max-w-full max-h-full"
      />

      <!-- 无选项提示 -->
      <div
        v-if="widget.options.length === 0"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="text-center text-text-secondary font-handwritten">
          <p>还没有选项</p>
          <p class="text-sm">点击下方按钮添加</p>
        </div>
      </div>

      <!-- 选项不足提示 -->
      <div
        v-else-if="widget.options.length === 1"
        class="absolute bottom-2 left-0 right-0 text-center text-xs text-text-secondary font-handwritten"
      >
        至少需要2个选项才能开始
      </div>
    </div>

    <!-- 结果显示 -->
    <div
      v-if="showResult || widget.lastResult"
      class="text-center py-2 px-4 bg-muted/30 rounded-lg mb-2 w-full"
    >
      <div class="text-lg text-text-secondary font-handwritten">
        {{ showResult ? '本次结果' : '上次结果' }}
      </div>
      <div class="text-lg font-bold font-handwritten text-bluePen">
        {{ showResult ? resultText : widget.lastResult }}
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex gap-2 w-full justify-center">
      <button
        class="px-4 py-2 font-handwritten rounded border-2 border-border-primary transition-all flex items-center gap-1 text-text-primary"
        :class="canSpin
          ? 'bg-bluePen text-white hover:bg-bluePen/80 cursor-pointer'
          : 'bg-muted/50 text-text-secondary cursor-not-allowed'"
        :disabled="!canSpin"
        @click="spin"
      >
        <svg class="w-4 h-4" :class="{ 'animate-spin': isSpinning }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{{ isSpinning ? '旋转中...' : '开始' }}</span>
      </button>

      <button
        class="px-3 py-2 font-handwritten rounded border-2 border-border-primary hover:bg-muted/50 transition-colors text-text-primary"
        @click="openOptionsDialog"
        :disabled="isSpinning"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    </div>

    <!-- 选项编辑对话框 -->
    <Teleport to="body">
      <div
        v-if="showOptionsDialog"
        class="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]"
        @click.self="cancelEdit"
      >
        <div class="card-hand-drawn bg-bg-primary p-4 w-80 max-h-[80vh] flex flex-col">
          <h3 class="font-handwritten text-lg font-bold mb-3 text-center text-text-primary">编辑选项</h3>

          <!-- 选项列表 -->
          <div class="flex-1 overflow-auto mb-3 max-h-48">
            <div
              v-for="(option, index) in editingOptions"
              :key="index"
              class="flex items-center gap-2 py-1 px-2 hover:bg-muted/30 rounded group"
            >
              <div
                class="w-4 h-4 rounded-full flex-shrink-0"
                :style="{ backgroundColor: getColor(index) }"
              />
              <span class="flex-1 font-handwritten truncate text-text-primary">{{ option }}</span>
              <button
                class="text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                @click="removeOption(index)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div v-if="editingOptions.length === 0" class="text-center text-text-secondary font-handwritten py-4">
              暂无选项
            </div>
          </div>

          <!-- 添加新选项 -->
          <div class="flex gap-2 mb-3">
            <input
              v-model="newOption"
              type="text"
              class="flex-1 px-3 py-1.5 border-2 border-border-primary rounded font-handwritten outline-none focus:border-bluePen bg-bg-secondary text-text-primary"
              placeholder="输入新选项..."
              @keydown.enter="addOption"
            />
            <button
              class="px-3 py-1.5 bg-bluePen text-white font-handwritten rounded border-2 border-border-primary hover:bg-bluePen/80"
              @click="addOption"
            >
              添加
            </button>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-2 justify-end">
            <button
              class="px-4 py-1.5 font-handwritten rounded border-2 border-border-primary hover:bg-muted/50 text-text-primary"
              @click="cancelEdit"
            >
              取消
            </button>
            <button
              class="px-4 py-1.5 bg-bluePen text-white font-handwritten rounded border-2 border-border-primary hover:bg-bluePen/80"
              @click="saveOptions"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
canvas {
  image-rendering: -webkit-optimize-contrast;
}
</style>
