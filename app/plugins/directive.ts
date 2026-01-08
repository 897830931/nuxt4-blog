import { createApp } from 'vue'
import LoadingSpinner from '@/components/SvgIcon/index.vue'

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.directive('lazy', {
        mounted(el, binding) {
            const observer = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            const imgElement = entry.target as HTMLImageElement
                            // 动态创建 Loading 组件实例并传递属性
                            const loadingApp = createApp(LoadingSpinner, {
                                // 第一个svg的loading效果
                                icon: binding.arg ? binding.arg : 'loading', // 传递属性
                            })
                            const loadingDiv = document.createElement('div')
                            loadingDiv.className = 'lazy-loading'

                            // 添加 Loading 样式以适应父元素
                            loadingDiv.style.position = 'absolute'
                            loadingDiv.style.top = '0'
                            loadingDiv.style.left = '0'
                            loadingDiv.style.width = '100%'
                            loadingDiv.style.height = '100%'
                            loadingDiv.style.display = 'flex'
                            loadingDiv.style.alignItems = 'center'
                            loadingDiv.style.justifyContent = 'center'
                            loadingDiv.style.backgroundColor = 'rgba(242, 242, 242, 0.5)'
                            loadingDiv.style.zIndex = '1'

                            // 设置图片容器为相对定位
                            const parentElement = imgElement.parentElement
                            if (parentElement) {
                                parentElement.style.position = 'relative'
                            }

                            // 将 loadingDiv 插入到图片容器中
                            imgElement.parentElement?.appendChild(loadingDiv)
                            loadingApp.mount(loadingDiv)

                            // 图片加载完成的处理
                            imgElement.onload = () => {
                                loadingApp.unmount() // 卸载 loading 组件
                                loadingDiv.remove() // 图片加载成功，移除 loading
                            }
                            imgElement.onerror = () => {
                                console.error('图片加载失败')
                                loadingApp.unmount() // 卸载 loading 组件
                                loadingDiv.remove() // 图片加载失败，移除 loading
                            }

                            // 设置图片源
                            const dataSrc = imgElement.getAttribute('data-src')
                            if (dataSrc !== null) {
                                imgElement.src = dataSrc // 确保 dataSrc 是字符串后再赋值
                            }

                            // 停止观察
                            observer.unobserve(imgElement)
                        }
                    })
                },
                {
                    rootMargin: '0px',
                    threshold: 0.1,
                },
            )

            observer.observe(el)
        },
    })
    // 自定义指令监控元素宽高变化，传入事件，触发事件
    nuxtApp.vueApp.directive('domResize', {
        mounted(el: HTMLElement, binding) {
            if (typeof window === 'undefined') return
            if (typeof binding.value !== 'function') return

            if (!('ResizeObserver' in window)) {
                // 兜底：不支持就不监听或回退 setInterval
                return
            }

            const ro = new ResizeObserver((entries) => {
                const entry = entries[0]
                if (!entry) return
                const { width, height } = entry.contentRect
                binding.value({ width: `${width}px`, height: `${height}px` })
            })

            ro.observe(el)
            ;(el as any).__domResizeObserver__ = ro
        },

        unmounted(el: any) {
            el.__domResizeObserver__?.disconnect?.()
        },
    })
})
