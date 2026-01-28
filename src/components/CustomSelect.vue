<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

interface Option {
  label: string
  value: string | number
}

interface Props {
  modelValue: string | number
  options: Option[]
  placeholder?: string
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择',
  width: 'auto'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const isOpen = ref(false)
const selectRef = ref<HTMLDivElement>()

const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue)
})

const displayText = computed(() => {
  return selectedOption.value?.label || props.placeholder
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectOption(option: Option) {
  emit('update:modelValue', option.value)
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    ref="selectRef"
    class="custom-select relative inline-block"
    :style="{ width: width }"
  >
    <!-- 选择框 -->
    <button
      type="button"
      class="select-button w-full px-3 py-2 bg-white text-pencil font-handwritten text-left flex items-center justify-between gap-2 cursor-pointer transition-all hover:shadow-[3px_3px_0px_#2d2d2d]"
      :class="{ 'shadow-[3px_3px_0px_#2d2d2d]': isOpen }"
      @click="toggleDropdown"
    >
      <span class="flex-1 truncate">{{ displayText }}</span>
      <ChevronDown
        :size="16"
        :stroke-width="2.5"
        class="flex-shrink-0 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- 下拉选项 -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="dropdown-menu absolute top-full left-0 right-0 mt-2 bg-paper border-2 border-pencil shadow-[4px_4px_0px_#2d2d2d] max-h-60 overflow-y-auto z-50"
        style="border-radius: 15px 225px 15px 225px / 225px 15px 255px 15px;"
      >
        <div
          v-for="option in options"
          :key="option.value"
          class="option-item px-3 py-2 cursor-pointer font-handwritten text-pencil transition-colors hover:bg-yellow-100"
          :class="{ 'bg-blue-100': option.value === modelValue }"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.select-button {
  border: 2px solid #2d2d2d;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  box-shadow: 2px 2px 0px #2d2d2d;
}

.dropdown-menu {
  scrollbar-width: thin;
  scrollbar-color: #2d2d2d #fdfbf7;
}

.dropdown-menu::-webkit-scrollbar {
  width: 8px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background: #fdfbf7;
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background: #2d2d2d;
  border-radius: 4px;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
