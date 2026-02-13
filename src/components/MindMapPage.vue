<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import { useResponsiveMode } from '@/composables/useResponsiveMode'
import MindMap from 'simple-mind-map'
// 导入插件
import Drag from 'simple-mind-map/src/plugins/Drag.js'
import Select from 'simple-mind-map/src/plugins/Select.js'
import Export from 'simple-mind-map/src/plugins/Export.js'
import KeyboardNavigation from 'simple-mind-map/src/plugins/KeyboardNavigation.js'
import type { MindMapFile, SimpleMindMapNode } from '@/types'
import MindMapHistory from './mindmap/MindMapHistory.vue'
import {
  Plus,
  Save,
  Download,
  Brain,
  PlusCircle,
  ArrowRight,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize
} from 'lucide-vue-next'

// 注册插件
MindMap.usePlugin(Drag)
MindMap.usePlugin(Select)
MindMap.usePlugin(Export)
MindMap.usePlugin(KeyboardNavigation)

const store = useDesktopStore()
const { isMobile } = useResponsiveMode()

// Mind map instance - use shallowRef to preserve the instance
const mindMapContainer = ref<HTMLElement | null>(null)
const mindMapInstance = shallowRef<InstanceType<typeof MindMap> | null>(null)

// UI state
const currentFileName = ref<string>('')
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const showNewDialog = ref(false)
const newMapName = ref('')
const isInitialized = ref(false)
const isMindMapOpen = ref(false)  // 是否打开了思维导图
const isLoadingData = ref(false)  // 是否正在加载数据（用于区分是加载还是用户编辑）

// 手绘风格确认对话框状态
const showConfirmDialog = ref(false)
const confirmDialogTitle = ref('')
const confirmDialogMessage = ref('')
const confirmDialogCallback = ref<(() => void) | null>(null)

// Context menu state
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const hasActiveNode = ref(false)
const showMobileMoreSheet = ref(false)
const showMobileExportSheet = ref(false)

// Undo/Redo state
const canUndo = ref(false)
const canRedo = ref(false)

// Auto-save timer
let autoSaveTimer: number | null = null
// Loading data timer (用于延迟重置 isLoadingData 标志)
let loadingDataTimer: number | null = null

// 手绘风格主题配置
const handDrawnTheme = {
  // 背景色
  backgroundColor: '#fdfbf7',
  // 连线样式
  lineColor: '#2d2d2d',
  lineWidth: 2,
  // 根节点样式
  root: {
    fillColor: '#fff9c4',
    fontFamily: 'Kalam, Patrick Hand, cursive',
    color: '#2d2d2d',
    fontSize: 18,
    fontWeight: 'bold',
    borderColor: '#2d2d2d',
    borderWidth: 3,
    borderRadius: 8
  },
  // 二级节点样式
  second: {
    fillColor: '#ffffff',
    fontFamily: 'Patrick Hand, cursive',
    color: '#2d2d2d',
    fontSize: 16,
    fontWeight: 'normal',
    borderColor: '#2d2d2d',
    borderWidth: 2,
    borderRadius: 6
  },
  // 三级及以下节点样式
  node: {
    fillColor: '#fdfbf7',
    fontFamily: 'Patrick Hand, cursive',
    color: '#2d2d2d',
    fontSize: 14,
    fontWeight: 'normal',
    borderColor: '#2d2d2d',
    borderWidth: 1,
    borderRadius: 4
  },
  // 概要节点样式
  generalization: {
    fillColor: '#ffcdd2',
    fontFamily: 'Patrick Hand, cursive',
    color: '#2d2d2d',
    fontSize: 14,
    borderColor: '#ff4d4d',
    borderWidth: 2
  }
}

// 默认数据
const getDefaultData = (name: string = '新建思维导图'): SimpleMindMapNode => ({
  data: {
    text: name,
    expand: true,
    uid: 'root'
  },
  children: []
})

// Context menu handlers
const handleContextMenu = (e: MouseEvent) => {
  if (isMobile.value) return
  e.preventDefault()
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
}

const handleContainerContextMenu = (e: MouseEvent) => {
  handleContextMenu(e)
}

const hideContextMenu = () => {
  showContextMenu.value = false
  showMobileMoreSheet.value = false
  showMobileExportSheet.value = false
}

