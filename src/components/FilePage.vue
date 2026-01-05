<script setup lang="ts">
import { ref } from 'vue'
import { useDesktopStore } from '@/stores/desktop'

const store = useDesktopStore()

// 临时状态（后续会移到store）
const showUploadDialog = ref(false)
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  type: 'blank' as 'blank' | 'file' | 'folder',
  itemId: null as string | null
})

// 右键菜单处理
const handleBlankContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    type: 'blank',
    itemId: null
  }
}

const closeContextMenu = () => {
  contextMenu.value.show = false
}

// 点击外部关闭菜单
const handleClick = () => {
  if (contextMenu.value.show) {
    closeContextMenu()
  }
}

// 新建文件夹
const handleCreateFolder = () => {
  const name = prompt('请输入文件夹名称：')
  if (name && name.trim()) {
    // TODO: 调用store创建文件夹
    console.log('创建文件夹:', name)
  }
  closeContextMenu()
}

// 上传文件
const handleUploadFiles = () => {
  showUploadDialog.value = true
  closeContextMenu()
}
</script>

<template>
  <div
    class="w-full h-full flex flex-col bg-paper overflow-hidden"
    @click="handleClick"
    @contextmenu="handleBlankContextMenu"
  >
    <!-- 工具栏 -->
    <div class="flex items-center gap-3 p-4 border-b-2 border-pencil/20">
      <button
        class="btn-hand-drawn px-4 py-2 text-sm"
        @click="handleUploadFiles"
      >
        📤 上传文件
      </button>
      <button
        class="btn-hand-drawn px-4 py-2 text-sm"
        @click="handleCreateFolder"
      >
        ➕ 新建文件夹
      </button>
      <div class="flex-1"></div>
      <button
        class="btn-hand-drawn px-4 py-2 text-sm"
        @click="store.fileViewMode = store.fileViewMode === 'grid' ? 'list' : 'grid'"
      >
        {{ store.fileViewMode === 'grid' ? '📋 列表' : '🔲 网格' }}
      </button>
    </div>

    <!-- 面包屑导航 -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-pencil/10">
      <button
        class="font-handwritten text-sm hover:text-accent transition-colors"
        @click="store.currentFolderId = null"
      >
        📁 根目录
      </button>
      <template v-for="folder in store.breadcrumbPath" :key="folder.id">
        <span class="text-pencil/40">/</span>
        <button
          class="font-handwritten text-sm hover:text-accent transition-colors"
          @click="store.currentFolderId = folder.id"
        >
          {{ folder.name }}
        </button>
      </template>
    </div>

    <!-- 主内容区 -->
    <div class="flex-1 overflow-auto p-6">
      <!-- 空状态 -->
      <div v-if="store.currentFolderItems.length === 0" class="flex flex-col items-center justify-center h-full">
        <div class="text-6xl mb-4">📂</div>
        <h3 class="font-handwritten text-xl text-pencil mb-2">文件夹为空</h3>
        <p class="font-handwritten text-pencil/60 mb-4">右键或点击上方按钮开始上传文件</p>
      </div>

      <!-- 文件列表 - 网格视图 -->
      <div v-else-if="store.fileViewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div
          v-for="item in store.currentFolderItems"
          :key="item.id"
          class="card-hand-drawn p-4 cursor-pointer hover:scale-105 transition-transform"
          @dblclick="item.type === 'folder' ? store.currentFolderId = item.id : null"
        >
          <!-- 图标 -->
          <div class="text-5xl text-center mb-2">
            {{ item.type === 'folder' ? '📁' : '📄' }}
          </div>
          <!-- 名称 -->
          <div class="font-handwritten text-sm text-center text-pencil truncate">
            {{ item.name }}
          </div>
          <!-- 文件大小 -->
          <div v-if="item.type === 'file'" class="font-handwritten text-xs text-center text-pencil/60 mt-1">
            {{ Math.round(item.size / 1024) }} KB
          </div>
        </div>
      </div>

      <!-- 文件列表 - 列表视图 -->
      <div v-else class="space-y-2">
        <div
          v-for="item in store.currentFolderItems"
          :key="item.id"
          class="card-hand-drawn p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
          @dblclick="item.type === 'folder' ? store.currentFolderId = item.id : null"
        >
          <!-- 图标 -->
          <div class="text-2xl">
            {{ item.type === 'folder' ? '📁' : '📄' }}
          </div>
          <!-- 名称 -->
          <div class="flex-1 font-handwritten text-sm text-pencil">
            {{ item.name }}
          </div>
          <!-- 文件大小 -->
          <div v-if="item.type === 'file'" class="font-handwritten text-xs text-pencil/60">
            {{ Math.round(item.size / 1024) }} KB
          </div>
          <!-- 日期 -->
          <div class="font-handwritten text-xs text-pencil/60">
            {{ new Date(item.updatedAt).toLocaleDateString() }}
          </div>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div
          v-if="contextMenu.show"
          class="fixed z-[10000] card-hand-drawn py-2 min-w-[160px]"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          style="box-shadow: 4px 4px 0px #2d2d2d;"
        >
          <!-- 空白处菜单 -->
          <template v-if="contextMenu.type === 'blank'">
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 transition-colors"
              @click="handleUploadFiles"
            >
              📤 上传文件
            </button>
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 transition-colors"
              @click="handleCreateFolder"
            >
              ➕ 新建文件夹
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>

    <!-- 上传对话框（简化版） -->
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
          v-if="showUploadDialog"
          class="fixed inset-0 z-[10000] flex items-center justify-center bg-pencil/50"
          @click.self="showUploadDialog = false"
        >
          <div class="card-hand-drawn p-6 max-w-md w-full mx-4" style="box-shadow: 8px 8px 0px #2d2d2d;">
            <h2 class="font-handwritten text-2xl text-pencil mb-4">上传文件</h2>
            <p class="font-handwritten text-pencil/80 mb-4">
              文件上传功能正在开发中...
            </p>
            <button
              class="btn-hand-drawn px-4 py-2"
              @click="showUploadDialog = false"
            >
              关闭
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
