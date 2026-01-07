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
  dataArray: {
    type: Array, default: () => [
      { areaId: '370100', value: 20 }, // 广州
      { areaId: '370300', value: 105 }, // 深圳
      { areaId: '370600', value: 85 }, // 佛山
      { areaId: '370700', value: 110 }, // 中山
      { areaId: '370800', value: 120 }, // 东莞
    ]
  },
  rangeList: {
    type: Array, default: () => [
      { min: 0, max: 80, color: '#00ff00' }, // 绿色：值在 0~80
      { min: 80, max: 100, color: '#ffff00' }, // 黄色：值在 80~100
      { min: 100, max: 120, color: '#ff9900' }, // 橙色：值在 100~120
      { min: 120, max: 200, color: '#ff0000' }, // 红色：值在 120~200
    ]
  },
  level: { type: Number, default: 0 },
  zoom: { type: Number, default: 7 },
  threeConfig: {
    type: Object,
    default: () => {
      return {
        labelType: '2d',
      }
    }
  }
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
