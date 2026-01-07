// useCommonMap.ts
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { addEventOnResize } from '@/utils/index'
import { getDicApiGeoByAreaCode } from '@/api/common'
import guangdongJson from '@/public/Json/three/shandong.json'
import ThreeMap from './ThreeMap'
import { markRaw } from 'vue'
import heatData from './heatData'
/**
 * useCommonMap 组合式函数
 *
 * 替代原来的 BaseMixins，提供地图组件的基础响应式数据、props 和方法。
 *
 * Props（使用 defineProps 在组件中传入）：
 *   - id, width, height, isScale, isNext, polygonHoverStyle, polygonStyle, hideText, textStyle, selfMapId, idKey, cpKey, pitch
 *
 * 内部数据（data）：
 *   - curLevel：当前地图层级
 *   - region：存储当前区域信息
 *   - mapObject：AMap 地图对象
 *   - mapParentDom：地图父容器 DOM
 *   - mapDom：地图容器 DOM
 *   - defaultWidth / defaultHight：缩放参考宽高
 *   - loading：加载状态
 *   - threeMapObject：3D 地图对象（ThreeMap 实例）
 *   - gllayer：3D 图层（AMap.GLCustomLayer 实例）
 *   - innerWidth / innerHeight：容器实际宽高
 *
 * Methods：
 *   - init：初始化地图
 *   - setScale：反缩放处理
 *   - replaceStyle：修改 DOM 元素样式
 *   - delArea：清除当前区域数据（调用 threeMapObject.clear() 等）
 *   - getAreaData：获取地图数据（示例中返回 guangdongJson）
 *   - initArea：初始化区域数据，先清除再绘制
 *   - initMap：居中处理
 *   - initThreeMap：初始化3D地图图层
 *   - initHeatAmap：初始化高德热力图
 *   - delOtherArea / initOtherAfterArea：留给业务扩展使用
 *   - handlePolyonClick：点击地图块事件处理，向父组件传递区域信息
 *   - resize：地图容器尺寸变化处理
 *
 * 使用示例（在 Vue 3 组件中）：
 *
 *   import { useCommonMap } from '@/components/yourPath/useCommonMap'
 *   const { props, loading, init, resize, ... } = useCommonMap(props, emit)
 *
 */
