<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import { Plus, Search, Camera } from 'lucide-vue-next'
import ClipCard from './clipper/ClipCard.vue'
import ClipFormDialog from './clipper/ClipFormDialog.vue'

const store = useDesktopStore()

const formDialog = ref<{ show: boolean; clipId?: string }>({
  show: false,
  clipId: undefined
})

onMounted(() => {
  store.fetchScreenshotQuota()
})

const openAddForm = () => {
  formDialog.value = { show: true, clipId: undefined }
}

const openEditForm = (clipId: string) => {
  formDialog.value = { show: true, clipId }
}

const handleDelete = async (clipId: string) => {
  if (confirm('确定要删除这个剪藏吗？')) {
    await store.deleteWebClip(clipId)
  }
}

const handleCapture = async (clipId: string) => {
  try {
    await store.captureScreenshot(clipId)
  } catch (error) {
    // 错误已在 store 中处理
  }
}
</script>

<template>
  <div class="w-full h-full flex flex-col bg-paper p-6 overflow-hidden">
    <!-- 顶部工具栏 -->
    <div class="flex items-center gap-4 mb-6">
      <button
        @click="openAddForm"
        class="btn-hand-drawn flex items-center gap-2 px-4 py-2 bg-blue-pen text-white"
      >
        <Plus :size="18" />
        <span>添加剪藏</span>
      </button>

      <div class="relative flex-1 max-w-md">
        <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-pencil/40" />
        <input
          v-model="store.clipSearchQuery"
          type="text"
          placeholder="搜索标题、URL、描述、标签..."
          class="input-hand-drawn w-full pl-10 pr-4 py-2"
        />
      </div>

      <select
        v-model="store.selectedClipCategory"
        class="input-hand-drawn px-4 py-2"
      >
        <option value="全部">全部分类</option>
        <option v-for="cat in store.navigationCategories" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>
    </div>

    <!-- 配额显示 -->
    <div class="card-hand-drawn p-4 mb-6">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Camera :size="18" class="text-pencil" />
          <span class="font-handwritten text-pencil">今日截图配额</span>
        </div>
        <span class="font-handwritten text-sm text-pencil/60">
          {{ store.screenshotQuota.used }}s / {{ store.screenshotQuota.limit }}s
        </span>
      </div>
      <div class="w-full h-2 bg-pencil/10 rounded-full overflow-hidden">
        <div
          class="h-full bg-blue-pen transition-all"
          :style="{ width: `${(store.screenshotQuota.used / store.screenshotQuota.limit) * 100}%` }"
        ></div>
      </div>
    </div>

    <!-- 剪藏列表 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="store.filteredWebClips.length === 0" class="text-center py-20">
        <div class="text-6xl mb-4">📑</div>
        <p class="font-handwritten text-pencil/60">暂无剪藏</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <ClipCard
          v-for="clip in store.filteredWebClips"
          :key="clip.id"
          :clip="clip"
          @edit="openEditForm"
          @delete="handleDelete"
          @capture="handleCapture"
        />
      </div>
    </div>

    <!-- 表单弹窗 -->
    <ClipFormDialog
      v-if="formDialog.show"
      :clip-id="formDialog.clipId"
      @close="formDialog.show = false"
    />
  </div>
</template>
