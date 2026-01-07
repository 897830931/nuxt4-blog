

// ==================== 1. 类型定义（保留你原来的注释）================
export interface AppConfig {
  /** 是否落地到浏览器环境了 */
  readonly isBrowser: boolean
  /** 当前环境模式 */
  readonly env: 'dev' | 'prod'

  /** 基础请求路径 */
  readonly baseURL: '/api'
  /**
   * 是否开发环境
   * - 包含测试环境
   * - 只用于浏览器环境
   */
  readonly isDevelopment: boolean
  /** 请求超时毫秒 */
  readonly requestOvertime: number

  /**
   * `api`请求域名
   * @description 根据当前域名来，接口需要在`nuxt.config.js`中的`proxy`去单独配置
   */
  readonly apiUrl: string

  /**
   * 路由前缀
   */
  readonly routePath: ''
  /** 当前产业链对应的项目, 当前0表示标准产业链 */
  readonly industryProjectId: '0'
  /** api服务器前缀 */
  readonly serverProxy: ''
  /** api服务sdk接口前缀 */
  readonly apiSdkProxy: '/openapi'
  readonly aiProxy: 'bochaapi/aiServer'
  /**
   * 导出pdf项目地址
   */
  readonly pdfProjectUrl: ''
  /**
   * 当前项目地址
   * - 测试地址
   * - 正式地址
   * - 预发地址
   */
  readonly projectUrl: string
  /** 客服地址 */
  readonly customerService: 'http://kefu.bokeyun.com.cn/im/text/1qcox9.html'

  // 应用配置
  readonly appConfig: {
    name: '龙泉驿区科技创新服务平台'
    companyName: '广州博士信息技术研究院有限公司'
    shortName: '科创生态'
    concat: '188-0506-5725'
  }
}

// ==================== 2. 运行时实现（所有原始注释原样保留）================
const isBrowser = typeof window !== 'undefined'

/** 测试环境 */
const TEST_URL = 'https://longquanyi.ifuhua.com.cn'

/** 正式环境 */
const FORMAL_URL = 'https://shuangliu.boshiyun.com.cn'

/** 是否测试域名 */
const isTestDomain = isBrowser && location?.hostname.includes('.bokeyun.com.cn')

/** 是否开发环境（包含测试环境） */
const isDevelopment = process.env.NODE_ENV === 'development' || isTestDomain

/** 服务端请求时使用的完整域名 */
const serverApiUrl = isBrowser ? '' : (isDevelopment ? TEST_URL : FORMAL_URL)

const config = {
  /** 是否落地到浏览器环境了 */
  get isBrowser() { return isBrowser },

  /** 当前环境模式 */
  get env() { return process.env.NODE_ENV === 'development' ? 'dev' : 'prod' },

  get baseURL() { return '/api' as const },

  /**
   * 是否开发环境
   * - 包含测试环境
   * - 只用于浏览器环境
   */
  get isDevelopment() { return isDevelopment },

  /** 请求超时毫秒 */
  get requestOvertime() { return 60000 },

  /**
   * `api`请求域名
   * @description 根据当前域名来，接口需要在`nuxt.config.js`中的`proxy`去单独配置
   */
  get apiUrl() { return serverApiUrl },

  /**
   * 路由前缀
   */
  get routePath() { return '' as const },

  /** 当前产业链对应的项目, 当前0表示标准产业链 */
  get industryProjectId() { return '0' as const },

  /** api服务器前缀 */
  get serverProxy() { return '' as const },

  get apiSdkProxy() { return '/openapi' as const },

  get aiProxy() { return 'bochaapi/aiServer' as const },

  /**
   * 导出pdf项目地址
   */
  get pdfProjectUrl() { return '' as const },

  /**
   * 当前项目地址
   * - 测试地址
   * - 正式地址
   * - 预发地址
   */
  get projectUrl() { return isDevelopment ? TEST_URL : FORMAL_URL },

  /** 客服地址 */
  get customerService() { return 'http://kefu.bokeyun.com.cn/im/text/1qcox9.html' as const },

  // 应用配置
  get appConfig() {
    return {
      name: '龙泉驿区科技创新服务平台',
      companyName: '广州博士信息技术研究院有限公司',
      shortName: '科创生态',
      concat: '188-0506-5725',
    } as const
  },
} as const satisfies AppConfig   // ← 一行解决所有字面量类型错误

// ==================== 3. 开发环境调试打印（可选）================
if (process.env.NODE_ENV === 'development' && !isBrowser) {
  console.clear()
  console.log('%c服务端运行时 >> 判定为开发/测试环境', 'color:#67c23a;font-weight:bold')
  console.log('%c服务端请求地址 >>', 'color:#409eff;font-weight:bold', serverApiUrl)
}

// ==================== 4. 导出 =================
export default config as AppConfig