export function useCommonMap(
    props: {
        id?: string
        width?: string
        height?: string
        isScale?: boolean
        isNext?: boolean
        polygonHoverStyle?: Record<string, any>
        polygonStyle?: Record<string, any>
        hideText?: boolean
        textStyle?: Record<string, any>
        selfMapId?: number | string | null
        idKey?: string
        cpKey?: string
        pitch?: number
    },
    emit: (event: string, ...args: any[]) => void
) {
    // 默认 props（可通过组件传入覆盖）
    const id = ref(props.id || 'CommonMap')
    const width = ref(props.width || '100%')
    const height = ref(props.height || '100%')
    const isScale = ref(props.isScale ?? true)
    const isNext = ref(props.isNext ?? true)
    const polygonHoverStyle = ref(
        props.polygonHoverStyle || {
            strokeColor: '#ffffff',
            fillColor: '#ffffff',
            strokeOpacity: 0.6,
            fillOpacity: 0.6,
        }
    )
    const polygonStyle = ref(
        props.polygonStyle || {
            strokeColor: '#1B7DC1',
            fillColor: '#1B7DC1',
            strokeWeight: 1,
            strokeStyle: 'dashed',
            strokeOpacity: 0.6,
            fillOpacity: 0.6,
            cursor: 'pointer',
        }
    )
    const hideText = ref(props.hideText ?? false)
    const textStyle = ref(
        props.textStyle || {
            color: '#fff',
            fontSize: '14px',
            backgroundColor: 'transparent',
            border: 'none',
            lineHeight: 1,
            padding: 0,
            cursor: 'pointer',
        }
    )
    const selfMapId = ref(props.selfMapId ?? null)
    const idKey = ref(props.idKey || 'adcode')
    const cpKey = ref(props.cpKey || 'center')
    const pitch = ref(props.pitch || 50)

    // 内部数据
    const curLevel = ref(0)
    const region = reactive({
        curId: '4401',
        curName: '广州市',
        provinceId: '44',
        province: '广东省',
        cityId: '4401',
        city: '广州市',
        areaId: '',
        area: '',
        streetId: '',
        street: '',
    })
    const mapObject = ref<any>(null) // AMap 地图对象
    const mapParentDom = ref<HTMLElement | null>(null)
    const mapDom = ref<HTMLElement | null>(null)
    const defaultWidth = 1920 // 反缩放参考宽度
    const defaultHight = 1080 // 反缩放参考高度
    const loading = ref(false)
    const threeMapObject = ref<any>(null) // 3D 地图对象
    const gllayer = ref<any>(null) // 3D 图层
    const innerWidth = ref(0)
    const innerHeight = ref(0)
    const AMap = (window as any).AMap
    const heatmap = ref<any>(null)
    /**
     * 初始化地图（AMap）
     */
    function init() {
        if (mapObject.value) return
        // 这里使用 AMap.Map 创建地图对象
        // 请确保 AMap 对象已经全局引入或通过插件引入
        console.log(id.value, '初始化地图')
        mapObject.value = new AMap.Map(id.value, {
            zoom: 7.5, // 地图级别
            center: [113.32, 23.1],
            zooms: [7, 9],
            mapStyle: 'amap://styles/3b837c8f4b250d95ac09a5638c150b84',
            viewMode: '3D',
            pitch: pitch.value,
            skyColor: 'rgb(1, 18, 49)',
            showLabel: true,
        })
        // 设置默认鼠标样式为pointer，default，move，crosshair
        mapObject.value.setDefaultCursor('pointer')

        // 当地图加载完成后，执行初始化区域等操作
        mapObject.value.on('complete', () => {
            console.log('地图加载完成')
            setTimeout(() => {
                initOtherAfterMap()
                initArea()
            }, 200)
        })
    }

    /**
     * 地图初始化后执行的其他逻辑（扩展用）
     */
    function initOtherAfterMap() {
        // 可根据需要添加其他初始化逻辑
    }

    /**
     * 反缩放处理，解决外层缩放问题
     */
    function setScale() {
        console.log('反缩放处理')
        if (mapDom.value) {
            const scaleX = defaultWidth / window.innerWidth
            const scaleY = defaultHight / window.innerHeight
            replaceStyle(
                mapDom.value,
                'transform',
                `transform: scale(${scaleX}, ${scaleY})`
            )
            nextTick(() => {
                if (mapParentDom.value) {
                    replaceStyle(
                        mapDom.value,
                        'width',
                        `width:${mapParentDom.value.offsetWidth / scaleX}px`
                    )
                    replaceStyle(
                        mapDom.value,
                        'height',
                        `height:${mapParentDom.value.offsetHeight / scaleY}px`
                    )
                    replaceStyle(mapDom.value, 'position', `position: absolute`)
                    nextTick(() => {
                        mapObject.value && mapObject.value.resize()
                    })
                }
            })
        }
    }

    /**
     * 修改 DOM 元素的样式（根据 key 替换样式字符串）
     */
    function replaceStyle(dom: HTMLElement, key: string, newValue: string) {
        const style = dom.getAttribute('style') || ''
        const styleList = style.split(';').filter((item) => item.trim() !== '')
        const index = styleList.findIndex((item) => item.indexOf(key) !== -1)
        if (index !== -1) {
            styleList[index] = newValue
        } else {
            styleList.push(newValue)
        }
        dom.setAttribute('style', styleList.join(';'))
    }

    /**
     * 清除当前区域的绘制
     */
    function delArea() {
        // 重置地图角度
        mapObject.value.setPitch(pitch.value)
        mapObject.value.setRotation(0)
        // 清除 3D 地图对象
        if (threeMapObject.value) {
            threeMapObject.value.clear()
        }
        delOtherArea()
    }

    /**
     * 清除其他图层（留给扩展使用）
     */
    function delOtherArea() {
        // 例如清除其他覆盖物
    }

    /**
     * 获取地图数据（示例中返回 guangdongJson，可替换为接口调用）
     */
    async function getAreaData() {
        let mapJson = null
        loading.value = true
        let params: any = {}
        if (selfMapId.value == -1) {
            params.id = 0 // 全国地图
        } else {
            params.id = selfMapId.value || region.curId
        }
        // 可选择接口调用：
        // const res = await getDicApiGeoByAreaCode(params)
        // mapJson = res
        // 示例直接返回 guangdongJson
        loading.value = false

        return guangdongJson
    }

    /**
     * 初始化区域数据：清除旧区域，加载新区域数据并绘制地图
     */
    async function initArea() {
        if (!mapObject.value) return
        delArea()
        const mapJson = await getAreaData()

        if (!mapJson) return
        const features = mapJson.features
        initMap(features)
        initThreeMap(features)
        initHeatAmap(heatData)
        initOtherAfterArea()
    }

    /**
     * 根据所有区域的点数据计算并居中地图
     */
    function initMap(features: any[]) {
        const allPoints: number[][] = []
        features.forEach((feature) => {
            feature.geometry.coordinates.forEach((ring: any) => {
                ring.forEach((points: any) => {
                    const validPoints = points.filter(
                        (point: any) =>
                            point && point.length === 2 && point[0] && point[1]
                    )
                    if (validPoints.length > 0) {
                        allPoints.push(...validPoints)
                    }
                })
            })
        })
        if (allPoints.length > 0) {
            const centerPolygon = new AMap.Polygon({
                path: allPoints,
                visible: true,
            })
            mapObject.value.setFitView([centerPolygon], true)
            mapObject.value.setZoom(7.5)
            mapObject.value.remove([centerPolygon])
        }
    }

    /**
     * 初始化 3D 地图图层（ThreeMap 对象）
     */
    function initThreeMap(features: any[]) {
        const zoom = mapObject.value.getZoom()
        console.log(zoom, 'zoom')
        if (!gllayer.value) {
            gllayer.value = new AMap.GLCustomLayer({
                zIndex: 100,
                init: (gl: any) => {
                    if (threeMapObject.value) {
                        threeMapObject.value.destroy()
                        threeMapObject.value = null
                    }
                    threeMapObject.value = markRaw(
                        new ThreeMap({
                            dom: mapDom.value,
                            gl,
                            zoom,
                            customCoords: mapObject.value.customCoords,
                            config: {
                                idKey: idKey.value,
                                cpKey: cpKey.value,
                            },
                            mapObject: mapObject.value,
                            renderedFun: () => {
                                mapObject.value && mapObject.value.render()
                            },
                        })
                    )
                    threeMapObject.value.initArea(features)
                    // threeMapObject.value.createHeatmapOverlay(heatData)
                    threeMapObject.value.createText()
                },
                render: () => {
                    threeMapObject.value.render()
                },
            })
            mapObject.value.add(gllayer.value)
            const throttledMapZoomend = useThrottleFn(async (e: MouseEvent) => {
                // threeMapObject.value.updateHeatmapData(heatData)
            }, 100)
            mapObject.value.on('zoomend', throttledMapZoomend)

            // 添加事件监听 节流
            const throttledMouseMove = useThrottleFn((e: MouseEvent) => {
                threeMapObject.value && threeMapObject.value.handleMouseMove(e)
            }, 100)
            mapDom.value?.addEventListener('mousemove', throttledMouseMove)

            mapDom.value?.addEventListener('mouseout', (e: MouseEvent) => {
                threeMapObject.value && threeMapObject.value.handleMouseOut(e)
            })
            mapDom.value?.addEventListener('click', (e: MouseEvent) => {
                threeMapObject.value &&
                    threeMapObject.value.handleMouseClick(e, handlePolyonClick)
            })
        } else {
            threeMapObject.value.setDepth(zoom)
            threeMapObject.value.initArea(features)
        }
    }
    /**
     * 初始化高德热力图
     */
    function initHeatAmap(heatData) {
        // 高德热力图初始化逻辑
        mapObject.value.plugin(['AMap.HeatMap'], function () {
            //初始化heatmap对象
            console.log(mapObject.value)
            heatmap.value = new AMap.HeatMap(mapObject.value, {
                radius: 30, //给定半径
                opacity: [0, 0.8],
                zIndex: 100,
                '3d': {
                    //平滑度
                    heightBezier: [0.2, 0, 0.5, 0.2],
                    // 高度缩放比例
                    heightScale: 0.4,
                    // 取样精度
                    gridSize: 10,
                },
                zooms: [6, 9],
                gradient: {
                    0.5: 'blue',
                    0.65: 'rgb(117,211,248)',
                    0.7: 'rgb(0, 255, 0)',
                    0.9: '#ffea00',
                    1.0: 'red',
                },
            })
            // console.log(heatmap.value, 'heatmap')
            //设置数据集：该数据为北京部分“公园”数据
            heatmap.value.setDataSet({
                data: heatData.data.map((item: any) => {
                    return {
                        ...item,
                        count: item.value,
                    }
                }),
                max: 100,
            })
        })
    }

    /**
     * 地图绘制后需要初始化的其他方法（扩展用）
     */
    function initOtherAfterArea() {
        // 例如添加文字、覆盖物等
    }

    /**
     * 处理地图块点击事件，下钻后将区域信息通过事件传递给父组件
     */
    function handlePolyonClick(params: any) {
        if (isNext.value) {
            params.id = params[idKey.value]
            emit('areaClick', params)
        }
    }

    /**
     * 地图容器尺寸变化时调用
     */
    function resize() {
        console.log('resize')
        threeMapObject.value && threeMapObject.value.resize()
    }

    // 组件挂载时：获取 DOM 并初始化地图、反缩放等
    onMounted(() => {
        nextTick(() => {
            mapDom.value = document.getElementById(id.value)
            if (mapDom.value) {
                innerWidth.value = mapDom.value.offsetWidth
                innerHeight.value = mapDom.value.offsetHeight
            }
            if (isScale.value) {
                nextTick(() => {
                    mapParentDom.value = document.getElementById(
                        id.value + 'Parent'
                    )
                    if (mapDom.value) {
                        innerWidth.value = mapDom.value.offsetWidth
                        innerHeight.value = mapDom.value.offsetHeight
                        // vue3写法去掉反而正常
                        // setScale()
                    }
                })
                addEventOnResize(() => {
                    // setScale()
                })
            }
            init()

            // 监听 selfMapId 变化，重新初始化区域
            watch(
                () => selfMapId.value,
                () => {
                    initArea()
                }
            )
        })
    })

    // 组件卸载时清理
    onBeforeUnmount(() => {
        delArea()
        if (mapDom.value) {
            mapDom.value.setAttribute('style', `transform: none`)
            mapDom.value = null
        }
        mapParentDom.value = null
        if (threeMapObject.value) {
            threeMapObject.value.destroy()
            threeMapObject.value = null
        }
        if (mapObject.value && gllayer.value) {
            mapObject.value.remove(gllayer.value)
            gllayer.value = null
        }
        mapObject.value && mapObject.value.destroy()
        mapObject.value = null
    })

    // 返回需要在组件中使用的响应式变量和方法
    return {
        id,
        width,
        height,
        loading,
        mapObject,
        threeMapObject,
        setScale,
        resize,
        // 其他你可能需要暴露的方法
    }
}
