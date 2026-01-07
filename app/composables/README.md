# composables/ 组合式函数

这里存放**可复用的业务逻辑**，任何地方（页面、组件、插件、server routes、middleware）都可以直接调用。

## 命名规范

- 文件名：kebab-case（use-something.ts）
- 导出函数：必须以 `use` 开头（useAuth、useApi、useCart 等）
- Nuxt 会自动导入，调用时直接：const { data } = await useFetchUser()

## 适合放什么（✓）

- useAuth() → 获取当前用户、刷新 token
- useApi() → 封装 axios/$fetch 实例
- useCart() → 购物车逻辑
- useDarkMode() → 深浅色切换
- useValidation() → 表单校验规则
- usePagination() → 分页逻辑
- useSocket() → WebSocket 连接
- usePermissions() → 判断用户是否有某权限（返回布尔值）

## 不适合放什么（✗）

- 路由权限拦截（要跳转登录页） → 放 middleware/
- 需要阻止导航、读取 to/from 的逻辑 → 放 middleware/

## 示例

```ts
// composables/use-auth.ts
export const useAuth = () => {
  const user = useState<User>('user')
  const isLogin = computed(() => !!user.value)

  const refreshToken = async () => { ... }

  return { user, isLogin, refreshToken }
}
```
