//httpClient用于客户端，httpSever用于服务端
import { httpClient } from '@/composables/httpClient'
import { httpSever } from '@/composables/httpSever'
enum api {
    userInfo = '/api/userInfo',
    login = '/user/login',
    logout = '/api/user/logout',
}
/**
 *
 * @param params 请求参数
 * @param options 请求配置
 * @returns
 */
export const login = async (
    params: object,
    options: object = {}
): Promise<string> => {
    // 确保options参数正确地传递给http.post方法
    return httpClient.post(api.login, params, options)
}

export function logout(params: object, options: object = {}) {
    return httpClient.post(api.logout, params, options)
}
export function userInfo(params: object, options: object = {}) {
    return httpClient.post(api.userInfo, params, options)
}
export function ceshi(params: object, options: object = {}) {
    return httpSever.post(api.userInfo, params, options)
}
