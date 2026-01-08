import { addEventOnResize } from '@/utils/index'
import { getDicApiGeoByAreaCode } from '@/api/common.ts'
import ThreeMap from './ThreeMap'
import { markRaw } from 'vue'

/** Map组件基础 */
const BaseMixins = {
    props: {
        id: {
            type: String,
            default: 'CommonMap',
        },
        width: {
            type: String,
            default: '100%',
        },
        height: {
            type: String,
            default: '100%',
        },
        isScale: {
            // 外层是否缩放
            type: Boolean,
            default: true,
        },
        isNext: {
            // 是否可以下钻
            type: Boolean,
            default: true,
        },
        zoom: {
            // 地图缩放
            type: Number,
            default: 7,
        },
        polygonHoverStyle: {
            // 地图块样式
            type: Object,
            default: () => ({
                strokeColor: '#ffffff',
                fillColor: '#ffffff',
                strokeOpacity: 0.6,
                fillOpacity: 0.6,
            }),
        },
        polygonStyle: {
            // 地图块样式
            type: Object,
            default: () => ({
                strokeColor: '#1B7DC1',
                fillColor: '#1B7DC1',
                strokeWeight: 1,
                strokeStyle: 'dashed',
                strokeOpacity: 0.6,
                fillOpacity: 0.6,
                cursor: 'pointer',
            }),
        },
        hideText: {
            // 是否显示地区名称
            type: Boolean,
            default: false,
        },
        textStyle: {
            // 地区名称样式
            type: Object,
            default: () => ({
                color: '#fff',
                fontSize: '14px',
                backgroundColor: 'transparent',
                border: 'none',
                lineHeight: 1,
                padding: 0,
                cursor: 'pointer',
            }),
        },
        selfMapId: {
            // 父组件传入地图id, 全国地图传-1，不传获取默认地区地图
            type: [Number, String],
            default: null,
        },
        idKey: {
            // 地图id的key值
            type: String,
            default: 'adcode', // 静态地图adcode，动态地图如果是getDicApiGeoById则为id
        },
        cpKey: {
            // 地图中心点的key值
            type: String,
            default: 'cp', // 静态地图center，动态地图如果是getDicApiGeoById则为cp
        },
        pitch: {
            // 3d地图倾斜角度
            type: Number,
            default: 50,
        },
        level: {
            // 区域层级
            type: Number,
            default: 0,
        },
        dataArray: {
            // 数据数组
            type: Array,
            default: () => [
                { areaId: '440100', value: 20 }, // 广州
                { areaId: '440300', value: 105 }, // 深圳
                { areaId: '440600', value: 85 }, // 佛山
                { areaId: '440700', value: 110 }, // 中山
                { areaId: '440800', value: 120 }, // 东莞
            ],
        },
        VisualList: {
            type: Array,
            default: () => [
                { min: 0, max: 80, color: '#00ff00' }, // 绿色：值在 0~80
                { min: 80, max: 100, color: '#ffff00' }, // 黄色：值在 80~100
                { min: 100, max: 120, color: '#ff9900' }, // 橙色：值在 100~120
                { min: 120, max: 200, color: '#ff0000' }, // 红色：值在 120~200
            ],
        },
        threeConfig: {
            type: Object,
            default: () => ({
                idKey: 'adcode',
                cpKey: 'cp',
                showTooltip: true, // 是否显示提示信息
                labelType: '2d', // 区域标题展示类型 2d 3d
                labelHoverColor: '#ffff00', // 区域标题悬浮颜色
                areaHoverColor: '#ff0000', // 区域悬浮颜色
                createTooltipElement: null, // 创建提示信息元素
                areaColor: '#1B7DC1', // 区域颜色
            }),
        },
    },
    data() {
        return {
            curLevel: 0,
            region: {
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
            },
            mapObject: null,
            mapParentDom: null,
            mapDom: null,
            defaultWidth: 1920, // 反缩放
            defaultHight: 1080, // 反缩放
            loading: false, // 地图接口加载
            threeMapObject: null, // 3d地图对象
            gllayer: null, // 3d图层
        }
    },
    watch: {
        selfMapId: {
            handler() {
                this.initArea()
            },
            immediate: false,
        },
    },
    mounted() {
        this.mapDom = document.getElementById(this.id)
        this.innerWidth = this.mapDom.offsetWidth
        this.innerHeight = this.mapDom.offsetHeight
        if (this.isScale) {
            this.$nextTick(() => {
                this.mapParentDom = document.getElementById(this.id + 'Parent')
                // this.mapDom = document.getElementById(this.id)
                console.log(this.mapDom, this.mapDom.offsetWidth)
                this.innerWidth = this.mapDom.offsetWidth
                this.innerHeight = this.mapDom.offsetHeight
                this.setScale()
            })
            addEventOnResize(() => {
                this.setScale()
            })
        }
        this.init()
    },
    beforeDestroy() {
        this.delArea()
        this.mapDom && this.mapDom.setAttribute('style', `transform: none`)
        this.mapDom = null
        this.mapParentDom = null
        if (this.threeMapObject) {
            this.threeMapObject.destroy()
            this.threeMapObject = null
        }
        if (this.mapObject && this.gllayer) {
            this.mapObject.remove(this.gllayer)
            this.gllayer = null
        }
        this.mapObject && this.mapObject.destroy()
        this.mapObject = null
    },
    methods: {
        // 初始化地图
        async init() {
            if (this.mapObject) return
            this.mapObject = new AMap.Map(this.id, {
                zoom: 7, //级别
                // center: [123.43, 41.80], //中心点坐标
                center: [113.32, 23.1],
                // center: [116.54, 39.79],
                mapStyle: `amap://styles/3b837c8f4b250d95ac09a5638c150b84`, //设置地图的显示样式
                viewMode: '3D', // 3d模型需要有内容宽高才能进行渲染，所以不能使用complete控制显隐
                pitch: this.pitch,
                skyColor: 'rgb(1, 18, 49)', // 设置天空颜色
                showLabel: true, // 是否展示地图文字和 POI 信息,不显示不会很卡
            })
            this.mapObject.on('complete', () => {
                setTimeout(() => {
                    // 延迟是为了不要白屏，由于加载地图样式是额外的，默认是白底
                    this.initOtherAfterMap()
                    this.mapObject.setDefaultCursor('pointer')
                    // 默认需要初始化地图
                    this.initArea()
                }, 200)
            })
        },
        // 地图初始化后就需要初始化的功能
        initOtherAfterMap() {},
        // 反缩放，解决外层缩放编译问题
        setScale() {
            if (this.mapDom) {
                const scaleX = this.defaultWidth / window.innerWidth
                const scaleY = this.defaultHight / window.innerHeight
                this.replaceStyle(
                    this.mapDom,
                    'transform',
                    `transform: scale(${scaleX}, ${scaleY})`
                )
                this.$nextTick(() => {
                    // 保持内容的高度固定在缩放范围内的
                    if (this.mapParentDom) {
                        // console.log(this.mapParentDom.offsetWidth, this.mapParentDom.offsetHeight)
                        this.replaceStyle(
                            this.mapDom,
                            'width',
                            `width:${(this.mapParentDom.offsetWidth * 1) / scaleX}px`
                        )
                        this.replaceStyle(
                            this.mapDom,
                            'height',
                            `height:${(this.mapParentDom.offsetHeight * 1) / scaleY}px`
                        )
                        this.replaceStyle(
                            this.mapDom,
                            'position',
                            `position: absolute`
                        )
                        this.$nextTick(() => {
                            this.mapObject && this.mapObject.resize()
                        })
                    }
                })
            }
        },
        // 修改dom元素的style样式，dom是待修改的元素，key为要修改的样式key,newValue表示修改后的样式
        replaceStyle(dom, key, newValue) {
            let style = dom.getAttribute('style')
            let styleList = style.split(';')
            let index = styleList.findIndex((item) => item.indexOf(key) != -1)
            if (index != -1) {
                styleList[index] = newValue
            } else {
                styleList.push(newValue)
            }
            dom.setAttribute('style', styleList.join(';'))
        },
        // 清除json画出的区域
        delArea() {
            // 地图回到初始角度
            this.mapObject.setPitch(this.pitch)
            // 地图回到初始旋转角度
            this.mapObject.setRotation(0)
            // 清除3d地图的素材
            if (this.threeMapObject) {
                this.threeMapObject.clear()
            }
            // 清除其他要清除的图层跟覆盖物
            this.delOtherArea()
        },
        // 其他要清除的图层跟覆盖物
        delOtherArea() {},
        // 获取地图数据，比如接口
        async getAreaData() {
            let mapJson = null
            this.loading = true
            let params = null
            if (this.selfMapId == -1) {
                // 获取全国地图
                params = {
                    id: 0,
                }
            } else {
                // 获取其他地图
                params = {
                    areaId: this.selfMapId || this.region.curId,
                }
            }
            // 用于getDicApiGeoById这个方式
            const res = await getDicApiGeoByAreaCode(params)
            if (res.code == 1) {
                mapJson = res.data
            }
            this.loading = false
            return mapJson
        },
        // 初始化json文件 画对应区域
        async initArea() {
            if (!this.mapObject) return
            this.delArea()
            let mapJson = await this.getAreaData()
            // console.log(mapJson);
            if (!mapJson) {
                return
            }
            const features = mapJson.features
            // 绘制单纯为了居中
            this.initMap(features)
            this.initThreeMap(features)
            this.initOtherAfterArea()
        },
        initMap(features) {
            // 处理点数据
            const allPoints = []
            features.forEach((feature) => {
                feature.geometry.coordinates.forEach((ring) => {
                    ring.forEach((points) => {
                        const validPoints = points.filter(
                            (point) =>
                                point?.length === 2 && point[0] && point[1]
                        )
                        if (validPoints.length > 0) {
                            allPoints.push(...validPoints)
                        }
                    })
                })
            })

            // 创建用于居中的多边形
            if (allPoints.length > 0) {
                const centerPolygon = new AMap.Polygon({
                    path: allPoints,
                    visible: false,
                })
                // 地图居中
                this.mapObject.setFitView([centerPolygon], true)
                this.mapObject.setZoom(
                    this.level >= 1 ? this.zoom + 2 : this.zoom
                )
                // 移除临时多边形
                this.mapObject.remove([centerPolygon])
            }
        },
        initThreeMap(features) {
            const zoom = this.mapObject.getZoom()
            if (!this.gllayer) {
            
                this.gllayer = new AMap.GLCustomLayer({
                    zIndex: 100,
                    init: (gl) => {
                        if (this.threeMapObject) {
                            this.threeMapObject.destroy()
                            this.threeMapObject = null
                        }
                        this.threeMapObject = markRaw(
                            new ThreeMap({
                                dom: this.mapDom,
                                gl,
                                zoom,
                                customCoords: this.mapObject.customCoords,
                                config: {
                                    ...this.threeConfig,
                                },
                                renderedFun: () => {
                                    this.mapObject && this.mapObject.render()
                                },
                            })
                        )
                        this.threeMapObject.initArea(features)
                        this.threeMapObject.createText()
                        this.threeMapObject.updateMapStyles(
                            this.dataArray,
                            this.VisualList,
                            this.threeConfig.areaColor // 默认颜色：如果没有匹配到数据，则使用灰色
                        )
                        this.threeMapObject.resize()
                    },
                    render: () => {
                        this.threeMapObject.render()
                    },
                })
                // 添加GL图层到地图
                this.mapObject.add(this.gllayer)
                this.mapDom.addEventListener('mousemove', (e) => {
                    this.threeMapObject &&
                        this.threeMapObject.handleMouseMove(e)
                })
                this.mapDom.addEventListener('mouseout', (e) => {
                    this.threeMapObject && this.threeMapObject.handleMouseOut(e)
                })
                this.mapDom.addEventListener('click', (e) => {
                    this.threeMapObject &&
                        this.threeMapObject.handleMouseClick(
                            e,
                            this.handlePolyonClick
                        )
                })
            } else {
                this.threeMapObject.setDepth(zoom)
                this.threeMapObject.initArea(features)
                this.threeMapObject.createText()
                this.threeMapObject.updateMapStyles(
                    this.dataArray,
                    this.VisualList,
                    this.threeConfig.areaColor // 默认颜色：如果没有匹配到数据，则使用灰色
                )
            }
        },
        // 地图绘制后需要初始化的其他方法
        initOtherAfterArea() {},
        // 下钻地图
        handlePolyonClick(params) {
            // console.log(params)
            if (this.isNext) {
                params.id = params[this.idKey]
                this.$emit('areaClick', params)
            }
        },
        // 地图宽高变化
        resize() {
            console.log('resize')
            this.threeMapObject && this.threeMapObject.resize()
        },
    },
}

export default BaseMixins
