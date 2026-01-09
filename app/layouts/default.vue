<template>
    <div>
        <div class="grid min-h-screen grid-cols-[auto,1fr] gap-2 grid-rows-[1fr,auto] md:grid-rows-[auto,1fr,auto] md:grid-cols-1">
            <div class="md:bg-[rgba(168,198,215,0.9)] h-fit sticky top-0 z-50">
                <Header />
            </div>
            <div class="md:w-full z-30">
                <div class="grid md:w-[1320px] h-full gap-2 grid-cols-1 md:grid-cols-[1fr_3fr] md:grid-rows-1 md:min-w-[1320px] md:mx-auto">
                    <Aside class="box h-fit hidden md:block md:sticky md:top-24" />
                    <div class="md:max-w-full md:w-full">
                        <NuxtPage class="h-full" />
                    </div>
                </div>
            </div>
            <Footer class="col-span-full md:col-span-1" />
            <el-backtop
                :right="20"
                :bottom="100"
            />
        </div>
        <div class="bg1 bg-full -z-10 fixed top-0 w-screen h-screen" />
        <div
            :style="bg2Style"
            class="bg2 bg-full -z-10 fixed top-0 w-screen h-screen"
        ></div>
        <div
            :style="bg2Style"
            class="flex md:justify-between bg-transparent px-4 justify-center items-end -z-10 fixed top-0 w-screen h-screen"
        >
            <img
                src="/img/myIcon1.svg"
                class="md:w-1/5"
            />
            <img
                src="/img/myIcon2.svg"
                class="w-1/5 hidden md:block"
            />
        </div>
    </div>
</template>

<script setup>
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Aside from './components/Aside.vue'

const bg2Style = ref({ opacity: '1' })

function handleScroll() {
    const scrollPosition = window.scrollY
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const opacity = 1 - scrollPosition / maxScroll
    bg2Style.value.opacity = opacity.toString()
}

onMounted(() => {
    window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.bg1 {
    background-image: linear-gradient(to right top, #38438b, #944b94, #d75a88, #ff7e71, #ffb25f, #ffeb68);
}

.bg2 {
    background-image: linear-gradient(to right top, #6d327c, #485da6, #00a1ba, #00bf98, #36c486);
}
</style>
