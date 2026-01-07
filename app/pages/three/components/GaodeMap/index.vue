<template>
  <div
    class="common-map fcc"
    :id="`${id}Parent`"
    :style="{ width: width, height: height }"
    v-loading="loading"
    element-loading-background="rgba(0, 0, 0, 0.5)"
    v-domResize="resize"
  >
    <div class="common-map-content" :id="id"></div>
  </div>
</template>
<script>
import BaseMixins from "./mixins";
export default {
  name: "CommonMap",
  mixins: [BaseMixins],
};
</script>

<style lang="scss" scoped>
.common-map {
  .common-map-content {
    width: 100%;
    height: 100%;
  }
}
</style>
