<script setup lang="ts">
import { ref } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { TabType } from '@/types'
import SettingsDialog from '@/components/SettingsDialog.vue'

const store = useDesktopStore()
const isExpanded = ref(false)
const showSettings = ref(false)

const tabs = [
  { id: 'desktop' as TabType, name: '记录', icon: '📝', description: '便签、待办、文本' },
  { id: 'navigation' as TabType, name: '导航', icon: '🌐', description: '网页导航站' },
  { id: 'news' as TabType, name: '热点', icon: '🔥', description: '新闻热搜' },
  { id: 'resource-search' as TabType, name: '资源', icon: '🔍', description: '资源搜索' },
  { id: 'file' as TabType, name: '文件', icon: '📁', description: '文件管理' }
]

const handleTabClick = (tabId: TabType) => {
  store.setActiveTab(tabId)
}

const handleSettingsClick = () => {
  showSettings.value = true
}

const handleCloseSettings = () => {
  showSettings.value = false
}
</script>

<template>
  <div
    class="fixed left-0 top-1/2 -translate-y-1/2 z-[10000]"
    @mouseenter="isExpanded = true"
    @mouseleave="isExpanded = false"
  >
    <!-- 收起状态的触发条 -->
    <div
      v-show="!isExpanded"
      class="w-1 h-32 bg-pencil/20 rounded-r-full hover:bg-pencil/40 transition-colors cursor-pointer"
    />

    <!-- 展开状态的 Tab 栏 -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform -translate-x-full opacity-0"
      enter-to-class="transform translate-x-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform translate-x-0 opacity-100"
      leave-to-class="transform -translate-x-full opacity-0"
    >
      <div
        v-if="isExpanded"
        class="card-hand-drawn py-3 px-2 flex flex-col gap-2 ml-2"
        style="box-shadow: 6px 6px 0px #2d2d2d;"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="group relative flex flex-col items-center gap-1 px-3 py-3 rounded-lg transition-all duration-200"
          :class="[
            store.activeTab === tab.id
              ? 'bg-accent text-paper scale-105'
              : 'hover:bg-muted/50 hover:scale-105'
          ]"
          @click="handleTabClick(tab.id)"
        >
          <!-- 图标 -->
          <span
            class="text-3xl transition-transform group-hover:scale-110"
            :class="store.activeTab === tab.id ? 'animate-bounce' : ''"
          >
            {{ tab.icon }}
          </span>

          <!-- 名称 -->
          <span
            class="font-handwritten text-sm font-medium whitespace-nowrap"
            :class="store.activeTab === tab.id ? 'text-paper' : 'text-pencil'"
          >
            {{ tab.name }}
          </span>

          <!-- 描述（悬浮时显示） -->
          <div
            class="absolute left-full ml-3 px-3 py-2 card-hand-drawn whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style="box-shadow: 4px 4px 0px #2d2d2d;"
          >
            <p class="font-handwritten text-xs text-pencil/80">{{ tab.description }}</p>
          </div>

          <!-- 激活指示器 -->
          <div
            v-if="store.activeTab === tab.id"
            class="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-paper rounded-full"
          />
        </button>

        <!-- 分隔线 -->
        <div class="h-px bg-pencil/20 my-1" />

        <!-- 设置按钮 -->
        <button
          class="group relative flex flex-col items-center gap-1 px-3 py-3 rounded-lg transition-all duration-200 hover:bg-muted/50 hover:scale-105"
          @click="handleSettingsClick"
        >
          <!-- 图标 -->
          <span class="text-3xl transition-transform group-hover:scale-110">
            ⚙️
          </span>

          <!-- 名称 -->
          <span class="font-handwritten text-sm font-medium whitespace-nowrap text-pencil">
            设置
          </span>

          <!-- 描述（悬浮时显示） -->
          <div
            class="absolute left-full ml-3 px-3 py-2 card-hand-drawn whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style="box-shadow: 4px 4px 0px #2d2d2d;"
          >
            <p class="font-handwritten text-xs text-pencil/80">网站导入、偏好设置</p>
          </div>
        </button>
      </div>
    </Transition>

    <!-- 设置弹窗 -->
    <SettingsDialog v-if="showSettings" @close="handleCloseSettings" />
  </div>
</template>

<style scoped>
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.animate-bounce {
  animation: bounce 1s ease-in-out infinite;
}
</style>
