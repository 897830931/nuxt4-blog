import * as THREE from 'three'
import {
    Line2,
    LineMaterial,
    LineGeometry,
    CSS2DRenderer,
    CSS2DObject,
    FontLoader,
    TextGeometry,
    FXAAShader,
    ShaderPass,
    EffectComposer,
    RenderPass,
} from 'three-stdlib'
import fontData from '@/public/Json/three/font.json'
type CreateTooltipElement = (
    name: string,
    newPos: THREE.Vector3,
    obj: any
) => HTMLElement
type CreateLabelElement = (properties: object) => HTMLElement
type configType = {
    idKey?: string
    cpKey?: string
    showTooltip?: boolean //是否显示提示信息
    labelType?: string //区域标题展示类型 2d 3d
    labelHoverColor?: string //区域标题悬浮颜色
    areaHoverColor?: string //区域悬浮颜色
    createTooltipElement?: CreateTooltipElement //创建提示信息元素
    createLabelElement?: CreateLabelElement //创建label元素
    lineColor?: string //线颜色
    lineWidth?: number //线宽
}
interface HeatPoint {
    lat: number
    lng: number
    value: number
}

interface HeatData {
    max: number
    data: HeatPoint[]
}
interface HeatConfig {
    radius?: number
    maxOpacity?: number
    minOpacity?: number
    blur?: number
    gradient?: { [key: string]: string }
}
export default class ThreeMap {
    config: configType
    dom: HTMLCanvasElement
    domRect: DOMRect
    tooltip: any
    innerWidth: number
    innerHeight: number
    renderedFun: Function
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    textLabels: Array<THREE.Mesh>
    cachedMeshes: Array<any>
    customCoords: any
    CSS2DLayer: any
    css2DGroup: any
    textMeshGroup: any
    depth: number
    raycaster: THREE.Raycaster
    mouse: THREE.Vector2
    hoveredMesh: THREE.Mesh
    hoveredText: THREE.Mesh
    hoverId: string
    sence: any
    dataFlowIntervals: any[]
    dataSpherePool: any[]
    /**
     * 构造函数
     * @param {Object} param0 参数对象，包含以下属性：
     *    - dom: 地图容器 DOM 元素
     *    - gl: AMap 提供的 WebGL 上下文
     *    - zoom: 地图缩放级别（默认 9）
     *    - customCoords: 自定义坐标转换工具，用于将经纬度转换为 Three.js 坐标 这个是高德地图的坐标转换工具
     *    - config: 配置对象，包含 idKey（地图块 id 字段）和 cpKey（中心点字段）等
     *    - renderedFun: 每次渲染时执行的回调函数
     *    - showTooltip: 是否显示提示信息
     */
    constructor({ dom, gl, zoom = 9, customCoords, config, renderedFun }) {
        // 合并传入的配置和默认配置
        this.config = {
            idKey: 'id',
            cpKey: 'cp',
            showTooltip: true, // 是否显示提示信息
            labelType: '2d', //区域标题展示类型 2d 3d
            labelHoverColor: '#ffff00', //区域标题悬浮颜色
            areaHoverColor: '#2A95B5', //区域悬浮颜色
            createTooltipElement: null, //创建提示信息元素,
            createLabelElement: null, //创建label元素,
            lineColor: '#87cefa', //线颜色
            lineWidth: 1, //线宽
            ...config,
        }

        this.dom = dom // 地图容器 DOM 元素
        this.domRect = null // 存储 DOM 元素的尺寸信息
        this.tooltip = null // 用于显示提示信息的 DOM 元素
        this.innerWidth = 0 // DOM 宽度
        this.innerHeight = 0 // DOM 高度
        this.setDomRect() // 初始化 DOM 尺寸

        // 初始化属性（稍后赋值）
        this.renderedFun = renderedFun || null
        this.camera = null // Three.js 相机对象
        this.renderer = null // Three.js 渲染器
        this.scene = null // Three.js 场景
        this.textLabels = [] // 存储所有 3D 文字标签
        this.cachedMeshes = [] // 存储已创建的地图块
        this.CSS2DLayer = null // 在3D地图上层容器
        this.css2DGroup = null // 存储所有 CSS2DObject
        this.textMeshGroup = []
        // 数据转换工具，用于将经纬度等数据转换为 Three.js 坐标
        this.customCoords = customCoords

        // 地图块挤出深度
        this.depth = 1
        this.setDepth(zoom) // 根据 zoom 动态设置深度

        // 初始化射线检测相关属性，用于鼠标交互
        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()
        this.hoveredMesh = null // 当前鼠标悬浮的地图块
        this.hoveredText = null // 当前鼠标悬浮的文字标签
        this.hoverId = '' // 当前悬浮的地图块 id
        // 初始化 Three.js 场景等资源，传入 gl（WebGL 上下文）
        this.init(gl)
        // 启动动画循环
        this.animation()
    }

    /**
     * 获取 DOM 容器的尺寸，并更新 innerWidth 和 innerHeight
     */
    setDomRect() {
        this.domRect = this.dom.getBoundingClientRect()
        this.innerWidth = this.domRect.width
        this.innerHeight = this.domRect.height
    }