// Node operations
const addChildNode = () => {
  if (mindMapInstance.value) {
    mindMapInstance.value.execCommand('INSERT_CHILD_NODE')
  }
  hideContextMenu()
}

const addSiblingNode = () => {
  if (mindMapInstance.value) {
    mindMapInstance.value.execCommand('INSERT_NODE')
  }
  hideContextMenu()
}

const deleteNode = () => {
  if (mindMapInstance.value) {
    mindMapInstance.value.execCommand('REMOVE_NODE')
  }
  hideContextMenu()
}

const copyNode = () => {
  if (mindMapInstance.value) {
    (mindMapInstance.value.renderer as any).copy()
  }
  hideContextMenu()
}

const cutNode = () => {
  if (mindMapInstance.value) {
    (mindMapInstance.value.renderer as any).cut()
  }
  hideContextMenu()
}

const pasteNode = () => {
  if (mindMapInstance.value) {
    (mindMapInstance.value.renderer as any).paste()
  }
  hideContextMenu()
}

// Update undo/redo state
const updateUndoRedoState = () => {
  if (mindMapInstance.value) {
    const history = (mindMapInstance.value as any).command.history
    if (history) {
      canUndo.value = history.activeIndex > 0
      canRedo.value = history.activeIndex < history.length - 1
    }
  }
}

const undo = () => {
  if (mindMapInstance.value) {
    mindMapInstance.value.execCommand('BACK')
  }
}

const redo = () => {
  if (mindMapInstance.value) {
    mindMapInstance.value.execCommand('FORWARD')
  }
}

const zoomIn = () => {
  if (mindMapInstance.value) {
    ;(mindMapInstance.value as any).view.enlarge()
  }
}

const zoomOut = () => {
  if (mindMapInstance.value) {
    ;(mindMapInstance.value as any).view.narrow()
  }
}

const fitCanvas = () => {
  if (mindMapInstance.value) {
    ;(mindMapInstance.value as any).view.fit()
  }
}

const openMobileExportSheet = () => {
  showMobileExportSheet.value = true
  showMobileMoreSheet.value = false
}

const openMobileMoreSheet = () => {
  showMobileMoreSheet.value = true
  showMobileExportSheet.value = false
}

// Initialize mind map with retry mechanism
const initMindMap = async (retryCount = 0): Promise<boolean> => {
  if (!mindMapContainer.value) return false

  const container = mindMapContainer.value

  // Check if container has dimensions
  if (container.offsetWidth === 0 || container.offsetHeight === 0) {
    if (retryCount < 10) {
      // Retry after a delay, with increasing wait time
      await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)))
      return initMindMap(retryCount + 1)
    }
    console.error('Mind map container has no dimensions after retries')
    return false
  }

  try {
    const instance = new MindMap({
      el: container,
      data: getDefaultData(),
      layout: 'logicalStructure',
      theme: 'classic',
      themeConfig: handDrawnTheme,
      // 基础配置
      mousewheelAction: 'zoom',
      mouseScaleCenterUseMousePosition: true,
      // 导出配置
      exportPaddingX: 20,
      exportPaddingY: 20,
      // 节点配置
      maxTag: 5,
      // 其他配置
      readonly: false,
      initRootNodePosition: ['center', 'center'],
      // 拖拽配置
      enableFreeDrag: false,
      // 快捷键配置
      enableShortcutOnlyWhenMouseInSvg: true,
      // 显示快速添加子节点按钮
      isShowCreateChildBtnIcon: true
    } as any)

    // Store the instance
    mindMapInstance.value = instance

    // Listen for changes
    instance.on('data_change', handleMindMapChange)

    // Listen for undo/redo state changes
    instance.on('back_forward', (index: number, length: number) => {
      canUndo.value = index > 0
      canRedo.value = index < length - 1
    })

    // Listen for node active state
    instance.on('node_active', (_node: any, activeNodeList: any[]) => {
      hasActiveNode.value = activeNodeList && activeNodeList.length > 0
    })

    // Listen for right click
    if (!isMobile.value) {
      instance.on('node_contextmenu', (e: MouseEvent) => {
        handleContextMenu(e)
      })
    }

    // Click to hide context menu
    instance.on('draw_click', () => {
      hideContextMenu()
    })

    isInitialized.value = true
    return true
  } catch (error) {
    console.error('Failed to initialize mind map:', error)
    return false
  }
}

