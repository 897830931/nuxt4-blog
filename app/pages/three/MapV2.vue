<template>
  <DemoWrap>
    <client-only>
      <div class="w-full h-full relative">
        <div v-show="drillDownList.length" class="back-btn" @click="handleBack">
          <i class="el-icon-arrow-left"></i>返回
        </div>
        <GaodeMap :isScale="false" class="relative" :level="drillDownList.length" :selfMapId="curAreaId"
          @areaClick="handleArea" />
      </div>
    </client-only>
  </DemoWrap>
</template>

<script setup>
import GaodeMap from './components/GaodeMap/index.vue'
import DemoWrap from '@/components/DemoWrap/index.vue'
// definePageMeta({
//   layout: 'empty',
// });

// 如果使用 Nuxt 3，可以设置页面布局
// definePageMeta({ layout: 'empty' })

const curAreaId = ref("440000")  // 地区id
const drillDownList = ref([])     // 下钻数组

function handleArea(data) {
  console.log("data", data)
  if (curAreaId.value !== data.id && drillDownList.value.length < 1) {
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
  // 实现相应逻辑
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
</style>
