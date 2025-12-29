<script setup lang="ts">
import { ref, computed } from "vue";
import { useDesktopStore } from "@/stores/desktop";
import type { ImageWidget } from "@/types";

const props = defineProps<{
  widget: ImageWidget;
}>();

const store = useDesktopStore();
const showPreview = ref(false);
const transformOrigin = ref('center center');

// 拖动状态
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartOffsetX = ref(0);
const dragStartOffsetY = ref(0);

// 获取图片完整URL
const imageUrl = computed(() => {
  if (!props.widget.src) return '';
  const imageDomain = import.meta.env.VITE_IMAGE_DOMAIN || 'https://sunkkk.de5.net';
  return `${imageDomain}/${props.widget.src}`;
});

// 计算鼠标样式
const cursorStyle = computed(() => {
  if (props.widget.scale > 1) {
    return isDragging.value ? 'grabbing' : 'grab';
  }
  return 'default';
});

// 鼠标滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();

  // 获取容器和鼠标位置
  const container = e.currentTarget as HTMLElement;
  const rect = container.getBoundingClientRect();

  // 计算鼠标在容器中的相对位置（百分比）
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  // 设置缩放中心点
  transformOrigin.value = `${x}% ${y}%`;

  // 根据滚轮方向调整缩放
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  const newScale = Math.max(0.25, Math.min(3, props.widget.scale + delta));

  // 如果缩放到1或以下，重置偏移量
  if (newScale <= 1) {
    store.updateWidget(props.widget.id, {
      scale: newScale,
      offsetX: 0,
      offsetY: 0
    });
  } else {
    store.updateWidget(props.widget.id, { scale: newScale });
  }
};

// 开始拖动
const handleMouseDown = (e: MouseEvent) => {
  // 只有放大时才能拖动
  if (props.widget.scale <= 1) return;

  e.preventDefault();
  e.stopPropagation();

  isDragging.value = true;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  dragStartOffsetX.value = props.widget.offsetX;
  dragStartOffsetY.value = props.widget.offsetY;

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// 拖动中
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;

  const deltaX = e.clientX - dragStartX.value;
  const deltaY = e.clientY - dragStartY.value;

  const newOffsetX = dragStartOffsetX.value + deltaX;
  const newOffsetY = dragStartOffsetY.value + deltaY;

  store.updateWidget(props.widget.id, {
    offsetX: newOffsetX,
    offsetY: newOffsetY
  });
};

// 结束拖动
const handleMouseUp = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
};

// 打开预览
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

// 暴露方法给父组件
defineExpose({
  openPreview
});
</script>

<template>
  <div class="h-full flex items-center justify-center overflow-hidden p-1">
    <!-- 图片显示区域 -->
    <div
      class="w-full h-full flex items-center justify-center transition-opacity"
      :style="{ cursor: cursorStyle }"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
    >
      <img
        v-if="widget.src"
        :src="imageUrl"
        :style="{
          transform: `translate(${widget.offsetX}px, ${widget.offsetY}px) scale(${widget.scale})`,
          transformOrigin: transformOrigin
        }"
        class="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
        alt="图片"
        draggable="false"
      />
      <div v-else class="text-pencil/40 font-handwritten text-center">
        <div class="text-4xl mb-2">🖼️</div>
        <p>暂无图片</p>
      </div>
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
            :src="imageUrl"
            class="max-w-[90vw] max-h-[90vh] object-contain"
            alt="预览"
            @click.stop
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
