<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { FileItem, FolderItem } from '@/types'

const store = useDesktopStore()

// 临时状态
const showUploadDialog = ref(false)
const uploadMode = ref<'file' | 'folder'>('file')
const isUploading = ref(false)
const uploadProgress = ref(0)

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  type: 'blank' as 'blank' | 'file' | 'folder',
  itemId: null as string | null,
  item: null as FileItem | FolderItem | null
})

// 初始化文件数据
onMounted(() => {
  store.initFiles()
})

// 右键菜单处理
const handleBlankContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    type: 'blank',
    itemId: null,
    item: null
  }
}

const handleItemContextMenu = (e: MouseEvent, item: FileItem | FolderItem) => {
  e.preventDefault()
  e.stopPropagation()
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    type: item.type,
    itemId: item.id,
    item
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
    store.createFolder(name.trim(), store.currentFolderId)
  }
  closeContextMenu()
}

// 重命名
const handleRename = () => {
  if (!contextMenu.value.item) return

  const item = contextMenu.value.item
  const newName = prompt('请输入新名称：', item.name)
  if (newName && newName.trim() && newName !== item.name) {
    store.renameItem(item.id, newName.trim(), item.type)
  }
  closeContextMenu()
}

// 删除
const handleDelete = async () => {
  if (!contextMenu.value.item) return

  const item = contextMenu.value.item
  const confirmMsg = item.type === 'folder'
    ? `确定要删除文件夹"${item.name}"及其所有内容吗？`
    : `确定要删除文件"${item.name}"吗？`

  if (confirm(confirmMsg)) {
    try {
      if (item.type === 'folder') {
        await store.deleteFolder(item.id)
      } else {
        await store.deleteFile(item.id)
      }
    } catch (error) {
      alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }
  closeContextMenu()
}

// 上传文件
const handleUploadFiles = () => {
  uploadMode.value = 'file'
  showUploadDialog.value = true
  closeContextMenu()
}

// 上传文件夹
const handleUploadFolder = () => {
  uploadMode.value = 'folder'
  showUploadDialog.value = true
  closeContextMenu()
}

// 文件选择处理
const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)

const handleFileSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  isUploading.value = true
  uploadProgress.value = 0

  try {
    if (uploadMode.value === 'folder') {
      const result = await store.uploadFolder(input.files)
      alert(`上传完成！成功：${result.success} 个，失败：${result.failed} 个`)
    } else {
      const result = await store.uploadFiles(input.files, store.currentFolderId)
      alert(`上传完成！成功：${result.success} 个，失败：${result.failed} 个`)
    }
    showUploadDialog.value = false
  } catch (error) {
    alert('上传失败：' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
    if (input) input.value = ''
  }
}

