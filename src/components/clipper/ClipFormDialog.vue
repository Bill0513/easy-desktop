<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import { X, Loader } from 'lucide-vue-next'

const props = defineProps<{
  clipId?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useDesktopStore()

const form = ref({
  url: '',
  title: '',
  description: '',
  favicon: '',
  category: '',
  tags: [] as string[]
})

const tagInput = ref('')
const isFetching = ref(false)

onMounted(() => {
  if (props.clipId) {
    const clip = store.webClips.find(c => c.id === props.clipId)
    if (clip) {
      form.value = {
        url: clip.url,
        title: clip.title,
        description: clip.description || '',
        favicon: clip.favicon || '',
        category: clip.category || '',
        tags: [...clip.tags]
      }
    }
  }
})

const fetchMetadata = async () => {
  if (!form.value.url) return

  isFetching.value = true
  try {
    const metadata = await store.fetchMetadata(form.value.url)
    if (!form.value.title) {
      form.value.title = metadata.title
    }
    if (metadata.favicon) {
      form.value.favicon = metadata.favicon
    }
  } catch (error) {
    console.error('获取元数据失败:', error)
  } finally {
    isFetching.value = false
  }
}

const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag)
    tagInput.value = ''
  }
}

const removeTag = (tag: string) => {
  form.value.tags = form.value.tags.filter(t => t !== tag)
}

const handleSubmit = () => {
  if (!form.value.url || !form.value.title) return

  if (props.clipId) {
    store.updateWebClip(props.clipId, form.value)
  } else {
    store.createWebClip(form.value)
  }

  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="card-hand-drawn bg-paper p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-handwritten text-2xl text-pencil">
          {{ clipId ? '编辑剪藏' : '添加剪藏' }}
        </h2>
        <button @click="emit('close')" class="text-pencil/60 hover:text-pencil">
          <X :size="24" />
        </button>
      </div>

      <!-- 表单 -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- URL -->
        <div>
          <label class="block font-handwritten text-pencil mb-2">
            网址 <span class="text-red">*</span>
          </label>
          <div class="flex gap-2">
            <input
              v-model="form.url"
              type="url"
              required
              placeholder="https://example.com"
              class="input-hand-drawn flex-1 px-4 py-2"
              @blur="fetchMetadata"
            />
            <button
              type="button"
              @click="fetchMetadata"
              :disabled="isFetching || !form.url"
              class="btn-hand-drawn px-4 py-2 bg-blue-pen text-white disabled:opacity-50"
            >
              <Loader v-if="isFetching" :size="18" class="animate-spin" />
              <span v-else>获取</span>
            </button>
          </div>
        </div>

        <!-- 标题 -->
        <div>
          <label class="block font-handwritten text-pencil mb-2">
            标题 <span class="text-red">*</span>
          </label>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="网页标题"
            class="input-hand-drawn w-full px-4 py-2"
          />
        </div>

        <!-- 描述 -->
        <div>
          <label class="block font-handwritten text-pencil mb-2">描述</label>
          <textarea
            v-model="form.description"
            placeholder="添加备注或摘要..."
            rows="3"
            class="input-hand-drawn w-full px-4 py-2 resize-none"
          ></textarea>
        </div>

        <!-- 分类 -->
        <div>
          <label class="block font-handwritten text-pencil mb-2">分类</label>
          <select v-model="form.category" class="input-hand-drawn w-full px-4 py-2">
            <option value="">无分类</option>
            <option v-for="cat in store.navigationCategories" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </div>

        <!-- 标签 -->
        <div>
          <label class="block font-handwritten text-pencil mb-2">标签</label>
          <div class="flex gap-2 mb-2">
            <input
              v-model="tagInput"
              type="text"
              placeholder="输入标签后按回车"
              class="input-hand-drawn flex-1 px-4 py-2"
              @keydown.enter.prevent="addTag"
            />
            <button
              type="button"
              @click="addTag"
              class="btn-hand-drawn px-4 py-2 bg-pencil text-white"
            >
              添加
            </button>
          </div>
          <div v-if="form.tags.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="tag in form.tags"
              :key="tag"
              class="px-3 py-1 bg-pencil/10 text-pencil rounded flex items-center gap-2"
            >
              {{ tag }}
              <button type="button" @click="removeTag(tag)" class="text-pencil/60 hover:text-pencil">
                <X :size="14" />
              </button>
            </span>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            @click="emit('close')"
            class="btn-hand-drawn px-6 py-2 bg-pencil/10 text-pencil"
          >
            取消
          </button>
          <button
            type="submit"
            class="btn-hand-drawn px-6 py-2 bg-blue-pen text-white"
            :disabled="!form.url || !form.title"
          >
            {{ clipId ? '保存' : '添加' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
