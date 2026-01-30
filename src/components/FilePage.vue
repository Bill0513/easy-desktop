<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, defineAsyncComponent } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { FileItem, FolderItem } from '@/types'
// 异步加载文件预览对话框，减少主bundle大小
const FilePreviewDialog = defineAsyncComponent(() => import('./FilePreviewDialog.vue'))
import HandDrawnDialog from './HandDrawnDialog.vue'
import draggable from 'vuedraggable'
import { getFileIcon } from '@/utils/fileIcons'
import { FolderOpen } from 'lucide-vue-next'
import CustomSelect from './CustomSelect.vue'

const store = useDesktopStore()

// 临时状态
const showUploadDialog = ref(false)
const uploadMode = ref<'file' | 'folder'>('file')
const isUploading = ref(false)
const uploadProgress = ref(0)
const previewFile = ref<FileItem | null>(null)

// 上传进度详情
const uploadStats = ref({
  totalFiles: 0,
  completedFiles: 0,
  currentFileName: '',
  totalSize: 0,
  uploadedSize: 0,
  startTime: 0,
  speed: 0 // KB/s
})

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化上传速度
const formatSpeed = (bytesPerSecond: number): string => {
  return formatFileSize(bytesPerSecond) + '/s'
}

// 计算上传进度百分比
const uploadPercentage = computed(() => {
  if (uploadStats.value.totalSize === 0) return 0
  return Math.round((uploadStats.value.uploadedSize / uploadStats.value.totalSize) * 100)
})

// 计算剩余时间
const estimatedTimeRemaining = computed(() => {
  if (uploadStats.value.speed === 0) return '计算中...'
  const remainingBytes = uploadStats.value.totalSize - uploadStats.value.uploadedSize
  const remainingSeconds = remainingBytes / uploadStats.value.speed

  if (remainingSeconds < 60) {
    return `${Math.ceil(remainingSeconds)} 秒`
  } else if (remainingSeconds < 3600) {
    return `${Math.ceil(remainingSeconds / 60)} 分钟`
  } else {
    return `${Math.ceil(remainingSeconds / 3600)} 小时`
  }
})

// 自定义对话框状态
const dialog = ref({
  show: false,
  title: '',
  message: '',
  type: 'alert' as 'prompt' | 'confirm' | 'alert',
  defaultValue: '',
  onConfirm: (_value?: string) => {},
  onCancel: () => {}
})

// 显示提示对话框
const showPrompt = (title: string, defaultValue = ''): Promise<string | null> => {
  return new Promise((resolve) => {
    dialog.value = {
      show: true,
      title,
      message: '',
      type: 'prompt',
      defaultValue,
      onConfirm: (value) => {
        resolve(value || null)
      },
      onCancel: () => {
        resolve(null)
      }
    }
  })
}

// 显示确认对话框
const showConfirm = (title: string, message = ''): Promise<boolean> => {
  return new Promise((resolve) => {
    dialog.value = {
      show: true,
      title,
      message,
      type: 'confirm',
      defaultValue: '',
      onConfirm: () => {
        resolve(true)
      },
      onCancel: () => {
        resolve(false)
      }
    }
  })
}

// 显示警告对话框
const showAlert = (title: string, message = ''): Promise<void> => {
  return new Promise((resolve) => {
    dialog.value = {
      show: true,
      title,
      message,
      type: 'alert',
      defaultValue: '',
      onConfirm: () => {
        resolve()
      },
      onCancel: () => {
        resolve()
      }
    }
  })
}

// 对话框确认处理
const handleDialogConfirm = (value?: string) => {
  dialog.value.onConfirm(value)
  dialog.value.show = false
}

// 对话框取消处理
const handleDialogCancel = () => {
  dialog.value.onCancel()
  dialog.value.show = false
}

// 拖拽状态
const isDragging = ref(false)
const isDragOver = ref(false)

// 可拖拽的文件列表（用于 v-model）
const draggableItems = computed({
  get: () => store.currentFolderItems,
  set: (value) => {
    store.reorderFileItems(value)
  }
})

