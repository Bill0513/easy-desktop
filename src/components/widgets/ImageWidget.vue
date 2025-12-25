<script setup lang="ts">
import { ref } from "vue";
import { useDesktopStore } from "@/stores/desktop";
import type { ImageWidget } from "@/types";

const props = defineProps<{
  widget: ImageWidget;
}>();

const store = useDesktopStore();
const showPreview = ref(false);

// 缩小
const zoomOut = () => {
  const newScale = Math.max(0.25, props.widget.scale - 0.25);
  store.updateWidget(props.widget.id, { scale: newScale });
};

// 放大
const zoomIn = () => {
  const newScale = Math.min(3, props.widget.scale + 0.25);
  store.updateWidget(props.widget.id, { scale: newScale });
};

// 点击预览
const openPreview = () => {
  showPreview.value = true;
};

// 关闭预览
const closePreview = () => {
  showPreview.value = false;
};

// 阻止预览区域的拖拽事件传播
const handlePreviewDrag = (e: Event) => {
  e.stopPropagation();
};
</script>

<template>
  <div class="h-full flex items-center justify-center overflow-hidden">
    <!-- 图片显示区域 -->
    <div
      class="w-full h-full flex items-center justify-center cursor-pointer hover:opacity-95 transition-opacity"
      @click="openPreview"
    >
      <img
        v-if="widget.src"
        :src="widget.src"
        :style="{ transform: `scale(${widget.scale})` }"
        class="max-w-full max-h-full object-contain transition-transform duration-200"
        alt="图片"
      />
      <div v-else class="text-pencil/40 font-handwritten text-center">
        <div class="text-4xl mb-2">🖼️</div>
        <p>暂无图片</p>
      </div>
    </div>

    <!-- 右下角缩放控制 -->
    <div
      class="absolute bottom-2 right-2 flex gap-1 bg-white border-2 border-pencil shadow-hard px-2 py-1 rounded-lg"
      @mousedown.stop
    >
      <button
        class="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors"
        title="缩小"
        @click="zoomOut"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 12H4"
          />
        </svg>
      </button>
      <span class="text-sm font-handwritten min-w-[3ch] text-center">
        {{ Math.round(widget.scale * 100) }}%
      </span>
      <button
        class="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors"
        title="放大"
        @click="zoomIn"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>

    <!-- 预览弹窗 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showPreview"
          class="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
          @click="closePreview"
          @mousedown="handlePreviewDrag"
        >
          <!-- 关闭按钮 -->
          <button
            class="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            @click="closePreview"
          >
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <!-- 预览图片 -->
          <img
            v-if="widget.src"
            :src="widget.src"
            class="max-w-[90vw] max-h-[90vh] object-contain"
            alt="预览"
            @click.stop
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