// Initialize mind map
onMounted(async () => {
  store.loadMindMaps()

  // Keyboard shortcuts
  window.addEventListener('keydown', handleKeyDown)

  // Click outside to hide context menu
  document.addEventListener('click', hideContextMenu)
})

// Watch for tab changes to reinitialize if needed
watch(() => store.activeTab, async (newTab) => {
  if (newTab === 'mindmap' && isMindMapOpen.value && !isInitialized.value) {
    await nextTick()
    await initMindMap()
  }
})

// Watch for currentMindMapId changes (from global search)
watch(() => store.currentMindMapId, async (newId, oldId) => {
  // 只在ID真正变化且新ID存在时才打开
  if (newId && newId !== oldId && store.activeTab === 'mindmap') {
    const mindMapFile = store.mindMaps.find(m => m.id === newId)
    if (mindMapFile) {
      await handleOpen(mindMapFile)
    }
  }
})

onUnmounted(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  window.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', hideContextMenu)

  // Save before unmount if there are unsaved changes
  if (hasUnsavedChanges.value && store.currentMindMapId) {
    handleSave()
  }

  // Destroy mind map instance
  if (mindMapInstance.value) {
    mindMapInstance.value.destroy()
    mindMapInstance.value = null
  }
})

// Handle mind map changes
const handleMindMapChange = () => {
  // 如果正在加载数据，不标记为未保存
  if (isLoadingData.value) {
    return
  }

  hasUnsavedChanges.value = true

  // Reset auto-save timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }

  // Auto-save after 3 seconds of inactivity
  autoSaveTimer = window.setTimeout(() => {
    if (hasUnsavedChanges.value && store.currentMindMapId) {
      handleSave()
    }
  }, 3000)
}

// Keyboard shortcuts
const handleKeyDown = (e: KeyboardEvent) => {
  // Only handle shortcuts when mindmap tab is active
  if (store.activeTab !== 'mindmap') return

  // Ctrl+S: Save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSave()
  }

  // Ctrl+N: New
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault()
    handleNew()
  }
}

// 显示手绘风格确认对话框
const showHandDrawnConfirm = (title: string, message: string, callback: () => void) => {
  confirmDialogTitle.value = title
  confirmDialogMessage.value = message
  confirmDialogCallback.value = callback
  showConfirmDialog.value = true
}

// 确认对话框确认
const handleConfirmDialogConfirm = () => {
  showConfirmDialog.value = false
  if (confirmDialogCallback.value) {
    confirmDialogCallback.value()
  }
}

// 确认对话框取消
const handleConfirmDialogCancel = () => {
  showConfirmDialog.value = false
  confirmDialogCallback.value = null
}

// Create new mind map
const handleNew = () => {
  if (hasUnsavedChanges.value) {
    showHandDrawnConfirm('未保存的更改', '当前思维导图有未保存的更改，是否继续？', () => {
      showNewDialog.value = true
      newMapName.value = ''
    })
    return
  }

  showNewDialog.value = true
  newMapName.value = ''
}

// Confirm new mind map creation
const confirmNew = async () => {
  if (!newMapName.value.trim()) {
    return
  }

  try {
    const mindMapFile = store.createMindMap(newMapName.value.trim())
    store.currentMindMapId = mindMapFile.id
    currentFileName.value = mindMapFile.name
    hasUnsavedChanges.value = false
    isMindMapOpen.value = true

    // 初始化思维导图（如果还没初始化）
    if (!isInitialized.value) {
      await nextTick()
      await initMindMap()
    }

    // 清除之前的定时器
    if (loadingDataTimer) {
      clearTimeout(loadingDataTimer)
    }

    // 设置加载标志，防止 data_change 事件标记为未保存
    isLoadingData.value = true
    // Reset mind map with new data
    mindMapInstance.value?.setData(mindMapFile.data)
    // 延迟重置标志，确保所有异步事件都已处理完毕
    loadingDataTimer = window.setTimeout(() => {
      isLoadingData.value = false
      // 更新撤销/重做状态
      updateUndoRedoState()
    }, 200)

    showNewDialog.value = false
  } catch (error) {
    console.error('创建失败:', error)
  }
}

