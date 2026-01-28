<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import HandDrawnDialog from './HandDrawnDialog.vue'
import CustomSelect from './CustomSelect.vue'
import { Pencil, Trash2, Plus } from 'lucide-vue-next'

const store = useDesktopStore()

// 编辑器状态
const isEditing = ref(false)
const editingSnippet = ref<{
  id?: string
  title: string
  code: string
  language: string
  description: string
  tags: string[]
} | null>(null)

// 编辑器实例
const editorContainer = ref<HTMLElement | null>(null)
let editorView: EditorView | null = null
let isInitializing = false  // 防止重复初始化

// 动态加载语言扩展
const loadLanguageExtension = async (language: string) => {
  switch (language) {
    case 'javascript':
    case 'typescript':
      const { javascript } = await import('@codemirror/lang-javascript')
      return language === 'typescript' ? javascript({ typescript: true }) : javascript()
    case 'python':
      const { python } = await import('@codemirror/lang-python')
      return python()
    case 'sql':
      const { sql } = await import('@codemirror/lang-sql')
      return sql()
    case 'html':
      const { html } = await import('@codemirror/lang-html')
      return html()
    case 'css':
      const { css } = await import('@codemirror/lang-css')
      return css()
    default:
      const { javascript: js } = await import('@codemirror/lang-javascript')
      return js()
  }
}

// 动态加载Prism语言包
const loadPrismLanguage = async (language: string) => {
  switch (language) {
    case 'javascript':
      // @ts-ignore
      await import('prismjs/components/prism-javascript')
      break
    case 'typescript':
      // @ts-ignore
      await import('prismjs/components/prism-typescript')
      break
    case 'python':
      // @ts-ignore
      await import('prismjs/components/prism-python')
      break
    case 'sql':
      // @ts-ignore
      await import('prismjs/components/prism-sql')
      break
    case 'html':
      // @ts-ignore
      await import('prismjs/components/prism-markup')
      break
    case 'css':
      // @ts-ignore
      await import('prismjs/components/prism-css')
      break
    case 'bash':
      // @ts-ignore
      await import('prismjs/components/prism-bash')
      break
    case 'json':
      // @ts-ignore
      await import('prismjs/components/prism-json')
      break
  }
}

// 语言选项
const languageOptions = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'bash', label: 'Bash' },
  { value: 'json', label: 'JSON' },
]

// 初始化编辑器
async function initEditor() {
  if (!editorContainer.value || !editingSnippet.value) return

  // 防止重复初始化
  if (isInitializing) return
  isInitializing = true

  if (editorView) {
    editorView.destroy()
  }

  // 动态加载语言扩展
  const languageExtension = await loadLanguageExtension(editingSnippet.value.language)

  const state = EditorState.create({
    doc: editingSnippet.value.code,
    extensions: [
      basicSetup,
      languageExtension,
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && editingSnippet.value) {
          editingSnippet.value.code = update.state.doc.toString()
        }
      }),
    ],
  })

  editorView = new EditorView({
    state,
    parent: editorContainer.value,
  })

  isInitializing = false
}

watch(() => isEditing.value, (newVal) => {
  if (newVal) {
    setTimeout(() => initEditor(), 100)
  } else {
    if (editorView) {
      editorView.destroy()
      editorView = null
    }
    isInitializing = false  // 重置标志
  }
})

watch(() => editingSnippet.value?.language, (newLang, oldLang) => {
  // 只在语言真正变化时重新初始化（避免首次设置时重复初始化）
  if (isEditing.value && oldLang !== undefined && newLang !== oldLang) {
    setTimeout(() => initEditor(), 100)
  }
})

function createNew() {
  editingSnippet.value = {
    title: '',
    code: '',
    language: 'javascript',
    description: '',
    tags: [],
  }
  isEditing.value = true
}

function editSnippet(id: string) {
  const snippet = store.codeSnippets.find(s => s.id === id)
  if (snippet) {
    editingSnippet.value = {
      id: snippet.id,
      title: snippet.title,
      code: snippet.code,
      language: snippet.language,
      description: snippet.description || '',
      tags: [...snippet.tags],
    }
    isEditing.value = true
    store.selectSnippet(id)
  }
}

function saveSnippet() {
  if (!editingSnippet.value || !editingSnippet.value.title.trim() || !editingSnippet.value.code.trim()) {
    alert('请填写标题和代码')
    return
  }

  if (editingSnippet.value.id) {
    store.updateCodeSnippet(editingSnippet.value.id, {
      title: editingSnippet.value.title,
      code: editingSnippet.value.code,
      language: editingSnippet.value.language,
      description: editingSnippet.value.description,
      tags: editingSnippet.value.tags,
    })
  } else {
    const newSnippet = store.createCodeSnippet({
      title: editingSnippet.value.title,
      code: editingSnippet.value.code,
      language: editingSnippet.value.language,
      description: editingSnippet.value.description,
      tags: editingSnippet.value.tags,
    })
    store.selectSnippet(newSnippet.id)
  }

  isEditing.value = false
  editingSnippet.value = null
}

