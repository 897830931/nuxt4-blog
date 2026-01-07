<template>
  <div class="loading-container relative fcc bg-black">
    <img @click="goHome" id="logo" class="w-[160px] h-[160px] z-10 cursor-pointer md:w-[180px] md:h-[180px] absolute hidden top-20 md:top-40 left-auto" src="/img/logo.png" alt="">
    <div class="title-container text-2xl md:text-4xl cursor-pointer">
      <span class="txt1">Welcome to</span>
      <span @click="goHome" class="txt2">Pumpkin Blog <div class="bar"></div></span>
    </div>
    <div id="loading" class='mt-12 mb-2 text-3xl text-white '>
      {{ isComplete ? 'Open' : percentage + '%' }}
    </div>
    <div @click="scrollToNext" class="arrow opacity-0"><span class="iconfont icon-xiangxiashuangjiantou cursor-pointer  text-white text-2xl"></span></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { gsap, SteppedEase, Expo, Power4, Power3 } from "gsap"
import CustomBounce from 'gsap/CustomBounce'
import CustomEase from 'gsap/CustomEase';
import SplitText from 'gsap/SplitText';
import { useRouter } from 'vue-router';
const router = useRouter();
gsap.registerPlugin(CustomBounce, CustomEase, SplitText);
// 定义变量
const percentage = ref(0);
const showTitle = ref(false);
const isComplete = ref(false);
const timeline = ref();

// 显示博客标题
const showBlogTitle = () => {

  CustomBounce.create("myBounce", {
    strength: 0.6,
    squash: 1.5,
    squashID: "myBounce-squash"
  });
  // charts字母 words 单词 lines 行
  let t2 = new SplitText('.txt2').chars;
  let t1 = new SplitText('.txt1').chars,
    color2 = '#17c0fd',
    color1 = '#fff',
    moveBar = () => { gsap.set('.bar', { right: 0 }) };
  const txt2El = document.querySelector('.txt2');
  gsap.set(txt2El, { width: 'auto', opacity: 0 });
  const finalWidth = txt2El.scrollWidth + 20; // 拿到真实宽度

  // 再把它“压扁”回 0，准备做横向生长动画
  gsap.set(txt2El, { width: 0, opacity: 1 });


  timeline.value = gsap.timeline({ defaults: { stagger: { amount: 0.1, ease: 'sine.in' } },autoRemoveChildren: true, })
    .set('.txt1', { color: color1, lineHeight: '60px', whiteSpace: 'nowrap', fontWeight: 'regular' })
    .set('.txt2', { color: color2, width: 10, fontWeight: 'bold', lineHeight: '60px', paddingLeft: '5px', opacity: 1, x: 0, immediateRender: true })
    .set('.bar', { right: 1, backgroundColor: color1, immediateRender: true, display: 'block' })
    .to('.bar', { duration: 0.1, opacity: 0, width: 3, ease: Expo.easeIn, yoyo: true, repeat: 3, repeatDelay: 0.3 }, 0)
    .from('.txt1', { duration: 1.1, width: 0, ease: SteppedEase.config(18), onUpdate: moveBar }, 2.5)
    .to('.bar', { duration: 0.5, width: finalWidth, ease: Power4.easeInOut, backgroundColor: color2 }, '+=0.15', '+=0.1')
    .to('.txt2', { width: finalWidth, duration: 1.0, ease: Power4.easeInOut })
    .to('.bar', { width: 0, duration: 0.4, ease: Power4.easeInOut })
    .from(t2, { duration: 0.6, opacity: 0, ease: Power3.easeInOut, stagger: 0.02 }, '-=0.4')
    .to('.bar', { display: 'none' })
    .to('.txt1', { duration: 1.5, opacity: 0.25, ease: Power3.easeInOut }, '-=1.2')

    .timeScale(1.45)
    .to(t1, { duration: .25, opacity: 0, stagger: .125, ease: 'power3. inOut', color: 'white' }, '+=0.2')
    .to(t2, { duration: .25, opacity: 0, stagger: .125, ease: 'power3. inOut', color: 'white' }, '+=0.3')
    .set('.txt1', {
      display: 'none',
    }, '+=0.2')
    .set('.txt2', {
      ease: 'back. out',
      width: 'fit-content',
      paddingLeft: '0',
      duration: 0.5,
      opacity: 1,
    }, '+=0.5')
    .set('.title-container', { display: 'flex', justifyContent: 'center', alignItems: 'center' })
    .to(t2, { duration: .25, opacity: 1, stagger: .125, letterSpacing: '0.2em', ease: 'power3. out', scale: 1.25, color: color2 }, '-=0.2')
    .fromTo('#logo', {
      display: 'none',
      opacity: 0,
      duration: 0.5,
      scale: 0.5
    }, {
      display: 'block',
      opacity: 1,
      duration: 0.5,
      scale: 1,
      rotate: -5,
    }, '-=0.6')
    .to('#logo', {
      // 随机水平移动 ±10px
      x: () => gsap.utils.random(-10, 10),
      // 随机垂直移动 ±10px
      y: () => gsap.utils.random(-10, 10),
      // 随机微旋转 ±3°
      rotation: () => gsap.utils.random(-3, 3),
      // 每次动画时长也随机在 1–2 秒之间
      duration: () => gsap.utils.random(1, 2),
      ease: 'sine.inOut',
      repeat: -1,          // 无限循环
      yoyo: true,          // 来回往返
      repeatRefresh: true  // 每次重复时重新取一组随机值
    });


};
// 定义滚动到下一个元素的函数
const scrollToNext = () => {
  gsap.to(window, {
    scrollTo: {
      y: '.section2', // 滚动到下一个元素
      offsetY: 0, // 可选：调整滚动位置
    },
    duration: 1.2, // 滚动动画持续时间
    ease: 'power2.out', // 缓动函数
  });
};

// 定义返回首页的函数
const goHome = () => {
  router.push('/home');
};

// 加载动画
onMounted(() => {
  document.body.style.overflow = 'hidden';
  gsap.to(percentage, {
    value: 100,
    duration: 6,
    ease: "slow.moout",
    onUpdate: () => {
      percentage.value = Math.floor(percentage.value);
      if (percentage.value >= 30 && !showTitle.value) {
        showTitle.value = true;
        showBlogTitle();
      }
    },
    onComplete: () => {
      isComplete.value = true;
      document.body.style.overflow = 'scroll';
      gsap.to('.arrow', {
        y: -10, // 设置浮动的幅度
        repeat: -1, // 无限重复
        yoyo: true, // 来回浮动
        duration: 1, // 设置动画的时长
        ease: 'power1.inOut', // 设置缓动效果
      });
      gsap.set('#loading', { opacity: 0, duration: 1 }, '-=0.5')
      gsap.set('.arrow', { opacity: 1, duration: 0.5 }, '-=0.5');
    },
  })

});
</script>

<style scoped lang="scss">
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;

  .title-container {
    font-family: Oswald, san-serif;
    letter-spacing: 1.5px;
    width: 600px;
    height: 400px;
    padding: 0;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: nowrap;
    white-space: nowrap;

  }

  .title-container .txt1,
  .title-container .txt2 {
    position: relative;
    transform: none;
    opacity: 1;
  }

  .title-container * {
    display: inline-block;
    overflow: hidden;
  }

  .bar {
    width: 3px;
    height: 60px;
    position: absolute;
    display: none;
    top: 0;
    /* 或者根据你想遮盖的位置，改成 bottom: 0 */
    right: 0;
  }
}
</style>