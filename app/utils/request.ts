import type { SearchParameters } from 'ofetch'
import { ElMessage } from 'element-plus'
import { isFormData } from '@/utils/index'
import md5 from 'md5'
// utils/request.ts
const isDev = import.meta.dev

// 开发时走代理，生产时直连
const prefixURL = isDev ? '/api' : '/api'
type UrlType = string | Request | Ref<string | Request> | (() => string | Request)

const postMode = {
    json: 'application/json',
    form: 'application/x-www-form-urlencoded',
} as const
type CodeMode = 'json' | 'form'
// 工具：对象 → x-www-form-urlencoded 字符串
function toFormUrlEncoded(data: Record<string, any>): string {
    const params = new URLSearchParams()
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key]
            if (value !== null && value !== undefined) {
                params.append(key, String(value))
            }
        }
    }
    return params.toString()
}
// 工具：将 Headers | [string,string][] | Record → Record<string, string>
function normalizeHeaders(input: Record<string, string> | Headers | [string, string][] | undefined): Record<string, string> {
    if (!input) return {}

    // 1. Headers 对象
    if (input instanceof Headers) {
        const obj: Record<string, string> = {}
        input.forEach((value, key) => {
            obj[key] = value
        })
        return obj
    }

    // 2. [string, string][] 数组
    if (Array.isArray(input)) {
        const obj: Record<string, string> = {}
        input.forEach(([key, value]) => {
            obj[key] = value
        })
        return obj
    }

    // 3. 普通对象
    return input as Record<string, string>
}
export interface RequestOptions {
    /** 唯一键，保证跨请求去重 */
    key?: string
    /** 向 URL 添加查询参数 */
    query?: SearchParameters
    /** 请求体 - 如果传入对象，会自动序列化 */
    body?: RequestInit['body'] | FormData | Record<string, unknown>
    /** 请求头 */
    headers?: Record<string, string | undefined> & { codeMode?: CodeMode }
    /** 请求的基础 URL */
    baseURL?: string
    /** 毫秒数，超过后自动中止请求 */
    timeout?: number
    /** 是否在服务器端获取数据（默认为 true） */
    server?: boolean
    /** 是否延迟在路由加载后解析异步函数，避免阻塞客户端导航（默认为 false） */
    lazy?: boolean
    /** 是否立即执行请求, 如果为 true，则立即执行请求，否则在组件挂载后执行, 如果为 false，则在组件挂载后执行, 默认为 true） */
    immediate?: boolean
    /** 工厂函数，用于在异步函数返回前设置 data 的默认值，适用于 lazy: true 或 immediate: false */
    default?: () => unknown
    /** 用于在解析后修改 handler 函数结果的函数 */
    transform?: (input: unknown) => unknown | Promise<unknown>
    /** 观察响应式源数组，在变化时自动刷新 fetch 结果。默认观察 fetch 选项和 URL。可以使用 watch: false 完全忽略响应式源。和 immediate: false 配合可以实现完全手动触发 useFetch。 */
    watch?: false
    /** 返回深度响应式的 ref（默认 true）。可设为 false 以返回浅层响应式的 ref，在数据无需深度响应时提升性能。 */
    deep?: boolean
}

/**
 * 请求状态吗处理
 *
 */
// 防止重复弹出（如 401、验证码）
let flag = false
/**
 * 统一处理后端返回的状态码和业务码
 * @param status HTTP 状态码
 * @param info 后端返回的数据体 { code, msg, data, ... }
 * @param showTip 是否显示默认错误提示（boolean | string）
 */
