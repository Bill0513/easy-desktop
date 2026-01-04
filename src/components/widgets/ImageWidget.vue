<script setup lang="ts">
import { computed } from "vue";
import type { ImageWidget } from "@/types";

const props = defineProps<{
  widget: ImageWidget;
}>();

// 获取图片完整URL
const imageUrl = computed(() => {
  if (!props.widget.src) return '';
  const imageDomain = import.meta.env.VITE_IMAGE_DOMAIN || 'https://sunkkk.de5.net';
  return `${imageDomain}/${props.widget.src}`;
});

// 是否正在上传
const isUploading = computed(() => {
  return props.widget.uploadProgress !== undefined;
});

// 是否有错误
const hasError = computed(() => {
  return !!props.widget.uploadError;
});

// 下载图片
const downloadImage = () => {
  if (!props.widget.src) return;

  const link = document.createElement('a');
  link.href = imageUrl.value;
  link.download = props.widget.filename || 'image';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center overflow-hidden p-2">
    <!-- 上传进度显示 -->
    <div v-if="isUploading" class="w-full h-full flex flex-col items-center justify-center">
      <div class="text-4xl mb-4 animate-bounce">📤</div>
      <div class="text-lg font-handwritten text-pencil mb-2">上传中...</div>

      <!-- 进度条 -->
      <div class="w-3/4 h-6 bg-paper border-2 border-pencil rounded-lg overflow-hidden relative">
        <div
          class="h-full bg-blue-pen transition-all duration-300"
          :style="{ width: `${widget.uploadProgress}%` }"
        ></div>
        <div class="absolute inset-0 flex items-center justify-center text-sm font-handwritten text-pencil">
          {{ widget.uploadProgress }}%
        </div>
      </div>
    </div>

    <!-- 上传错误显示 -->
    <div v-else-if="hasError" class="w-full h-full flex flex-col items-center justify-center text-center p-4">
      <div class="text-4xl mb-4">❌</div>
      <div class="text-lg font-handwritten text-red-accent mb-2">上传失败</div>
      <div class="text-sm font-handwritten text-pencil/60">{{ widget.uploadError }}</div>
    </div>

    <!-- 图片显示区域 -->
    <div v-else-if="widget.src" class="w-full h-full flex flex-col">
      <!-- 图片容器 -->
      <div class="flex-1 flex items-center justify-center overflow-hidden">
        <img
          v-viewer="{
            toolbar: {
              zoomIn: 4,
              zoomOut: 4,
              oneToOne: 4,
              reset: 4,
              prev: 0,
              play: 0,
              next: 0,
              rotateLeft: 4,
              rotateRight: 4,
              flipHorizontal: 4,
              flipVertical: 4,
            },
            title: false,
            navbar: false,
          }"
          :src="imageUrl"
          :alt="widget.filename"
          class="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
        />
      </div>

      <!-- 下载按钮 -->
      <div class="flex justify-center mt-2">
        <button
          @click.stop="downloadImage"
          class="btn-hand-drawn px-3 py-1 text-sm font-handwritten flex items-center gap-1 hover:scale-105 transition-transform"
          title="下载图片"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          下载
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-pencil/40 font-handwritten text-center">
      <div class="text-4xl mb-2">🖼️</div>
      <p>暂无图片</p>
    </div>
  </div>
</template>
