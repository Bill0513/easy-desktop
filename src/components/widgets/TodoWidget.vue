<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import draggable from 'vuedraggable'
import type { TodoWidget, TodoItem } from '@/types'

const props = defineProps<{
  widget: TodoWidget
}>()

const store = useDesktopStore()
const newItemText = ref('')
const editingItemId = ref<string | null>(null)
const editingText = ref('')
const editInput = ref<HTMLTextAreaElement | null>(null)

// 输入法组合状态
const isComposing = ref(false)
const isEditComposing = ref(false)

// 拖拽状态
const isDragging = ref(false)

// 使用计算属性来实现双向绑定
const todoItems = computed({
  get: () => props.widget.items,
  set: (value: TodoItem[]) => {
    store.reorderTodoItems(props.widget.id, value)
  }
})

// 添加待办
const addItem = () => {
  const text = newItemText.value.trim()
  if (text) {
    store.addTodoItem(props.widget.id, text)
    newItemText.value = ''
  }
}

// 按回车添加（需要检查输入法状态）
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !isComposing.value) {
    e.preventDefault()
    addItem()
  }
}

// 输入法开始组合
const handleCompositionStart = () => {
  isComposing.value = true
}

// 输入法结束组合
const handleCompositionEnd = () => {
  isComposing.value = false
}

// 开始编辑待办项
const startEditItem = (itemId: string, currentText: string) => {
  editingItemId.value = itemId
  editingText.value = currentText
  nextTick(() => {
    editInput.value?.focus()
    editInput.value?.select()
    autoResizeTextarea()
  })
}

// 自动调整textarea高度
const autoResizeTextarea = () => {
  if (editInput.value) {
    editInput.value.style.height = 'auto'
    editInput.value.style.height = editInput.value.scrollHeight + 'px'
  }
}

// 保存编辑
const saveEdit = () => {
  if (editingItemId.value && editingText.value.trim()) {
    store.updateTodoItem(props.widget.id, editingItemId.value, editingText.value.trim())
  }
  editingItemId.value = null
  editingText.value = ''
}

// 处理编辑输入的按键（需要检查输入法状态）
const handleEditKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !isEditComposing.value) {
    e.preventDefault()
    saveEdit()
  } else if (e.key === 'Escape') {
    editingItemId.value = null
    editingText.value = ''
  }
}

// 编辑输入法开始组合
const handleEditCompositionStart = () => {
  isEditComposing.value = true
}

// 编辑输入法结束组合
const handleEditCompositionEnd = () => {
  isEditComposing.value = false
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 待办列表 -->
    <div class="flex-1 overflow-auto space-y-2">
      <draggable
        v-model="todoItems"
        item-key="id"
        handle=".drag-handle"
        :animation="200"
        ghost-class="opacity-50"
        drag-class="rotate-2"
        @start="isDragging = true"
        @end="isDragging = false"
      >
        <template #item="{ element: item }">
          <div
            class="flex items-center gap-2 group p-2 rounded hover:bg-muted/30 transition-colors"
            :class="{ 'cursor-move': !editingItemId }"
          >
            <!-- 拖拽手柄 -->
            <div class="drag-handle cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
              <svg class="w-4 h-4 text-pencil/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
              </svg>
            </div>

            <!-- 复选框 -->
            <button
              class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0"
              :class="item.completed ? 'bg-accent border-accent' : 'border-pencil hover:bg-muted'"
              @click="store.toggleTodoItem(widget.id, item.id)"
            >
              <svg v-if="item.completed" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </button>

            <!-- 文本 -->
            <textarea
              v-if="editingItemId === item.id"
              ref="editInput"
              v-model="editingText"
              class="flex-1 font-handwritten text-lg bg-transparent border-none outline-none resize-none"
              rows="1"
              @blur="saveEdit"
              @keydown="handleEditKeydown"
              @compositionstart="handleEditCompositionStart"
              @compositionend="handleEditCompositionEnd"
              @input="autoResizeTextarea"
            />
            <span
              v-else
              class="flex-1 font-handwritten text-lg break-all cursor-text"
              :class="{ 'line-through text-pencil/40': item.completed }"
              @dblclick="startEditItem(item.id, item.text)"
            >
              {{ item.text }}
            </span>

            <!-- 删除按钮 -->
            <button
              class="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-accent hover:bg-accent/20 rounded transition-all flex-shrink-0"
              @click="store.deleteTodoItem(widget.id, item.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </template>
      </draggable>

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
          @compositionstart="handleCompositionStart"
          @compositionend="handleCompositionEnd"
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
