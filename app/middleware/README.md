
# middleware/ 路由中间件（路由守卫）

这里只放**和路由导航直接相关的逻辑**，每次页面切换都会自动执行。

## 命名规范

- 普通中间件：auth.ts、admin.ts（需在页面 definePageMeta 手动引用）
- 全局中间件：auth.global.ts（所有路由自动执行）
- 推荐后缀：.ts 或 .js

### 适合放什么（✓）

- 登录校验（未登录 → 跳登录页）
- 权限校验（角色不对 → 403）
- 路由日志 / 埋点
- 动态路由生成
- 强制 HTTPS
- 多租户切换

### 不适合放什么（✗）

- 普通的业务函数（如获取用户信息、刷新 token） → 放 composables/
- 不和路由相关的工具函数 → 放 utils/ 或 composables/

### 示例

```ts
// middleware/auth.global.ts  ← 全局登录守卫（最常用）
export default defineNuxtRouteMiddleware((to) => {
  const { isLogin } = useAuth()  // ← 这里可以调用 composables

  if (to.meta.requiresAuth && !isLogin.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }
})

// middleware/admin.ts  ← 仅管理员页面使用
export default defineNuxtRouteMiddleware((to) => {
  const user = useAuth().user
  if (user?.role !== 'admin') {
    return abortNavigation('无权限')
    // 或 return navigateTo('/403')
  }
})

```
