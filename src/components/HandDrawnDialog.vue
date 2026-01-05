<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  show: boolean
  title: string
  message?: string
  type?: 'prompt' | 'confirm' | 'alert'
  defaultValue?: string
  confirmText?: string
  cancelText?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'alert',
  defaultValue: '',
  confirmText: '确定',
  cancelText: '取消'
})

const emit = defineEmits<{
  close: []
  confirm: [value?: string]
  cancel: []
}>()

const inputValue = ref(props.defaultValue)

// 监听 show 变化，重置输入值
watch(() => props.show, (newShow) => {
  if (newShow && props.type === 'prompt') {
    inputValue.value = props.defaultValue
  }
})

const handleConfirm = () => {
  if (props.type === 'prompt') {
    emit('confirm', inputValue.value)
  } else {
    emit('confirm')
  }
  emit('close')
}

const handleCancel = () => {
  emit('cancel')
  emit('close')
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
        v-if="show"
        class="fixed inset-0 z-[10001] flex items-center justify-center bg-pencil/50"
        @click.self="handleCancel"
      >
        <div
          class="card-hand-drawn p-6 max-w-md w-full mx-4 bg-paper"
          style="box-shadow: 8px 8px 0px #2d2d2d;"
        >
          <!-- 标题 -->
          <h2 class="font-handwritten text-2xl text-pencil mb-4">
            {{ title }}
          </h2>

          <!-- 消息 -->
          <p v-if="message" class="font-handwritten text-pencil/80 mb-4">
            {{ message }}
          </p>

          <!-- 输入框（仅 prompt 类型） -->
          <input
            v-if="type === 'prompt'"
            v-model="inputValue"
            type="text"
            class="input-hand-drawn w-full px-4 py-2 mb-4"
            @keydown.enter="handleConfirm"
            @keydown.esc="handleCancel"
            autofocus
          />

          <!-- 按钮 -->
          <div class="flex gap-3">
            <button
              v-if="type !== 'alert'"
              class="btn-hand-drawn flex-1 px-4 py-2"
              @click="handleCancel"
            >
              {{ cancelText }}
            </button>
            <button
              class="btn-hand-drawn flex-1 px-4 py-2"
              :class="{ 'bg-accent text-paper': type === 'confirm' }"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
