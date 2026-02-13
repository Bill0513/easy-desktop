<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, defineAsyncComponent } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { FileItem, FolderItem } from '@/types'
import { useResponsiveMode } from '@/composables/useResponsiveMode'
// 异步加载文件预览对话框，减少主bundle大小
const FilePreviewDialog = defineAsyncComponent(() => import('./FilePreviewDialog.vue'))
import HandDrawnDialog from './HandDrawnDialog.vue'
import draggable from 'vuedraggable'
import { getFileIcon } from '@/utils/fileIcons'
import { FolderOpen, Upload, FolderUp, FolderPlus, FilePlus2, FolderInput, FilePenLine, Pencil, Trash2, MoreVertical } from 'lucide-vue-next'
import CustomSelect from './CustomSelect.vue'

const store = useDesktopStore()
const { isMobile } = useResponsiveMode()

// 临时状态
const showUploadDialog = ref(false)
const uploadMode = ref<'file' | 'folder'>('file')
const isUploading = ref(false)
const uploadProgress = ref(0)
const previewFile = ref<FileItem | null>(null)
const showCreateFileDialog = ref(false)
const newFileName = ref('')
const newFileType = ref('ts')
const fileSearchQuery = ref('')

const isEditorOpen = ref(false)
const editorLoading = ref(false)
const editorSaving = ref(false)
const editorFile = ref<FileItem | null>(null)
const editorContent = ref('')
const originalContent = ref('')
const editorLanguage = ref('')
const editorDescription = ref('')
const editorTagsInput = ref('')

const TEXT_FILE_TYPES = [
  { label: 'TypeScript (.ts)', value: 'ts' },
  { label: 'JavaScript (.js)', value: 'js' },
  { label: 'Python (.py)', value: 'py' },
  { label: 'Markdown (.md)', value: 'md' },
  { label: 'JSON (.json)', value: 'json' },
  { label: 'Vue (.vue)', value: 'vue' },
  { label: 'CSS (.css)', value: 'css' },
  { label: 'HTML (.html)', value: 'html' },
  { label: 'Text (.txt)', value: 'txt' },
]

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
const hasFileFilter = computed(() => {
  return !!fileSearchQuery.value.trim()
})

const filteredCurrentFolderItems = computed(() => {
  const query = fileSearchQuery.value.trim().toLowerCase()
  return store.currentFolderItems.filter(item => {
    return !query || item.name.toLowerCase().includes(query)
  })
})

const draggableItems = computed({
  get: () => filteredCurrentFolderItems.value,
  set: (value) => {
    if (!hasFileFilter.value) {
      store.reorderFileItems(value)
    }
  }
})

const mobilePathText = computed(() => {
  const pathNames = store.breadcrumbPath.map(folder => folder.name)
  return ['根目录', ...pathNames].join(' / ')
})

const canGoBackFolder = computed(() => store.currentFolderId !== null)

const goBackFolder = () => {
  if (!canGoBackFolder.value) return
  const path = store.breadcrumbPath
  if (path.length <= 1) {
    store.currentFolderId = null
    return
  }
  store.currentFolderId = path[path.length - 2].id
}

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

const availableFileLanguages = computed(() => {
  return store.usedFileLanguages.map(language => ({ label: language, value: language }))
})

const isDarkMode = computed(() => store.effectiveTheme === 'dark')

const contextMenuItemClass = computed(() => {
  return [
    'w-full px-4 py-2 text-left font-handwritten text-sm transition-colors text-text-primary',
    isDarkMode.value ? 'hover:bg-bluePen/25 active:bg-bluePen/35' : 'hover:bg-accent/20 active:bg-accent/30'
  ]
})

const contextMenuDangerItemClass = computed(() => {
  return [
    'w-full px-4 py-2 text-left font-handwritten text-sm transition-colors text-text-primary',
    isDarkMode.value ? 'hover:bg-bluePen/25 active:bg-bluePen/35' : 'hover:bg-accent/20 active:bg-accent/30'
  ]
})

