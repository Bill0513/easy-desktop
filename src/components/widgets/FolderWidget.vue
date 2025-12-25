<script setup lang="ts">
import { computed } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { FolderWidget } from '@/types'

const props = defineProps<{
  widget: FolderWidget
}>()

const store = useDesktopStore()

// 获取文件夹内的组件
const children = computed(() => {
  return props.widget.children
    .map(id => store.getWidgetById(id))
    .filter(Boolean)
})

// 点击子组件：从文件夹提取出来进行编辑
const editChild = (child: any) => {
  // 从文件夹中移除
  store.removeFromFolder(props.widget.id, child.id)
  // 取消最小化
  child.isMinimized = false
  // 置顶并选中
  store.bringToFront(child.id)
  store.selectWidget(child.id)
  store.save()
}

// 删除组件（直接从文件夹中删除）
const deleteChild = (widgetId: string) => {
  store.deleteWidget(widgetId)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 文件夹内容列表 -->
    <div class="flex-1 overflow-auto">
      <div v-if="children.length > 0" class="space-y-1">
        <div
          v-for="child in children"
          :key="child!.id"
          class="flex items-center gap-2 p-2 bg-muted/30 rounded-lg group cursor-pointer hover:bg-muted/50 transition-colors"
          @click="editChild(child)"
        >
          <!-- 根据类型显示图标 -->
          <span class="text-lg">
            {{ child!.type === 'note' ? '📝' :
               child!.type === 'todo' ? '✅' :
               child!.type === 'bookmark' ? '🔖' :
               child!.type === 'text' ? '📋' : '📁' }}
          </span>
          <span class="flex-1 font-handwritten text-sm truncate">
            {{ child!.title }}
          </span>
          <!-- 编辑箭头 -->
          <svg class="w-4 h-4 text-pencil/40 group-hover:text-pencil/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <!-- 删除按钮 -->
          <button
            class="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-accent hover:bg-accent/20 rounded transition-all"
            @click.stop="deleteChild(child!.id)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="flex-1 flex items-center justify-center text-pencil/40">
        <p class="font-handwritten text-center">
          将组件拖到此处<br>或点击下方按钮添加
        </p>
      </div>

      <!-- 状态提示 -->
      <div class="mt-3 pt-3 border-t-2 border-dashed border-pencil/20 text-center">
        <p class="font-handwritten text-sm text-pencil/60">
          {{ children.length }} 个项目，点击提取编辑
        </p>
      </div>
    </div>
  </div>
</template>