// Open existing mind map
const handleOpen = async (mindMapFile: MindMapFile) => {
  const doOpen = async () => {
    const data = store.loadMindMap(mindMapFile.id)
    if (data) {
      store.currentMindMapId = mindMapFile.id
      currentFileName.value = mindMapFile.name
      hasUnsavedChanges.value = false
      isMindMapOpen.value = true

      // 初始化思维导图（如果还没初始化）
      if (!isInitialized.value) {
        await nextTick()
        await initMindMap()
      }

      // 清除之前的定时器
      if (loadingDataTimer) {
        clearTimeout(loadingDataTimer)
      }

      // 设置加载标志，防止 data_change 事件标记为未保存
      isLoadingData.value = true
      mindMapInstance.value?.setFullData(data)
      // 延迟重置标志，确保所有异步事件都已处理完毕
      loadingDataTimer = window.setTimeout(() => {
        isLoadingData.value = false
        // 更新撤销/重做状态
        updateUndoRedoState()
      }, 200)
    }
  }

  if (hasUnsavedChanges.value) {
    showHandDrawnConfirm('未保存的更改', '当前思维导图有未保存的更改，是否继续？', doOpen)
    return
  }

  await doOpen()
}

// Save current mind map
const handleSave = () => {
  if (!store.currentMindMapId || !mindMapInstance.value) {
    return
  }

  isSaving.value = true

  try {
    const data = mindMapInstance.value.getData(true) as SimpleMindMapNode
    const success = store.saveMindMap(store.currentMindMapId, data)

    if (success) {
      hasUnsavedChanges.value = false
    }
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    isSaving.value = false
  }
}

