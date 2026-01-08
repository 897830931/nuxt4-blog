<template>
  <div class="home-index">
    <GaodeMap :level="drillDownList.length" :threeConfig="threeConfig" :isScale="false" :selfMapId="curAreaId" @areaClick="handleArea" />
    <div v-show="drillDownList.length" class="back-btn" @click="handleBack">
      <i class="el-icon-arrow-left"></i>返回
    </div>
  </div>
</template>

<script>
import GaodeMap from "./components/GaodeMap/index.vue"
export default {
  name: "HomeIndex",
  components: {
    GaodeMap,
  },
  data() {
    return {
      curAreaId: "440000", // getDicApiGeoByAreaCode的adcode是440000，getDicApiGeoById的id是44
      drillDownList: [], // 下钻数组
    }
  },
  watch: {},
  computed: {
    threeConfig() {
      return {
        idKey: 'adcode',//地图数据的key,判断都依据这个
        cpKey: 'cp',
        showLabel: true,
        showTooltip: false, // 是否显示提示信息
        tooltipHeight: 3.5,
        labelType: '2d', // 区域标题展示类型 2d 3d
        labelHoverColor: '#ffff00', // 区域标题悬浮颜色
        areaHoverColor: 'rgb(124, 205, 230, 0.8)', // 区域悬浮颜色
        createLabelElement: null, // 创建区域标题元素
        lineColor: '#87cefa', //线颜色
        lineWidth: 2, //区域分隔线宽
        areaColor: 'rgb(124, 205, 230, 0.8)', // 区域颜色
      }
    }
  },
  mounted() { },
  methods: {
    // ==================================== 一、逻辑类 ====================================
    handleArea(data) {
      console.log("data", data)
      if (this.curAreaId != data.id && this.drillDownList.length <= 1) {
        // 下钻时把上一个地区id压栈
        this.drillDownList.push(this.curAreaId)
        this.curAreaId = data.id
      }
    },
    handleType(type) {
      this.type = type
    },
    handleBack() {
      // 地图返回事件
      this.curAreaId = this.drillDownList.pop()
    },
    createTooltipElement(data) {
      const div = document.createElement('div')
      div.style.width = '100px'
      div.style.height = '50px'
      div.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'
      div.innerHTML = `
        <div class="tooltip-content">
          <div>名称：</div>
          <div>${data.name}</div>
        </div>
      `
      return div
    },
    createLabelElement(data) {
      const div = document.createElement('div')
      div.style.width = '100px'
      div.style.height = '50px'
      div.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'
      div.innerHTML = `
        <div class="tooltip-content">
          <div>名称：</div>
          <div>${data.name}</div>
        </div>
      `
      return div
    },
    // ==================================== 二、数据请求类 ================================
    // ==================================== 三、跳转类 ====================================
    // ==================================== 四、小工具类 ==================================
  },
}
</script>

<style lang="scss" scoped>
.tooltip-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
}
.home-index {
  height: 100vh;
  width: 100vw;
  position: relative;
  .back-btn {
    position: absolute;
    top: 28px;
    left: 52px;
    cursor: pointer;
    font-size: 18px;
    color: #fff;
    z-index: 420;
  }
  .type-list{
    position: absolute;
    top: 28px;
    right: 52px;
    z-index: 420;
    .type-item{
      background: #157394;
      border-radius: 4px;
      color: #95c6df;
      cursor: pointer;
      font-size: 12px;
      font-weight: 400;
      height: 30px;
      padding: 0 10px;
      &:last-child{
        margin-left: 10px;
      }
      &.active{
        background: #1b6de8;
      }
    }
  }
}
</style>

