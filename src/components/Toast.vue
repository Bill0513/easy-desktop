<script setup lang="ts">
import { ref, onMounted } from 'vue'

export interface ToastProps {
  id: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  duration?: number
}

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  duration: 3000,
})

const emit = defineEmits<{
  close: [id: string]
}>()

const isVisible = ref(false)

// 图标映射
const icons = {
  info: 'ℹ️',
  success: '✓',
  warning: '⚠',
  error: '✗',
}

// 颜色映射
const colors = {
  info: 'bg-blue-100 border-blue-400 text-blue-800',
  success: 'bg-green-100 border-green-400 text-green-800',
  warning: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  error: 'bg-red-100 border-red-400 text-red-800',
}

onMounted(() => {
  // 进入动画
  setTimeout(() => {
    isVisible.value = true
  }, 10)

  // 自动关闭
  if (props.duration > 0) {
    setTimeout(() => {
      handleClose()
    }, props.duration)
  }
})

function handleClose() {
  isVisible.value = false
  setTimeout(() => {
    emit('close', props.id)
  }, 300)
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-x-full opacity-0"
    enter-to-class="transform translate-x-0 opacity-100"
    leave-active-class="transition duration-300 ease-in"
    leave-from-class="transform translate-x-0 opacity-100"
    leave-to-class="transform translate-x-full opacity-0"
  >
    <div
      v-if="isVisible"
      class="flex items-center gap-3 px-4 py-3 border-2 rounded-lg shadow-hand-drawn min-w-[280px] max-w-md"
      :class="colors[type]"
      style="border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;"
    >
      <!-- 图标 -->
      <span class="text-2xl flex-shrink-0">{{ icons[type] }}</span>

      <!-- 消息 -->
      <p class="font-handwritten text-sm flex-1">{{ message }}</p>

      <!-- 关闭按钮 -->
      <button
        @click="handleClose"
        class="flex-shrink-0 text-lg hover:scale-110 transition-transform"
        :class="type === 'error' ? 'text-red-600' : 'text-gray-600'"
      >
        ✕
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.shadow-hand-drawn {
  box-shadow: 3px 3px 0px currentColor;
}
</style>
