<script setup lang="ts">
import { ref } from 'vue'
import { useDesktopStore } from '@/stores/desktop'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useDesktopStore()

// 表单状态
const newCategoryName = ref('')
const error = ref('')

// 添加分类
const handleAddCategory = () => {
  error.value = ''

  if (!newCategoryName.value.trim()) {
    error.value = '分类名称不能为空'
    return
  }

  const result = store.addCategory(newCategoryName.value)
  if (result.success) {
    newCategoryName.value = ''
  } else {
    error.value = result.error || '添加失败'
  }
}

// 删除分类
const handleDeleteCategory = (category: string) => {
  error.value = ''

  const result = store.deleteCategory(category)
  if (!result.success) {
    error.value = result.error || '删除失败'
  }
}

// 关闭弹窗
const handleClose = () => {
  newCategoryName.value = ''
  error.value = ''
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
          <h3 class="font-handwritten text-xl font-medium mb-4">管理分类</h3>

          <!-- 添加新分类 -->
          <div class="mb-4">
            <label class="block font-handwritten text-sm mb-1">添加新分类</label>
            <div class="flex gap-2">
              <input
                v-model="newCategoryName"
                type="text"
                class="input-hand-drawn flex-1"
                placeholder="输入分类名称"
                maxlength="10"
                @keydown.enter="handleAddCategory"
              />
              <button class="btn-hand-drawn px-4 py-2 text-sm" @click="handleAddCategory">
                添加
              </button>
            </div>
            <p v-if="error" class="text-accent text-xs mt-1">{{ error }}</p>
          </div>

          <!-- 现有分类列表 -->
          <div class="space-y-2 mb-4 max-h-60 overflow-y-auto">
            <div
              v-for="category in store.navigationCategories"
              :key="category"
              class="flex items-center justify-between p-2 border-2 border-pencil/20 rounded-lg"
            >
              <span class="font-handwritten">{{ category }}</span>
              <button
                class="text-accent hover:text-accent/80 transition-colors"
                @click="handleDeleteCategory(category)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- 关闭按钮 -->
          <div class="flex justify-end">
            <button class="btn-hand-drawn px-4 py-2 text-sm" @click="handleClose">
              关闭
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
