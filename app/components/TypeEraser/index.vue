<template>
  <div class="typing-container" :style="{ '--duration': duration + 's' }">
    <!-- 底层文字 -->
    <p class="base">
      {{ text }}
    </p>
    <!-- 擦除层 -->
    <div class="eraser">
      <p class="text">
        {{ text }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  /**
   * 要展示和擦除的文本内容
   */
  text: {
    type: String,
    default: ''
  },
  /**
   * 擦除动画时长，单位秒
   */
  duration: {
    type: Number,
    default: 10
  }
});
</script>

<style scoped>
body {
  font-family: monospace;
}
.typing-container {
  position: relative;
  background: #fff;
  padding: 20px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 600px;
  line-height: 1.5;
  overflow: hidden;
}

/* 静态底层文字 */
.base {
  margin: 0;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 动画允许自定义属性 */
@property --v {
  syntax: "<percentage>";
  inherits: false;
  initial-value: 0%;
}

/* 擦除层 */
.eraser {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  bottom: 20px;
  pointer-events: none;
  overflow: hidden;
}

.text {
  --v: 0%;
  /* 渐变遮罩：透明→背景色 */
  background: linear-gradient(
    to right,
    transparent var(--v),
    #fff calc(var(--v) + 2ch)
  );
  color: transparent;
  white-space: pre-wrap;
  word-break: break-word;
  animation: erase var(--duration) linear forwards;
}

@keyframes erase {
  to { --v: 100%; }
}
</style>
