// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { selectProxyTarget } from './proxy-selector'
import { resolve } from 'path'
import { defineEventHandler } from 'h3'
let proxyUrl = 'https://kcst.bokeyun.com.cn' // 默认生产
const isDev = process.env.NODE_ENV === 'development'
if (isDev) {
    // 动态注入：启动时选择
    // @ts-ignore - 允许同步等待
    proxyUrl = await selectProxyTarget()
}
export default defineNuxtConfig({
    devServer: {
        port: 8090,
    },
    compatibilityDate: '2025-11-18',
    // 这些键仅在服务器端可用 配置属性是响应式的
    runtimeConfig: {
        // 仅服务端可用（不能在浏览器访问）
        // apiSecret: '',

        // 公开给浏览器端（相当于旧的 publicRuntimeConfig）
        public: {
            env: process.env.NODE_ENV === 'development' ? 'dev' : 'prod',
            baseURL: '/api',
            testUrl: process.env.TEST_URL ?? 'https://longquanyi.ifuhua.com.cn',
            formalUrl: process.env.FORMAL_URL ?? 'https://shuangliu.boshiyun.com.cn',
            aiProxy: 'bochaapi/aiServer',
            customerService: 'http://kefu.bokeyun.com.cn/im/text/1qcox9.html',
            appConfig: { name: '龙泉驿区科技创新服务平台', shortName: '科创生态', concat: '188-0506-5725' },
            industryProjectId: '0',
            apiSdkProxy: '/openapi',
            isBrowser: typeof window !== 'undefined',
        },
    },
    appConfig: {
        name: '龙泉驿区科技创新服务平台',
        shortName: '科创生态',
        concat: '188-0506-5725',
    },
    app: {
        baseURL: '/',
        head: {
            title: '科创生态服务平台',
            htmlAttrs: {
                lang: 'en',
            },
            meta: [
                {
                    name: 'viewport',
                    content: 'width=device-width, initial-scale=1',
                },
                {
                    charset: 'utf-8',
                },
                {
                    name: 'description',
                    content: '科创生态服务平台, 提供科创生态服务, 包括但不限于: 项目管理, 项目合作, 项目评估, 项目咨询, 项目合作, 项目评估, 项目咨询.',
                },
            ],
            link: [],
            style: [],
            script: [],
            noscript: [],
        },
        keepalive: true,
        // 布局过渡动画
        layoutTransition: {
            name: 'fade',
            mode: 'out-in',
        },
        // 页面过渡动画
        pageTransition: {
            name: 'fade',
            mode: 'out-in',
        },
        //  teleport 容器属性
        teleportAttrs: {
            class: 'teleport-container',
        },
        // 视图过渡动画
        viewTransition: true,
    },
    appId: 'techmarket-nuxt4',

    // 别名配置
    alias: {
        '@': resolve(__dirname, './app'),
        images: fileURLToPath(new URL('/app/assets/images', import.meta.url)),
        style: fileURLToPath(new URL('/app/assets/style', import.meta.url)),
        store: resolve(__dirname, './app/stores'),
        utils: resolve(__dirname, './app/utils'),
        components: resolve(__dirname, './app/components'),
    },

    // 类型检查配置
    typescript: {
        typeCheck: false,
    },
    imports: {
        // 自动导入的文件夹
        presets: [],
        dirs: ['store'], // 自动扫描 store 目录
    },
    devtools: { enabled: true },
    // 模块配置
    modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss', '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt', '@vueuse/nuxt', '@element-plus/nuxt'],
    elementPlus: {
        cache: true,
        importStyle: false,
    },
    pinia: {
        storesDirs: ['stores'],
    },
    piniaPluginPersistedstate: {
        storage: 'sessionStorage',
        cookieOptions: {
            sameSite: 'lax',
        },
        debug: true,
        key: 'prefix_%id_techmarket',
    },
    builder: 'vite',
    build: {
        analyze: {
            analyzerMode: 'static',
        },
        
    },
    // ==================== Vite 终极打包优化 ====================
    vite: {
        // 1. 预构建优化（必须）
        optimizeDeps: {
            include: ['vue', 'vue-router', 'pinia', '@vueuse/core', 'dayjs', 'dayjs/plugin/*.js'],
            // 强制把这些大依赖放进预构建，启动 + 打包都更快
            force: true,
        },
        logLevel: 'silent',
        server: {
            hmr: {
                port: 8090,
            },
        },
        
        // 2. 构建优化（最重要！）
        build: {
            emptyOutDir: true,
            target: 'esnext', // 支持顶层 await + 现代浏览器
            minify: 'esbuild', // 比 terser 快 10 倍
            cssCodeSplit: true, // CSS 按路由拆分
            sourcemap: false, // 生产关掉 sourcemap（体积减 30%）
            rollupOptions: {
                output: {
                    // 文件名带 hash，长缓存
                    entryFileNames: '_nuxt/entry-[hash].js',
                    chunkFileNames: '_nuxt/chunk-[name]-[hash].js',
                    assetFileNames: '_nuxt/assets/[name]-[hash][extname]',

                    // 关键：手动分包 + 大体积库单独打包 id是路径
                    manualChunks(id: string) {
                        const chunks = ['element-plus']
                        if (id.includes('/node_modules/')) {
                            for (const chunkName of chunks) {
                                if (id.includes(chunkName)) {
                                    return chunkName
                                }
                            }
                            
                        }
                    },
                },
            },

            // 超大 chunk 警告阈值（方便你发现没拆干净的包）
            chunkSizeWarningLimit: 600, // kb（默认 500，调高一点别老报警）

            // 开启 Brotli 压缩（比 gzip 体积再小 15~20%）
            // 需要服务器支持（nginx / vercel / netlify 都支持）
            reportCompressedSize: true,
        },

        // 3. CSS 优化
        css: {
            devSourcemap: true,
            preprocessorOptions: {
                scss: {},
            },
        },

        // 4. 插件（必须加这两个，体积再降 10~20%）
        plugins: [],

        // 5. 别名保持一致（避免重复打包）
        resolve: {
            alias: {
                '@': resolve(__dirname, './app'),
                '~': resolve(__dirname, './'),
            },
        },
    },

    // nitro 配置 （服务端渲染配置）
    nitro: {
        // 开发服务端代理配置
        routeRules: {
            '/api/**': { proxy: `${proxyUrl}/api/**` },
        },
        // prerender 首页 + 常见页面（首屏更快）
        prerender: {
            routes: ['/'], // 你项目常见的页面
            crawlLinks: true,
        },
    },
    // 全局引入的css文件
    css: ['@/styles/index.scss'],
    // 根据不同环境配置通
    $development: {},
    $production: {
        // 生产环境关闭 devtools
        devtools: { enabled: false },
        // 关闭类型检查（构建快 50%）
        typescript: { typeCheck: false },
        // nitro 配置 （服务端渲染配置）2
        nitro: {
            // 开发服务端代理配置
            routeRules: {
                '/api/**': { proxy: `${proxyUrl}/api/**` },
            },
        },
    },
})