// 拖拽上传处理
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false

  if (!e.dataTransfer) return

  const items = e.dataTransfer.items
  if (!items || items.length === 0) return

  isUploading.value = true

  try {
    const files: File[] = []

    // 收集所有文件
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }

    if (files.length > 0) {
      const result = await store.uploadFiles(files as unknown as FileList, store.currentFolderId)
      await showAlert('上传完成', `成功：${result.success} 个，失败：${result.failed} 个`)
    }
  } catch (error) {
    await showAlert('上传失败', error instanceof Error ? error.message : '未知错误')
  } finally {
    isUploading.value = false
  }
}

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
  // 添加快捷键监听
  window.addEventListener('keydown', handleKeyDown)
})

// 清理
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// 快捷键处理
const handleKeyDown = (e: KeyboardEvent) => {
  // 只在文件 tab 下处理快捷键
  if (store.activeTab !== 'file') return

  // 如果在输入框或可编辑元素中，不处理快捷键
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
    return
  }

  // 检查是否在富文本编辑器内
  let element = target
  while (element) {
    if (element.classList?.contains('ProseMirror') ||
        element.classList?.contains('tiptap-editor')) {
      return
    }
    element = element.parentElement as HTMLElement
  }

  // Ctrl+A 全选
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault()
    store.selectAllFiles()
  }

  // Ctrl+C 复制
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    e.preventDefault()
    if (store.selectedFileIds.size > 0) {
      store.copyFiles(Array.from(store.selectedFileIds))
    }
  }

  // Ctrl+X 剪切
  if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
    e.preventDefault()
    if (store.selectedFileIds.size > 0) {
      store.cutFiles(Array.from(store.selectedFileIds))
    }
  }

  // Ctrl+V 粘贴
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    e.preventDefault()
    store.pasteFiles()
  }

  // Delete 删除
  if (e.key === 'Delete') {
    e.preventDefault()
    if (store.selectedFileIds.size > 0) {
      handleBatchDelete()
    }
  }

  // Escape 取消选择
  if (e.key === 'Escape') {
    e.preventDefault()
    store.clearFileSelection()
  }
}

// 批量删除
const handleBatchDelete = async () => {
  const count = store.selectedFileIds.size
  const confirmed = await showConfirm('确认删除', `确定要删除选中的 ${count} 个项目吗？`)
  if (!confirmed) return

  try {
    for (const id of store.selectedFileIds) {
      const item = store.currentFolderItems.find(i => i.id === id)
      if (item) {
        if (item.type === 'folder') {
          await store.deleteFolder(id)
        } else {
          await store.deleteFile(id)
        }
      }
    }
    store.clearFileSelection()
  } catch (error) {
    await showAlert('删除失败', error instanceof Error ? error.message : '未知错误')
  }
}

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
const handleCreateFolder = async () => {
  const name = await showPrompt('新建文件夹', '')
  if (name && name.trim()) {
    store.createFolder(name.trim(), store.currentFolderId)
  }
  closeContextMenu()
}

