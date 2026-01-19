<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { useDesktopStore } from '@/stores/desktop'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { oneDark } from '@codemirror/theme-one-dark'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import HandDrawnDialog from './HandDrawnDialog.vue'
import { Pencil, Trash2 } from 'lucide-vue-next'

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

// 语言映射
const languageExtensions: Record<string, any> = {
  javascript: javascript(),
  typescript: javascript({ typescript: true }),
  python: python(),
  sql: sql(),
  html: html(),
  css: css(),
  bash: javascript(),
  json: javascript(),
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
function initEditor() {
  if (!editorContainer.value || !editingSnippet.value) return

  if (editorView) {
    editorView.destroy()
  }

  const language = languageExtensions[editingSnippet.value.language] || javascript()

  const state = EditorState.create({
    doc: editingSnippet.value.code,
    extensions: [
      basicSetup,
      language,
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
}

watch(() => isEditing.value, (newVal) => {
  if (newVal) {
    setTimeout(() => initEditor(), 100)
  } else if (editorView) {
    editorView.destroy()
    editorView = null
  }
})

watch(() => editingSnippet.value?.language, () => {
  if (isEditing.value) {
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

function highlightCode(code: string, language: string) {
  const grammar = Prism.languages[language] || Prism.languages.javascript
  return Prism.highlight(code, grammar, language)
}

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
  <div class="h-screen bg-paper flex flex-col">
    <!-- 顶部工具栏 -->
    <div class="flex items-center gap-4 p-4 border-b-2 border-pencil">
      <button
        @click="createNew"
        class="btn-hand-drawn px-4 py-2 bg-blue-100 text-pencil"
      >
        + 新建片段
      </button>
      <select
        v-model="store.selectedLanguage"
        class="input-hand-drawn px-3 py-2 bg-white"
        style="width:150px"
      >
        <option value="all">全部语言</option>
        <option
          v-for="lang in store.usedLanguages"
          :key="lang"
          :value="lang"
        >
          {{ lang }}
        </option>
      </select>
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
            <select
              v-model="editingSnippet.language"
              class="input-hand-drawn px-3 py-2 bg-white"
            >
              <option
                v-for="lang in languageOptions"
                :key="lang.value"
                :value="lang.value"
              >
                {{ lang.label }}
              </option>
            </select>
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
              v-html="highlightCode(selectedSnippet.code, selectedSnippet.language)"
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
