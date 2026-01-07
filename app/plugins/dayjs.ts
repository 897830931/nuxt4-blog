// plugins/dayjs.ts
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn' // 引入中文语言包

// ==================== 按需引入常用插件（只引入你会用到的，体积最小化） ====================
import relativeTime from 'dayjs/plugin/relativeTime'       // 支持 .fromNow()、.toNow() → “3分钟前”
import duration from 'dayjs/plugin/duration'                 // 支持 dayjs.duration() → 计算时间间隔
import isToday from 'dayjs/plugin/isToday'                   // .isToday() → 判断是否今天
import isYesterday from 'dayjs/plugin/isYesterday'           // .isYesterday() → 是否昨天
import isTomorrow from 'dayjs/plugin/isTomorrow'             // .isTomorrow() → 是否明天
import quarterOfYear from 'dayjs/plugin/quarterOfYear'       // .quarter() → 获取季度
import advancedFormat from 'dayjs/plugin/advancedFormat'     // 支持 Do、DDDo 等高级格式（如 1st、2nd）
import localizedFormat from 'dayjs/plugin/localizedFormat'   // 支持 L、LL、LLL、LLLL 等本地化格式
import weekday from 'dayjs/plugin/weekday'                   // 支持 .weekday() 计算星期几

// ==================== 启用所有插件 ====================
dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.extend(isToday)
dayjs.extend(isYesterday)
dayjs.extend(isTomorrow)
dayjs.extend(quarterOfYear)
dayjs.extend(advancedFormat)
dayjs.extend(localizedFormat)
dayjs.extend(weekday)

// ==================== 全局默认使用中文 ====================
dayjs.locale('zh-cn')

// ==================== 优化中文「刚刚」显示（原生 dayjs 1分钟内显示“几秒前”，国人更习惯“刚刚”） ====================
dayjs.extend((_, DayjsClass) => {
  const oldFromNow = DayjsClass.prototype.fromNow
  DayjsClass.prototype.fromNow = function (withoutSuffix?: boolean) {
    const diff = dayjs().diff(this, 'minute') // 计算相差分钟数
    if (Math.abs(diff) < 1) return '刚刚'     // 小于1分钟统一显示「刚刚」
    return oldFromNow.call(this, withoutSuffix)
  }
})

// ==================== Nuxt 插件定义 ====================
export default defineNuxtPlugin(() => {
  /**
   * 将 dayjs 实例全局注入为 $dayjs
   * 使用方式（全项目统一）：
   *   const { $dayjs } = useNuxtApp()
   *   $dayjs().format('YYYY-MM-DD')
   *   $dayjs('2025-01-01').fromNow()
   *
   * 优点：
   *   1. 绝不与其他函数名冲突（now、format 等常见名字全部避免）
   *   2. 所有 dayjs 插件已全局开启，直接调用即可
   *   3. 支持完整链式调用、类型提示、热更新
   */
  return {
    provide: {
      $dayjs: dayjs  // ← 唯一注入点，团队强制规范
    }
  }
})