// 重命名
const handleRename = async () => {
  if (!contextMenu.value.item) return

  const item = contextMenu.value.item
  const newName = await showPrompt('重命名', item.name)
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

  const confirmed = await showConfirm('确认删除', confirmMsg)
  if (confirmed) {
    try {
      if (item.type === 'folder') {
        await store.deleteFolder(item.id)
      } else {
        await store.deleteFile(item.id)
      }
    } catch (error) {
      await showAlert('删除失败', error instanceof Error ? error.message : '未知错误')
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

  // 初始化上传统计
  const files = Array.from(input.files)
  uploadStats.value = {
    totalFiles: files.length,
    completedFiles: 0,
    currentFileName: '',
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
    uploadedSize: 0,
    startTime: Date.now(),
    speed: 0
  }

  try {
    // 逐个上传文件并更新进度
    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      uploadStats.value.currentFileName = file.name

      try {
        if (uploadMode.value === 'folder') {
          // 文件夹上传需要特殊处理
          await store.uploadFile(file, store.currentFolderId)
        } else {
          await store.uploadFile(file, store.currentFolderId)
        }

        successCount++
        uploadStats.value.completedFiles++
        uploadStats.value.uploadedSize += file.size

        // 计算上传速度
        const elapsedTime = (Date.now() - uploadStats.value.startTime) / 1000 // 秒
        uploadStats.value.speed = uploadStats.value.uploadedSize / elapsedTime

        // 更新进度百分比
        uploadProgress.value = Math.round((uploadStats.value.completedFiles / uploadStats.value.totalFiles) * 100)
      } catch (error) {
        console.error('Failed to upload file:', file.name, error)
        failedCount++
        uploadStats.value.completedFiles++
      }
    }

    await showAlert('上传完成', `成功：${successCount} 个，失败：${failedCount} 个`)
    showUploadDialog.value = false
  } catch (error) {
    await showAlert('上传失败', error instanceof Error ? error.message : '未知错误')
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
    // 打开文件预览
    previewFile.value = item
  }
}

// 点击选择处理
const handleItemClick = (e: MouseEvent, item: FileItem | FolderItem) => {
  if (e.ctrlKey || e.metaKey) {
    // Ctrl/Cmd + 点击：切换选中状态
    store.toggleFileSelection(item.id)
  } else if (e.shiftKey) {
    // Shift + 点击：范围选择（暂不实现）
    store.toggleFileSelection(item.id)
  } else {
    // 普通点击：清除其他选择，只选中当前项
    store.clearFileSelection()
    store.toggleFileSelection(item.id)
  }
}

// 关闭预览
const closePreview = () => {
  previewFile.value = null
}

// 获取文件/文件夹图标
const getItemIcon = (item: FileItem | FolderItem) => {
  if (item.type === 'folder') {
    return getFileIcon('', 'folder')
  }
  return getFileIcon(item.name, item.mimeType)
}
</script>

<template>
  <div
    class="w-full h-full flex flex-col overflow-hidden"
    :class="{ 'ring-4 ring-accent ring-opacity-50': isDragOver }"
    @click="handleClick"
    @contextmenu="handleBlankContextMenu"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 工具栏 -->
    <div class="flex items-center gap-3 p-4 border-b-2 border-border-primary/20">
      <button
        class="btn-hand-drawn p-3"
        @click="handleUploadFiles"
        title="上传文件"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </button>
      <button
        class="btn-hand-drawn p-3"
        @click="handleUploadFolder"
        title="上传文件夹"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </button>
      <button
        class="btn-hand-drawn p-3"
        @click="handleCreateFolder"
        title="新建文件夹"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- 面包屑导航 -->
    <div class="flex items-center gap-2 px-4 py-3 pr-64 border-b border-border-primary/10">
      <button
        class="font-handwritten text-sm hover:text-accent transition-colors flex items-center gap-1"
        @click="store.currentFolderId = null"
      >
        <FolderOpen :size="16" :stroke-width="2.5" />
        <span>根目录</span>
      </button>
      <template v-for="folder in store.breadcrumbPath" :key="folder.id">
        <span class="text-text-secondary">/</span>
        <button
          class="font-handwritten text-sm hover:text-accent transition-colors"
          @click="store.currentFolderId = folder.id"
        >
          {{ folder.name }}
        </button>
      </template>

      <div class="flex-1"></div>

      <!-- 排序选项 -->
      <div class="flex items-center gap-2">
        <CustomSelect
          v-model="store.fileSortBy"
          :options="[
            { label: '按名称', value: 'name' },
            { label: '按大小', value: 'size' },
            { label: '按日期', value: 'date' }
          ]"
          width="120px"
        />
        <button
          class="btn-hand-drawn p-3"
          @click="store.fileSortOrder = store.fileSortOrder === 'asc' ? 'desc' : 'asc'"
          :title="store.fileSortOrder === 'asc' ? '升序' : '降序'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="store.fileSortOrder === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <button
        class="btn-hand-drawn p-3"
        @click="store.fileViewMode = store.fileViewMode === 'grid' ? 'list' : 'grid'"
        :title="store.fileViewMode === 'grid' ? '切换到列表视图' : '切换到网格视图'"
      >
        <svg v-if="store.fileViewMode === 'grid'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
    </div>

    <!-- 主内容区 -->
    <div class="flex-1 overflow-auto p-6">
      <!-- 加载状态 -->
      <div v-if="store.isLoadingFiles" class="flex flex-col items-center justify-center h-full">
        <div class="text-4xl mb-4">⏳</div>
        <p class="font-handwritten text-text-secondary">加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="store.currentFolderItems.length === 0" class="flex flex-col items-center justify-center h-full">
        <div class="text-6xl mb-4">📂</div>
        <h3 class="font-handwritten text-xl text-text-primary mb-2">文件夹为空</h3>
        <p class="font-handwritten text-text-secondary mb-4">右键或点击上方按钮开始上传文件</p>
      </div>

      <!-- 文件列表 - 网格视图 -->
      <draggable
        v-else-if="store.fileViewMode === 'grid'"
        v-model="draggableItems"
        class="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-8 gap-4"
        item-key="id"
        :animation="200"
        ghost-class="opacity-50"
        @start="isDragging = true"
        @end="isDragging = false"
      >
        <template #item="{ element: item }">
          <div
            class="card-hand-drawn p-4 cursor-pointer hover:scale-105 transition-transform"
            :class="{
              'cursor-move': isDragging,
              'ring-2 ring-accent': store.selectedFileIds.has(item.id)
            }"
            @click="(e) => handleItemClick(e, item)"
            @dblclick="handleItemDoubleClick(item)"
            @contextmenu="(e) => handleItemContextMenu(e, item)"
          >
            <!-- 图标 -->
            <div class="flex items-center justify-center mb-2">
              <svg
                class="w-16 h-16"
                :style="{ color: getItemIcon(item).color }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  v-for="(path, index) in getItemIcon(item).paths"
                  :key="index"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="path"
                />
              </svg>
            </div>
            <!-- 名称 - 显示两行 -->
            <div
              class="font-handwritten text-sm text-center text-text-primary line-clamp-2 leading-tight min-h-[2.5rem]"
              :title="item.name"
            >
              {{ item.name }}
            </div>
            <!-- 文件大小和上传日期 -->
            <div v-if="item.type === 'file'" class="font-handwritten text-xs text-center text-text-secondary mt-1">
              {{ Math.round(item.size / 1024) }} KB
            </div>
            <div class="font-handwritten text-xs text-center text-text-secondary mt-0.5">
              {{ new Date(item.createdAt).toLocaleDateString() }}
            </div>
          </div>
        </template>
      </draggable>

      <!-- 文件列表 - 列表视图 -->
      <draggable
        v-else
        v-model="draggableItems"
        class="space-y-2"
        item-key="id"
        :animation="200"
        ghost-class="opacity-50"
        @start="isDragging = true"
        @end="isDragging = false"
      >
        <template #item="{ element: item }">
          <div
            class="card-hand-drawn p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
            :class="{
              'cursor-move': isDragging,
              'ring-2 ring-accent': store.selectedFileIds.has(item.id)
            }"
            @click="(e) => handleItemClick(e, item)"
            @dblclick="handleItemDoubleClick(item)"
            @contextmenu="(e) => handleItemContextMenu(e, item)"
          >
            <!-- 图标 -->
            <div class="flex-shrink-0">
              <svg
                class="w-8 h-8"
                :style="{ color: getItemIcon(item).color }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  v-for="(path, index) in getItemIcon(item).paths"
                  :key="index"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="path"
                />
              </svg>
            </div>
            <!-- 名称 -->
            <div class="flex-1 font-handwritten text-sm text-text-primary truncate" :title="item.name">
              {{ item.name }}
            </div>
            <!-- 文件大小 -->
            <div v-if="item.type === 'file'" class="font-handwritten text-xs text-text-secondary">
              {{ Math.round(item.size / 1024) }} KB
            </div>
            <!-- 日期 -->
            <div class="font-handwritten text-xs text-text-secondary">
              {{ new Date(item.updatedAt).toLocaleDateString() }}
            </div>
          </div>
        </template>
      </draggable>
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
          class="fixed z-[10000] card-hand-drawn py-2 min-w-[160px] bg-bg-primary"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          style="box-shadow: 4px 4px 0px var(--color-border-primary);"
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
          class="fixed inset-0 z-[10000] flex items-center justify-center bg-border-primary/50"
          @click.self="showUploadDialog = false"
        >
          <div class="card-hand-drawn p-6 max-w-md w-full mx-4 bg-bg-primary" style="box-shadow: 8px 8px 0px var(--color-border-primary);">
            <h2 class="font-handwritten text-2xl text-text-primary mb-4">
              {{ uploadMode === 'folder' ? '上传文件夹' : '上传文件' }}
            </h2>

            <!-- 上传进度显示 -->
            <div v-if="isUploading" class="mb-4 space-y-4">
              <!-- 当前文件名 -->
              <div class="text-center">
                <div class="font-handwritten text-sm text-text-secondary mb-1">正在上传</div>
                <div class="font-handwritten text-base text-text-primary font-bold truncate" :title="uploadStats.currentFileName">
                  {{ uploadStats.currentFileName }}
                </div>
              </div>

              <!-- 进度条 -->
              <div class="space-y-2">
                <div class="w-full h-6 bg-muted border-2 border-border-primary wobbly-sm overflow-hidden relative">
                  <div
                    class="h-full bg-accent transition-all duration-300"
                    :style="{ width: uploadPercentage + '%' }"
                  ></div>
                  <div class="absolute inset-0 flex items-center justify-center text-sm font-handwritten text-text-primary font-bold">
                    {{ uploadPercentage }}%
                  </div>
                </div>
              </div>

              <!-- 统计信息 -->
              <div class="grid grid-cols-2 gap-3">
                <!-- 文件数量 -->
                <div class="card-hand-drawn p-3 bg-bg-primary/50">
                  <div class="font-handwritten text-xs text-text-secondary mb-1">文件进度</div>
                  <div class="font-handwritten text-lg text-text-primary font-bold">
                    {{ uploadStats.completedFiles }} / {{ uploadStats.totalFiles }}
                  </div>
                </div>

                <!-- 上传速度 -->
                <div class="card-hand-drawn p-3 bg-bg-primary/50">
                  <div class="font-handwritten text-xs text-text-secondary mb-1">上传速度</div>
                  <div class="font-handwritten text-lg text-text-primary font-bold">
                    {{ formatSpeed(uploadStats.speed) }}
                  </div>
                </div>

                <!-- 总大小 -->
                <div class="card-hand-drawn p-3 bg-bg-primary/50">
                  <div class="font-handwritten text-xs text-text-secondary mb-1">总大小</div>
                  <div class="font-handwritten text-sm text-text-primary font-bold">
                    {{ formatFileSize(uploadStats.uploadedSize) }} / {{ formatFileSize(uploadStats.totalSize) }}
                  </div>
                </div>

                <!-- 剩余时间 -->
                <div class="card-hand-drawn p-3 bg-bg-primary/50">
                  <div class="font-handwritten text-xs text-text-secondary mb-1">剩余时间</div>
                  <div class="font-handwritten text-sm text-text-primary font-bold">
                    {{ estimatedTimeRemaining }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 文件选择区域 -->
            <div v-else class="mb-4">
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
                @click="uploadMode === 'file' ? fileInput?.click() : folderInput?.click()"
              >
                <div class="text-4xl mb-2">{{ uploadMode === 'folder' ? '📁' : '📤' }}</div>
                <div class="font-handwritten text-lg">
                  {{ uploadMode === 'folder' ? '选择文件夹' : '选择文件' }}
                </div>
                <div class="font-handwritten text-sm text-text-secondary mt-2">
                  {{ uploadMode === 'folder' ? '支持整个文件夹上传' : '支持多文件选择' }}
                </div>
                <div class="font-handwritten text-xs text-text-secondary mt-1">
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
              {{ isUploading ? '上传中...' : '关闭' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 文件预览对话框 -->
    <FilePreviewDialog :file="previewFile" @close="closePreview" />

    <!-- 自定义对话框 -->
    <HandDrawnDialog
      :show="dialog.show"
      :title="dialog.title"
      :message="dialog.message"
      :type="dialog.type"
      :default-value="dialog.defaultValue"
      @confirm="handleDialogConfirm"
      @cancel="handleDialogCancel"
      @close="dialog.show = false"
    />
  </div>
</template>
