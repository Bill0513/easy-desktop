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
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center overflow-hidden p-2">
    <!-- 上传进度显示 -->
    <div v-if="isUploading" class="w-full h-full flex flex-col items-center justify-center">
      <div class="text-4xl mb-4 animate-bounce">📤</div>
      <div class="text-lg font-handwritten text-text-primary mb-2">上传中...</div>

      <!-- 进度条 -->
      <div class="w-3/4 h-6 bg-bg-primary border-2 border-border-primary rounded-lg overflow-hidden relative">
        <div
          class="h-full bg-blue-pen transition-all duration-300"
          :style="{ width: `${widget.uploadProgress}%` }"
        ></div>
        <div class="absolute inset-0 flex items-center justify-center text-sm font-handwritten text-text-primary">
          {{ widget.uploadProgress }}%
        </div>
      </div>
    </div>

    <!-- 上传错误显示 -->
    <div v-else-if="hasError" class="w-full h-full flex flex-col items-center justify-center text-center p-4">
      <div class="text-4xl mb-4">❌</div>
      <div class="text-lg font-handwritten text-red-accent mb-2">上传失败</div>
      <div class="text-sm font-handwritten text-text-secondary">{{ widget.uploadError }}</div>
    </div>

    <!-- 图片显示区域 -->
    <div v-else-if="widget.src" class="w-full h-full flex items-center justify-center overflow-hidden">
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

    <!-- 空状态 -->
    <div v-else class="text-text-secondary font-handwritten text-center">
      <div class="text-4xl mb-2">🖼️</div>
      <p>暂无图片</p>
    </div>
  </div>
</template>
