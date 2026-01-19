<script setup lang="ts">
import { ref } from 'vue'
import Toast, { type ToastProps } from './Toast.vue'

export interface ToastItem extends ToastProps {
  id: string
}

const toasts = ref<ToastItem[]>([])

// 添加 toast
function addToast(toast: Omit<ToastItem, 'id'>) {
  const id = `toast-${Date.now()}-${Math.random()}`
  toasts.value.push({ ...toast, id })
}

// 移除 toast
function removeToast(id: string) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

// 暴露方法给外部调用
defineExpose({
  addToast,
})
</script>

<template>
  <div class="fixed top-20 right-4 z-[10001] flex flex-col gap-3 pointer-events-none">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto"
    >
      <Toast
        :id="toast.id"
        :message="toast.message"
        :type="toast.type"
        :duration="toast.duration"
        @close="removeToast"
      />
    </div>
  </div>
</template>