const breadcrumbButtonClass = computed(() => {
  return [
    'font-handwritten text-sm text-text-primary transition-colors',
    isDarkMode.value ? 'hover:text-bluePen' : 'hover:text-accent'
  ]
})

const editorIsDirty = computed(() => {
  return editorContent.value !== originalContent.value
})

const parseTagsInput = (value: string): string[] => {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

const getFileUrl = (file: FileItem) => {
  const domain = import.meta.env.VITE_IMAGE_DOMAIN || 'https://sunkkk.de5.net'
  return `${domain}/${file.url}`
}

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

  // 编辑器内保存
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && isEditorOpen.value) {
    e.preventDefault()
    saveEditorContent()
    return
  }

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
    if (isEditorOpen.value) {
      closeEditor()
    } else {
      store.clearFileSelection()
    }
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
  if (isMobile.value) return
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
  if (isMobile.value) return
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

const openMobileItemActions = (item: FileItem | FolderItem) => {
  contextMenu.value = {
    show: true,
    x: 0,
    y: 0,
    type: item.type,
    itemId: item.id,
    item
  }
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

const openCreateFileDialog = () => {
  newFileName.value = ''
  newFileType.value = 'ts'
  showCreateFileDialog.value = true
  closeContextMenu()
}

const createTextFile = async () => {
  const rawName = newFileName.value.trim()
  if (!rawName) {
    await showAlert('创建失败', '请输入文件名')
    return
  }

  const extension = newFileType.value
  const finalName = rawName.includes('.') ? rawName : `${rawName}.${extension}`

  try {
    const file = await store.createTextFile({
      name: finalName,
      parentId: store.currentFolderId,
      content: '',
      tags: [],
      description: '',
    })
    showCreateFileDialog.value = false
    await openEditorForFile(file)
  } catch (error) {
    await showAlert('创建失败', error instanceof Error ? error.message : '未知错误')
  }
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

const openEditorForFile = async (file: FileItem) => {
  if (!store.isTextCodeFileItem(file)) {
    previewFile.value = file
    return
  }

  editorLoading.value = true
  isEditorOpen.value = true
  editorFile.value = file
  editorLanguage.value = file.language || store.inferLanguageFromFilename(file.name)
  editorDescription.value = file.description || ''
  editorTagsInput.value = (file.tags || []).join(', ')

  try {
    const response = await fetch(getFileUrl(file))
    if (!response.ok) {
      throw new Error('加载文件内容失败')
    }
    const content = await response.text()
    editorContent.value = content
    originalContent.value = content
  } catch (error) {
    await showAlert('打开失败', error instanceof Error ? error.message : '未知错误')
    isEditorOpen.value = false
  } finally {
    editorLoading.value = false
  }
}

const saveEditorContent = async () => {
  if (!editorFile.value || editorSaving.value) return

  editorSaving.value = true
  try {
    await store.updateTextFileContent(editorFile.value.id, editorContent.value)
    store.updateFileMetadata(editorFile.value.id, {
      language: editorLanguage.value,
      description: editorDescription.value,
      tags: parseTagsInput(editorTagsInput.value)
    })
    originalContent.value = editorContent.value
    await showAlert('保存成功', '文本/代码文件已保存')
  } catch (error) {
    await showAlert('保存失败', error instanceof Error ? error.message : '未知错误')
  } finally {
    editorSaving.value = false
  }
}

const closeEditor = async () => {
  if (editorIsDirty.value) {
    const confirmed = await showConfirm('放弃修改', '你有未保存的更改，确定要关闭编辑器吗？')
    if (!confirmed) return
  }
  isEditorOpen.value = false
  editorFile.value = null
  editorContent.value = ''
  originalContent.value = ''
  editorLanguage.value = ''
  editorDescription.value = ''
  editorTagsInput.value = ''
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
    openEditorForFile(item)
  }
}

// 点击选择处理
const handleItemClick = (e: MouseEvent, item: FileItem | FolderItem) => {
  if (isMobile.value && item.type === 'folder' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    store.currentFolderId = item.id
    closeContextMenu()
    return
  }

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
    <div :class="isMobile ? 'mobile-file-topbar' : 'flex items-center gap-3 p-4 border-b-2 border-border-primary/20'">
      <div :class="isMobile ? 'mobile-file-topbar-inner card-hand-drawn bg-bg-secondary' : 'flex items-center gap-2'">
        <input
          v-model="fileSearchQuery"
          type="text"
          placeholder="筛选文件名..."
          class="input-hand-drawn px-3 py-2 bg-bg-secondary"
          :style="isMobile ? 'width: 100%;' : 'width: 300px'"
        />
        <div v-if="isMobile" class="mobile-file-path-row">
          <button
            class="mobile-file-back-btn"
            :disabled="!canGoBackFolder"
            @click.stop="goBackFolder"
          >
            返回
          </button>
          <p class="mobile-file-path" :title="mobilePathText">
            当前位置：{{ mobilePathText }}
          </p>
        </div>
        <div v-if="isMobile" class="grid grid-cols-2 gap-2 w-full mt-2">
          <button class="mobile-file-action-btn" @click.stop="handleUploadFiles">
            <Upload :size="14" :stroke-width="2.5" />
            上传
          </button>
          <button class="mobile-file-action-btn" @click.stop="handleUploadFolder">
            <FolderUp :size="14" :stroke-width="2.5" />
            上传文件夹
          </button>
          <button class="mobile-file-action-btn" @click.stop="handleCreateFolder">
            <FolderPlus :size="14" :stroke-width="2.5" />
            新建文件夹
          </button>
          <button class="mobile-file-action-btn" @click.stop="openCreateFileDialog">
            <FilePlus2 :size="14" :stroke-width="2.5" />
            新建文件
          </button>
        </div>
      </div>
    </div>

    <!-- 面包屑导航 -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-border-primary/10" :class="isMobile ? 'pt-[136px] overflow-x-auto whitespace-nowrap' : 'pr-64'">
      <button
        :class="[breadcrumbButtonClass, 'flex items-center gap-1']"
        @click="store.currentFolderId = null"
      >
        <FolderOpen :size="16" :stroke-width="2.5" />
        <span>根目录</span>
      </button>
      <template v-for="folder in store.breadcrumbPath" :key="folder.id">
        <span class="text-text-secondary">/</span>
        <button
          :class="breadcrumbButtonClass"
          @click="store.currentFolderId = folder.id"
        >
          {{ folder.name }}
        </button>
      </template>

      <div class="flex-1" v-if="!isMobile"></div>

      <!-- 排序选项 -->
      <div v-if="!isMobile" class="flex items-center gap-2">
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
        v-if="!isMobile"
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
      <div v-else-if="filteredCurrentFolderItems.length === 0" class="flex flex-col items-center justify-center h-full">
        <div class="text-6xl mb-4">📂</div>
        <h3 class="font-handwritten text-xl text-text-primary mb-2">暂无匹配内容</h3>
        <p class="font-handwritten text-text-secondary mb-4">可上传文件或新建文本/代码文件</p>
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
            <div v-if="isMobile" class="mt-2 flex justify-center">
              <button
                class="mobile-item-more-btn"
                @click.stop="openMobileItemActions(item)"
              >
                <MoreVertical :size="14" :stroke-width="2.5" />
                更多
              </button>
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
            <button
              v-if="isMobile"
              class="mobile-item-more-btn"
              @click.stop="openMobileItemActions(item)"
            >
              <MoreVertical :size="14" :stroke-width="2.5" />
              更多
            </button>
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
          v-if="contextMenu.show && !isMobile"
          class="fixed z-[10000] card-hand-drawn py-2 min-w-[160px] bg-bg-primary"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          style="box-shadow: 4px 4px 0px var(--color-border-primary);"
        >
          <!-- 空白处菜单 -->
          <template v-if="contextMenu.type === 'blank'">
            <button
              :class="contextMenuItemClass"
              @click="handleUploadFiles"
            >
              <span class="inline-flex items-center gap-2">
                <Upload :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>上传文件</span>
              </span>
            </button>
            <button
              :class="contextMenuItemClass"
              @click="handleUploadFolder"
            >
              <span class="inline-flex items-center gap-2">
                <FolderUp :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>上传文件夹</span>
              </span>
            </button>
            <button
              :class="contextMenuItemClass"
              @click="handleCreateFolder"
            >
              <span class="inline-flex items-center gap-2">
                <FolderPlus :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>新建文件夹</span>
              </span>
            </button>
            <button
              :class="contextMenuItemClass"
              @click="openCreateFileDialog"
            >
              <span class="inline-flex items-center gap-2">
                <FilePlus2 :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>新建文本/代码文件</span>
              </span>
            </button>
          </template>

          <!-- 文件夹菜单 -->
          <template v-else-if="contextMenu.type === 'folder'">
            <button
              :class="contextMenuItemClass"
              @click="handleItemDoubleClick(contextMenu.item!)"
            >
              <span class="inline-flex items-center gap-2">
                <FolderInput :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>打开</span>
              </span>
            </button>
            <button
              :class="contextMenuItemClass"
              @click="handleRename"
            >
              <span class="inline-flex items-center gap-2">
                <Pencil :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>重命名</span>
              </span>
            </button>
            <button
              :class="contextMenuDangerItemClass"
              @click="handleDelete"
            >
              <span class="inline-flex items-center gap-2">
                <Trash2 :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>删除</span>
              </span>
            </button>
          </template>

          <!-- 文件菜单 -->
          <template v-else-if="contextMenu.type === 'file'">
            <button
              :class="contextMenuItemClass"
              @click="handleItemDoubleClick(contextMenu.item!)"
            >
              <span class="inline-flex items-center gap-2">
                <FilePenLine :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>打开</span>
              </span>
            </button>
            <button
              :class="contextMenuItemClass"
              @click="handleRename"
            >
              <span class="inline-flex items-center gap-2">
                <Pencil :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>重命名</span>
              </span>
            </button>
            <button
              :class="contextMenuDangerItemClass"
              @click="handleDelete"
            >
              <span class="inline-flex items-center gap-2">
                <Trash2 :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>删除</span>
              </span>
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>

    <!-- 移动端项目动作抽屉 -->
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
          v-if="contextMenu.show && isMobile && contextMenu.type !== 'blank'"
          class="fixed inset-0 z-[10000] bg-border-primary/45"
          @click="closeContextMenu"
        >
          <div class="mobile-file-action-modal card-hand-drawn bg-bg-primary p-4" @click.stop>
            <div class="font-handwritten text-base text-text-primary mb-3">
              {{ contextMenu.type === 'folder' ? '文件夹操作' : '文件操作' }}
            </div>
            <div class="space-y-2">
              <button v-if="contextMenu.type === 'file'" class="mobile-file-sheet-btn" @click="handleItemDoubleClick(contextMenu.item!)">打开文件</button>
              <button class="mobile-file-sheet-btn" @click="handleRename">重命名</button>
              <button class="mobile-file-sheet-btn text-accent" @click="handleDelete">删除</button>
              <button class="mobile-file-sheet-btn" @click="closeContextMenu">取消</button>
            </div>
          </div>
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

    <!-- 新建文件对话框 -->
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
          v-if="showCreateFileDialog"
          class="fixed inset-0 z-[10000] flex items-center justify-center bg-border-primary/50"
          @click.self="showCreateFileDialog = false"
        >
          <div class="card-hand-drawn p-6 max-w-md w-full mx-4 bg-bg-primary" style="box-shadow: 8px 8px 0px var(--color-border-primary);">
            <h2 class="font-handwritten text-2xl text-text-primary mb-4">新建文本/代码文件</h2>
            <div class="space-y-3">
              <input
                v-model="newFileName"
                type="text"
                class="input-hand-drawn w-full px-3 py-2 bg-bg-secondary"
                placeholder="输入文件名（不含扩展名）"
              />
              <CustomSelect v-model="newFileType" :options="TEXT_FILE_TYPES" width="100%" />
            </div>
            <div class="flex gap-2 mt-5">
              <button class="btn-hand-drawn px-4 py-2 flex-1" @click="createTextFile">创建</button>
              <button class="btn-hand-drawn px-4 py-2 flex-1" @click="showCreateFileDialog = false">取消</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 文本/代码编辑器 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isEditorOpen" class="fixed inset-0 z-[10000] flex items-center justify-center bg-border-primary/50">
          <div class="card-hand-drawn w-[90vw] h-[85vh] bg-bg-primary flex flex-col" style="box-shadow: 8px 8px 0px var(--color-border-primary);">
            <div class="flex items-center gap-3 p-4 border-b border-border-primary/20">
              <div class="font-handwritten text-lg text-text-primary flex-1 truncate">
                {{ editorFile?.name }}
              </div>
              <span v-if="editorIsDirty" class="text-xs font-handwritten text-orange-600">未保存</span>
              <button class="btn-hand-drawn px-3 py-1 text-sm" :disabled="editorSaving" @click="saveEditorContent">
                {{ editorSaving ? '保存中...' : '保存 (Ctrl+S)' }}
              </button>
              <button class="btn-hand-drawn px-3 py-1 text-sm" @click="closeEditor">关闭</button>
            </div>

            <div v-if="editorLoading" class="flex-1 flex items-center justify-center font-handwritten text-text-secondary">加载中...</div>
            <div v-else class="flex-1 grid grid-cols-[1fr_260px] gap-4 p-4 overflow-hidden">
              <textarea
                v-model="editorContent"
                class="input-hand-drawn w-full h-full resize-none p-4 font-mono text-sm bg-bg-secondary"
                spellcheck="false"
              ></textarea>
              <div class="space-y-3 overflow-auto">
                <div>
                  <label class="block text-sm font-handwritten mb-1">语言</label>
                  <CustomSelect v-model="editorLanguage" :options="availableFileLanguages" width="100%" />
                </div>
                <div>
                  <label class="block text-sm font-handwritten mb-1">标签（逗号分隔）</label>
                  <input v-model="editorTagsInput" type="text" class="input-hand-drawn w-full px-3 py-2 bg-bg-secondary" placeholder="api, auth" />
                </div>
                <div>
                  <label class="block text-sm font-handwritten mb-1">描述</label>
                  <textarea v-model="editorDescription" rows="4" class="input-hand-drawn w-full px-3 py-2 bg-bg-secondary resize-none"></textarea>
                </div>
              </div>
            </div>
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

<style scoped>
.mobile-file-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  padding: 8px 10px 6px;
  background: color-mix(in srgb, var(--color-bg-primary) 92%, transparent);
  backdrop-filter: blur(8px);
}

.mobile-file-topbar-inner {
  min-height: 92px;
  padding: 8px 10px;
}

.mobile-file-action-btn {
  min-height: 34px;
  border: 2px solid var(--color-border-primary);
  border-radius: 10px;
  font-family: 'Patrick Hand', cursive;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.mobile-file-path {
  padding: 4px 8px;
  border: 2px solid var(--color-border-primary);
  border-radius: 10px;
  font-family: 'Patrick Hand', cursive;
  font-size: 12px;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-bg-primary) 90%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.mobile-file-path-row {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mobile-file-back-btn {
  min-height: 30px;
  padding: 0 10px;
  border: 2px solid var(--color-border-primary);
  border-radius: 10px;
  font-family: 'Patrick Hand', cursive;
  font-size: 12px;
}

.mobile-file-back-btn:disabled {
  opacity: 0.55;
}

.mobile-item-more-btn {
  min-height: 30px;
  padding: 0 8px;
  border: 2px solid var(--color-border-primary);
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: 'Patrick Hand', cursive;
  font-size: 12px;
}

.mobile-file-action-modal {
  width: min(360px, calc(100vw - 24px));
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.mobile-file-sheet-btn {
  width: 100%;
  min-height: 42px;
  border: 2px solid var(--color-border-primary);
  border-radius: 12px;
  padding: 0 12px;
  text-align: left;
  font-family: 'Patrick Hand', cursive;
  font-size: 16px;
}
</style>
