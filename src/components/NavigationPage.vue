<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import { useResponsiveMode } from '@/composables/useResponsiveMode'
import draggable from 'vuedraggable'
import SiteCard from './navigation/SiteCard.vue'
import SiteFormDialog from './navigation/SiteFormDialog.vue'
import CategoryManagerDialog from './navigation/CategoryManagerDialog.vue'
import type { NavigationSite } from '@/types'
import { Settings, Plus, Pencil, Trash2, Globe2 } from 'lucide-vue-next'

const store = useDesktopStore()
const { isMobile } = useResponsiveMode()

// 检测是否为暗色模式
const isDarkMode = computed(() => {
  return store.effectiveTheme === 'dark'
})

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

// 拖拽中的状态（用于视觉反馈）
const isDragging = ref(false)

// 处理空白处右键
const handleBlankContextMenu = (e: MouseEvent) => {
  if (isMobile.value) return
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
  if (isMobile.value) return
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

const openMobileSiteActions = (site: NavigationSite) => {
  contextMenu.value = {
    show: true,
    x: 0,
    y: 0,
    type: 'site',
    siteId: site.id
  }
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
const onDragStart = () => {
  isDragging.value = true
}

// 拖拽结束 - 更新排序
const onDragEnd = (evt: any) => {
  isDragging.value = false

  // evt.oldIndex 和 evt.newIndex 是拖拽前后的索引
  if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
    store.reorderNavigationSites(evt.oldIndex, evt.newIndex)
  }
}
</script>

<template>
  <div
    class="w-full h-full flex flex-col"
    @contextmenu="handleBlankContextMenu"
    @click="closeContextMenu"
  >
    <!-- 固定头部：标题和分类 -->
    <div
      class="flex-shrink-0"
      :class="isMobile ? 'mobile-nav-topbar' : 'p-8 pb-0'"
    >
      <!-- 标题 -->
      <div :class="isMobile ? 'mobile-nav-topbar-inner card-hand-drawn bg-bg-secondary' : 'mb-6'">
        <div class="min-w-0 flex-1">
          <h1 :class="isMobile ? 'font-handwritten text-xl font-bold text-text-primary' : 'font-handwritten text-3xl font-bold text-text-primary'">网页导航</h1>
          <p class="font-handwritten text-sm text-text-secondary mt-1">收藏你常用的网站</p>
        </div>
        <div v-if="isMobile" class="flex items-center gap-2 flex-shrink-0">
          <button
            class="mobile-nav-action-btn"
            @click.stop="openAddForm"
          >
            <Plus :size="16" :stroke-width="2.5" />
            新增
          </button>
          <button
            class="mobile-nav-action-btn"
            @click.stop="openCategoryManager"
          >
            <Settings :size="16" :stroke-width="2.5" />
            分类
          </button>
        </div>
      </div>

      <!-- 分类筛选 -->
      <div
        class="mb-6 flex items-center justify-between"
        :class="isMobile ? 'mobile-nav-categories' : ''"
      >
        <div class="flex items-center gap-3 flex-1">
          <span class="font-handwritten text-sm text-text-secondary">分类:</span>
          <div class="flex gap-2 flex-wrap flex-1" :class="isMobile ? 'mobile-nav-categories-scroll' : ''">
            <button
              v-for="category in store.allCategories"
              :key="category"
              class="px-4 py-2 flex items-center gap-2 transition-all hover:scale-105 border-2 border-border-primary"
              :class="[
                store.selectedCategory === category
                  ? (isDarkMode ? 'bg-bluePen text-white' : 'bg-accent text-white')
                  : 'bg-muted text-text-primary hover:bg-muted/70'
              ]"
              style="border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px; box-shadow: 4px 4px 0px 0px var(--color-shadow-primary);"
              @click="store.selectCategory(category)"
            >
              <span class="font-handwritten text-sm font-medium">{{ category }}</span>
              <span v-if="store.selectedCategory === category" class="text-xs">✓</span>
            </button>
          </div>
        </div>

        <!-- 管理分类按钮 -->
        <button
          v-if="!isMobile"
          class="btn-hand-drawn px-4 py-2 text-sm flex items-center gap-2"
          @click="openCategoryManager"
        >
          <Settings :size="16" :stroke-width="2.5" />
          <span>管理分类</span>
        </button>
      </div>
    </div>

    <!-- 可滚动的网站区域 -->
    <div class="flex-1 overflow-auto" :class="isMobile ? 'px-4 pt-[168px] pb-6 mobile-content-space' : 'px-8 pb-8'">
      <!-- 网站网格 -->
      <draggable
        :list="store.filteredNavigationSites"
        class="navigation-grid flex flex-wrap"
        :class="isMobile ? 'gap-4 justify-start' : 'gap-6'"
        item-key="id"
        :animation="200"
        ghost-class="dragging-ghost"
        drag-class="dragging-item"
        @start="onDragStart"
        @end="onDragEnd"
      >
        <template #item="{ element: site }">
          <div>
            <SiteCard
              :site="site"
              :show-actions="isMobile"
              @contextmenu="(e) => handleSiteContextMenu(e, site)"
              @actions="openMobileSiteActions"
            />
          </div>
        </template>
      </draggable>

      <!-- 空状态 -->
      <div
        v-if="store.filteredNavigationSites.length === 0"
        class="text-center"
        :class="isMobile ? 'mobile-nav-empty-state' : 'py-20'"
      >
        <div class="text-6xl mb-4">🌐</div>
        <p class="font-handwritten text-lg text-text-secondary mb-2">
          {{ store.selectedCategory === '全部' ? '还没有添加网站' : '该分类下还没有网站' }}
        </p>
        <p class="font-handwritten text-sm text-text-secondary">
          {{ isMobile ? '点击顶部“新增”添加你的第一个网站' : '右键点击空白处添加你的第一个网站' }}
        </p>
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
          v-if="contextMenu.show && !isMobile"
          class="fixed z-[10000] card-hand-drawn py-2 min-w-[160px] bg-bg-primary"
          :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
          style="box-shadow: 4px 4px 0px var(--color-border-primary);"
          @click.stop
        >
          <!-- 空白处菜单 -->
          <template v-if="contextMenu.type === 'blank'">
            <button
              :class="contextMenuItemClass"
              @click="openAddForm"
            >
              <span class="inline-flex items-center gap-2">
                <Plus :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>新增网站</span>
              </span>
            </button>
          </template>

          <!-- 卡片菜单 -->
          <template v-else>
            <button
              :class="contextMenuItemClass"
              @click="openEditForm"
            >
              <span class="inline-flex items-center gap-2">
                <Pencil :size="16" :stroke-width="2.5" class="text-pencil" />
                <span>编辑</span>
              </span>
            </button>
            <button
              :class="contextMenuDangerItemClass"
              @click="deleteSite"
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

    <!-- 移动端站点动作抽屉 -->
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
          v-if="contextMenu.show && isMobile && contextMenu.type === 'site'"
          class="fixed inset-0 z-[10000] bg-border-primary/45"
          @click="closeContextMenu"
        >
          <div class="mobile-nav-action-sheet card-hand-drawn bg-bg-primary p-4" @click.stop>
            <div class="flex items-center gap-2 mb-3">
              <Globe2 :size="16" :stroke-width="2.5" />
              <span class="font-handwritten text-base text-text-primary">站点操作</span>
            </div>
            <div class="space-y-2">
              <button class="mobile-nav-sheet-btn" @click="openEditForm">
                <Pencil :size="16" :stroke-width="2.5" />
                编辑
              </button>
              <button class="mobile-nav-sheet-btn text-accent" @click="deleteSite">
                <Trash2 :size="16" :stroke-width="2.5" />
                删除
              </button>
              <button class="mobile-nav-sheet-btn" @click="closeContextMenu">
                取消
              </button>
            </div>
          </div>
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

<style scoped>
/* 拖动时的占位符样式 */
.dragging-ghost {
  opacity: 0.3;
}

/* 正在拖动的元素样式 */
.dragging-item {
  transform: rotate(2deg) scale(1.05);
  cursor: grabbing !important;
}

.mobile-nav-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  padding: 8px 10px 0;
  background: color-mix(in srgb, var(--color-bg-primary) 92%, transparent);
  backdrop-filter: blur(8px);
}

.mobile-nav-topbar-inner {
  min-height: 64px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-nav-categories {
  margin: 10px 2px 0;
}

.mobile-nav-categories-scroll {
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 2px;
}

.mobile-nav-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 34px;
  padding: 0 10px;
  border: 2px solid var(--color-border-primary);
  border-radius: 10px;
  font-family: 'Patrick Hand', cursive;
  font-size: 13px;
}

.mobile-nav-action-sheet {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: calc(90px + env(safe-area-inset-bottom, 0px));
}

.mobile-nav-sheet-btn {
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 2px solid var(--color-border-primary);
  border-radius: 12px;
  padding: 0 12px;
  font-family: 'Patrick Hand', cursive;
}

.mobile-nav-empty-state {
  min-height: calc(100vh - 260px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
