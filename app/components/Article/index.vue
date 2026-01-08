<script setup lang="ts">
import type { ArticleInfo } from '@/types/article.d.ts';
import BirdButton from '@/components/BirdButton.vue';
import { ref, onMounted, onBeforeUnmount } from 'vue';
const router = useRouter();

// 使用 withDefaults 为 props 添加默认值
const props = withDefaults(defineProps<{
  info: ArticleInfo;
  showCover?: boolean;
}>(), {
  showCover: true, // 默认值为 true
});

const isSmallScreen = ref(false);
const articleBox = ref<HTMLElement | null>(null);

// 添加loading状态
const loading = ref(true);

const handleScreenChange = (e: MediaQueryListEvent) => {
  isSmallScreen.value = e.matches;
};

const handleClickBox = () => {
  if (isSmallScreen.value) {
    // 小屏幕，点击整个盒子跳转详情页
    navigateToDetailPage();
  }
};

const handleButtonClick = () => {
  // 大屏幕，仅按钮点击时跳转详情页
  navigateToDetailPage();
};

const navigateToDetailPage = () => {
  // 使用 vue-router 进行跳转
  console.log('跳转到详情页：', props.info.id);
  router.push({
    path: `/articles/detail/${props.info.id}`
  });
};

// 图片加载成功的回调
const onImageLoad = () => {
  loading.value = false;
};

// 图片加载失败的回调
const onImageError = () => {
  loading.value = false;
  console.error("图片加载失败");
};

// 监听屏幕变化
onMounted(() => {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  isSmallScreen.value = mediaQuery.matches;
  mediaQuery.addEventListener('change', handleScreenChange);
});
onBeforeUnmount(() => {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  mediaQuery.removeEventListener('change', handleScreenChange);
});

// getCategoryColor 分类颜色
const getCategoryColor = (category: string) => {
  switch (category) {
    case '学习笔记':
      return 'rgb(242, 113, 28)'; // 橙色
    case '项目日志':
      return 'rgb(120, 160, 242)'; // 蓝色
    case '学习演示':
      return 'rgb(242, 113, 28)'; // 红色
    case '心情随写':
      return 'rgb(120, 160, 242)'; // 绿色
    case '生活总结':
      return 'rgb(242, 113, 28)'; // 紫色
    default:
      return 'rgb(242, 113, 28)'; // 默认颜色
  }
}
</script>

<template>
  <div ref="articleBox" @click="handleClickBox"
    class="flex flex-col relative bg-white justify-between pointer md:p-2 border min-h-[160px] rounded-lg hover:shadow-lg transition-shadow duration-200 ease-in-out mb-4">
    <div class="flex flex-col p-1 md:flex-grow">
      <!-- 文章标题 -->
      <h2 :title="info.title" class="line-clamp-2 text-center text-xl font-semibold mb-2 transition-transform duration-300 ease-in-out md:hover:scale-110 cursor-pointer">
        {{ info.title }}
      </h2>
      <!-- 文章简介 -->
      <div class="hidden md:flex text-gray-700 flex-grow mb-2">
        {{ info.content }}
      </div>
      <!-- 图片加载 loading 效果 -->
      <div v-if="showCover" class="w-full aspect-[4/3] md:max-h-[360px] rounded-md relative">
        <!-- 图片 -->
        <client-only>
          <img v-lazy:loading1 :data-src="info.cover + '?t=' + Math.floor(Math.random() * 100000) " alt="文章封面" class="object-fill w-full aspect-[3/2] max-h-full ">
        </client-only>
      </div>
      <!-- 文章信息 -->
      <div class="flex justify-between">
        <!-- 观看次数 -->
        <div class="text-sm fcc md:text-lg align-center text-red-600 mt-2 text-right">
          <span class="iconfont icon-yanjing1 h-full text-xl  mr-1"></span> {{ info.viewCount }}
        </div>
        <!-- 发布日期 -->
        <div class="text-sm md:text-lg text-time-color mt-2 text-right">
          {{ info.time }}
        </div>
      </div>
    </div>

    <!-- 分类标签，手机端隐藏，PC端显示 -->
    <div :style="{ '--data-color': getCategoryColor(info.category), background: getCategoryColor(info.category) }"
      class="category hidden absolute py-[3px] rounded-r-sm -left-[20px] z-10 top-[200px] md:flex items-center bg-gray-100 px-4 cursor-pointer">
      <span class="text-sm text-white"></span>{{ info.category }}
    </div>
    <BirdButton class="hidden mx-auto md:block py-1 px-3 " @click.stop="handleButtonClick()">
      查看详情
    </BirdButton>
  </div>
</template>

<style scoped lang="scss">
/* 自定义一些基础样式，保持组件风格统一 */
.category::before {
  content: '';
  position: absolute;
  display: block;
  left: 0;
  bottom: 2px;
  width: 0;
  height: 0;
  border: 15px solid var(--data-color);
  transform: translateY(15px);
  border-right: 0;
  border-bottom: 0;
  border-left: 10px solid transparent;
  box-sizing: content-box;
  opacity: 0.8;
}

.category:hover {
  &::before {
    opacity: 1;
  }
}
</style>
