<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import SiteCard from './navigation/SiteCard.vue'
import SiteFormDialog from './navigation/SiteFormDialog.vue'
import CategoryManagerDialog from './navigation/CategoryManagerDialog.vue'
import type { NavigationSite } from '@/types'

const store = useDesktopStore()

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  type: 'blank' as 'blank' | 'site',
  siteId: null as string | null
})

// 表单弹窗状态
const formDialog = ref<{
  show: boolean
  site: NavigationSite | undefined
}>({
  show: false,
  site: undefined
})

// 分类管理对话框状态
const categoryManagerDialog = ref({
  show: false
})

// 拖拽状态
const dragState = ref({
  isDragging: false,
  draggedSiteId: null as string | null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  draggedIndex: -1
})

// 处理空白处右键
const handleBlankContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    type: 'blank',
    siteId: null
  }
}

// 处理卡片右键
const handleSiteContextMenu = (e: MouseEvent, site: NavigationSite) => {
  e.preventDefault()
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    type: 'site',
    siteId: site.id
  }
}

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenu.value.show = false
}

// 打开新增表单
const openAddForm = () => {
  formDialog.value = {
    show: true,
    site: undefined
  }
  closeContextMenu()
}

// 打开编辑表单
const openEditForm = () => {
  const site = store.sortedNavigationSites.find(s => s.id === contextMenu.value.siteId)
  if (site) {
    formDialog.value = {
      show: true,
      site
    }
  }
  closeContextMenu()
}

// 删除网站
const deleteSite = () => {
  if (contextMenu.value.siteId) {
    if (confirm('确定要删除这个网站吗？')) {
      store.deleteNavigationSite(contextMenu.value.siteId)
    }
  }
  closeContextMenu()
}

// 提交表单
const handleFormSubmit = async (data: {
  name: string
  url: string
  description: string
  color: string
  category?: string
}) => {
  if (formDialog.value.site) {
    // 编辑
    await store.updateNavigationSite(formDialog.value.site.id, data)
  } else {
    // 新增
    await store.addNavigationSite(data)
  }
  formDialog.value.show = false
}

// 打开分类管理对话框
const openCategoryManager = () => {
  categoryManagerDialog.value.show = true
}

// 拖拽开始
const handleDragStart = (e: MouseEvent, site: NavigationSite, index: number) => {
  dragState.value = {
    isDragging: true,
    draggedSiteId: site.id,
    startX: e.clientX,
    startY: e.clientY,
    currentX: e.clientX,
    currentY: e.clientY,
    draggedIndex: index
  }
  store.draggedSiteId = site.id

  const handleMouseMove = (e: MouseEvent) => {
    if (dragState.value.isDragging) {
      dragState.value.currentX = e.clientX
      dragState.value.currentY = e.clientY
    }
  }

  const handleMouseUp = () => {
    if (dragState.value.isDragging) {
      // 计算拖拽到的位置
      const container = document.querySelector('.navigation-grid')
      if (container) {
        const rect = container.getBoundingClientRect()
        const x = dragState.value.currentX - rect.left
        const y = dragState.value.currentY - rect.top

        // 计算目标索引（简单的网格计算）
        const cols = Math.floor(rect.width / 80)  // 60px卡片 + 20px间距
        const col = Math.floor(x / 80)
        const row = Math.floor(y / 80)
        const targetIndex = Math.min(row * cols + col, store.sortedNavigationSites.length - 1)

        if (targetIndex >= 0 && targetIndex !== dragState.value.draggedIndex) {
          store.reorderNavigationSites(dragState.value.draggedIndex, targetIndex)
        }
      }

      dragState.value.isDragging = false
      dragState.value.draggedSiteId = null
      store.draggedSiteId = null
    }

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 拖拽偏移量
const dragOffset = computed(() => {
  if (!dragState.value.isDragging) return { x: 0, y: 0 }
  return {
    x: dragState.value.currentX - dragState.value.startX,
    y: dragState.value.currentY - dragState.value.startY
  }
})
</script>

<template>
  <div
    class="w-full h-full bg-paper overflow-auto p-8"
    @contextmenu="handleBlankContextMenu"
    @click="closeContextMenu"
  >
    <!-- 标题 -->
    <div class="mb-6">
      <h1 class="font-handwritten text-3xl font-bold text-pencil">网页导航</h1>
      <p class="font-handwritten text-sm text-pencil/60 mt-1">收藏你常用的网站</p>
    </div>

    <!-- 分类筛选 -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="font-handwritten text-sm text-pencil/60">分类:</span>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="category in store.allCategories"
            :key="category"
            class="card-hand-drawn px-4 py-2 flex items-center gap-2 transition-all hover:scale-105"
            :style="{
              background: store.selectedCategory === category ? '#ff4d4d' : '#e8e8e8',
              color: store.selectedCategory === category ? '#fdfbf7' : '#2d2d2d',
              boxShadow: '2px 2px 0px #2d2d2d'
            }"
            @click="store.selectCategory(category)"
          >
            <span class="font-handwritten text-sm font-medium">{{ category }}</span>
            <span v-if="store.selectedCategory === category" class="text-xs">✓</span>
          </button>
        </div>
      </div>

      <!-- 管理分类按钮 -->
      <button
        class="btn-hand-drawn px-4 py-2 text-sm flex items-center gap-2"
        @click="openCategoryManager"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        管理分类
      </button>
    </div>

    <!-- 网站网格 -->
    <div class="navigation-grid flex flex-wrap gap-5">
      <div
        v-for="(site, index) in store.filteredNavigationSites"
        :key="site.id"
        :style="{
          transform: dragState.draggedSiteId === site.id
            ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
            : 'none',
          opacity: dragState.draggedSiteId === site.id ? 0.5 : 1,
          zIndex: dragState.draggedSiteId === site.id ? 1000 : 1
        }"
      >
        <SiteCard
          :site="site"
          @contextmenu="(e) => handleSiteContextMenu(e, site)"
          @dragstart="(e) => handleDragStart(e, site, index)"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="store.filteredNavigationSites.length === 0" class="text-center py-20">
      <div class="text-6xl mb-4">🌐</div>
      <p class="font-handwritten text-lg text-pencil/60 mb-2">
        {{ store.selectedCategory === '全部' ? '还没有添加网站' : '该分类下还没有网站' }}
      </p>
      <p class="font-handwritten text-sm text-pencil/40">右键点击空白处添加你的第一个网站</p>
    </div>

    <!-- 右键菜单 -->
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
          v-if="contextMenu.show"
          class="fixed z-[9999] card-hand-drawn py-2 min-w-[120px]"
          :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
          @click.stop
        >
          <!-- 空白处菜单 -->
          <template v-if="contextMenu.type === 'blank'">
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
              @click="openAddForm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              新增网站
            </button>
          </template>

          <!-- 卡片菜单 -->
          <template v-else>
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
              @click="openEditForm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              编辑
            </button>
            <button
              class="w-full px-4 py-2 text-left font-handwritten text-sm hover:bg-accent/20 text-accent transition-colors flex items-center gap-2"
              @click="deleteSite"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>

    <!-- 表单弹窗 -->
    <SiteFormDialog
      :show="formDialog.show"
      :site="formDialog.site"
      @close="formDialog.show = false"
      @submit="handleFormSubmit"
    />

    <!-- 分类管理对话框 -->
    <CategoryManagerDialog
      :show="categoryManagerDialog.show"
      @close="categoryManagerDialog.show = false"
    />
  </div>
</template>
