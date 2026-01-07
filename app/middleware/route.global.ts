// middleware/auth.global.ts

export default defineNuxtRouteMiddleware(async (to) => {
    const authStore = useAuthStore()

    const { isLogin, userRoles } = authStore

    // 1. 登录校验
    if (to.meta?.loginRequired && !isLogin) {
        // 支持服务端也重定向（SSR 友好）
        return navigateTo({
            path: '/login',
            query: {
                redirect: to.fullPath, // 登录成功后跳回原页面
            },
        })
    }
    // 2. 角色/权限校验（meta.roles 可在页面 definePageMeta 中定义）
    const routeRoles = to.meta.roles as string[] | undefined

    if (routeRoles && (!userRoles || !routeRoles.some((r) => userRoles.includes(r)))) {
        // 你可以选择直接抛错中断导航，或者重定向到 403 页面
        return navigateTo('/403')
    }
})