export function handleResponseStatus(status: number, info: { code?: number; msg?: string; verifyCode?: string; [key: string]: any }, showTip: boolean | string = true) {
    // 重置 flag（可选：每次请求可重置）
    // flag = false

    const msg = info.msg || ''

    // === HTTP 状态码处理 ===
    switch (status) {
        case 404:
            ElMessage.error('接口不存在')
            return
        case 400:
            ElMessage.error('请求的参数有误')
            return
        case 301:
        case 302:
            ElMessage.info('请求已被重定向')
            return
        case 401:
          // 登录失效，提示重新登录,或者跳转到登录页
            return
    }

    // === 200 成功，但业务码异常 ===
    if (status === 200 && info.code !== 1) {
        // 防止 401 重复处理（已在上面拦截）
        if (info.code === 0 && !flag) {
            flag = true
            // Message.error(msg)
            // setTimeout(() => logoutClear(true), 1000)
            return
        }

        // 业务错误码统一处理
        const businessError = () => {
            switch (info.code) {
               
            }
        }

        businessError()
        return
    }
    // === 200 + code === 1：成功，不处理 ===
    // === 其他 5xx 可选处理 ===
    if (status >= 500) {
      ElMessage.error('网络出错了')
    }
}
/**
 * 基于 $fetch 的请求方法（客户端请求）
 * 在客户端执行，返回 Promise，适用于交互式请求
 * @param url 请求地址
 * @param method 请求方法
 * @param params 请求参数
 * @param options 请求选项
 * @returns Promise<T> 请求结果
 * @description
 * $fetch 是客户端请求方法，不会在服务端执行
 * 适用于用户交互触发的请求，如表单提交、按钮点击等
 */
export async function request<T>(url: UrlType, method: string = 'GET', params?: SearchParameters, options: RequestOptions = {}): Promise<T> {
    const urlString = typeof url === 'string' ? url : typeof url === 'function' ? url() : String(url)
    const requestMethod = method.toUpperCase()
    const isGetLike = requestMethod === 'GET' || requestMethod === 'DELETE'
    const isPostLike = requestMethod === 'POST' || requestMethod === 'PUT' || requestMethod === 'PATCH'

    const rawBody = options.body ?? params

    // === 1. 仅从 headers 中提取 codeMode ===
    const userHeaders = normalizeHeaders(options.headers)
    const codeMode = userHeaders['codeMode'] as CodeMode | undefined // 安全断言
    // === 2. 处理 query ===
    const finalQuery = isGetLike && params ? { ...params, ...options.query } : options.query

    // === 3. 处理 body 和 Content-Type ===
    let body: any = undefined
    let contentType: string | undefined = undefined

    if (isPostLike && rawBody !== undefined) {
        if (isFormData(rawBody)) {
            body = rawBody
        }
        // 关键：只认 headers['codeMode']
        else if (codeMode && codeMode in postMode) {
            if (typeof rawBody === 'object' && rawBody !== null) {
                if (codeMode === 'json') {
                    body = JSON.stringify(rawBody)
                    contentType = postMode.json
                } else if (codeMode === 'form') {
                    body = toFormUrlEncoded(rawBody as Record<string, any>)
                    contentType = postMode.form
                }
            }
        }
        // 默认 JSON
        else if (typeof rawBody === 'object' && rawBody !== null) {
            body = JSON.stringify(rawBody)
            contentType = 'application/json'
        } else {
            body = rawBody
        }
    }

    // === 4. 合并 headers（删除 codeMode）===
    const baseHeaders = normalizeHeaders(useRequestHeaders(['cookie']))
    const finalHeaders: Record<string, string> = { ...baseHeaders, ...userHeaders }

    delete finalHeaders['codeMode'] // 关键：不透传

    if (contentType) {
        finalHeaders['Content-Type'] = contentType
    }

    // === 5. 调用 $fetch ===
    return $fetch<T>(prefixURL + urlString, {
        method: requestMethod,
        baseURL: options.baseURL || '',
        timeout: options.timeout ?? 5000,
        credentials: 'include',
        headers: finalHeaders,
        query: finalQuery,
        body,
        onRequest() {},
        onRequestError() {
            ElMessage.closeAll()
            ElMessage.error('Sorry, The Data Request Failed')
        },
        // 类似响应拦截器，处理状态码和业务码
        onResponse({ response }) {
            const data = response._data as { code?: number; message?: string; data?: T }
            // 处理状态码和业务码
            handleResponseStatus(response.status, data)
            response._data = (data ?? 'success') as T
        },
        onResponseError({ request }) {
            console.log('Response Error:', request)
        },
    })
}

