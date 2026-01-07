<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
useHead({
  script: [
    /**
     * 到gsap官网通过控制台下载min.js文件，删除会员插件中的h函数，或者其他报错文件，即可使用
     */
    {
      src: '/js/gsap/gsap.min.js',
      type: 'text/javascript',
    },
    {
      src: '/js/gsap/ScrollTrigger.min.js',
      type: 'text/javascript',
    },
    {
      src: '/js/gsap/ScrollSmootherPlugin3.min.js',
      type: 'text/javascript',
    },
    {
      src: '/js/gsap/SplitText3.min.js',
      type: 'text/javascript',
    },
    {
      src: '/js/gsap/TextPlugin.min.js',
      type: 'text/javascript',
    },

    {
      src: '/js/gsap/ScrambleTextPlugin3.min.js',
      type: 'text/javascript',
    },
    {
      src: '/js/gsap/ScrollToPlugin3.min.js',
      type: 'text/javascript',
    },
    {
      src: '/js/gsap/DraggablePlugin3.min.js',
      type: 'text/javascript',
    },
    {
      src: '/js/gsap/MotionPathPlugin3.min.js',
      type: 'text/javascript',
    },
    {
      src: '/js/gsap/MorphSVGPlugin3.min.js',
      type: 'text/javascript',
    },
  ],
})
let restartMorph: any
onMounted(() => {
  // gsap.registerPlugin(ScrollTrigger);
  // var split = new SplitText(".title", { type: "chars" });
  // //now animate each character into place from 100px above, fading in:
  // gsap.from(split.chars, {
  //   text: "Welcome to Pumpkin Blog",
  //   duration: 1,
  //   y: 100,
  //   autoAlpha: 0,
  //   stagger: 0.05
  // });

  //滚动动画
  let scrollE = ScrollSmoother.create({
    wrapper: "#smooth-wrapper",
    content: "#smooth-content",
    smooth: 1, // how long (in seconds) it takes to "catch up" to the native scroll position
    effects: true, // looks for data-speed and data-lag attributes on elements
    smoothTouch: 0.1, // much shorter smoothing time on touch devices (default is NO smoothing on touch devices)
  });
  // 拖拽演示
  Draggable.create(".flair--1", {
    type: "x",
    bounds: ".container"
  });

  Draggable.create(".flair--3b", {
    type: "rotation",
    inertia: true
  });
  Draggable.create(".flair--4b", {
    bounds: ".container",
    inertia: true
  });

  // charts字母 words 单词 lines 行
  var splitText = new SplitText('.title', { type: 'chars,words,lines' });
  var tl = gsap.timeline({ repeat: -1, yoyo: true });
  tl
    .from(splitText.lines, {
      duration: 0.5,
      opacity: 0,
      scale: 0,
      y: 80,
      rotationX: 150,
      transformOrigin: "0% 50% -50",
      ease: "back",
      stagger: 0.01,

    })
    .to(splitText.chars, { duration: 1.5, opacity: 0, stagger: .125, ease: 'power1. In', color: 'blue' })
    .to(splitText.chars, { duration: .25, opacity: 1, stagger: .125, ease: 'power3. inOut', color: 'white' }, '+=0.2')
  // scrambles插件使用
  // .to(splitText.chars, {
  //   duration: 1,
  //   scrambleText: {
  //     text: "THIS IS NEW TEXT",
  //     revealDelay: 0.5,
  //     speed: 0.3,
  //     newClass: "myClass"
  //   }
  // }, '+=0.2')

  // morphSVG插件使用
  var morph = gsap.to("#circle", { duration: 1, morphSVG: "#hippo", repeat: 1, yoyo: true, repeatDelay: 0.2 })
  restartMorph = () => {
    morph.restart(true);
  }
});
onUnmounted(() => {
  scrollE.scrollTop();
});


