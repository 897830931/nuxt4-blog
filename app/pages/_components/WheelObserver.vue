<template>
  <div class="section4-wrap w-screen h-screen">
    <section class="first">
      <div class="outer">
        <div class="inner">
          <div class="bg one">
            <h2 class="section-heading">first</h2>
          </div>
        </div>
      </div>

    </section>
    <section class="second">
      <div class="outer">
        <div class="inner">
          <div class="bg">
            <h2 class="section-heading">second</h2>
          </div>
        </div>
      </div>
    </section>
    <section class="third">
      <div class="outer">
        <div class="inner">
          <div class="bg">
            <h2 class="section-heading">three</h2>
          </div>
        </div>
      </div>
    </section>
    <section class="fourth">
      <div class="outer">
        <div class="inner">
          <div class="bg">
            <h2 class="section-heading">four</h2>
          </div>
        </div>
      </div>
    </section>
    <section class="fifth">
      <div class="outer">
        <div class="inner">
          <div class="bg">
            <h2 class="section-heading">fif</h2>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import { gsap } from 'gsap';

const finished = ref(false);
const currentScroll = ref<any>(null)
onMounted(() => {
  const wrap = document.querySelector('.section4-wrap') as HTMLElement;
  const sections = document.querySelectorAll('.section4-wrap section');
  const images = document.querySelectorAll(".bg");
  const outerWrappers = gsap.utils.toArray(".outer");
  const innerWrappers = gsap.utils.toArray(".inner");
  gsap.set(outerWrappers, { yPercent: 100 });
  gsap.set(innerWrappers, { yPercent: -100 });
  let currentIndex = -1;
  let isAnimating = false; // 标志位，防止滚动过快导致重复触发
  let observer: any;
  // 启用鼠标滚轮监听
  const enableScrollListener = () => {
    observer = Observer.create({
      type: 'wheel,touch,pointer',
      wheelSpeed: -1,
      tolerance: 10,
      preventDefault: true,
      onDown: () => {
        if (!isAnimating) gotoSection(currentIndex - 1, -1);
        
      },
      onUp: () => {
        if (!isAnimating) gotoSection(currentIndex + 1, +1);
      },
    });
  };

  // 禁用鼠标滚轮监听
  const disableScrollListener = () => {
    if (observer) observer.kill();
  };

  /**
   * 
   * @param index 当前索引
   * @param direction 1为下滚动 -1为上滚动
   */
  const gotoSection = (index: number, direction: number) => {
    if (isAnimating || index < 0 || index >= sections.length) return;

    const fromTop = direction === -1; // 判断滚动方向
    const dFactor = fromTop ? -1 : 1;

    const tl = gsap.timeline({
      defaults: { duration: 1, ease: 'power1.inOut' },
      onStart: () => { isAnimating = true; },
      onComplete: () => {
        isAnimating = false; // 动画完成
        if (currentIndex == 4) {
          disableScrollListener();
          finished.value = true;
        }
      },
    });

    // 当前页面的滑出动画
    console.log(currentIndex);
    if (currentIndex >= 0) {
      gsap.set(sections[currentIndex], { zIndex: 0 })
      tl.to(images[currentIndex], {
        yPercent: -15 * dFactor, // 背景向上/向下滑出
      }, 0)
        .set(sections[currentIndex], { autoAlpha: 0 }); // 动画结束后隐藏当前页面
    }

    // 下一页面的滑入动画
    gsap.set(sections[index], { autoAlpha: 1, zIndex: 1 })
    tl.fromTo([outerWrappers[index], innerWrappers[index]], {
      yPercent: i => i ? -100 * dFactor : 100 * dFactor, // 背景从屏幕外滑入
    }, {
      yPercent: 0, // 背景滑入到屏幕中
    }, 0)
      .fromTo(images[index], {
        yPercent: 15 * dFactor, // 外层容器从屏幕外滑入
      }, {
        yPercent: 0,
      }, 0)

    currentIndex = index; // 更新当前索引

  };



  // 监听 wrap 是否进入视口
  currentScroll.value = ScrollTrigger.create({
    trigger: wrap,
    start: 'top top',
    end: 'bottom top',
    pin: true,
    onEnter: () => {
      if (finished.value) return;
      enableScrollListener();
    },
  });


  // 初始化显示第一个 section
  gotoSection(-1, 1);
});

</script>




<style lang="scss" scoped>
$bg-gradient: linear-gradient(180deg,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.3) 100%);

section {
  height: 100%;
  width: 100%;
  top: 0;
  position: fixed;
  visibility: hidden;

  .outer,
  .inner {
    width: 100%;
    height: 100%;
    overflow-y: hidden;
  }

  .bg {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    height: 100%;
    width: 100%;
    top: 0;
    background-size: cover;
    background-position: center;

    h2 {
      z-index: 2;
    }

    .clip-text {
      overflow: hidden;
    }
  }
}

.first {
  .bg {
    background-image: $bg-gradient,
      url('@/assets/img/home/observer1.jpg');
  }
}

.second {
  .bg {
    background-image: $bg-gradient,
      url('@/assets/img/home/observer2.jpg');
  }
}

.third {
  .bg {
    background-image: $bg-gradient,
      url('@/assets/img/home/observer3.jpg');
    ;
  }
}

.fourth {
  .bg {
    background-image: $bg-gradient,
      url('@/assets/img/home/observer4.jpg');
    ;
  }
}

.fifth {
  .bg {
    background-image: $bg-gradient,
      url('@/assets/img/home/observer5.jpg');
    background-position: 50% 45%;
  }
}

h2 * {
  will-change: transform;
}
</style>