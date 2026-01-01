<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="card-hand-drawn bg-paper max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b-2 border-pencil">
        <h2 class="text-2xl font-handwritten font-bold">数据备份管理</h2>
        <button
          @click="$emit('close')"
          class="text-pencil hover:text-red transition-colors"
          aria-label="关闭"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Actions -->
        <div class="flex gap-3 mb-6">
          <button
            @click="createBackup"
            :disabled="isCreatingBackup"
            class="btn-hand-drawn px-4 py-2 bg-blue text-white disabled:opacity-50"
          >
            {{ isCreatingBackup ? '备份中...' : '立即备份' }}
          </button>
          <button
            @click="loadBackups"
            :disabled="isLoadingBackups"
            class="btn-hand-drawn px-4 py-2 bg-pencil text-white disabled:opacity-50"
          >
            {{ isLoadingBackups ? '刷新中...' : '刷新列表' }}
          </button>
        </div>

        <!-- Status Message -->
        <div v-if="statusMessage" class="mb-4 p-3 rounded wobbly-sm" :class="statusType === 'error' ? 'bg-red/10 text-red' : 'bg-blue/10 text-blue'">
          {{ statusMessage }}
        </div>

        <!-- Backups List -->
        <div v-if="isLoadingBackups" class="text-center py-8 text-pencil/60">
          加载中...
        </div>

        <div v-else-if="backups.length === 0" class="text-center py-8 text-pencil/60">
          暂无备份文件
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="backup in backups"
            :key="backup.filename"
            class="card-hand-drawn p-4 flex items-center justify-between hover:shadow-lg transition-shadow"
          >
            <div class="flex-1">
              <div class="font-handwritten font-bold text-pencil">
                {{ formatDate(backup.uploaded) }}
              </div>
              <div class="text-sm text-pencil/60 mt-1">
                文件大小: {{ formatSize(backup.size) }}
              </div>
              <div class="text-xs text-pencil/40 mt-1">
                {{ backup.filename }}
              </div>
            </div>
            <button
              @click="restoreBackup(backup.filename)"
              :disabled="isRestoring"
              class="btn-hand-drawn px-4 py-2 bg-blue text-white text-sm disabled:opacity-50"
            >
              {{ isRestoring ? '恢复中...' : '恢复' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t-2 border-pencil bg-paper/50">
        <p class="text-sm text-pencil/60">
          💡 提示：建议定期备份数据。恢复备份会覆盖当前所有数据，请谨慎操作。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Backup {
  filename: string
  size: number
  uploaded: string
}

defineEmits<{
  close: []
}>()

const backups = ref<Backup[]>([])
const isLoadingBackups = ref(false)
const isCreatingBackup = ref(false)
const isRestoring = ref(false)
const statusMessage = ref('')
const statusType = ref<'success' | 'error'>('success')

onMounted(() => {
  loadBackups()
})

async function loadBackups() {
  isLoadingBackups.value = true
  statusMessage.value = ''

  try {
    const response = await fetch('/api/restore')
    const data = await response.json()

    if (data.success) {
      backups.value = data.backups
    } else {
      throw new Error(data.error || '加载备份列表失败')
    }
  } catch (error) {
    statusType.value = 'error'
    statusMessage.value = error instanceof Error ? error.message : '加载备份列表失败'
  } finally {
    isLoadingBackups.value = false
  }
}

async function createBackup() {
  isCreatingBackup.value = true
  statusMessage.value = ''

  try {
    const response = await fetch('/scheduled/backup', {
      method: 'POST'
    })
    const data = await response.json()

    if (data.success) {
      statusType.value = 'success'
      statusMessage.value = `备份成功：${data.filename}`
      // 刷新列表
      await loadBackups()
    } else {
      throw new Error(data.error || '备份失败')
    }
  } catch (error) {
    statusType.value = 'error'
    statusMessage.value = error instanceof Error ? error.message : '备份失败'
  } finally {
    isCreatingBackup.value = false
  }
}

async function restoreBackup(filename: string) {
  if (!confirm(`确定要恢复到备份 "${formatDate(filename)}" 吗？\n\n这将覆盖当前所有数据，操作不可撤销！`)) {
    return
  }

  isRestoring.value = true
  statusMessage.value = ''

  try {
    const response = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    })
    const data = await response.json()

    if (data.success) {
      statusType.value = 'success'
      statusMessage.value = '恢复成功！页面将在 2 秒后刷新...'
      // 2秒后刷新页面
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } else {
      throw new Error(data.error || '恢复失败')
    }
  } catch (error) {
    statusType.value = 'error'
    statusMessage.value = error instanceof Error ? error.message : '恢复失败'
  } finally {
    isRestoring.value = false
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
</script>
