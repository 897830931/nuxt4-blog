<template>
    <div class="component-class pb-2">
        <img class="rounded-tr-lg w-full aspect-[16/10] rounded-tl-lg" src="@/assets/img/layouts/avatar.jpg" alt="">
        <div class="grid grid-rows-2 items-center justify-center p-1 text-2xl border-b-[1px]">
            <span class="text-orange-500">Pumpkin</span>
            <span class="text-sm text-gray-600">加油，做个优秀的人</span>
        </div>
        <div class="demo-collapse">
            <el-collapse accordion>
                <el-collapse-item title="Efficiency" name="3">
                    <template #title>
                        <div class="text-sm pl-2 flex items-center justify-start">最爱的人 <span
                                class="iconfont  icon-airen"></span></div>
                    </template>
                    <div>
                        希望一直走下去的<span class="text-sky-600">星星</span>
                    </div>
                </el-collapse-item>
                <el-collapse-item name="1">
                    <template #title>
                        <div class="text-sm pl-2 flex items-center justify-start">我喜欢的歌手<span
                                class="iconfont icon-geshou"></span></div>
                    </template>
                    <div>
                        周杰伦
                    </div>
                </el-collapse-item>
                <el-collapse-item title="Feedback" name="2">
                    <template #title>
                        <div class="text-sm pl-2 flex items-center justify-start">当然要去吃 <span
                                class="iconfont icon-hanbao"></span></div>
                    </template>
                    <div class="px-2">
                        妈妈做的炸酱面、螺蛳粉、火锅、烤面筋、苹果、辣子鸡、油泼面
                    </div>

                </el-collapse-item>

            </el-collapse>
        </div>
        <client-only>
            <Aplayer />
        </client-only>

        <div class="p-2 flex justify-between text-left">
            <span> {{ date }}</span> <span>距离<span class="text-sky-600">{{ countdown.name }}
                </span>还有
                <span class="text-red-600"> {{ countdown.date
                    }}</span>
                天</span>
        </div>


    </div>
</template>

<script setup lang='ts'>
import { ref, onMounted, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import Aplayer from '@/components/Aplayer/index.vue';

const countdown = ref({
    name: '',
    date: 0

});
// 节日倒计时
function updateCountdown() {
    const today: Date = new Date();
    const year: number = today.getFullYear();
    const distances: FestivalDistance[] = festivals.map((festival: Festival): FestivalDistance => {
        const festivalDate: Date = new Date(festival.date);
        if (festivalDate < today) {
            festivalDate.setFullYear(year + 1);
        }
        const diff: number = Math.ceil((festivalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...festival, diff };
    });

    const nextFestival: FestivalDistance = distances.reduce((prev: FestivalDistance, curr: FestivalDistance) => prev.diff < curr.diff ? prev : curr);
    countdown.value = {
        name: nextFestival.name,
        date: nextFestival.diff
    }
}
onMounted(() => {
    updateCountdown();  // 初次挂载时立即更新
    const timer = setInterval(updateCountdown, 86400000); // 每天更新一次

    onUnmounted(() => {
        clearInterval(timer); // 清除定时器
    });
});

const date = dayjs().format('YYYY年MM月DD日');
// 定义一个类型来描述单个节日
interface Festival {
    date: string;
    name: string;
}

// 定义一个类型来描述节日和距离今天的天数
interface FestivalDistance extends Festival {
    diff: number;
}
const festivals: Festival[] = [
    { date: '2024-01-01', name: '元旦' },
    { date: '2024-02-10', name: '春节' },
    { date: '2024-04-05', name: '清明节' },
    { date: '2024-05-01', name: '劳动节' },
    { date: '2024-06-12', name: '端午节' },
    { date: '2024-09-13', name: '中秋节' },
    { date: '2024-10-01', name: '国庆节' }
];




</script>

<style lang="scss" scoped>
.iconfont {
    margin-left: 6px;
    font-size: 18px;
}
</style>