<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";

// 从环境变量读取密码，默认 000000
const CORRECT_PASSWORD = import.meta.env.VITE_DESKTOP_PASSWORD || "000000";

// 6个密码框
const passwordInputs = ref<(HTMLInputElement | null)[]>([
  null,
  null,
  null,
  null,
  null,
  null,
]);
const passwordValues = ref<string[]>(["", "", "", "", "", ""]);
const isUnlocked = ref(false);
const errorMsg = ref("");

const emits = defineEmits<{
  unlock: [];
}>();

// 输入处理
const handleInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  // 只允许数字
  if (!/^\d*$/.test(value)) {
    passwordValues.value[index] = "";
    input.value = "";
    return;
  }

  passwordValues.value[index] = value;

  // 如果输入了内容，自动跳到下一个框
  if (value && index < 5) {
    nextTick(() => {
      passwordInputs.value[index + 1]?.focus();
    });
  }

  // 检查是否输满了6位
  checkPassword();
};

// 处理退格键
const handleKeydown = (index: number, event: KeyboardEvent) => {
  // 如果是退格键且当前框为空，跳到前一个框
  if (event.key === "Backspace" && !passwordValues.value[index] && index > 0) {
    nextTick(() => {
      passwordInputs.value[index - 1]?.focus();
    });
  }
};

// 检查密码
const checkPassword = () => {
  const enteredPassword = passwordValues.value.join("");

  if (enteredPassword.length === 6) {
    if (enteredPassword === CORRECT_PASSWORD) {
      isUnlocked.value = true;
      errorMsg.value = "";
      emits("unlock");
    } else {
      // 密码错误，清空并回到第一个框
      passwordValues.value = ["", "", "", "", "", ""];
      errorMsg.value = "密码错误";
      nextTick(() => {
        passwordInputs.value[0]?.focus();
      });
    }
  } else {
    errorMsg.value = "";
  }
};

// 自动聚焦到第一个框
onMounted(() => {
  nextTick(() => {
    passwordInputs.value[0]?.focus();
  });
});
</script>

<template>
  <div class="fixed inset-0 bg-paper flex items-center justify-center z-50">
    <div class="card-hand-drawn p-8 md:p-12 text-center max-w-lg w-full mx-4">
      <!-- 标题 -->
      <h1 class="text-3xl md:text-4xl font-marker mb-2 text-pencil">
        密码保护
      </h1>
      <p class="text-lg font-handwritten text-pencil/70 mb-8">
        请输入6位数字密码
      </p>

      <!-- 错误提示 -->
      <p
        v-if="errorMsg"
        class="text-xl font-handwritten text-accent mb-4 animate-pulse"
      >
        {{ errorMsg }}
      </p>

      <!-- 6个密码框 -->
      <div class="flex justify-center gap-3 mb-8">
        <input
          v-for="(_, index) in 6"
          :key="index"
          :ref="(el) => { passwordInputs[index] = el as HTMLInputElement }"
          type="text"
          inputmode="numeric"
          maxlength="1"
          :value="passwordValues[index]"
          class="w-12 h-16 md:w-14 md:h-18 text-center text-2xl md:text-3xl font-handwritten border-3 border-pencil bg-white shadow-hard focus:ring-2 focus:ring-bluePen/30 focus:border-bluePen outline-none transition-all duration-100"
          :style="{
            borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
          }"
          @input="handleInput(index, $event)"
          @keydown="handleKeydown(index, $event)"
        />
      </div>
    </div>
  </div>
</template>