let ctx = ref({});
const contentWrap = ref();
const tween = ref();
onMounted(() => {
  ctx.value = gsap.context((self) => {
    const boxes = self.selector('.box');
    boxes.forEach((box: any, index: number) => {
      // 偶数盒子从左侧，奇数盒子从右侧
      const xStart = index % 2 === 0 ? -600 : 600; // 偶数从左侧，奇数从右侧
      const rotation = index % 2 === 0 ? 360 : -360; // 偶数从左侧，奇数从右侧
      const xEnd = 0; // 偶数从左侧，奇数从右侧
      // 从一个状态变到另一个状态
      gsap.from(line, {
        scrollTrigger: {
          trigger: line,       // 每个行元素作为触发器
          start: 'top 80%',     // 当元素到达视口 80% 时开始动画
          end: 'top 20%',       // 动画结束时元素到达视口 20%
          scrub: 1,             // 与滚动同步
          markers: false,       // 关闭调试标记（可以设置为 true 以显示调试）
        },
        opacity: 1,            // 文字逐渐显现
        y: 50,                 // 从下方偏移 50px
        delay: index * 0.2,    // 延迟时间，每行逐渐显示（依次出现）
        duration: 1,           // 动画持续时间
      });
    });
  }, contentWrap.value);//是这个元素下的
  function getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
  }
  tween.value = gsap.to(".box", {
    duration: 2,
    x: 'random([0, 300, 600, 900])', // animate by the px width of the nav
    // xPercent: -100, // offset by the width of the box
    rotation: 360,
    ease: "none",
    paused: true,
    opacity: 0.8,
    background: getRandomColor(),
  });
});

onUnmounted(() => {
  ctx.value.revert(); // <- Easy Cleanup!
});
</script>

<template>
  <div id="smooth-wrapper" class="page-wrap">
    <div id="smooth-content">
      <!-- <img class="header-img h-screen w-screen" src="@/assets/img/home/header.webp" alt=""> -->
      <section class="section1 h-screen w-screen fcc bg-black">
        <div class="title text-4xl"><strong>Welcome</strong> to <strong>Pumpkin Blog</strong></div>
      </section>
      <section class="container min-h-screen min-w-full">
        <div class="wrapper">
          <div class="flair flair--1"></div>
        </div>
        <div class="wrapper">
          <div class="flair flair--3b"></div>
        </div>
        <div class="wrapper">
          <div class="flair flair--4b"></div>
        </div>
      </section>
      <section class="section3 h-screen flex justify-center flex-col items-center">
        <svg xml:space="preserve" id="svg2" x="0" y="0" version="1.1" viewBox="9 80 800 400">
          <path id="background" fill="#1d1d1d" stroke="#000" stroke-miterlimit="10" d="M9 80h800v400H9z" />
          <path id="circle"
            d="M490.1 280.649c0 44.459-36.041 80.5-80.5 80.5s-80.5-36.041-80.5-80.5 36.041-80.5 80.5-80.5 80.5 36.041 80.5 80.5z"
            class="st1" />
          <path id="hippo" fill="#0ae448"
            d="M149 245c2.7-36.7 16.11-69.08 40.1-97.06 27.04-31.6 60.92-47.39 101.63-47.39 15.48 0 38.48 2.45 69.02 7.29 30.54 4.89 53.53 7.28 69.03 7.28 23.69 0 57.87 8.85 102.53 26.48 7.91 3.01 17.47 11.24 28.7 24.59 6.38 7.89 16.26 19.77 29.62 35.57 3.04 2.14 7 5.32 11.86 9.6 4.86 4.22 8.19 6.06 10 5.46.62-1.84 2.15-4.4 4.58-7.74 1.21-1.23 1.96-1.83 2.26-1.83.93.61 1.83 1.21 2.75 1.83.91.62 1.21 2.42.91 5.46-.62 5.47-.91 7.14-.91 5-.33 3.06-.76 5.01-1.37 5.95-3.95 6.67-5.48 11.85-4.55 15.47.92 3.32 3.77 8.67 8.64 15.96 4.87 7.29 7.59 12.76 8.19 16.4-.3 2.73-.43 7.12-.43 13.21l-4.57 11.38c0 8.51 9.86 23.11 29.62 43.78 9.44 4.22 14.12 18.83 14.12 43.71 0 19.47-16.09 29.17-48.27 29.17-4.26 0-8.81-.13-13.68-.47-3.34-1.2-8.2-2.56-14.58-4.07-7.59-.93-12.76-3.49-15.48-7.77-4.88-6.95-12.78-13.51-23.71-19.58-1.82-.88-4.48-4.22-7.98-10.02-3.5-5.77-6.61-9.42-9.33-10.95-2.72-1.49-6.68-1.81-11.86-.88-8.81 1.49-13.68 2.26-14.57 2.26-2.14 0-5.25-.6-9.34-1.83-4.11-1.21-7.05-1.83-8.89-1.83-2.11 9.73-2.59 19.15-1.36 28.25.3 2.45 1.83 4.43 4.56 5.92 4.27 3.05 6.53 4.71 6.85 5.05 2.72 2.11 5.61 5.61 8.64 10.45.62 1.85-.52 4.95-3.42 9.34-2.89 4.41-5.22 7.01-7.06 7.74-1.81.79-5.77 1.18-11.85 1.18-8.82 0-29.45-2.45-30.98-2.73-7.59-1.53-14.13-3.94-19.58-7.3-2.76-1.81-5.91-10.33-9.56-25.52-3.68-16.41-6.72-26.27-9.14-29.64-.6-.9-1.36-1.33-2.26-1.33-1.53 0-4.05 1.49-7.53 4.56-3.49 2.99-5.86 4.65-7.05 5.01-4.24 17.9-6.4 26.4-6.4 25.47 0 7.01 1.97 12.89 5.92 17.77 3.94 4.86 8.06 9.57 12.32 14.11 5.16 5.77 7.74 10.78 7.74 15.04 0 2.41-.75 4.52-2.28 6.37-6.38 7.89-17.02 11.85-31.9 11.85-16.71 0-27.64-2.28-32.79-6.84-6.7-5.77-10.95-11.86-12.76-18.2-.3-1.53-1.05-6.09-2.28-13.68-.61-4.58-1.98-7.29-4.08-8.18-6.1-.92-13.69-2.58-22.78-5.01-1.84-1.21-3.81-4.26-5.94-9.12-3.93-9.4-6.83-15.79-8.66-19.13-9.13-4.56-23.7-9.7-43.76-15.45-.92 1.83-1.35 4.37-1.35 7.72 3.34 4.26 8.34 10.8 15.03 19.58 5.47 7.29 8.2 14.3 8.2 20.96 0 12.78-8.2 19.13-24.61 19.13-12.45 0-20.96-.88-25.52-2.71-6.67-2.73-12.29-9.14-16.85-19.13-7.6-16.74-11.85-26.16-12.76-28.27-4.87-11.23-8.2-21.13-10.01-29.65-1.23-6.05-3.06-15.35-5.49-27.8-2.12-10.3-5.46-18.36-10.01-24.13C155.33 279.36 147.5 260.6 149 245z" />
        </svg>
        <el-button class=" w-[80px]" type="primary" @click="restartMorph">重绘</el-button>
      </section>
      <section>
        <div ref="wrap" class="wrap">
          <h1 class="fcc">动画</h1>
          <div class="control-box flex justify-around">
            <button @click="() => { tween.play() }">play</button>
            <button @click="() => { tween.pause() }">pause</button>
            <button @click="() => { tween.seek(2) }">seek(2)</button>
            <button @click="() => { tween.progress(0.5) }">progress(0.5)</button>
            <button @click="() => { tween.restart() }">restart</button>
          </div>
          <div class="box fcc" v-for="(item, index) in 10" :key="index">box{{ index }}</div>
          <section class="h-[70vh] bg-green-100"></section> <!-- 页面滚动空间 -->
          <div ref="contentWrap" class="content-wrap grid grid-cols-2 gap-4 justify-between">
            <div class="box fcc" v-for="(item, index) in 10" :key="index">box{{ index }}</div>
            <div class="box fcc" v-for="(item, index) in 10" :key="index">box{{ index }}</div>
          </div>

          <div class="box fcc" v-for="(item, index) in 10" :key="index">box{{ index }}</div>

          <section class="h-[100vh] bg-green-100"></section>
          <section class="h-[100vh] bg-green-100"></section>
        </div>
      </section>
    </div>
  </div>