    /**
     * 动画循环方法
     * 使用 requestAnimationFrame 循环调用自身，
     * 每帧渲染场景并调用外部渲染回调
     */
    animation() {
        requestAnimationFrame(() => this.animation()) // 调度下一帧
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera)
        }
        // 调用外部传入的渲染回调
        if (this.renderedFun) {
            this.renderedFun()
        }
    }

    /**
     * 初始化 Three.js 的基本元素：相机、渲染器、场景、光照
     * @param {WebGLRenderingContext} gl - AMap 提供的 WebGL 上下文
     */
    init(gl) {
        // 创建透视相机，视场角 60 度，近平面 100，远平面 1<<30
        this.camera = new THREE.PerspectiveCamera(
            60, // 视场角
            this.innerWidth / this.innerHeight, // 宽高比
            100, // 近平面
            1 << 30 // 远平面
        )
        // 使用传入的 gl 上下文创建 WebGLRenderer
        this.renderer = new THREE.WebGLRenderer({
            context: gl,
        })
        this.renderer.autoClear = false // 不自动清除，便于多层渲染
        // 创建场景
        this.scene = new THREE.Scene()
        // 添加光照
        this.initLight()
    }

    /**
     * 添加环境光和方向光到场景中
     */
    initLight() {
        var aLight = new THREE.AmbientLight(0xffffff, 0.3) // 环境光，柔和照明
        var dLight = new THREE.DirectionalLight(0xffffff, 1) // 方向光，产生阴影效果,平行光
        // 创建聚光灯光源
        // const spotLight = new THREE.SpotLight(0xffffff)
        // spotLight.position.set(10, 200, this.depth * 3) // 设置光源的位置
        // spotLight.angle = Math.PI / 6
        // 设置目标位置
        // spotLight.target.position.set(100, 0, 0)

        this.initLightPosition(dLight) // 设置方向光的位置
        this.scene.add(dLight)
        this.scene.add(aLight)
        // this.scene.add(spotLight)
    }

    /**
     * 初始化方向光的位置
     * @param {THREE.DirectionalLight} dLight - 方向光对象
     */
    initLightPosition(dLight) {
        dLight.position.set(1000, -100, 900)
    }

    /**
     * 根据地图缩放级别 zoom 动态设置地图块的挤出深度
     * @param {number} zoom - 地图缩放级别
     */
    setDepth(zoom) {
        // 公式：根据基准高度、目标缩放级别和缩放范围计算深度
        const baseHeight = 25000 // 基础高度（zoom 8 时的高度）
        const targetZoom = 8 // 目标缩放级别
        const zoomRange = 1.5 // zoom 6 到 8 的差值
        const depth = baseHeight * Math.pow(2, (targetZoom - zoom) / zoomRange)
        this.depth = depth
    }
    /**
     * 渲染方法，在每帧更新时调用
     */
    render() {
        // 更新所有线宽材质的分辨率，以适应容器尺寸变化
        const lineObject = this.scene.children
            .filter((item) => item.type === 'Object3D' && item.children.length)
            .map((item) => item.children[1])
        lineObject
            .filter((item) => item)
            .forEach((line: any) => {
                if (line.material && line.material.resolution) {
                    line.material.resolution.set(
                        this.innerWidth,
                        this.innerHeight
                    )
                }
            })

        // 同步相机参数，从自定义坐标转换工具获取
       
        this.renderer.resetState()
        var { near, far, fov, up, lookAt, position } =
            this.customCoords.getCameraParams() as any
        this.camera.near = near
        this.camera.far = far
        this.camera.fov = fov
         // @ts-ignore
        this.camera.position.set(...position)
         // @ts-ignore
        this.camera.up.set(...up)
         // @ts-ignore
        this.camera.lookAt(...lookAt)
        this.camera.updateProjectionMatrix()

        // 渲染场景到 WebGL 渲染器
        this.renderer.render(this.scene, this.camera)

        // 渲染 CSS2D 标签层
        if (this.CSS2DLayer) {
            this.CSS2DLayer.render(this.scene, this.camera)
            // 同步更新渲染器尺寸（注意不要误用除法，这里只是单纯调用 setSize）
            this.CSS2DLayer.setSize(this.innerWidth, this.innerHeight)
        }

        this.renderer.resetState()
    }

    /**
     * 初始化鼠标射线检测
     * 根据事件对象计算鼠标在 Three.js 坐标系中的位置，并设置射线检测
     * @param {MouseEvent} event
     * @returns {Intersection|null} 返回第一个相交的对象信息
     */
    initRay(event) {
        // 使用 DOM 矩形计算鼠标在画布内的相对位置
        const rect = this.domRect
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
        // 设置射线检测
        this.raycaster.setFromCamera(this.mouse, this.camera)
        const intersects = this.raycaster.intersectObjects(this.cachedMeshes)
        return intersects && intersects.length > 0 ? intersects[0] : null
    }
    // 当场景中区域或 Mesh 改变时，调用该方法更新缓存
    updateMeshCache() {
        this.cachedMeshes = this.scene.children
            .filter((item:any) => item.isProvince)
            .map((item) => item.children)
            .flat()
            .filter((item) => item.type === 'Mesh')
    }
    /**
     * 初始化区域数据：根据 GeoJSON features 创建地图块，并添加文字标签
     * @param {Object} features GeoJSON 数据中的 features 数组
     */
    initArea(features) {
        // 先对 features 进行过滤处理，过滤无效坐标和小面积区域
        let mapJson = this.filterFeatures(features, 0.01)
        features.forEach((feature) => {
            const province = new THREE.Group() as any // 每个区域使用一个 Group 进行管理
            const coordinates = feature.geometry.coordinates
            coordinates.forEach((coordinate) => {
                coordinate.forEach((item) => {
                    // 转换坐标（使用自定义工具）
                    const coords = this.customCoords.lngLatsToCoords(item)
                    const vertices = []
                    // 创建二维形状
                    const shape = new THREE.Shape()
                    coords.forEach((coord, index) => {
                        if (index === 0) {
                            shape.moveTo(coord[0], coord[1])
                        } else {
                            shape.lineTo(coord[0], coord[1])
                            vertices.push(coord[0], coord[1], this.depth + 1)
                        }
                    })
                    // 创建地图块 Mesh
                    const mesh = this.createMesh(shape) as any
                    // 将 feature 属性挂载到 mesh 上
                    mesh.properties = feature.properties
                    // 创建轮廓线
                    const line = this.createLine(vertices)
                    // 将地图块和轮廓线加入区域 Group
                    province.add(mesh, line)
                })
            })
            // 设置当前地区的参数
            province.properties = feature.properties
            // 使用地图数据提供的中心 则打开注释
            // let provinceCenter = province.properties[this.config.cpKey]
            // 使用计算的重心坐标 更精确
            let provinceCenter = null
            if (provinceCenter && provinceCenter.length) {
                // 如果有指定中心点，则转换为三维坐标
                let newCenter =
                    this.customCoords.lngLatsToCoords(provinceCenter)[0]
                provinceCenter = new THREE.Vector3(
                    newCenter[0],
                    newCenter[1],
                    this.depth / 2
                )
            } else {
                // 没有指定中心点时，使用外环坐标计算重心
                // 假设外环坐标为 feature.geometry.coordinates[0][0]
                if (!feature.geometry.coordinates.length) {
                    return
                }
                const ring = feature.geometry.coordinates[0][0]
                // 过滤出有效的点
                const validPoints = ring.filter((pt) => pt && pt.length >= 2)
                if (validPoints.length >= 3) {
                    // 转换所有点
                    const convertedPoints = validPoints.map((pt) => {
                        // 假设 customCoords.lngLatsToCoords 返回 [[x,y], ...]
                        return this.customCoords.lngLatsToCoords(pt)[0]
                    })
                    // 计算重心
                    const [Cx, Cy] = this.computeCentroid(convertedPoints)
                    provinceCenter = new THREE.Vector3(Cx, Cy, this.depth / 2)
                } else {
                    // 备选方案：使用 Box3 计算中心
                    const center = new THREE.Vector3()
                    new THREE.Box3().setFromObject(province).getCenter(center)
                    provinceCenter = center
                }
            }
            // 保存计算后的中心坐标到属性中
            province.properties.compCenter = provinceCenter

            // 标识该 Group 为地区块
            province.isProvince = true
            // 添加区域到场景中
            this.scene.add(province)
            this.updateMeshCache()
        })
        // 添加区域对应的文字标签

        // 初始化地图容器
        this.creatCss2DLayer()
        this.initCss2DGroup()
    }

    /**
     * 创建地图块 Mesh 对象
     * @param {THREE.Shape} shape - 地图块的二维形状
     * @returns {THREE.Mesh} 返回构建好的 Mesh 对象
     */
    createMesh(shape) {
        // 使用 ExtrudeGeometry 将二维形状挤出为三维体
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: this.depth,
            bevelEnabled: false,
        })
        // 使用 MeshStandardMaterial 创建材质
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff, // 地图块颜色
            transparent: false,
            opacity: 1,
            metalness: 0.1, // 金属度
            roughness: 0.5, // 粗糙度
            side: THREE.DoubleSide, // 双面可见
        })
        // 创建渐变材质，使用 ShaderMaterial 实现自定义渐变效果
        const vertexShader = `
      varying float vHeight;
      void main() {
        vHeight = position.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `
        const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      uniform float depth;
      varying float vHeight;
      void main() {
        float h = clamp((vHeight - offset) / depth, 0.0, 1.0);
        float t = smoothstep(0.0, 1.0, h);
        vec3 color = mix(bottomColor, topColor, pow(t, exponent));
        gl_FragColor = vec4(color, 1.0);
      }
    `
        const sideMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x3564b7) },
                bottomColor: { value: new THREE.Color(0x85aeef) },
                offset: { value: 0.0 },
                exponent: { value: 1.0 },
                depth: { value: this.depth },
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0,
        })

        // 创建 Mesh 对象，材质数组中第一个材质用于顶面，第二个材质用于侧面
        const mesh = new THREE.Mesh(geometry, [material, sideMaterial])
        mesh.position.z = 0 // 设置地图块在 z 轴的位置
        return mesh
    }
    /**
     * 更新地图块的材质样式
     * @param {Array} dataList 数据列表，每项至少包含 areaId 和 value 字段
     * @param {Array} ranges 范围列表，每项包含 min, max, color 属性
     * @param {string} defaultColor 默认颜色（例如 '#CCCCCC'）
     */
    updateMapStyles(
        dataList = [],
        ranges = [],
        defaultColor = 'rgba(42,88,172,1)'
    ) {
        // 遍历所有已创建的地图块
        this.cachedMeshes.forEach((mesh) => {
            // 从 mesh 的 properties 中获取 areaId
            const areaId = mesh.properties[this.config.idKey]

            // 在数据列表中查找对应区域的数据
            const dataItem = dataList.find((item) => item.areaId == areaId)

            // 根据数据中的 value 匹配范围，否则使用 defaultColor
            let fillColor
            if (dataItem) {
                const matchedRange = ranges.find(
                    (range) =>
                        dataItem.value >= range.min &&
                        dataItem.value <= range.max
                )
                fillColor = matchedRange ? matchedRange.color : defaultColor
            } else {
                fillColor = defaultColor
            }

            // 将计算出来的区域颜色存储到 mesh 上，便于后续使用
            mesh.userData.fillColor = fillColor

            // 计算 mesh 的包围盒及尺寸
            const box = new THREE.Box3().setFromObject(mesh)
            const size = new THREE.Vector3()
            box.getSize(size)

            // 定义分辨率缩放因子
            const scale = 1
            let computedWidth = Math.ceil(size.x * scale)
            let computedHeight = Math.ceil(size.y * scale)

            // 限制最大 canvas 尺寸
            const maxDimension = 2048
            const canvasWidth = Math.min(computedWidth, maxDimension)
            const canvasHeight = Math.min(computedHeight, maxDimension)
            if (canvasWidth <= 0 || canvasHeight <= 0) return

            // 创建 canvas，并设置绘图缓冲区尺寸
            const canvas = document.createElement('canvas')
            canvas.width = canvasWidth
            canvas.height = canvasHeight

            // 获取 2D 绘图上下文，并填充背景色
            let ctx = canvas.getContext('2d')
            ctx.fillStyle = fillColor
            ctx.fillRect(0, 0, canvasWidth, canvasHeight)

            // 创建 CanvasTexture，并应用到 mesh 顶面材质上
            const texture = new THREE.CanvasTexture(canvas)
            texture.needsUpdate = true
            if (mesh.material && Array.isArray(mesh.material)) {
                mesh.material[0].map = texture
                mesh.material[0].needsUpdate = true
            } else if (mesh.material) {
                mesh.material.map = texture
                mesh.material.needsUpdate = true
            }
            ctx = null
        })
    }

    initCss2DGroup() {
        this.css2DGroup = new THREE.Group()
        this.scene.add(this.css2DGroup)
    }

    /**
     * 创建地图的渲染图层，用来渲染额外的效果 文字，热力图 tooltip等
     */
    creatCss2DLayer() {
        // 创建 CSS2DRenderer 对象，作为渲染器来更新 DOM 元素位置
        this.CSS2DLayer = new CSS2DRenderer()
        // 设置渲染器尺寸与容器尺寸一致
        this.CSS2DLayer.setSize(this.innerWidth, this.innerHeight)
        // 注意：position 属性应设置为 'absolute' 而不是 'r'
        this.CSS2DLayer.domElement.style.position = 'absolute'
        this.CSS2DLayer.domElement.style.left = '0px'
        this.CSS2DLayer.domElement.style.top = '0px'
        this.CSS2DLayer.domElement.style.pointerEvents = 'none' // 禁止鼠标事件
        // 将 CSS2DRenderer 的 DOM 元素添加到地图容器中
        this.dom.appendChild(this.CSS2DLayer.domElement)
    }
    /**
     * 清空this.CSS2DLayer
     */
    clearCss2DLayer() {
        // 移除 group 内所有对象
        if (this.css2DGroup) {
            while (this.css2DGroup.children.length > 0) {
                this.css2DGroup.remove(this.css2DGroup.children[0])
            }
        }
        // 清空 CSS2DRenderer DOM 同上
        while (this.CSS2DLayer.domElement.firstChild) {
            this.CSS2DLayer.domElement.removeChild(
                this.CSS2DLayer.domElement.firstChild
            )
        }
        if (this.CSS2DLayer && this.CSS2DLayer.domElement.parentNode) {
            this.CSS2DLayer.domElement.parentNode.removeChild(
                this.CSS2DLayer.domElement
            )
        }
    }

    /**
     * 处理鼠标移动事件：更新鼠标悬浮的地图块和文字的高亮状态
     * @param {MouseEvent} event
     */

    handleMouseMove(event) {
        const obj = this.initRay(event)
        // 每次移动时先重置悬浮样式
        this.hoverReset()
        //创建tooltip

        this.createTooltip(obj)
        if (obj) {
            const currentMesh:any = obj.object 
            // 记录悬浮区域 id
            this.hoverId = currentMesh.parent.properties[this.config.idKey]
            // 设置选中样式
            this.setSelectArea(this.hoverId)
        } else {
            this.hoverId = ''
        }
    }
    /**
     * 处理鼠标移出事件，重置悬浮样式
     * @param {MouseEvent} event
     */
    handleMouseOut(event) {
        this.hoverReset()
        this.hoverId = ''
    }
    /**
     * 移除tooltip
     */
    removeTooltip() {
        if (this.tooltip) {
            this.scene.remove(this.tooltip)
            if (this.tooltip.element && this.tooltip.element.parentNode) {
                this.tooltip.element.parentNode.removeChild(
                    this.tooltip.element
                )
            }
            // 同时从 css2DGroup 中移除
            if (
                this.css2DGroup &&
                this.css2DGroup.children.includes(this.tooltip)
            ) {
                this.css2DGroup.remove(this.tooltip)
            }
            this.tooltip = null
        }
    }

    /**
     * 处理鼠标点击事件，调用外部传入的点击处理回调
     * @param {MouseEvent} event
     * @param {Function} handler 外部点击处理函数
     */
    handleMouseClick(event, handler) {
        const obj = this.initRay(event)
        if (obj) {
            const currentMesh:any = obj.object
            const properties = currentMesh.parent.properties
            handler && handler(properties)
        }
    }

    /**
     * 获取所有地区块对应的 Mesh 列表（过滤线和文字）
     * @returns {Array} 包含 Mesh 对象的数组
     */
    getAreaList(): any {
        return this.scene.children
            .filter((item: any) => item.isProvince)
            .map((item) => item.children)
            .flat()
            .filter((item) => item.type == 'Mesh')
    }

    /**
     * 获取所有 3D 文字标签列表
     * @returns {Array} 包含 CSS2DObject 的数组
     */
    getTextList() {
        return this.scene.children.filter((item:any) => item.isTextNode)
    }
    /**
     * 创建一个单色的 CanvasTexture
     * @param {string} color - 填充颜色，例如 '#ff0000'
     * @param {number} width - 纹理宽度（默认256）
     * @param {number} height - 纹理高度（默认256）
     * @returns {THREE.CanvasTexture} 返回一个 CanvasTexture 对象
     */
    createColorTexture(color, width = 256, height = 256) {
        // 创建 canvas 并设置分辨率
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        // 填充整个 canvas 为指定颜色
        ctx.fillStyle = color
        ctx.fillRect(0, 0, width, height)
        // 创建纹理
        const texture = new THREE.CanvasTexture(canvas)
        texture.needsUpdate = true
        return texture
    }

    /**
     * 设置选中区域的样式（高亮）
     * @param {string} curId 当前选中区域的 id
     */
    setSelectArea(curId) {
        this.getAreaList().forEach((item) => {
            let id = item.properties[this.config.idKey]
            if (id == curId) {
                // 保存原始颜色
                item.material[0].oldColor = item.material[0].map.clone()
                // 设置高亮颜色
                item.material[0].map = this.createColorTexture(
                    this.config.areaHoverColor
                )
                if (!item.originalScale) {
                    item.originalScale = item.scale.clone()
                }
                // 增加高度，比如放大 20%（也可以调整为其他比例）
                item.scale.z = item.originalScale.z * 1.4
            }
        })

        this.textLabels.forEach((item: any) => {
            let id = item.properties[this.config.idKey]

            if (id == curId) {
                // 保存原始文字颜色
                item.oldColor = item.element.style.color
                // 设置文字颜色为白色
                item.element.style.color = this.config.labelHoverColor
            }
        })
        this.textMeshGroup.forEach((item) => {
            let id = item.properties[this.config.idKey]

            if (id == curId) {
                item.oldPosition = item.position.clone()
                item.oldColor = item.material.color.clone()
                item.material.color.set(this.config.labelHoverColor)
                item.position.z += 10000
            }
        })
    }
    /**
     * 重置悬浮状态，恢复之前高亮的地图块和文字颜色
     */
    hoverReset() {
        const meshes = this.getAreaList() // 地图块 Mesh
        const textList = this.getTextList() // 文字标签
        if (this.hoverId) {
            // 恢复地图块颜色
            meshes.forEach((item) => {
                let id = item.properties[this.config.idKey]
                if (id == this.hoverId) {
                    item.material[0].map.copy(item.material[0].oldColor) // 恢复原来的颜色
                    // 如果保存了原始 scale，则恢复 scale
                    if (item.originalScale) {
                        item.scale.copy(item.originalScale)
                    }
                }
            })
            // 恢复文字颜色
            this.textLabels.forEach((item: any) => {
                let id = item.properties[this.config.idKey]
                if (id == this.hoverId) {
                    item.element.style.color = item.oldColor
                }
            })
            this.textMeshGroup.forEach((item) => {
                let id = item.properties[this.config.idKey]
                if (id == this.hoverId) {
                    item.position.copy(item.oldPosition)
                    item.material.color.copy(item.oldColor)
                }
            })
        }
        return { meshes, textList }
    }

    /**
     * 创建区域文字标签，使用 CSS2DRenderer 渲染 DOM 文本
     * CSS2DRenderer 会将所有通过 CSS2DObject 添加的 DOM 元素统一放在同一个容器中，渲染顺序通常按照它们在 scene 中添加的先后顺序决定。
     * 因此，在添加 CSS2DObject 时，确保它们的添加顺序与你希望它们在屏幕上渲染的顺序一致。 !!!重点
     */
    createText() {
        if (this.config.labelType === '2d') {
            const list = this.scene.children.filter(
                (item: any) => item.isProvince
            )
            list.forEach((item: any) => {
                const { name, compCenter } = item.properties
                let textDiv
                if (
                    this.config.createLabelElement &&
                    typeof this.config.createLabelElement === 'function'
                ) {
                    // 用户自定义创建标签，传入区域名称和中心位置，要求返回一个 HTMLElement
                    textDiv = this.config.createLabelElement(item.properties)
                } else {
                    // 默认创建 2d 标签
                    textDiv = document.createElement('div')
                    textDiv.style.color = '#A1C3DD'
                    textDiv.style.fontSize = '12px'
                    textDiv.style.position = 'absolute'
                    textDiv.textContent = name
                }
                const textLabel = new CSS2DObject(textDiv) as any
                textLabel.position.copy(compCenter)
                textLabel.position.z += Math.floor(this.depth / 2)
                textLabel.properties = item.properties
                textLabel.isTextNode = true
                this.css2DGroup.add(textLabel)
                this.textLabels.push(textLabel)
            })
            this.textLabels.forEach((label: any) => {
                this.CSS2DLayer.domElement.insertBefore(
                    label.element,
                    this.CSS2DLayer.domElement.firstChild
                )
            })
        }
        // 如果 labelType 为 '3d'，这里可以保持原有逻辑
        if (this.config.labelType == '3d') {
            const loader = new FontLoader()
            const font = loader.parse(fontData as any)
            this.cachedMeshes.map((item) => {
                const { name, compCenter } = item.properties
                const textGeometry = new TextGeometry(name, {
                    font: font,
                    size: 8000,
                    height: 1000,
                })
                const material = new THREE.MeshBasicMaterial({
                    color: new THREE.Color('#8FB1CE'),
                    depthTest: true,
                    depthWrite: true,
                })
                textGeometry.center()
                const textMesh: any = new THREE.Mesh(textGeometry, material)
                const [x, y] = item.properties.compCenter
                textMesh.rotation.x = Math.PI / 2
                textMesh.name = item.properties.name
                textMesh.scale.set(1.5, 1.5, 1.5)
                textMesh.position.set(x, y, this.depth * 1.4)
                textMesh.properties = item.properties
                textMesh.is3dTextNode = true
                this.textMeshGroup.push(textMesh)
                this.scene.add(textMesh)
            })
        }
    }

    /**
     * 创建区域轮廓线对象
     * @param {Array} vertices - 顶点数组，包含线的所有顶点
     * @returns {THREE.Line2} 返回构建好的轮廓线对象
     */
    createLine(vertices) {
        if (vertices.length === 0) {
            console.error('Vertices array is empty')
            return
        }
        // 使用 LineGeometry 创建线的几何体
        const lineGeometry = new LineGeometry()
        lineGeometry.setPositions(vertices)
        // 创建 LineMaterial，可设置线宽
        const lineMaterial = new LineMaterial({
            color: new THREE.Color(this.config.lineColor).getHex(),
            linewidth: this.config.lineWidth,
            resolution: new THREE.Vector2(this.innerWidth, this.innerHeight),
        })
        // 使用 Line2 构造可设置线宽的线对象
        const line = new Line2(lineGeometry, lineMaterial)
        line.computeLineDistances()
        return line
    }
    /**
     * 创建 tooltip，对外暴露一个配置接口，
     * 用户可以通过 this.config.createTooltipElement 自定义 tooltip DOM 的创建，
     * 参数可以传入区域名称、位置等信息，返回一个 DOM 元素。
     */
    createTooltip(obj) {
        if (!this.config.showTooltip) return
        if (obj) {
            // 计算 tooltip 新位置，避免累加偏移
            const newPos = obj.point.clone()
            newPos.z = this.depth * 3

            // 从当前 mesh 获取 tooltip 数据，比如名称
            const currentMesh = obj.object
            const { name } = currentMesh.parent.properties

            let tooltipElement
            // 如果用户通过配置传入了 createTooltipElement 回调，则调用它
            if (
                this.config.createTooltipElement &&
                typeof this.config.createTooltipElement === 'function'
            ) {
                // 用户可以自行设计 tooltip 元素，函数参数可自行定制
                tooltipElement = this.config.createTooltipElement(
                    name,
                    newPos,
                    obj
                )
            } else {
                // 默认创建 tooltip DOM
                tooltipElement = document.createElement('div')
                tooltipElement.style.background = 'rgba(255, 255, 255, 1)'
                tooltipElement.style.color = '#1E87FC'
                tooltipElement.style.padding = '20px 30px'
                tooltipElement.style.borderRadius = '4px'
                tooltipElement.style.fontSize = '12px'
                tooltipElement.style.zIndex = '1000'
                tooltipElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                tooltipElement.style.opacity = '1'
                tooltipElement.style.position = 'absolute'

                const labelSpan = document.createElement('span')
                labelSpan.style.color = '#000000'
                labelSpan.style.fontSize = '12px'
                labelSpan.textContent = '城市：'

                const valueSpan = document.createElement('span')
                valueSpan.style.marginLeft = '5px'
                valueSpan.style.color = '#1E87FC'
                valueSpan.style.fontSize = '12px'
                valueSpan.textContent = name

                tooltipElement.appendChild(labelSpan)
                tooltipElement.appendChild(valueSpan)
            }

            // 如果 tooltip 已经存在，则更新其位置和内容
            if (this.tooltip) {
                this.tooltip.position.copy(newPos)
                if (!this.config.createTooltipElement) {
                    const valueSpan =
                        this.tooltip.element.querySelector('span:nth-child(2)')
                    if (valueSpan) {
                        valueSpan.textContent = name
                    }
                }
            } else {
                // 创建新的 CSS2DObject 包裹 tooltipElement
                const tooltipLabel:any = new CSS2DObject(tooltipElement)
                tooltipLabel.position.copy(newPos)
                tooltipLabel.isTooltip = true
                // 添加到 css2DGroup 和 CSS2DRenderer 的 DOM 中（确保顺序在最上层）
                this.css2DGroup.add(tooltipLabel)
                this.CSS2DLayer.domElement.insertBefore(
                    tooltipLabel.element,
                    this.CSS2DLayer.domElement.firstChild
                )
                this.tooltip = tooltipLabel
            }
        } else {
            // 如果 obj 不存在，则移除 tooltip
            this.removeTooltip()
        }
    }
    // loadRoundMap 整个区域的地图
    loadAllMap(mapRoundJson) {
        const shape = new THREE.Shape()
        const coordinates = mapRoundJson.features[0].geometry.coordinates[0][0]
        const [x, y] = this.customCoords.lngLatsToCoords(coordinates[0])[0]
        shape.moveTo(x, y)
        coordinates.forEach((coord, index) => {
            if (index > 0) {
                const [x, y] = this.customCoords.lngLatsToCoords(coord)[0]
                shape.lineTo(x, y)
            }
        })
        shape.closePath()
        return shape
    }
    // 实现思路是，创建一个和地图一样大小的一个shape，然后将热力图渲染成一个贴图，然后贴到这个shape上面，shape放在地图表面
    renderHeatmaps(roundJson: any, heatData: HeatData, heatConfig: HeatConfig) {
        // 检查数据是否为空
        if (!heatData || !heatData.data || heatData.data.length === 0) {
            console.warn('No heatmap data provided.')
            return
        }
        // 1. 根据地图外圈数据生成全局形状（必须与地图形状一致）
        const mapShape = this.loadAllMap(roundJson)

        // 2. 使用 mapShape 生成 THREE.ExtrudeGeometry（替代平面几何），并设置挤出深度
        const extrudeSettings = {
            depth: 1, // 热力图层的厚度，可根据需求调整
            bevelEnabled: false,
        }
        const geometry = new THREE.ExtrudeGeometry(mapShape, extrudeSettings)

        // 3. 计算几何体的包围盒，作为热力图数据归一化参考
        const bbox = new THREE.Box3().setFromObject(new THREE.Mesh(geometry))
        const size = bbox.getSize(new THREE.Vector3())

        // 限制最大 canvas 尺寸
        const maxDimension = 1024
        const canvasWidth = Math.min(Math.ceil(size.x), maxDimension)
        const canvasHeight = Math.min(Math.ceil(size.y), maxDimension)
        if (canvasWidth <= 0 || canvasHeight <= 0) return

        // 4. 创建一个隐藏的 DOM 容器供 heatmap.js 渲染
        const container = document.createElement('div')
        container.style.width = canvasWidth + 'px'
        container.style.height = canvasHeight + 'px'
        container.style.display = 'none'
        document.body.appendChild(container)

        // 5. 计算 bbox 宽高，用于将热力图数据点归一化到容器内
        const widthBox = bbox.max.x - bbox.min.x
        const heightBox = bbox.max.y - bbox.min.y
        const pointsInMap = []
        heatData.data.forEach((pt) => {
            const coords = this.customCoords.lngLatsToCoords([
                [pt.lng, pt.lat],
            ])[0]
            const ptVec = new THREE.Vector3(coords[0], coords[1], bbox.max.z)
            if (bbox.containsPoint(ptVec)) {
                const relativeX =
                    ((ptVec.x - bbox.min.x) / widthBox) * canvasWidth
                const relativeY =
                    ((ptVec.y - bbox.min.y) / heightBox) * canvasHeight
                pointsInMap.push({
                    x: Math.floor(relativeX),
                    y: Math.floor(relativeY),
                    value: pt.value,
                })
            }
        })

        // 6. 使用 heatmap.js 创建热力图实例
        const h337 = (window as any).h337
        const heatmapInstance = h337.create({
            container: container,
            width: canvasWidth,
            height: canvasHeight,
            radius: heatConfig?.radius || 50,
            maxOpacity: heatConfig?.maxOpacity || 1,
            minOpacity: heatConfig?.minOpacity || 1,
            blur: heatConfig?.blur || 1,
            gradient: heatConfig?.gradient || {
                '.10': 'blue',
                '.30': 'cyan',
                '.40': 'lime',
                '.50': 'yellow',
                '.95': 'red',
            },
        })
        heatmapInstance.setData({
            max: heatData.max,
            data: pointsInMap,
        })

        // 7. 获取 heatmap.js 内部的 canvas，并创建 THREE.CanvasTexture
        const heatmapCanvas = heatmapInstance._renderer.canvas
        const texture = new THREE.CanvasTexture(heatmapCanvas)
        texture.needsUpdate = true

        // 8. 分别创建顶部和侧边材质
        const topMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1.0,
            side: THREE.FrontSide,
        })
        // 侧边设为全透明
        const sideMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
        })

        // 使用两个材质构建 Mesh，数组顺序须与几何体的组顺序一致
        const heatmapMesh = new THREE.Mesh(geometry, [
            topMaterial,
            sideMaterial,
        ])
        this.changeUv(heatmapMesh.geometry)
        // 9. 将热力图层放置在整体区域中心，z 坐标根据需求调整（这里用 this.depth*1.2）
        const center = bbox.getCenter(new THREE.Vector3())
        heatmapMesh.position.set(0, 0, this.depth * 1.05)
        heatmapMesh.renderOrder = 999 // 确保在地图上方渲染

        // 10. 添加到场景中
        this.scene.add(heatmapMesh)

        // 11. 添加辅助对象显示该层的边界（便于调试）
        // const helper = new THREE.BoxHelper(heatmapMesh, 0xff0000)
        // this.scene.add(helper)

        // 12. 清理临时容器
        document.body.removeChild(container)
    }

    changeUv(geometry) {
        const bbox = new THREE.Box3().setFromObject(new THREE.Mesh(geometry))
        const size = bbox.getSize(new THREE.Vector3())
        const uvs = geometry.attributes.uv
        const positions = geometry.attributes.position
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i)
            const y = positions.getY(i)
            const u = (x - bbox.min.x) / size.x
            const v = (y - bbox.min.y) / size.y

            uvs.setXY(i, u, v)
        }
        geometry.attributes.uv.needsUpdate = true
    }

    /**
     * 清除当前地图绘制的区域和文字标签
     */
    clear() {
        // 移除 CSS2DRenderer 的 DOM 元素
        if (this.CSS2DLayer) {
            this.CSS2DLayer.domElement.remove()
            this.CSS2DLayer = null
        }
        // 移除所有文字标签的 DOM 元素
        if (this.textLabels.length) {
            this.textLabels.forEach((label:any) => {
                label.element.remove()
            })
            this.textLabels = []
        }
        // 移除所有区域 Mesh 和文字标签
        if (this.textMeshGroup.length) {
            this.textMeshGroup.forEach((item) => {
                this.scene.remove(item)
            })
            this.textMeshGroup = []
        }
        // 将灯光重置到初始位置
        this.scene.children.forEach((item: any) => {
            if (item.isLight) {
                this.initLightPosition(item)
            }
        })
        // 移除场景中所有非灯光对象
        if (this.scene && this.scene.children) {
            let i = this.scene.children.length
            while (i--) {
                const item: any = this.scene.children[i]
                if (!item.isLight) {
                    this.scene.remove(item)
                }
            }
        }
    }

    /**
     * 持续不断地从各区域生成数据流动效果，流向济南市
     * @param {number} duration - 每个小球沿曲线运动的时长（秒），默认 3 秒
     * @param {number} heightOffset - 曲线中控制点在 z 轴上的偏移量（决定弧度），默认 10
     * @param {number} spawnInterval - 每个区域生成数据流小球的时间间隔（毫秒），默认 1000 毫秒
     */
    startContinuousDataFlowToJinan(
        duration = 8,
        heightOffset = this.depth * 4,
        spawnInterval = 2000
    ) {
        // 获取所有区域块（这里使用缓存的 mesh 列表）
        const areas = this.cachedMeshes
        // 查找济南市区域块（要求 properties.name 为 '济南市'）
        const jinanArea = areas.find(
            (area) => area.properties && area.properties.name === '济南市'
        )
        if (!jinanArea) {
            console.warn('未找到济南市的区域块')
            return
        }
        // 获取济南市的中心坐标（假设存储在 properties.compCenter 中）
        const jinanPos = jinanArea.properties.compCenter || new THREE.Vector3()
        const that = this

        // 用于存储各区域的定时器，便于后续停止动画
        this.dataFlowIntervals = []

        // 遍历除济南市外的其他区域
        areas.forEach((area) => {
            if (area.properties && area.properties.name !== '济南市') {
                // 每个区域设置一个定时器，持续生成数据流效果
                const timer = setInterval(() => {
                    // 取当前区域的中心坐标作为起点（要求预先计算并存入 properties.compCenter）
                    const startPos =
                        area.properties.compCenter || new THREE.Vector3()

                    // 计算控制点：起点与济南市中心的中点，并在 z 轴上增加偏移，形成弧线
                    const midPos = startPos
                        .clone()
                        .add(jinanPos)
                        .multiplyScalar(0.5)
                    midPos.z += heightOffset

                    // 构造二次贝塞尔曲线
                    const curve = new THREE.QuadraticBezierCurve3(
                        startPos,
                        midPos,
                        jinanPos
                    )

                    // 获取曲线上的采样点
                    const curvePoints = curve.getPoints(50)

                    // 使用 LineGeometry 生成几何体，这里需要把 THREE.Vector3 数组转换为扁平数组
                    const positions = []
                    curvePoints.forEach((point) => {
                        positions.push(point.x, point.y, point.z)
                    })
                    const curveGeometry = new LineGeometry()
                    curveGeometry.setPositions(positions)

                    // 使用 LineMaterial 创建材质，设置金属感颜色和半透明属性
                    const curveMaterial = new LineMaterial({
                        color: 0x00ff00, // 金属感的基础颜色
                        linewidth: 2, // 线宽（单位为像素，需要根据设备分辨率设置）
                        transparent: true,
                        opacity: 1,
                        // 如果需要进一步实现模糊效果，可以自定义 Shader 或配合后处理
                    })

                    // 必须设置分辨率，用于计算线宽（这里以窗口尺寸为例）
                    curveMaterial.resolution.set(
                        window.innerWidth,
                        window.innerHeight
                    )

                    // 使用 Line2 对象创建线条（Line2 支持自定义线宽）
                    const flowLine = new Line2(curveGeometry, curveMaterial)
                    flowLine.computeLineDistances() // 计算线段距离用于虚线等效果（如果需要）

                    this.scene.add(flowLine)

                    // 创建一个小球作为数据流载体
                    const sphereGeo = new THREE.SphereGeometry(
                        that.depth * 0.15,
                        16,
                        16
                    )

                    // 定义顶点着色器：传递顶点坐标给片元着色器
                    const sphereVertexShader = `
                    varying vec3 vPosition;
                    void main() {
                      vPosition = position;
                      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                  `

                    // 定义片元着色器：根据 x 坐标实现从左到右的颜色插值
                    const sphereFragmentShader = `
                    uniform vec3 leftColor;
                    uniform vec3 rightColor;
                    uniform float sphereRadius;
                    varying vec3 vPosition;
                    void main() {
                      // 计算 x 方向的插值系数：将坐标范围 [-sphereRadius, sphereRadius] 映射到 [0, 1]
                      float t = clamp((vPosition.x + sphereRadius) / (2.0 * sphereRadius), 0.0, 1.0);
                      vec3 color = mix(leftColor, rightColor, t);
                      gl_FragColor = vec4(color, 1.0);
                    }
                  `

                    // 创建 ShaderMaterial 材质，并设置 uniform 参数
                    const sphereMat = new THREE.ShaderMaterial({
                        uniforms: {
                            leftColor: { value: new THREE.Color(0xff5700) }, // 左侧颜色：红色
                            rightColor: { value: new THREE.Color(0xffef00) }, // 右侧颜色：白色
                            sphereRadius: { value: that.depth * 0.2 }, // 半径值，用于映射 x 坐标
                        },
                        vertexShader: sphereVertexShader,
                        fragmentShader: sphereFragmentShader,
                        transparent: true,
                    })

                    // 创建小球 Mesh 并设置初始位置
                    const dataSphere = new THREE.Mesh(sphereGeo, sphereMat)
                    dataSphere.position.copy(startPos)
                    dataSphere.scale.set(1, 0.2, 1)
                    that.scene.add(dataSphere)

                    // 利用 gsap 动画让小球沿曲线运动
                    gsap.to(
                        { t: 0 },
                        {
                            t: 1,
                            duration: duration,
                            ease: 'power2.inOut',
                            onUpdate: function () {
                                const point = curve.getPoint(
                                    this.targets()[0].t
                                )
                                dataSphere.position.copy(point)
                            },
                            onComplete: function () {
                                // 动画完成后移除小球和曲线路径
                                that.scene.remove(dataSphere)
                                that.scene.remove(flowLine)
                            },
                        }
                    )
                }, spawnInterval)
                // 保存定时器，便于后续清理
                that.dataFlowIntervals.push(timer)
            }
        })
    }

    /**
     * 停止持续的数据流动效果，清除所有定时器
     */
    stopContinuousDataFlow() {
        if (this.dataFlowIntervals && this.dataFlowIntervals.length) {
            this.dataFlowIntervals.forEach((timer) => clearInterval(timer))
            this.dataFlowIntervals = []
        }
    }

    /**
     * resize 方法：更新 DOM 容器尺寸和相机参数
     */
    resize() {
        this.setDomRect() // 更新容器尺寸信息
        if (this.renderer) {
            this.renderer.setSize(this.innerWidth, this.innerHeight)
        }
        if (this.camera) {
            this.camera.aspect = this.innerWidth / this.innerHeight
            this.camera.updateProjectionMatrix()
        }
    }

    /**
     * 销毁方法，清理所有资源，释放内存
     */
    destroy() {
        this.clear()
        // 清理场景中的所有对象
        if (this.scene) {
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0])
            }
            this.scene = null
        }
        // 清理渲染器
        if (this.renderer) {
            this.renderer.dispose()
            this.renderer.forceContextLoss()
            this.renderer = null
        }
        // 清理相机
        if (this.camera) {
            this.camera = null
        }
        // 清理其他资源
        this.raycaster = null
        this.mouse = null
        this.hoveredMesh = null
        this.hoveredText = null

        // 强制释放 WebGL 上下文
        if (this.dom && this.dom.getContext) {
            const gl = this.dom.getContext('webgl')
            if (gl) {
                gl.getExtension('WEBGL_lose_context')?.loseContext()
            }
        }
    }

    /**
     * 计算多边形面积，采用经典公式
     * @param {Array} points - 数组，每个元素为 [x, y]
     * @returns {number} 返回多边形面积
     */
    computePolygonArea(points) {
        let area = 0
        const n = points.length
        for (let i = 0; i < n; i++) {
            const [x1, y1] = points[i]
            const [x2, y2] = points[(i + 1) % n]
            area += x1 * y2 - x2 * y1
        }
        return Math.abs(area / 2)
    }

    /**
     * 根据过滤规则过滤 feature 数据
     * 过滤掉无效坐标和面积过小的区域
     * @param {Array} features - GeoJSON features 数组
     * @param {number} minArea - 最小面积阈值
     * @returns {Object} 返回过滤后的数据对象，格式为 { features: [...] }
     */
    filterFeatures(features, minArea = 0.1) {
        const filteredFeatures = features
            .map((feature) => {
                let coordinates = feature.geometry.coordinates
                let newCoordinates = []
                for (let j = 0; j < coordinates.length; j++) {
                    let coordinatesItem = coordinates[j]
                    let newCoordinatesItem = []
                    for (let k = 0; k < coordinatesItem.length; k++) {
                        // 过滤掉无效坐标点
                        let validRing = coordinatesItem[k].filter((item) => {
                            return item && item.length && item[0] && item[1]
                        })
                        // 至少需要三个点才能计算面积
                        if (validRing.length >= 3) {
                            const area = this.computePolygonArea(validRing)
                            if (area >= minArea) {
                                newCoordinatesItem.push(validRing)
                            }
                        }
                    }
                    if (newCoordinatesItem.length > 0) {
                        newCoordinates.push(newCoordinatesItem)
                    }
                }
                feature.geometry.coordinates = newCoordinates
                return feature
            })
            .filter((feature) => feature.geometry.coordinates.length > 0)

        return { features: filteredFeatures }
    }
    /**
     * 计算多边形的重心（质心）
     * @param {Array} points - 数组，每个元素为 [x, y]
     * @returns {Array} 返回 [Cx, Cy]
     */
    computeCentroid(points) {
        let area = 0,
            Cx = 0,
            Cy = 0
        const n = points.length
        for (let i = 0; i < n; i++) {
            const [x1, y1] = points[i]
            const [x2, y2] = points[(i + 1) % n]
            const cross = x1 * y2 - x2 * y1
            area += cross
            Cx += (x1 + x2) * cross
            Cy += (y1 + y2) * cross
        }
        area *= 0.5
        Cx /= 6 * area
        Cy /= 6 * area
        return [Cx, Cy]
    }
}
