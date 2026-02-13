import { ref, onMounted, onUnmounted, computed } from 'vue'

const MOBILE_BREAKPOINT = 768

export function useResponsiveMode() {
  const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)

  const updateViewport = () => {
    viewportWidth.value = window.innerWidth
  }

  onMounted(() => {
    updateViewport()
    window.addEventListener('resize', updateViewport)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateViewport)
  })

  const isMobile = computed(() => viewportWidth.value <= MOBILE_BREAKPOINT)

  return {
    isMobile,
    viewportWidth
  }
}
