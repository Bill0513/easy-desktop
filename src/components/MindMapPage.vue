<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import MindElixir from 'mind-elixir'
import type { MindMapData, MindMapFile } from '@/types'
import MindMapHistory from './mindmap/MindMapHistory.vue'

const store = useDesktopStore()

// Mind map instance
const mindMapContainer = ref<HTMLElement | null>(null)
let mindElixir: InstanceType<typeof MindElixir> | null = null

// UI state
const currentFileName = ref<string>('')
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const showNewDialog = ref(false)
const showOpenDialog = ref(false)
const newMapName = ref('')

// Auto-save timer
let autoSaveTimer: number | null = null

// Initialize mind map
onMounted(async () => {
  store.loadMindMapHistory()

  if (mindMapContainer.value) {
    mindElixir = new MindElixir({
      el: mindMapContainer.value,
      direction: MindElixir.SIDE,
      draggable: true,
      contextMenu: true,
      toolBar: true,
      nodeMenu: true,
      keypress: true,
      locale: 'zh_CN',
      overflowHidden: false,
      mainLinkStyle: 2,
      subLinkStyle: 1,
      theme: {
        name: 'hand-drawn',
        palette: ['#fdfbf7', '#ffcdd2', '#c8e6c9', '#bbdefb', '#ffe0b2', '#f3e5f5'],
        cssVar: {
          '--main-color': '#2d2d2d',
          '--main-bgcolor': '#fdfbf7',
          '--color': '#2d2d2d',
          '--bgcolor': '#fdfbf7',
        }
      }
    })

    // Initialize with default data
    const defaultData = {
      nodeData: {
        id: 'root',
        topic: '新建思维导图',
        root: true,
        children: []
      }
    }

    mindElixir.init(defaultData as any)

    // Listen for changes
    mindElixir.bus.addListener('operation', handleMindMapChange)
  }

  // Keyboard shortcuts
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
  }
  window.removeEventListener('keydown', handleKeyDown)

  // Save before unmount if there are unsaved changes
  if (hasUnsavedChanges.value && store.currentMindMapId) {
    handleSave()
  }
})

// Handle mind map changes
const handleMindMapChange = () => {
  hasUnsavedChanges.value = true

  // Reset auto-save timer
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
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

  // Ctrl+O: Open
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault()
    showOpenDialog.value = true
  }
}

// Create new mind map
const handleNew = () => {
  if (hasUnsavedChanges.value) {
    if (!confirm('当前思维导图有未保存的更改，是否继续？')) {
      return
    }
  }

  showNewDialog.value = true
  newMapName.value = ''
}

