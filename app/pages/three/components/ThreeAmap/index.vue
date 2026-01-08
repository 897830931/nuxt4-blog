<template>
  <client-only>
    <div
      class="common-map fcc h-full w-full"
      :id="`${id}Parent`"
      :style="{ width, height }"
      v-loading="loading"
      element-loading-background="rgba(0, 0, 0, 0.5)"
      v-domResize="resize"
    >
      <div class="common-map-content" :id="id"></div>
      <div class="common-map-operate">
        <div
          v-for="item in operateList"
          :key="item.name"
          class="common-map-operate-item"
          @click="item.callback"
        >
          {{ item.name }}
        </div>
      </div>
    </div>
  </client-only>

</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCommonMap } from './mixin'
import heatData from './heatData'
import shandongRound from './shandongRound.json'
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
  heatData: { type: Object, default: () => heatData },
  heatRound: { type: Object, default: () => shandongRound },
  heatConfig: {
    type: Object,
    default: () => ({
      radius: 20,
      blur: 0.95,
      maxOpacity: 0.8,
      minOpacity: 0.2,
    }),
  },
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
const { id, width, height, loading, resize, threeMapObject } = useCommonMap(
  props,
  emit
)

const operateList = ref([
  { name: '区域名称', callback: handleName, isChecked: true },
  { name: '圆柱', callback: handleCylinder, isChecked: true },
  { name: '飞线', callback: handleLine, isChecked: true },
  { name: '着色图', callback: handleColor, isChecked: true },
  { name: '热力图', callback: handleHeat, isChecked: true },
])
const hasInited = ref(false)

watch(
  () => threeMapObject.value,
  (val) => {
    if (!val || hasInited.value) {
      return
    }
    hasInited.value = true
    setTimeout(() => {
      threeMapObject.value?.createBarsAndRings(props.dataArray, props.rangeList)
      threeMapObject.value?.createFlightLines(props.dataArray)
      threeMapObject.value?.updateMapStyles(
        props.dataArray,
        props.rangeList,
        props.threeConfig?.areaColor
      )
    }, 1000)
  }
)

function handleCylinder() {
  if (operateList.value[1].isChecked) {
    threeMapObject.value?.createBarsAndRings([], props.rangeList)
    operateList.value[1].isChecked = false
  } else {
    threeMapObject.value?.createBarsAndRings(props.dataArray, props.rangeList)
    operateList.value[1].isChecked = true
  }
}

function handleColor() {
  if (operateList.value[3].isChecked) {
    threeMapObject.value?.updateMapStyles(
      [],
      props.rangeList,
      props.threeConfig?.areaColor
    )
  } else {
    threeMapObject.value?.updateMapStyles(
      props.dataArray,
      props.rangeList,
      props.threeConfig?.areaColor
    )
  }
  operateList.value[3].isChecked = !operateList.value[3].isChecked
}

function handleHeat() {
  if (operateList.value[4].isChecked) {
    threeMapObject.value?.renderHeatmaps(
      props.heatRound,
      { data: [], max: 100 },
      props.heatConfig
    )
  } else {
    threeMapObject.value?.renderHeatmaps(
      props.heatRound,
      props.heatData,
      props.heatConfig
    )
  }
  operateList.value[4].isChecked = !operateList.value[4].isChecked
}

function handleLine() {
  if (operateList.value[2].isChecked) {
    threeMapObject.value?.createFlightLines([])
  } else {
    threeMapObject.value?.createFlightLines(props.dataArray)
  }
  operateList.value[2].isChecked = !operateList.value[2].isChecked
}

function handleName() {
  threeMapObject.value?.createText()
}
</script>

<style lang="scss" scoped>
.common-map {
  height: 800px;
  width: 800px;
  position: relative;

  .common-map-content {
    width: 100%;
    height: 100%;
  }

  .common-map-operate {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.8);
    padding: 5px;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;

    .common-map-operate-item {
      margin-bottom: 5px;
      padding: 5px 10px;
      border-radius: 5px;
      background: rgba(79, 136, 158, 0.7);
      color: #fff;
      cursor: pointer;
      transition: background 0.3s ease;

      &:hover {
        background: rgba(79, 136, 158, 1);
      }
    }
  }
}

:deep(.bar-label) {
  position: absolute;
  transform: translate(-50%, -100%);
  background: rgba(79, 136, 158, 0.7);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  user-select: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  strong {
    display: block;
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 2px;
  }

  .bar-label-name {
    font-size: 12px;
  }

  .bar-label-value {
    font-size: 18px;
  }
}
</style>
