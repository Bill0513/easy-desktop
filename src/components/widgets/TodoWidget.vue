<script setup lang="ts">
import { ref } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { TodoWidget } from '@/types'

const props = defineProps<{
  widget: TodoWidget
}>()

const store = useDesktopStore()
const newItemText = ref('')

// 添加待办
const addItem = () => {
  const text = newItemText.value.trim()
  if (text) {
    store.addTodoItem(props.widget.id, text)
    newItemText.value = ''
  }
}

// 按回车添加
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    addItem()
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 待办列表 -->
    <div class="flex-1 overflow-auto space-y-2">
      <div
        v-for="item in widget.items"
        :key="item.id"
        class="flex items-center gap-2 group"
      >
        <!-- 复选框 -->
        <button
          class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
          :class="item.completed ? 'bg-accent border-accent' : 'border-pencil hover:bg-muted'"
          @click="store.toggleTodoItem(widget.id, item.id)"
        >
          <svg v-if="item.completed" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <!-- 文本 -->
        <span
          class="flex-1 font-handwritten text-lg break-all"
          :class="{ 'line-through text-pencil/40': item.completed }"
        >
          {{ item.text }}
        </span>

        <!-- 删除按钮 -->
        <button
          class="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-accent hover:bg-accent/20 rounded transition-all"
          @click="store.deleteTodoItem(widget.id, item.id)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 空状态 -->
      <div v-if="widget.items.length === 0" class="text-center text-pencil/40 py-4">
        <p class="font-handwritten">暂无待办事项</p>
      </div>
    </div>

    <!-- 添加输入框 -->
    <div class="mt-3 pt-3 border-t-2 border-dashed border-pencil/20">
      <div class="flex gap-2">
        <input
          v-model="newItemText"
          type="text"
          class="flex-1 input-hand-drawn text-base py-2"
          placeholder="添加新待办..."
          @keydown="handleKeydown"
        />
        <button
          class="btn-hand-drawn py-2 px-4 text-base"
          @click="addItem"
        >
          添加
        </button>
      </div>
    </div>
  </div>
</template>