// Confirm new mind map creation
const confirmNew = async () => {
  if (!newMapName.value.trim()) {
    alert('请输入思维导图名称')
    return
  }

  try {
    const fileItem = await store.createMindMapFile(newMapName.value.trim())
    store.currentMindMapId = fileItem.id
    currentFileName.value = fileItem.name
    hasUnsavedChanges.value = false

    // Reset mind map
    const defaultData = {
      nodeData: {
        id: 'root',
        topic: newMapName.value.trim(),
        root: true,
        children: []
      }
    }

    mindElixir?.init(defaultData as any)

    showNewDialog.value = false
  } catch (error) {
    alert('创建失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

// Open existing mind map
const handleOpen = async (mindMapFile: MindMapFile) => {
  if (hasUnsavedChanges.value) {
    if (!confirm('当前思维导图有未保存的更改，是否继续？')) {
      return
    }
  }

  try {
    const data = await store.loadMindMapFile(mindMapFile.fileId)
    if (data) {
      mindElixir?.init(data as any)
      store.currentMindMapId = mindMapFile.fileId
      currentFileName.value = mindMapFile.name
      hasUnsavedChanges.value = false

      // Update history
      const updatedFile: MindMapFile = {
        ...mindMapFile,
        lastOpened: Date.now()
      }
      store.updateMindMapHistory(updatedFile)

      showOpenDialog.value = false
    }
  } catch (error) {
    alert('打开失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

// Save current mind map
const handleSave = async () => {
  if (!store.currentMindMapId || !mindElixir) {
    alert('请先创建或打开一个思维导图')
    return
  }

  isSaving.value = true

  try {
    const data = mindElixir.getData() as MindMapData
    const success = await store.saveMindMapFile(store.currentMindMapId, data)

    if (success) {
      hasUnsavedChanges.value = false

      // Update history
      const mindMapFile: MindMapFile = {
        id: store.currentMindMapId,
        name: currentFileName.value,
        fileId: store.currentMindMapId,
        lastOpened: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      store.updateMindMapHistory(mindMapFile)
    } else {
      alert('保存失败')
    }
  } catch (error) {
    alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isSaving.value = false
  }
}

// Export mind map
const handleExport = (format: 'png' | 'svg' | 'json') => {
  if (!mindElixir) return

  switch (format) {
    case 'png':
      // Use screenshot or canvas export
      alert('PNG导出功能需要额外配置，请使用JSON格式导出')
      break
    case 'svg':
      // Use screenshot or canvas export
      alert('SVG导出功能需要额外配置，请使用JSON格式导出')
      break
    case 'json':
      const data = mindElixir.getData()
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
  <div class="w-full h-full flex bg-paper">
    <!-- Left sidebar with tools -->
    <div class="w-16 flex-shrink-0 border-r-2 border-pencil/20 flex flex-col items-center gap-3 py-4">
      <button
        class="btn-hand-drawn p-3 w-12 h-12 flex items-center justify-center"
        @click="handleNew"
        title="新建"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <button
        class="btn-hand-drawn p-3 w-12 h-12 flex items-center justify-center"
        @click="showOpenDialog = true"
        title="打开"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </button>

      <button
        class="btn-hand-drawn p-3 w-12 h-12 flex items-center justify-center"
        :class="{ 'opacity-50': !hasUnsavedChanges || isSaving }"
        @click="handleSave"
        :disabled="!hasUnsavedChanges || isSaving"
        title="保存"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      </button>

      <div class="flex-1"></div>

      <!-- Export dropdown -->
      <div class="relative group">
        <button
          class="btn-hand-drawn p-3 w-12 h-12 flex items-center justify-center"
          title="导出"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        <div class="absolute left-full ml-2 top-0 card-hand-drawn py-2 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
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
      <!-- Title bar -->
      <div class="flex items-center justify-center p-4 border-b-2 border-pencil/20">
        <span class="font-handwritten text-lg text-pencil">
          {{ currentFileName || '未命名思维导图' }}
          <span v-if="hasUnsavedChanges" class="text-accent">*</span>
        </span>
      </div>

      <!-- Mind map container -->
      <div ref="mindMapContainer" class="flex-1 relative"></div>

      <!-- History section -->
      <MindMapHistory
        :history="store.mindMapHistory"
        @open="handleOpen"
        @remove="store.removeMindMapFromHistory"
      />
    </div>

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

    <!-- Open dialog -->
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
          v-if="showOpenDialog"
          class="fixed inset-0 z-[10000] flex items-center justify-center bg-pencil/50"
          @click.self="showOpenDialog = false"
        >
          <div class="card-hand-drawn p-6 max-w-2xl w-full mx-4 bg-paper" style="box-shadow: 8px 8px 0px #2d2d2d;">
            <h2 class="font-handwritten text-2xl text-pencil mb-4">打开思维导图</h2>

            <!-- File list from file system -->
            <div class="max-h-96 overflow-y-auto space-y-2">
              <div
                v-for="file in store.files.filter(f => f.name.endsWith('.mindmap'))"
                :key="file.id"
                class="card-hand-drawn p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                @click="handleOpen({ id: file.id, name: file.name, fileId: file.id, lastOpened: Date.now(), createdAt: file.createdAt, updatedAt: file.updatedAt })"
              >
                <div class="flex items-center gap-3">
                  <div class="text-2xl">🧠</div>
                  <div class="flex-1">
                    <div class="font-handwritten text-sm text-pencil">{{ file.name }}</div>
                    <div class="font-handwritten text-xs text-pencil/60">
                      {{ new Date(file.updatedAt).toLocaleString() }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="store.files.filter(f => f.name.endsWith('.mindmap')).length === 0" class="text-center py-8">
                <div class="text-4xl mb-2">📂</div>
                <p class="font-handwritten text-pencil/60">暂无思维导图文件</p>
              </div>
            </div>

            <button class="btn-hand-drawn px-4 py-2 w-full mt-4" @click="showOpenDialog = false">
              关闭
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Apply hand-drawn styling to MindElixir elements */
:deep(.mind-elixir) {
  font-family: 'Patrick Hand', 'Kalam', cursive !important;
}

:deep(.mind-elixir-node) {
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px !important;
  box-shadow: 2px 2px 0px #2d2d2d !important;
}

:deep(.mind-elixir-toolbar) {
  border-radius: 15px 225px 15px 225px / 225px 15px 255px 15px !important;
  box-shadow: 4px 4px 0px #2d2d2d !important;
  background: #fdfbf7 !important;
  border: 2px solid #2d2d2d !important;
}
</style>
