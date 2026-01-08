<template>
  <DemoWrap>
    <client-only>
      <div class="w-full h-full relative">
        <div v-show="drillDownList.length" class="back-btn" @click="handleBack">
          <i class="el-icon-arrow-left"></i>返回
        </div>
        <GaodeMap
          :isScale="false"
          class="relative"
          :level="drillDownList.length"
          :selfMapId="curAreaId"
          :threeConfig="threeConfig"
          @areaClick="handleArea"
        />
      </div>
    </client-only>
  </DemoWrap>
</template>

<script setup>
import GaodeMap from './components/ThreeAmap/index.vue'
import DemoWrap from '@/components/DemoWrap/index.vue'
definePageMeta({
  layout: 'empty',
});

// 如果使用 Nuxt 3，可以设置页面布局
// definePageMeta({ layout: 'empty' })

const curAreaId = ref("370000")  // 地区id
const drillDownList = ref([])     // 下钻数组
const threeConfig = computed(() => ({
  idKey: 'adcode',
  cpKey: 'cp',
  showLabel: true,
  showTooltip: false,
  tooltipHeight: 3.5,
  labelType: '2d',
  labelHoverColor: '#ffff00',
  areaHoverColor: 'rgb(124, 205, 230, 0.8)',
  createLabelElement:null,
  createTooltipElement,
  lineColor: '#87cefa',
  lineWidth: 2,
  areaColor: 'rgb(124, 205, 230, 0.8)',
}))

function handleArea(data) {
  console.log("data", data)
  if (curAreaId.value !== data.id && drillDownList.value.length <= 1) {
    drillDownList.value.push(curAreaId.value)
    curAreaId.value = data.id
  }
}

function handleBack() {
  // 回退时弹出上一个地区id
  curAreaId.value = drillDownList.value.pop()
}

// 如果需要其他方法，比如 handleType，可以按需添加
function handleType(type) {
  
}

function createTooltipElement(data) {
  const div = document.createElement('div')
  div.style.width = '100px'
  div.style.height = '50px'
  div.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'
  div.innerHTML = `
    <div class="tooltip-content">
      <div>名称</div>
      <div>${data.name}</div>
    </div>
  `
  return div
}

function createLabelElement(data) {
  const div = document.createElement('div')
  div.style.width = '100px'
  div.style.height = '50px'
  div.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'
  div.innerHTML = `
    <div class="tooltip-content">
      <div>${data.name}</div>
    </div>
  `
  return div
}
</script>

<style lang="scss" scoped>
.back-btn {
  position: absolute;
  top: 28px;
  left: 52px;
  cursor: pointer;
  font-size: 18px;
  color: #fff;
  z-index: 420;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
}
</style>
