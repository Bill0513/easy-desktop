<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { TabType } from '@/types'
import { StickyNote, Globe, Flame, FolderOpen, Brain, Settings } from 'lucide-vue-next'

const emit = defineEmits<{
  openSettings: []
}>()

const store = useDesktopStore()

const tabs: { id: TabType; name: string; icon: Component }[] = [
  { id: 'desktop', name: '记录', icon: StickyNote },
  { id: 'navigation', name: '导航', icon: Globe },
  { id: 'news', name: '热点', icon: Flame },
  { id: 'file', name: '文件', icon: FolderOpen },
  { id: 'mindmap', name: '导图', icon: Brain }
]

const isDarkMode = computed(() => store.effectiveTheme === 'dark')
</script>

<template>
  <div class="mobile-bottom-tab">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="mobile-tab-btn"
      :class="store.activeTab === tab.id ? (isDarkMode ? 'mobile-tab-btn-active-dark' : 'mobile-tab-btn-active') : ''"
      @click="store.setActiveTab(tab.id)"
    >
      <component :is="tab.icon" :stroke-width="2.5" class="w-4 h-4" />
      <span class="text-[10px] leading-none mt-1">{{ tab.name }}</span>
    </button>

    <button
      class="mobile-tab-btn"
      @click="emit('openSettings')"
    >
      <Settings :stroke-width="2.5" class="w-4 h-4" />
      <span class="text-[10px] leading-none mt-1">设置</span>
    </button>
  </div>
</template>

<style scoped>
.mobile-bottom-tab {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px));
  background: color-mix(in srgb, var(--color-bg-secondary) 92%, transparent);
  border-top: 2px solid var(--color-border-primary);
  backdrop-filter: blur(8px);
}

.mobile-tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border: 2px solid transparent;
  border-radius: 12px;
  color: var(--color-text-primary);
  transition: background-color 0.15s ease;
}

.mobile-tab-btn-active {
  background: #ff4d4d;
  color: #fff;
  border-color: var(--color-border-primary);
}

.mobile-tab-btn-active-dark {
  background: #2d5da1;
  color: #fff;
  border-color: var(--color-border-primary);
}
</style>
