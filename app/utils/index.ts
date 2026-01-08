/** 检查是否为 FormData 实例 */
export function isFormData(data: any): data is FormData {
  return data instanceof FormData
}

/**
 * 精确获取任意值的类型字符串（小写）
 * 例如：'string'、'object'、'null'、'array'、'date' 等
 */
export function checkType(target: unknown): string {
  const type = Object.prototype.toString.call(target).slice(8, -1).toLowerCase()
  return type
}


/**
 * 描述 用于onresize事件中绑定多个回调函数
 * @author luoyong
 * @date 2021-03-16
 * @param {Function} callback 回调函数
 * @returns {void}
 */
export function addEventOnResize(callback: () => void): void {
  var originFn = window.onresize
  window.onresize = function () {
    originFn && originFn()
    callback()
  }
}
