<template>
  <div class="w-full z-50">
    <div
      class="header grid w-full py-1 md:w-[1320px] md:mx-auto col-span-1 md:grid-cols-[auto,auto,1fr] md:min-w-[1320px]  md:grid-auto-flow-column md:grid-rows-1 justify-center items-center gap-2">
      <div class="flex justify-center items-center">
        <div class="bg-[url('@/assets/img/layouts/logo.png')] bg-no-repeat my-auto bg-cover rounded-full w-10 aspect-[1/1] sm:w-16">
        </div>
      </div>
      <div class="title hidden md:flex font-title text-3xl font-bold">南瓜时光机</div>
      <el-menu background-color="transparent" default-active="2" class="el-menu-vertical-demo" :collapse="isCollapse" :mode="menuMode">

        <template v-for="menu in menuData" :key="menu.index">
          <el-sub-menu v-if="menu.subItems && menu.subItems.length > 0" :index="menu.index">
            <template #title @click="navigateTo(menu.path)">
              <component :is="menu.icon" class="icon-size md:mr-1" />
              <span>{{ menu.title }}</span>
            </template>
            <template v-for="group in menu.subItems" :key="group.groupTitle">
              <el-menu-item-group>
                <template #title><span>{{ group.groupTitle }}</span></template>
                <el-menu-item v-for="item in group.items" :key="item.index" :index="item.index" @click="navigateTo(item.path)">
                  {{ item.title }}
                </el-menu-item>
              </el-menu-item-group>
            </template>
          </el-sub-menu>
          <el-menu-item v-else :index="menu.index" @click="navigateTo(menu.path)">
            <component :is="menu.icon" class="icon-size md:mr-1" />
            <span>{{ menu.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import {
  VideoCameraFilled,
  HomeFilled,
  Notebook,
  InfoFilled,
  CollectionTag
} from '@element-plus/icons-vue';
const isCollapse = ref(true);
const menuMode = ref<any>('vertical'); // 默认为垂直模式
const router = useRouter();
// 动态改变菜单折叠模式
function updateMenuMode() {
  const mdBreakpoint = window.matchMedia('(min-width: 768px)');
  menuMode.value = mdBreakpoint.matches ? 'horizontal' : 'vertical';
}
watch(menuMode, (value) => {
  if (value === 'horizontal') {
    isCollapse.value = false;
  } else {
    isCollapse.value = true;
  }
})
// 定义菜单路由数据
const menuData = shallowRef([
  { index: "1", icon: HomeFilled, title: "首页", path: "/home" },
  {
    index: "2",
    icon: Notebook,
    title: "文章",

    path: null,
    subItems: [
      {
        groupTitle: "学习",
        items: [
          { index: "1-1", title: "学习笔记", path: "/articles/studyNotes" },
          { index: "1-2", title: "项目日志", path: "/articles/projectLog" },
          { index: "1-3", title: "学习演示", path: "/articles/studyDemo" }
        ]
      },
      {
        groupTitle: "生活",
        items: [
          { index: "1-4", title: "心情随写", path: "/moodMusings" },
          { index: "1-5", title: "生活总结", path: "/lifeSummary" }
        ]
      }
    ]
  },

  { index: "3", icon: VideoCameraFilled, title: "动态", path: "/lifeRecord", disabled: true },
  { index: "4", icon: CollectionTag, title: "收集", path: "/collection", disabled: true },
  { index: "5", icon: InfoFilled, title: "关于", path: "/about" }
]);


onMounted(() => {
  updateMenuMode(); // 初始检查
  window.addEventListener('resize', updateMenuMode);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateMenuMode);
});
// 路由跳转
const navigateTo = (path: string) => {
  router.push(path);
}
</script>


<style lang="scss" scoped>
.header {


  .title {
    letter-spacing: 0.3rem;
    background-image: -webkit-linear-gradient(left, #147B96, #E6D205 25%, #147B96 50%, #E6D205 75%, #147B96);
    -webkit-text-fill-color: transparent;
    -webkit-background-clip: text;
    -webkit-background-size: 200% 100%;
    -webkit-animation: maskedAnimation 4s infinite linear;
  }

  @keyframes maskedAnimation {
    0% {
      background-position: 0 0;
    }

    100% {
      background-position: -100% 0;
    }
  }




}

.icon-size {
  width: 18px;
  height: 18px;

}

:deep(.el-menu--horizontal) {
  @media (min-width: 768px) {
    // 对应 Tailwind CSS 中的 `md` 断点
    border-bottom: 1px solid transparent;
  }
}

:deep(.el-menu-item, .el-sub-menu__title) {
  @media (min-width: 768px) {
    // 对应 Tailwind CSS 中的 `md` 断点
    font-size: 24px;
    @apply font-xia;
  }
}

:deep(.el-sub-menu__title) {
  @media (min-width: 768px) {
    // 对应 Tailwind CSS 中的 `md` 断点
    font-size: 24px;
    @apply font-xia;
  }
}

:deep(.el-menu-item:not(.is-disabled):hover) {
  @media (min-width: 768px) {
    // 对应 Tailwind CSS 中的 `md` 断点
    background-color: transparent;
    ;
  }
}

:deep(.el-menu-item:not(.is-disabled):focus) {
  @media (min-width: 768px) {
    // 对应 Tailwind CSS 中的 `md` 断点
    background-color: transparent;
    ;
  }
}
.el-menu-vertical-demo {
  @media (min-width: 768px) {
    // 对应 Tailwind CSS 中的 `md` 断点
    flex-direction: row;
    flex-wrap: nowrap;
    width: 100%;
  }
}
</style>
