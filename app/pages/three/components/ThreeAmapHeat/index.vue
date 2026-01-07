<template>

  <client-only>
    <div class="common-map fcc h-full w-full" :id="`${id}Parent`" :style="{ width, height }" v-loading="loading"
      element-loading-background="rgba(0, 0, 0, 0.5)" v-domResize="resize">
      <div class="common-map-content" :id="id"></div>
    </div>
  </client-only>

</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useCommonMap } from './mixin'
definePageMeta({
  layout: 'empty',
});

// 定义组件传入的 props（如果需要）
// 也可以在父组件中传入相关值
const props = defineProps({
  id: { type: String, default: 'CommonMap' },
  width: { type: String, default: '100%' },
  height: { type: String, default: '100%' },
  selfMapId: { type: String },
  // 其他 prop...
})


// 如果需要向父组件发送事件
const emit = defineEmits(['areaClick'])
// 调用组合式函数，传入 props 与 emit
const { id, width, height, loading, resize } = useCommonMap(props, emit)
</script>

<style lang="scss" scoped>
.common-map {
  height: 800px;
  width: 800px;

  .common-map-content {
    width: 100%;
    height: 100%;
  }
}
</style>
