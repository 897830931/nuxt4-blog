
# plugins/ 全局插件注册说明

这里放**全局注册第三方库**、**注入全局属性**等「只需要执行一次」的代码。

## 核心原则（背下来！）

| 规则 | 正确做法 | 错误做法（千万别） |
|------|----------|-------------------|
| 1    | 一个功能一个插件文件 | 一个文件里写 10 个插件 |
| 2    | 文件名随意，但建议语义化（pinia.ts、dayjs.ts、sentry.client.ts） | 乱命名导致看不懂 |
| 3    | 只需要客户端执行的插件一律加 `.client` 后缀（sentry.client.ts、umami.client.ts） | 服务端也执行客户端 API（localStorage、window 未定义） |
| 4    | 只需要服务端执行的插件一律加 `.server` 后缀（极少用） | 客户端执行服务端才有的 API |
| 5    | 插件里只做「注册全局东西」的事 | 放业务逻辑、路由守卫、API 请求 |

## 适合放在 plugins/ 的内容（✓ 正确）

| 插件示例                     | 文件名建议                     | 说明 |
|--------------------------------|-------------------------------|------|
| Pinia（含持久化）              | pinia.ts                      | 全局注册 pinia + persistedstate |
| VueUse                         | vueuse.ts                     | app.use(VueUse) |
| Dayjs / Date-fns               | dayjs.ts                      | 注入 $dayjs |
| 全局指令（v-copy、v-lazy 等）  | directives.ts                 | app.directive() |
| 第三方分析（Umami、Google Analytics） | umami.client.ts          | 只在客户端执行 |
| 错误监控（Sentry、LogRocket）  | sentry.client.ts              | 客户端才初始化 |
| 图标库（unplugin-icons）       | icons.ts                      | app.use(UnpluginIcons) |
| 全局组件（极少用）             | global-components.ts          | 需要特殊逻辑时才放这里 |
| 全局属性注入（$toast、$modal）| injects.ts                    | provide + app.provide |
| i18n（@nuxtjs/i18n）           | 通常由模块自动注册，不用手写   | 手动写容易重复注册 |

## 绝对不要放这里的内容（✗ 错误）

| 错误内容               | 应该放哪里          | 原因 |
|------------------------|---------------------|------|
| 路由守卫（登录校验）   | middleware/         | 插件里写守卫 SSR 不兼容、顺序混乱 |
| 业务 composables       | composables/        | 不是全局注册，只是函数 |
| API 封装               | server/api/ 或 composables/use-api.ts | 不是插件职责 |
| 工具函数（格式化金额） | utils/              | 同上 |
| Pinia store 定义       | stores/             | 不是插件 |

## 标准插件模板（复制粘贴就行）

```ts
// plugins/example.client.ts   ← 只在客户端执行
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  // 1. 注册第三方库
  // nuxtApp.vueApp.use(SomePlugin)

  // 2. 注入全局属性（$xxx）
  // return {
  //   provide: {
  //     hello: () => 'world'
  //   }
  // }

  // 3. 监听生命周期（可选）
  // nuxtApp.hook('app:mounted', () => {
  //   console.log('客户端插件已挂载')
  // })
})