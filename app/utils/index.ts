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