// Export mind map
const handleExport = (format: 'png' | 'svg' | 'json') => {
  if (!mindMapInstance.value) return

  switch (format) {
    case 'png':
      mindMapInstance.value.export('png', true, currentFileName.value || '思维导图')
      break
    case 'svg':
      mindMapInstance.value.export('svg', true, currentFileName.value || '思维导图')
      break
    case 'json':
      const data = mindMapInstance.value.getData(true)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentFileName.value || '思维导图'}.json`
      a.click()
      URL.revokeObjectURL(url)
      break
  }
}
</script>

<template>
  <div class="w-full h-full flex" :class="isMobile ? 'flex-col' : ''">
    <!-- Left sidebar with tools -->
    <div v-if="!isMobile" class="w-20 flex-shrink-0 bg-bg-primary border-r-2 border-border-primary/20 flex flex-col items-center gap-2 py-4">
      <!-- 新建 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="新建 (Ctrl+N)"
        @click="handleNew"
      >
        <Plus :stroke-width="2.5" class="w-6 h-6 text-text-primary group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-text-secondary">新建</span>
      </button>

      <!-- 保存 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        :class="{ 'opacity-50 cursor-not-allowed': !hasUnsavedChanges || isSaving }"
        title="保存 (Ctrl+S)"
        @click="handleSave"
        :disabled="!hasUnsavedChanges || isSaving"
      >
        <Save :stroke-width="2.5" class="w-6 h-6 text-text-primary group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-text-secondary">保存</span>
      </button>

      <!-- 分隔线 -->
      <div class="w-10 h-px bg-border-primary/20 my-1"></div>

      <!-- 撤销 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        :class="{ 'opacity-50 cursor-not-allowed': !canUndo }"
        title="撤销 (Ctrl+Z)"
        @click="undo"
        :disabled="!canUndo"
      >
        <Undo :stroke-width="2.5" class="w-5 h-5 text-text-primary group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-text-secondary">撤销</span>
      </button>

      <!-- 重做 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        :class="{ 'opacity-50 cursor-not-allowed': !canRedo }"
        title="重做 (Ctrl+Y)"
        @click="redo"
        :disabled="!canRedo"
      >
        <Redo :stroke-width="2.5" class="w-5 h-5 text-text-primary group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-text-secondary">重做</span>
      </button>

      <!-- 分隔线 -->
      <div class="w-10 h-px bg-border-primary/20 my-1"></div>

      <!-- 放大 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="放大"
        @click="zoomIn"
      >
        <ZoomIn :stroke-width="2.5" class="w-5 h-5 text-text-primary group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-text-secondary">放大</span>
      </button>

      <!-- 缩小 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="缩小"
        @click="zoomOut"
      >
        <ZoomOut :stroke-width="2.5" class="w-5 h-5 text-text-primary group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-text-secondary">缩小</span>
      </button>

      <!-- 适应画布 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="适应画布"
        @click="fitCanvas"
      >
        <Maximize :stroke-width="2.5" class="w-5 h-5 text-text-primary group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-text-secondary">适应</span>
      </button>

      <div class="flex-1"></div>

      <!-- 导出下拉菜单 -->
      <div class="relative group">
        <button
          class="p-2 hover:bg-muted/50 rounded-lg transition-colors flex flex-col items-center gap-0.5"
          title="导出"
        >
          <Download :stroke-width="2.5" class="w-6 h-6 text-text-primary group-hover:scale-110 transition-transform" />
          <span class="text-[10px] font-handwritten text-text-secondary">导出</span>
        </button>
        <div class="absolute left-full ml-2 bottom-0 card-hand-drawn py-2 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 bg-bg-primary">
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm text-text-primary hover:bg-muted/50"
            @click="handleExport('png')"
          >
            PNG 图片
          </button>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm text-text-primary hover:bg-muted/50"
            @click="handleExport('svg')"
          >
            SVG 矢量
          </button>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm text-text-primary hover:bg-muted/50"
            @click="handleExport('json')"
          >
            JSON 数据
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile top tools -->
    <div v-if="isMobile" class="mobile-mindmap-topbar">
      <div class="mobile-mindmap-topbar-inner card-hand-drawn bg-bg-secondary">
        <div class="min-w-0 flex-1">
          <div class="font-handwritten text-base text-text-primary truncate">
            {{ currentFileName || '未命名思维导图' }}
            <span v-if="hasUnsavedChanges" class="text-accent">*</span>
          </div>
          <div class="font-handwritten text-xs text-text-secondary">移动编辑模式</div>
        </div>
        <button class="mobile-mindmap-btn" @click="handleNew">
          <Plus :stroke-width="2.5" class="w-4 h-4" />
          新建
        </button>
        <button class="mobile-mindmap-btn" :disabled="!hasUnsavedChanges || isSaving" @click="handleSave">
          <Save :stroke-width="2.5" class="w-4 h-4" />
          保存
        </button>
      </div>
    </div>

    <!-- Main content area -->
    <div class="flex-1 flex flex-col">
      <!-- Title bar with tips (only show when mind map is open) -->
      <div v-if="isMindMapOpen && !isMobile" class="flex items-center justify-between p-4 border-b-2 border-border-primary/20">
        <div class="text-xs font-handwritten text-text-secondary/70">
          
        </div>
        <span class="font-handwritten text-lg text-text-primary">
          {{ currentFileName || '未命名思维导图' }}
          <span v-if="hasUnsavedChanges" class="text-accent">*</span>
        </span>
        <div class="text-xs font-handwritten text-text-secondary/70">
          拖拽节点可调整位置 | 滚轮缩放
        </div>
      </div>

      <!-- Mind map container (only show when mind map is open) -->
      <div
        v-if="isMindMapOpen"
        ref="mindMapContainer"
        class="flex-1 relative overflow-hidden"
        :class="isMobile ? 'pt-[74px] pb-[84px]' : ''"
        style="min-height: 400px;"
        @contextmenu="handleContainerContextMenu"
      ></div>

      <!-- Empty state (show when no mind map is open) -->
      <div v-else class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <Brain :stroke-width="1.5" class="w-24 h-24 mx-auto mb-6 text-text-secondary" />
          <h2 class="font-handwritten text-2xl text-text-primary mb-2">开始创建思维导图</h2>
          <p class="font-handwritten text-text-secondary mb-6">点击"新建"创建新的思维导图，或从下方历史记录中选择</p>
          <button
            class="btn-hand-drawn px-6 py-3 font-handwritten text-lg"
            @click="handleNew"
          >
            <Plus :stroke-width="2.5" class="w-5 h-5 inline-block mr-2" />
            新建思维导图
          </button>
        </div>
      </div>

      <!-- History section -->
      <MindMapHistory
        :history="store.mindMaps"
        :is-mobile="isMobile"
        @open="handleOpen"
        @remove="store.deleteMindMap"
      />
    </div>

    <!-- Mobile bottom actions -->
    <div v-if="isMobile && isMindMapOpen" class="mobile-mindmap-bottombar">
      <button class="mobile-mindmap-btn" :disabled="!canUndo" @click="undo">撤销</button>
      <button class="mobile-mindmap-btn" :disabled="!canRedo" @click="redo">重做</button>
      <button class="mobile-mindmap-btn" :disabled="!hasActiveNode" @click="addChildNode">子节点</button>
      <button class="mobile-mindmap-btn" :disabled="!hasActiveNode" @click="addSiblingNode">同级</button>
      <button class="mobile-mindmap-btn" @click="openMobileExportSheet">导出</button>
      <button class="mobile-mindmap-btn" @click="openMobileMoreSheet">更多</button>
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showContextMenu && !isMobile"
          class="fixed z-[10001] card-hand-drawn py-2 min-w-[160px] bg-bg-primary"
          :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
          @click.stop
        >
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
            @click="addChildNode"
            :disabled="!hasActiveNode"
            :class="{ 'opacity-50 cursor-not-allowed': !hasActiveNode }"
          >
            <PlusCircle :stroke-width="2" class="w-4 h-4" />
            添加子节点
            <span class="ml-auto text-text-secondary/70 text-xs">Tab</span>
          </button>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
            @click="addSiblingNode"
            :disabled="!hasActiveNode"
            :class="{ 'opacity-50 cursor-not-allowed': !hasActiveNode }"
          >
            <ArrowRight :stroke-width="2" class="w-4 h-4" />
            添加同级节点
            <span class="ml-auto text-text-secondary/70 text-xs">Enter</span>
          </button>
          <div class="h-px bg-pencil/20 my-1"></div>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
            @click="copyNode"
            :disabled="!hasActiveNode"
            :class="{ 'opacity-50 cursor-not-allowed': !hasActiveNode }"
          >
            <Copy :stroke-width="2" class="w-4 h-4" />
            复制
            <span class="ml-auto text-text-secondary/70 text-xs">Ctrl+C</span>
          </button>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
            @click="cutNode"
            :disabled="!hasActiveNode"
            :class="{ 'opacity-50 cursor-not-allowed': !hasActiveNode }"
          >
            <Scissors :stroke-width="2" class="w-4 h-4" />
            剪切
            <span class="ml-auto text-text-secondary/70 text-xs">Ctrl+X</span>
          </button>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
            @click="pasteNode"
          >
            <Clipboard :stroke-width="2" class="w-4 h-4" />
            粘贴
            <span class="ml-auto text-text-secondary/70 text-xs">Ctrl+V</span>
          </button>
          <div class="h-px bg-pencil/20 my-1"></div>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2 text-accent"
            @click="deleteNode"
            :disabled="!hasActiveNode"
            :class="{ 'opacity-50 cursor-not-allowed': !hasActiveNode }"
          >
            <Trash2 :stroke-width="2" class="w-4 h-4" />
            删除
            <span class="ml-auto text-text-secondary/70 text-xs">Delete</span>
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- Mobile export sheet -->
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
          v-if="showMobileExportSheet && isMobile"
          class="fixed inset-0 z-[10000] bg-border-primary/45"
          @click="hideContextMenu"
        >
          <div class="mobile-mindmap-sheet card-hand-drawn bg-bg-primary p-4" @click.stop>
            <div class="font-handwritten text-base text-text-primary mb-3">导出</div>
            <div class="space-y-2">
              <button class="mobile-mindmap-sheet-btn" @click="handleExport('png'); hideContextMenu()">导出 PNG</button>
              <button class="mobile-mindmap-sheet-btn" @click="handleExport('svg'); hideContextMenu()">导出 SVG</button>
              <button class="mobile-mindmap-sheet-btn" @click="handleExport('json'); hideContextMenu()">导出 JSON</button>
              <button class="mobile-mindmap-sheet-btn" @click="hideContextMenu">取消</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Mobile more actions sheet -->
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
          v-if="showMobileMoreSheet && isMobile"
          class="fixed inset-0 z-[10000] bg-border-primary/45"
          @click="hideContextMenu"
        >
          <div class="mobile-mindmap-sheet card-hand-drawn bg-bg-primary p-4" @click.stop>
            <div class="font-handwritten text-base text-text-primary mb-3">更多操作</div>
            <div class="space-y-2">
              <button class="mobile-mindmap-sheet-btn" @click="zoomIn">放大</button>
              <button class="mobile-mindmap-sheet-btn" @click="zoomOut">缩小</button>
              <button class="mobile-mindmap-sheet-btn" @click="fitCanvas">适应画布</button>
              <button class="mobile-mindmap-sheet-btn" :disabled="!hasActiveNode" @click="copyNode">复制节点</button>
              <button class="mobile-mindmap-sheet-btn" :disabled="!hasActiveNode" @click="cutNode">剪切节点</button>
              <button class="mobile-mindmap-sheet-btn" @click="pasteNode">粘贴节点</button>
              <button class="mobile-mindmap-sheet-btn text-accent" :disabled="!hasActiveNode" @click="deleteNode">删除节点</button>
              <button class="mobile-mindmap-sheet-btn" @click="hideContextMenu">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- New dialog -->
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
          v-if="showNewDialog"
          class="fixed inset-0 z-[10000] flex items-center justify-center bg-pencil/50"
          @click.self="showNewDialog = false"
        >
          <div class="card-hand-drawn p-6 max-w-md w-full mx-4 bg-bg-primary" style="box-shadow: 8px 8px 0px #2d2d2d;">
            <h2 class="font-handwritten text-2xl text-text-primary mb-4">新建思维导图</h2>

            <input
              v-model="newMapName"
              type="text"
              placeholder="输入思维导图名称"
              class="input-hand-drawn w-full px-4 py-2 mb-4"
              @keydown.enter="confirmNew"
            />

            <div class="flex gap-3">
              <button class="btn-hand-drawn px-4 py-2 flex-1" @click="confirmNew">
                创建
              </button>
              <button class="btn-hand-drawn px-4 py-2 flex-1" @click="showNewDialog = false">
                取消
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
          @click.self="handleConfirmDialogCancel"
        >
          <div class="card-hand-drawn p-6 max-w-md w-full mx-4 bg-bg-primary" style="box-shadow: 8px 8px 0px #2d2d2d;">
            <h2 class="font-handwritten text-2xl text-text-primary mb-4">{{ confirmDialogTitle }}</h2>
            <p class="font-handwritten text-text-primary/80 mb-6">{{ confirmDialogMessage }}</p>

            <div class="flex gap-3">
              <button class="btn-hand-drawn px-4 py-2 flex-1" @click="handleConfirmDialogConfirm">
                确定
              </button>
              <button class="btn-hand-drawn px-4 py-2 flex-1" @click="handleConfirmDialogCancel">
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
/* Ensure mind map container has proper dimensions */
:deep(.smm-container) {
  width: 100% !important;
  height: 100% !important;
}

/* 手绘风格节点样式 */
:deep(.smm-node) {
  border-radius: 8px !important;
}

:deep(.smm-node-text) {
  font-family: 'Patrick Hand', 'Kalam', cursive !important;
}

/* 工具栏样式 */
:deep(.smm-toolbar) {
  border-radius: 8px !important;
  box-shadow: 4px 4px 0px #2d2d2d !important;
  background: #fdfbf7 !important;
  border: 2px solid #2d2d2d !important;
}

.mobile-mindmap-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  padding: 8px 10px 6px;
  background: color-mix(in srgb, var(--color-bg-primary) 92%, transparent);
  backdrop-filter: blur(8px);
}

.mobile-mindmap-topbar-inner {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}

.mobile-mindmap-bottombar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  z-index: 9998;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--color-bg-secondary) 94%, transparent);
  border-top: 2px solid var(--color-border-primary);
}

.mobile-mindmap-btn {
  min-height: 34px;
  border: 2px solid var(--color-border-primary);
  border-radius: 10px;
  padding: 0 8px;
  font-family: 'Patrick Hand', cursive;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.mobile-mindmap-sheet {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: calc(156px + env(safe-area-inset-bottom, 0px));
}

.mobile-mindmap-sheet-btn {
  width: 100%;
  min-height: 40px;
  border: 2px solid var(--color-border-primary);
  border-radius: 12px;
  text-align: left;
  padding: 0 12px;
  font-family: 'Patrick Hand', cursive;
}
</style>
