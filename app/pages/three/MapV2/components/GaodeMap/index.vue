<template>
  <div class="common-map fcc" :id="`${id}Parent`" :style="{ width: width, height: height }" v-loading="loading" element-loading-background="rgba(0, 0, 0, 0.5)"
    v-domResize="resize">
    <div class="common-map-content" :id="id"></div>
    <div class="common-map-operate">
      <div class="common-map-operate-item" v-for="item in operateList" :key="item.name" @click="item.callback">
        {{ item.name }}
      </div>
    </div>
  </div>
</template>
<script>
import BaseMixins from "./mixins";
export default {
  name: "CommonMap",
  mixins: [BaseMixins],
  data() {
    return {
      operateList: [
        {
          name: '区域名称',
          callback: this.handleName,
          isChecked: true,
        },
        {
          name: '圆柱',
          callback: this.handleCylinder,
          isChecked: true,
        },
        {
          name: '飞线',
          callback: this.handleLine,
          isChecked: true,
        },
        {
          name: '着色图',
          callback: this.handleColor,
          isChecked: true,
        },
        {
          name: '热力图',
          callback: this.handleHeat,
          isChecked: true,
        }
      ],
    }
  },
  mounted() {
    setTimeout(() => {
      this.threeMapObject.createBarsAndRings(this.dataArray, this.visualList)
      this.threeMapObject.createText()
      this.threeMapObject.createFlightLines(this.dataArray, this.visualList)
      this.threeMapObject.updateMapStyles(this.dataArray, this.visualList, this.threeConfig.areaColor)
    }, 1000)
  },
  methods: {
    handleCylinder() {

      if (this.operateList[1].isChecked) {
        this.threeMapObject && this.threeMapObject.createBarsAndRings([], this.visualList)
        this.operateList[1].isChecked = false
      } else {
        this.threeMapObject && this.threeMapObject.createBarsAndRings(this.dataArray, this.visualList)
        this.operateList[1].isChecked = true;
      }

    },
    handleColor() {
      console.log(this.dataArray)
      if (this.operateList[3].isChecked) {
        this.threeMapObject && this.threeMapObject.updateMapStyles(
          [],
          this.visualList,
          this.threeConfig.areaColor
        )
      } else {
        this.threeMapObject && this.threeMapObject.updateMapStyles(
          this.dataArray,
          this.visualList,
          this.threeConfig.areaColor
        )
      }
      this.operateList[3].isChecked = !this.operateList[3].isChecked;
    },
    handleHeat() {
      if (this.operateList[4].isChecked) {
        this.threeMapObject && this.threeMapObject.renderHeatmaps(this.heatRound, {
          data: [],
          max: 100,
        }, this.heatConfig)
      } else {
        this.threeMapObject && this.threeMapObject.renderHeatmaps(this.heatRound, this.heatData, this.heatConfig)
      }
      this.operateList[4].isChecked = !this.operateList[4].isChecked
    },
    handleLine() {
      if (this.operateList[2].isChecked) {
        this.threeMapObject && this.threeMapObject.createFlightLines([], this.visualList)
      } else {
        this.threeMapObject && this.threeMapObject.createFlightLines(this.dataArray, this.visualList)
      }
      this.operateList[2].isChecked = !this.operateList[2].isChecked
    },
    handleName() {
      this.threeMapObject && this.threeMapObject.createText()
    },
  }
};
</script>

<style lang="scss" scoped>
.common-map {
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

:deep(.bar-label)  {
  position: absolute;
  transform: translate(-50%, -100%);
  /* 居中并贴顶 */
  background: rgba(79, 136, 158, 0.7);
  /* 半透明背景 */
  color: #fff;
  /* 白色文字 */
  padding: 4px 8px;
  /* 内边距 */
  border-radius: 4px;
  /* 圆角 */
  font-size: 12px;
  /* 基础字号 */
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  /* 防折行 */
  // pointer-events: none;
  /* 不拦截鼠标 */
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
