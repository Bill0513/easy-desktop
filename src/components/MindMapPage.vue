<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
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
  e.preventDefault()
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
}

const hideContextMenu = () => {
  showContextMenu.value = false
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
    instance.on('node_contextmenu', (e: MouseEvent) => {
      handleContextMenu(e)
    })

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
  <div class="w-full h-full flex">
    <!-- Left sidebar with tools -->
    <div class="w-20 flex-shrink-0 border-r-2 border-pencil/20 flex flex-col items-center gap-2 py-4" :style="{ backgroundColor: store.backgroundColor }">
      <!-- 新建 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="新建 (Ctrl+N)"
        @click="handleNew"
      >
        <Plus :stroke-width="2.5" class="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-pencil/60">新建</span>
      </button>

      <!-- 保存 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        :class="{ 'opacity-50 cursor-not-allowed': !hasUnsavedChanges || isSaving }"
        title="保存 (Ctrl+S)"
        @click="handleSave"
        :disabled="!hasUnsavedChanges || isSaving"
      >
        <Save :stroke-width="2.5" class="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-pencil/60">保存</span>
      </button>

      <!-- 分隔线 -->
      <div class="w-10 h-px bg-pencil/20 my-1"></div>

      <!-- 撤销 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        :class="{ 'opacity-50 cursor-not-allowed': !canUndo }"
        title="撤销 (Ctrl+Z)"
        @click="undo"
        :disabled="!canUndo"
      >
        <Undo :stroke-width="2.5" class="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-pencil/60">撤销</span>
      </button>

      <!-- 重做 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        :class="{ 'opacity-50 cursor-not-allowed': !canRedo }"
        title="重做 (Ctrl+Y)"
        @click="redo"
        :disabled="!canRedo"
      >
        <Redo :stroke-width="2.5" class="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-pencil/60">重做</span>
      </button>

      <!-- 分隔线 -->
      <div class="w-10 h-px bg-pencil/20 my-1"></div>

      <!-- 放大 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="放大"
        @click="zoomIn"
      >
        <ZoomIn :stroke-width="2.5" class="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-pencil/60">放大</span>
      </button>

      <!-- 缩小 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="缩小"
        @click="zoomOut"
      >
        <ZoomOut :stroke-width="2.5" class="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-pencil/60">缩小</span>
      </button>

      <!-- 适应画布 -->
      <button
        class="p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col items-center gap-0.5"
        title="适应画布"
        @click="fitCanvas"
      >
        <Maximize :stroke-width="2.5" class="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span class="text-[10px] font-handwritten text-pencil/60">适应</span>
      </button>

      <div class="flex-1"></div>

      <!-- 导出下拉菜单 -->
      <div class="relative group">
        <button
          class="p-2 hover:bg-muted/50 rounded-lg transition-colors flex flex-col items-center gap-0.5"
          title="导出"
        >
          <Download :stroke-width="2.5" class="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span class="text-[10px] font-handwritten text-pencil/60">导出</span>
        </button>
        <div class="absolute left-full ml-2 bottom-0 card-hand-drawn py-2 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 bg-paper">
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50"
            @click="handleExport('png')"
          >
            PNG 图片
          </button>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50"
            @click="handleExport('svg')"
          >
            SVG 矢量
          </button>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50"
            @click="handleExport('json')"
          >
            JSON 数据
          </button>
        </div>
      </div>
    </div>

    <!-- Main content area -->
    <div class="flex-1 flex flex-col">
      <!-- Title bar with tips (only show when mind map is open) -->
      <div v-if="isMindMapOpen" class="flex items-center justify-between p-4 border-b-2 border-pencil/20">
        <div class="text-xs font-handwritten text-pencil/40">
          
        </div>
        <span class="font-handwritten text-lg text-pencil">
          {{ currentFileName || '未命名思维导图' }}
          <span v-if="hasUnsavedChanges" class="text-accent">*</span>
        </span>
        <div class="text-xs font-handwritten text-pencil/40">
          拖拽节点可调整位置 | 滚轮缩放
        </div>
      </div>

      <!-- Mind map container (only show when mind map is open) -->
      <div
        v-if="isMindMapOpen"
        ref="mindMapContainer"
        class="flex-1 relative overflow-hidden"
        style="min-height: 400px;"
        @contextmenu="handleContextMenu"
      ></div>

      <!-- Empty state (show when no mind map is open) -->
      <div v-else class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <Brain :stroke-width="1.5" class="w-24 h-24 mx-auto mb-6 text-pencil/30" />
          <h2 class="font-handwritten text-2xl text-pencil mb-2">开始创建思维导图</h2>
          <p class="font-handwritten text-pencil/60 mb-6">点击"新建"创建新的思维导图，或从下方历史记录中选择</p>
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
        @open="handleOpen"
        @remove="store.deleteMindMap"
      />
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
          v-if="showContextMenu"
          class="fixed z-[10001] card-hand-drawn py-2 min-w-[160px] bg-paper"
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
            <span class="ml-auto text-pencil/40 text-xs">Tab</span>
          </button>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
            @click="addSiblingNode"
            :disabled="!hasActiveNode"
            :class="{ 'opacity-50 cursor-not-allowed': !hasActiveNode }"
          >
            <ArrowRight :stroke-width="2" class="w-4 h-4" />
            添加同级节点
            <span class="ml-auto text-pencil/40 text-xs">Enter</span>
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
            <span class="ml-auto text-pencil/40 text-xs">Ctrl+C</span>
          </button>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
            @click="cutNode"
            :disabled="!hasActiveNode"
            :class="{ 'opacity-50 cursor-not-allowed': !hasActiveNode }"
          >
            <Scissors :stroke-width="2" class="w-4 h-4" />
            剪切
            <span class="ml-auto text-pencil/40 text-xs">Ctrl+X</span>
          </button>
          <button
            class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 flex items-center gap-2"
            @click="pasteNode"
          >
            <Clipboard :stroke-width="2" class="w-4 h-4" />
            粘贴
            <span class="ml-auto text-pencil/40 text-xs">Ctrl+V</span>
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
            <span class="ml-auto text-pencil/40 text-xs">Delete</span>
          </button>
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
          <div class="card-hand-drawn p-6 max-w-md w-full mx-4 bg-paper" style="box-shadow: 8px 8px 0px #2d2d2d;">
            <h2 class="font-handwritten text-2xl text-pencil mb-4">新建思维导图</h2>

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
          <div class="card-hand-drawn p-6 max-w-md w-full mx-4 bg-paper" style="box-shadow: 8px 8px 0px #2d2d2d;">
            <h2 class="font-handwritten text-2xl text-pencil mb-4">{{ confirmDialogTitle }}</h2>
            <p class="font-handwritten text-pencil/80 mb-6">{{ confirmDialogMessage }}</p>

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
</style>
