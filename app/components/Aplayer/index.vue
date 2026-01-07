<template>
    <div ref="aplayerContainer"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import APlayer from 'aplayer';

const aplayerContainer = ref(null);

onMounted(() => {
    if (process.client) {
        const ap = new APlayer({
            container: aplayerContainer.value,
            mini: false,
            autoplay: false,
            theme: '#FADFA3',
            loop: 'all',
            order: 'random',
            preload: 'auto',
            volume: 0.7,
            mutex: true,
            listFolded: false,
            listMaxHeight: 90,
            lrcType: 3,
            audio: [{
                name: '半岛铁盒',
                artist: '周杰伦',
                url: '/music/mp3/music1.mp3',
                cover: '/music/cover/music1.jpg',
                lrc: '/music/text/music1.lrc'
            }]
        });
    }
});
</script>
<!--    ！！能使用scoped 使用之后样式报错 -->
<style lang="scss">
@import "aplayer/dist/APlayer.min.css";
</style>