// 双击处理
const handleItemDoubleClick = (item: FileItem | FolderItem) => {
  if (item.type === 'folder') {
    store.currentFolderId = item.id
  } else {
    // TODO: 打开文件预览
    console.log('预览文件:', item.name)
  }
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
        @click="handleUploadFolder"
      >
        📁 上传文件夹
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
      <!-- 加载状态 -->
      <div v-if="store.isLoadingFiles" class="flex flex-col items-center justify-center h-full">
        <div class="text-4xl mb-4">⏳</div>
        <p class="font-handwritten text-pencil/60">加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="store.currentFolderItems.length === 0" class="flex flex-col items-center justify-center h-full">
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
          @dblclick="handleItemDoubleClick(item)"
          @contextmenu="(e) => handleItemContextMenu(e, item)"
        >
          <!-- 图标 -->
          <div class="text-5xl text-center mb-2">
            {{ item.type === 'folder' ? '📁' : '📄' }}
          </div>
          <!-- 名称 -->
          <div class="font-handwritten text-sm text-center text-pencil truncate" :title="item.name">
            {{ item.name }}
          </div>
          <!-- 文件大小 -->
          <div v-if="item.type === 'file'" class="font-handwritten text-xs text-center text-pencil/60 mt-1">
            {{ Math.round(item.size / 1024) }} KB
          </div>
          <!-- 上传进度 -->
          <div v-if="item.type === 'file' && item.uploadProgress !== undefined" class="mt-2">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-accent h-2 rounded-full transition-all" :style="{ width: item.uploadProgress + '%' }"></div>
            </div>
            <div class="text-xs text-center text-pencil/60 mt-1">{{ item.uploadProgress }}%</div>
          </div>
        </div>
      </div>

      <!-- 文件列表 - 列表视图 -->
      <div v-else class="space-y-2">
        <div
          v-for="item in store.currentFolderItems"
          :key="item.id"
          class="card-hand-drawn p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
          @dblclick="handleItemDoubleClick(item)"
          @contextmenu="(e) => handleItemContextMenu(e, item)"
        >
          <!-- 图标 -->
          <div class="text-2xl">
            {{ item.type === 'folder' ? '📁' : '📄' }}
          </div>
          <!-- 名称 -->
          <div class="flex-1 font-handwritten text-sm text-pencil truncate" :title="item.name">
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
          <!-- 上传进度 -->
          <div v-if="item.type === 'file' && item.uploadProgress !== undefined" class="w-24">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-accent h-2 rounded-full transition-all" :style="{ width: item.uploadProgress + '%' }"></div>
            </div>
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
          class="fixed z-[10000] card-hand-drawn py-2 min-w-[160px] bg-paper"
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
              @click="handleUploadFolder"
            >
              📁 上传文件夹
            </button>
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 transition-colors"
              @click="handleCreateFolder"
            >
              ➕ 新建文件夹
            </button>
          </template>

          <!-- 文件夹菜单 -->
          <template v-else-if="contextMenu.type === 'folder'">
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 transition-colors"
              @click="handleItemDoubleClick(contextMenu.item!)"
            >
              📂 打开
            </button>
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 transition-colors"
              @click="handleRename"
            >
              ✏️ 重命名
            </button>
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 transition-colors text-red-600"
              @click="handleDelete"
            >
              🗑️ 删除
            </button>
          </template>

          <!-- 文件菜单 -->
          <template v-else-if="contextMenu.type === 'file'">
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 transition-colors"
              @click="handleItemDoubleClick(contextMenu.item!)"
            >
              👁️ 预览
            </button>
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 transition-colors"
              @click="handleRename"
            >
              ✏️ 重命名
            </button>
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 transition-colors text-red-600"
              @click="handleDelete"
            >
              🗑️ 删除
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>

    <!-- 上传对话框 -->
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
          <div class="card-hand-drawn p-6 max-w-md w-full mx-4 bg-paper" style="box-shadow: 8px 8px 0px #2d2d2d;">
            <h2 class="font-handwritten text-2xl text-pencil mb-4">
              {{ uploadMode === 'folder' ? '上传文件夹' : '上传文件' }}
            </h2>

            <!-- 文件选择区域 -->
            <div class="mb-4">
              <input
                v-if="uploadMode === 'file'"
                ref="fileInput"
                type="file"
                multiple
                class="hidden"
                @change="handleFileSelect"
              />
              <input
                v-else
                ref="folderInput"
                type="file"
                webkitdirectory
                multiple
                class="hidden"
                @change="handleFileSelect"
              />

              <button
                class="btn-hand-drawn w-full py-8 text-center"
                :disabled="isUploading"
                @click="uploadMode === 'file' ? fileInput?.click() : folderInput?.click()"
              >
                <div class="text-4xl mb-2">{{ uploadMode === 'folder' ? '📁' : '📤' }}</div>
                <div class="font-handwritten text-lg">
                  {{ isUploading ? '上传中...' : (uploadMode === 'folder' ? '选择文件夹' : '选择文件') }}
                </div>
                <div class="font-handwritten text-sm text-pencil/60 mt-2">
                  {{ uploadMode === 'folder' ? '支持整个文件夹上传' : '支持多文件选择' }}
                </div>
                <div class="font-handwritten text-xs text-pencil/60 mt-1">
                  单个文件最大 20MB
                </div>
              </button>
            </div>

            <!-- 关闭按钮 -->
            <button
              class="btn-hand-drawn px-4 py-2 w-full"
              :disabled="isUploading"
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
