// stores/auth.ts
import { defineStore } from 'pinia'
interface User {
  id: number
  name: string
  avatar?: string
  roles: string[]
}

type Credentials = { username: string; password: string }

export const useAuthStore = defineStore(
  'auth',
  () => {
    // 信息
    const token = ref<string | null>(null)
    const user = ref<User | null>(null)
    // 状态
    const isLogin = computed(() => !!token.value)
    const userName = computed(() => user.value?.name || '未登录')
    const userRoles = computed(() => user.value?.roles || ['admin'])

    // actions
    async function login(credentials: Credentials) {
      try {
        // 保持与原逻辑一致，使用全局 $fetch（Nuxt 环境下可用）
        const res = (await $fetch('/api/login', {
          method: 'POST',
          body: credentials
        })) as { code: number; data: { token: string; user: User }; message?: string }

        if (res.code === 1) {
          token.value = res.data.token
          user.value = res.data.user
          return { success: true }
        } else {
          throw new Error(res.message || '登录失败')
        }
      } catch (error: any) {
        return { success: false, error: error?.message || String(error) }
      }
    }

    function logout() {
      // 清空 state
      token.value = null
      user.value = null
      // 可选跳转到登录页（Nuxt 全局函数）
    try {
        navigateTo('/login')
    } catch {
        // ignore if not available
      }
    }

    function init() {
      // 如果需要在客户端手动恢复（但通常由持久化插件自动恢复）
      // 示例：从 localStorage / cookie 恢复（留空或实现自定义逻辑）
    }

    return {
      // state
      token,
      user,
      // getters
      isLogin,
      userName,
      userRoles,
      // actions
      login,
      logout,
      init
    }
  },
  {
    // 持久化（保持你原来的写法：用 cookies 存储）
    persist: {
      storage: (piniaPluginPersistedstate as any).cookies()
    }
  }
)