function cancelEdit() {
  isEditing.value = false
  editingSnippet.value = null
}

// 删除确认对话框状态
const showDeleteConfirm = ref(false)
const deletingSnippetId = ref<string | null>(null)
const deletingSnippetTitle = ref('')

function deleteSnippet(id: string) {
  const snippet = store.codeSnippets.find(s => s.id === id)
  if (snippet) {
    deletingSnippetId.value = id
    deletingSnippetTitle.value = snippet.title
    showDeleteConfirm.value = true
  }
}

function confirmDelete() {
  if (deletingSnippetId.value) {
    store.deleteCodeSnippet(deletingSnippetId.value)
    if (store.selectedSnippetId === deletingSnippetId.value) {
      store.selectSnippet(null)
    }
  }
  showDeleteConfirm.value = false
  deletingSnippetId.value = null
  deletingSnippetTitle.value = ''
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deletingSnippetId.value = null
  deletingSnippetTitle.value = ''
}

function copyCode(code: string) {
  navigator.clipboard.writeText(code).then(() => {
    alert('代码已复制到剪贴板')
  })
}

const selectedSnippet = computed(() => {
  if (!store.selectedSnippetId) return null
  return store.codeSnippets.find(s => s.id === store.selectedSnippetId)
})

// 高亮后的代码
const highlightedCode = ref('')

async function highlightCode(code: string, language: string) {
  // 动态加载Prism语言包
  await loadPrismLanguage(language)
  const grammar = Prism.languages[language] || Prism.languages.javascript
  return Prism.highlight(code, grammar, language)
}

// 当选中的代码片段变化时,重新高亮代码
watch(selectedSnippet, async (newSnippet) => {
  if (newSnippet) {
    highlightedCode.value = await highlightCode(newSnippet.code, newSnippet.language)
  } else {
    highlightedCode.value = ''
  }
}, { immediate: true })

const tagInput = ref('')

