<template>
    <div class='demo-wrap grid w-screen h-screen '>
       <div class="h-fit w-full p-2">
          <el-button @click="handleBack" type="primary" :icon="Back" class="w-fit">返回</el-button>
       </div>
        <div class="fcc content w-full h-full overflow-auto">
            <slot></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Back } from '@element-plus/icons-vue'

const router = useRouter();
const handleBack = () => {
    router.go(-1);
};
</script>

<style lang="scss" scoped>
.demo-wrap {
    grid-template-rows: 50px minmax(500px, 1fr);
    grid-template-columns: minmax(0, 1fr);
}
</style>