</template>

<style lang="scss" scoped>
.wrap {
  width: 100%;
  /* 设置高度以便页面滚动 */
  margin: 0 auto;


  .box {
    width: 300px;
    height: 300px;
    border: solid 1px #000;
    margin-bottom: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f0f0f0;

    opacity: 0;
    /* 初始透明度为0 */
    transform-origin: center;
  }

  .content-wrap {
    .box:nth-child(2n+1) {
      margin-left: auto;
    }
  }
}

.section1 {
  .title {
    font-family: Oswald, san-serif;
    font-weight: 200;
    letter-spacing: .02em;
    // text-transform: uppercase;
    color: white;
    text-shadow: 0 0 -1px white, 0 0 -1px white, 0 0 -1px white, 0 0 -1px white;

    strong {
      font-weight: 600;
    }
  }
}


.container {
  display: flex;
  align-items: center;
  justify-content: space-around;
  border-radius: 9px;
}

.flair {
  cursor: pointer;
  width: 70px;
  height: 70px;
  max-height: 15vh;
  max-width: 15vh;
  background: red;
}

.section3 {
  svg {
    display: none;
    position: relative;
    display: block;
    margin: 20px auto;
    width: 700px;
    max-height: 70vh;
  }

  #hippo {
    visibility: hidden;
  }

  #play {
    position: relative;
    display: block;
    width: 100px;
    margin: 20px auto;
    padding: 10px;
  }
}
</style>