/**
 * 基于 useFetch 的请求方法（服务端数据获取，用于 SSR）
 * 在服务端获取数据并嵌入到 HTML 中，支持服务端渲染
 * @param url 请求地址
 * @param method 请求方法
 * @param params 请求参数
 * @param options 请求选项
 * @returns AsyncData 包含 data, pending, error 等属性的响应式对象
 * @description
 * useFetch 主要用于 SSR，会在服务端获取数据并序列化到 HTML 中
 * 适用于需要在服务端渲染时获取数据的场景
 */
// === 关键：定义 codeMode 类型 ===

export function $request<T>(
    url: UrlType,
    method: string = 'GET',
    params?: SearchParameters,
    options?: RequestOptions & {
        /** 可选：通过 headers['codeMode'] 控制 body 格式 */
        headers?: Record<string, string> & { codeMode?: 'json' | 'form' }
    },
) {
    const H3Event = useRequestEvent()
    const headers = useRequestHeaders(['cookie'])
    const requestMethod = method.toUpperCase()

    const isGetLike = requestMethod === 'GET' || requestMethod === 'DELETE'
    const isPostLike = requestMethod === 'POST' || requestMethod === 'PUT' || requestMethod === 'PATCH'

    const rawBody = options?.body ?? params
    const codeMode = options?.headers?.['codeMode'] // 关键：从 headers 中读取

    const urlString = typeof url === 'string' ? url : typeof url === 'function' ? url() : String(url)

    // === 1. 处理 query ===
    let query: SearchParameters | undefined = undefined
    if (isGetLike && params) {
        query = { ...params, ...options?.query }
    }

    // === 2. 处理 body ===
    let body: any = undefined
    let contentType: string | undefined = undefined

    if (isPostLike && rawBody !== undefined) {
        // 情况1：FormData → 不处理，直接传
        if (isFormData(rawBody)) {
            body = rawBody
        }
        // 情况2：有 codeMode 控制
        else if (codeMode && postMode[codeMode]) {
            if (typeof rawBody === 'object' && rawBody !== null) {
                if (codeMode === 'json') {
                    body = JSON.stringify(rawBody)
                    contentType = postMode.json
                } else if (codeMode === 'form') {
                    body = toFormUrlEncoded(rawBody as Record<string, any>)
                    contentType = postMode.form
                }
            }
        }
        // 情况3：默认 JSON
        else if (typeof rawBody === 'object' && rawBody !== null) {
            body = JSON.stringify(rawBody)
            contentType = 'application/json'
        }
        // 情况4：原始字符串等
        else {
            body = rawBody
        }
    }

    // === 3. 合并 headers（移除 codeMode，避免透传到后端）===
    const finalHeaders: Record<string, string> = {
        ...normalizeHeaders(headers),
        ...normalizeHeaders(options?.headers),
    }
    delete finalHeaders['codeMode']

    if (contentType) {
        finalHeaders['Content-Type'] = contentType
    }

    // === 4. 调用 useFetch ===
    // @ts-expect-error useFetch 类型复杂，运行时安全
    return useFetch<T>(prefixURL + url, {
        key: options?.key ?? md5(typeof urlString === 'string' ? urlString : ''),
        method: requestMethod,
        query: isGetLike ? query : options?.query,
        body,
        headers: finalHeaders,
        baseURL: options?.baseURL || '',
        timeout: options?.timeout ?? 5000,
        server: options?.server ?? true,
        lazy: options?.lazy,
        immediate: options?.immediate,
        default: options?.default as (() => T) | undefined,
        transform: options?.transform as ((input: T) => T | Promise<T>) | undefined,
        credentials: 'include',
        watch: options?.watch,
        deep: options?.deep,

        onRequest() {},
        onRequestError({ error }: { error: Error }) {
            if (import.meta.client) {
                ElMessage.closeAll()
                ElMessage.error('Sorry, The Data Request Failed')
            }
        },
        onResponse({ response }: any) {
            // 服务端请求
            const tmpData = response._data as { code?: number; msg?: string; data?: T }
            response._data = tmpData ?? ({ code: 0, msg: 'success', data: {} } as T)
        },
        onResponseError({ request }: any) {
            console.log('Response Error:', request)
        },
    })
}
