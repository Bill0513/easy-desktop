<script setup lang="ts">
import { ref } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import type { BookmarkWidget } from '@/types'

const props = defineProps<{
  widget: BookmarkWidget
}>()

const store = useDesktopStore()
const showForm = ref(false)
const newTitle = ref('')
const newUrl = ref('')

// 获取 favicon
const getFavicon = (url: string) => {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return 'https://www.google.com/s2/favicons?domain=example.com&sz=32'
  }
}

// 添加书签
const addBookmark = () => {
  const title = newTitle.value.trim() || newUrl.value.trim()
  const url = newUrl.value.trim()

  if (title && url) {
    // 确保 URL 有协议
    let finalUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url
    }

    store.addBookmark(props.widget.id, title, finalUrl)
    newTitle.value = ''
    newUrl.value = ''
    showForm.value = false
  }
}

// 取消添加
const cancelAdd = () => {
  showForm.value = false
  newTitle.value = ''
  newUrl.value = ''
}

// 打开链接
const openLink = (url: string) => {
  window.open(url, '_blank')
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 书签列表 -->
    <div class="flex-1 overflow-auto space-y-1">
      <a
        v-for="bookmark in widget.bookmarks"
        :key="bookmark.id"
        class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
        :href="bookmark.url"
        target="_blank"
        @click.stop
      >
        <img
          :src="getFavicon(bookmark.url)"
          :alt="bookmark.title"
          class="w-5 h-5 flex-shrink-0"
          @error="(e) => e.target?.remove()"
        />
        <span class="flex-1 font-handwritten text-sm truncate">{{ bookmark.title }}</span>
        <button
          class="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-accent hover:bg-accent/20 rounded transition-all"
          @click.prevent="store.deleteBookmark(widget.id, bookmark.id)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </a>

      <!-- 空状态 -->
      <div v-if="widget.bookmarks.length === 0" class="text-center text-pencil/40 py-4">
        <p class="font-handwritten">暂无书签</p>
      </div>
    </div>

    <!-- 添加表单/按钮 -->
    <div class="mt-3 pt-3 border-t-2 border-dashed border-pencil/20">
      <div v-if="!showForm">
        <button
          class="w-full py-2 font-handwritten text-pencil/60 hover:text-pencil hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-center gap-2"
          @click="showForm = true"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          添加书签
        </button>
      </div>
      <div v-else class="space-y-2">
        <input
          v-model="newTitle"
          type="text"
          class="input-hand-drawn text-base py-2"
          placeholder="标题（可选）"
        />
        <input
          v-model="newUrl"
          type="text"
          class="input-hand-drawn text-base py-2"
          placeholder="输入网址..."
        />
        <div class="flex gap-2">
          <button
            class="flex-1 btn-hand-drawn py-2 text-base"
            @click="addBookmark"
          >
            添加
          </button>
          <button
            class="px-4 py-2 font-handwritten text-pencil/60 hover:text-pencil hover:bg-muted/50 rounded-lg transition-colors"
            @click="cancelAdd"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
