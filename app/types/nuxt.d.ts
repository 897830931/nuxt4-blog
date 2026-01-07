/// <reference types="nuxt" />

declare module '#app' {
  interface NuxtApp {
    // 扩展 NuxtApp 类型
  }
}

declare module 'vue' {
  // Vue 类型扩展
}

// 声明 .vue 文件模块
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

