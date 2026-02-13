<script setup lang="ts">
import { ref } from 'vue'
import type { MindMapFile } from '@/types'
import { Brain, X } from 'lucide-vue-next'

defineProps<{
  history: MindMapFile[]
  isMobile?: boolean
}>()

const emit = defineEmits<{
  open: [file: MindMapFile]
  remove: [id: string]
}>()

// 手绘风格确认对话框状态
const showConfirmDialog = ref(false)
const pendingRemoveId = ref<string | null>(null)

const handleRemove = (e: MouseEvent, id: string) => {
  e.stopPropagation()
  pendingRemoveId.value = id
  showConfirmDialog.value = true
}

const confirmRemove = () => {
  if (pendingRemoveId.value) {
    emit('remove', pendingRemoveId.value)
  }
  showConfirmDialog.value = false
  pendingRemoveId.value = null
}

const cancelRemove = () => {
  showConfirmDialog.value = false
  pendingRemoveId.value = null
}
</script>

<template>
  <div class="border-t-2 border-border-primary/20 bg-paper/50 p-4">
    <div class="flex items-start justify-between mb-3 gap-4">
      <div class="flex-1">
        <h3 class="font-handwritten text-lg text-text-primary mb-3">最近打开</h3>

        <div v-if="history.length === 0" class="text-center py-4">
          <p class="font-handwritten text-sm text-text-secondary">暂无历史记录</p>
        </div>

        <div v-else class="flex gap-3 overflow-x-auto pb-2 flex-nowrap scrollbar-thin">
          <div
            v-for="item in history"
            :key="item.id"
            class="card-hand-drawn p-3 min-w-[180px] flex-shrink-0 cursor-pointer hover:scale-105 transition-transform group relative"
            @click="emit('open', item)"
            @dblclick="emit('open', item)"
          >
            <!-- Thumbnail or icon -->
            <div class="w-full h-24 mb-2 flex items-center justify-center bg-muted/20 rounded-lg overflow-hidden">
              <Brain :stroke-width="2" class="w-10 h-10 text-text-secondary" />
            </div>

            <!-- Name -->
            <div class="font-handwritten text-sm text-text-primary truncate" :title="item.name">
              {{ item.name }}
            </div>

            <!-- Last opened -->
            <div class="font-handwritten text-xs text-text-secondary">
              {{ new Date(item.lastOpened).toLocaleDateString() }}
            </div>

            <!-- Remove button -->
            <button
              class="history-remove-btn absolute top-2 right-2 w-6 h-6 rounded-full bg-accent text-paper transition-opacity flex items-center justify-center"
              @click="(e) => handleRemove(e, item.id)"
            >
              <X :stroke-width="2.5" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- 快捷键提示 -->
      <div class="flex-shrink-0 font-handwritten text-xs text-text-secondary space-y-1">
        <div>Tab: 添加子节点</div>
        <div>Enter: 添加同级节点</div>
        <div>Ctrl+C: 复制</div>
        <div>Ctrl+X: 剪切</div>
        <div>Ctrl+V: 粘贴</div>
        <div>Delete: 删除</div>
      </div>
    </div>

    <!-- Hand-drawn style confirm dialog -->
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
          v-if="showConfirmDialog"
          class="fixed inset-0 z-[10000] flex items-center justify-center bg-pencil/50"
          @click.self="cancelRemove"
        >
          <div class="card-hand-drawn p-6 max-w-md w-full mx-4 bg-paper" style="box-shadow: 8px 8px 0px #2d2d2d;">
            <h2 class="font-handwritten text-2xl text-text-primary mb-4">删除确认</h2>
            <p class="font-handwritten text-text-primary/80 mb-6">确定要删除这个思维导图吗？此操作不可恢复。</p>

            <div class="flex gap-3">
              <button class="btn-hand-drawn px-4 py-2 flex-1 bg-accent/10 hover:bg-accent/20" @click="confirmRemove">
                删除
              </button>
              <button class="btn-hand-drawn px-4 py-2 flex-1" @click="cancelRemove">
                取消
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* 自定义滚动条样式 */
.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: #e5e0d8;
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #2d2d2d;
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #ff4d4d;
}

.history-remove-btn {
  opacity: 0;
}

.group:hover .history-remove-btn {
  opacity: 1;
}

@media (max-width: 768px) {
  .history-remove-btn {
    opacity: 1;
  }
}
</style>
