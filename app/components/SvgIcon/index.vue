<template>
  <div>
    <!-- 正确方式：使用 img 标签加载 SVG -->
    <img :src="iconPath" alt="Loading icon" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// 使用 import.meta.glob() 动态导入 SVG
const icons = import.meta.glob('@/assets/icons/*.svg');

const props = defineProps({
  icon: {
    type: String,
    required: true,
  },
});

const iconPath = ref('');


onMounted(async () => {
  if (icons[`/assets/icons/${props.icon}.svg`]) {
    // 使用动态导入的路径
    iconPath.value = (await icons[`/assets/icons/${props.icon}.svg`]()).default;
  } else {
    console.error(`无法找到图标: ${props.icon}`);
  }
});
</script>
