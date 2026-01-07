<template>
    <div class="component-class bg-gray-50 p-4 md:p-6 rounded-md">
        <div class="group mb-2" v-for="(item, index) in menuList" :key="index">
            <!-- 分类标题 -->
            <div
                class="py-2 flex justify-start m-0 mb-4 items-center text-2xl font-semibold text-gray-800 border-b border-gray-300">
                {{ item.category }}
            </div>

            <!-- 子块 -->
            <div class="list flex flex-wrap gap-4">
                <div class="item w-full md:w-[200px] cursor-pointer bg-gray-200 rounded-lg shadow-sm p-4 hover:shadow-lg hover:bg-gray-300 transition-all"
                    @click="routerTo(demo)" v-for="(demo, index) in item.list" :key="index">
                    <div class="item-title font-medium text-lg text-gray-700">{{ demo.name }}</div>
                    <div class="item-desc text-sm text-gray-500 mt-1">{{ demo.description }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { menuList } from './router';

const router = useRouter();
const routerTo = (item: any) => {
    if (item.path) {
        router.push(item.path);
    }
};
</script>

<style lang="scss" scoped></style>