function addTag() {
  if (!editingSnippet.value || !tagInput.value.trim()) return
  const tag = tagInput.value.trim()
  if (!editingSnippet.value.tags.includes(tag)) {
    editingSnippet.value.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  if (!editingSnippet.value) return
  editingSnippet.value.tags = editingSnippet.value.tags.filter(t => t !== tag)
}

onUnmounted(() => {
  if (editorView) {
    editorView.destroy()
  }
})
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- 顶部工具栏 -->
    <div class="flex items-center gap-4 p-4 border-b-2 border-pencil">
      <button
        @click="createNew"
        class="btn-hand-drawn px-4 py-2 bg-blue-100 text-pencil flex items-center gap-2"
      >
        <Plus :size="18" :stroke-width="2.5" />
        <span>新建片段</span>
      </button>
      <CustomSelect
        v-model="store.selectedLanguage"
        :options="[
          { label: '全部语言', value: 'all' },
          ...store.usedLanguages.map(lang => ({ label: lang, value: lang }))
        ]"
        width="150px"
      />
      <input
        v-model="store.snippetSearchQuery"
        type="text"
        placeholder="搜索片段..."
        class="input-hand-drawn px-3 py-2 bg-white"
        style="width:400px"
      />
    </div>

    <!-- 主内容区 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧列表 -->
      <div class="w-80 border-r-2 border-pencil overflow-y-auto p-4 space-y-2">
        <div
          v-for="snippet in store.filteredCodeSnippets"
          :key="snippet.id"
          @click="store.selectSnippet(snippet.id)"
          class="card-hand-drawn p-3 cursor-pointer transition-colors"
          :class="{
            'bg-blue-100': store.selectedSnippetId === snippet.id,
            'bg-white hover:bg-gray-50': store.selectedSnippetId !== snippet.id,
          }"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <h3 class="font-handwritten font-bold text-pencil truncate">
                {{ snippet.title }}
              </h3>
              <p class="text-xs text-gray-500 font-handwritten">
                {{ snippet.language }}
              </p>
              <div v-if="snippet.tags.length > 0" class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="tag in snippet.tags"
                  :key="tag"
                  class="text-xs px-2 py-0.5 bg-yellow-100 text-pencil rounded font-handwritten"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="flex gap-1">
              <button
                @click.stop="editSnippet(snippet.id)"
                class="p-1 hover:bg-blue-100 rounded transition-colors"
                title="编辑"
              >
                <Pencil :size="16" :stroke-width="2.5" class="text-blue-600" />
              </button>
              <button
                @click.stop="deleteSnippet(snippet.id)"
                class="p-1 hover:bg-red-100 rounded transition-colors"
                title="删除"
              >
                <Trash2 :size="16" :stroke-width="2.5" class="text-red-600" />
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="store.filteredCodeSnippets.length === 0"
          class="text-center text-gray-400 font-handwritten py-8"
        >
          暂无代码片段
        </div>
      </div>

      <!-- 右侧详情/编辑区 -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- 编辑模式 -->
        <div v-if="isEditing && editingSnippet" class="space-y-4">
          <h2 class="text-2xl font-handwritten font-bold text-pencil">
            {{ editingSnippet.id ? '编辑片段' : '新建片段' }}
          </h2>

          <div>
            <label class="block text-sm font-handwritten text-pencil mb-1">标题</label>
            <input
              v-model="editingSnippet.title"
              type="text"
              class="input-hand-drawn w-full px-3 py-2 bg-white"
              placeholder="片段标题"
            />
          </div>

          <div>
            <label class="block text-sm font-handwritten text-pencil mb-1">语言</label>
            <CustomSelect
              v-model="editingSnippet.language"
              :options="languageOptions"
              width="100%"
            />
          </div>

          <div>
            <label class="block text-sm font-handwritten text-pencil mb-1">代码</label>
            <div
              ref="editorContainer"
              class="border-2 border-pencil rounded-lg overflow-hidden"
              style="height: 400px"
            ></div>
          </div>

          <div>
            <label class="block text-sm font-handwritten text-pencil mb-1">描述</label>
            <textarea
              v-model="editingSnippet.description"
              class="input-hand-drawn w-full px-3 py-2 bg-white"
              rows="3"
              placeholder="代码片段描述（可选）"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-handwritten text-pencil mb-1">标签</label>
            <div class="flex gap-2 mb-2">
              <input
                v-model="tagInput"
                @keydown.enter="addTag"
                type="text"
                class="input-hand-drawn flex-1 px-3 py-2 bg-white"
                placeholder="输入标签后按回车"
              />
              <button
                @click="addTag"
                class="btn-hand-drawn px-4 py-2 bg-blue-100 text-pencil"
              >
                添加
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in editingSnippet.tags"
                :key="tag"
                class="px-3 py-1 bg-yellow-100 text-pencil rounded font-handwritten flex items-center gap-2"
              >
                {{ tag }}
                <button
                  @click="removeTag(tag)"
                  class="text-red-600 hover:text-red-800"
                >
                  ✗
                </button>
              </span>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              @click="saveSnippet"
              class="btn-hand-drawn px-6 py-2 bg-green-100 text-pencil"
            >
              保存
            </button>
            <button
              @click="cancelEdit"
              class="btn-hand-drawn px-6 py-2 bg-gray-100 text-pencil"
            >
              取消
            </button>
          </div>
        </div>

        <!-- 查看模式 -->
        <div v-else-if="selectedSnippet" class="space-y-4">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-2xl font-handwritten font-bold text-pencil">
                {{ selectedSnippet.title }}
              </h2>
              <p class="text-sm text-gray-500 font-handwritten mt-1">
                {{ selectedSnippet.language }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="editSnippet(selectedSnippet.id)"
                class="btn-hand-drawn px-4 py-2 bg-blue-100 text-pencil"
              >
                编辑
              </button>
              <button
                @click="copyCode(selectedSnippet.code)"
                class="btn-hand-drawn px-4 py-2 bg-green-100 text-pencil"
              >
                复制代码
              </button>
            </div>
          </div>

          <div v-if="selectedSnippet.description" class="card-hand-drawn p-4 bg-yellow-50">
            <p class="font-handwritten text-pencil">{{ selectedSnippet.description }}</p>
          </div>

          <div v-if="selectedSnippet.tags.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="tag in selectedSnippet.tags"
              :key="tag"
              class="px-3 py-1 bg-yellow-100 text-pencil rounded font-handwritten"
            >
              {{ tag }}
            </span>
          </div>

          <div class="card-hand-drawn p-4 bg-gray-900 overflow-x-auto">
            <pre class="text-sm"><code
              v-html="highlightedCode"
            ></code></pre>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="flex items-center justify-center h-full">
          <div class="text-center text-gray-400 font-handwritten">
            <p class="text-xl mb-2">选择一个代码片段查看详情</p>
            <p class="text-sm">或点击"新建片段"创建新的代码片段</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <HandDrawnDialog
      :show="showDeleteConfirm"
      type="confirm"
      title="确认删除"
      :message="`确定要删除代码片段「${deletingSnippetTitle}」吗？删除后将无法恢复。`"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
      @close="cancelDelete"
    />
  </div>
</template>

<style scoped>
.cm-editor {
  height: 100%;
}
</style>
