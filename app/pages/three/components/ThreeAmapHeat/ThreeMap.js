import * as THREE from 'three'

import { markRaw } from 'vue'
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
import fontData from '@/assets/Json/three/font.json'
function debounce(fn, delay) {
    let timer = null
    return function (...args) {
        clearTimeout(timer)
        timer = setTimeout(() => {
            fn.apply(this, args)
        }, delay)
    }
}

export default class ThreeMap {
    /**
     * 构造函数
     * @param {Object} param0 参数对象，包含以下属性：
     *    - dom: 地图容器 DOM 元素
     *    - gl: AMap 提供的 WebGL 上下文
     *    - zoom: 地图缩放级别（默认 9）
     *    - customCoords: 自定义坐标转换工具，用于将经纬度转换为 Three.js 坐标
     *    - config: 配置对象，包含 idKey（地图块 id 字段）和 cpKey（中心点字段）等
     *    - renderedFun: 每次渲染时执行的回调函数
     *    - showTooltip: 是否显示提示信息
     */
    constructor({
        dom,
        gl,
        zoom = 9,
        customCoords,
        config,
        renderedFun,
        showTooltip = true,
    }) {
        // 合并传入的配置和默认配置
        this.config = {
            idKey: 'id',
            cpKey: 'cp',
            ...config,
        }

        this.dom = dom // 地图容器 DOM 元素
        this.domRect = null // 存储 DOM 元素的尺寸信息
        this.tooltip = null // 用于显示提示信息的 DOM 元素
        this.innerWidth = 0 // DOM 宽度
        this.innerHeight = 0 // DOM 高度
        this.heatmapInstance = null // 热力图实例
        this.setDomRect() // 初始化 DOM 尺寸

        // 初始化属性（稍后赋值）
        this.renderedFun = renderedFun || mull
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
        // 控制属性
        this.showTooltip = showTooltip
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
            60,
            this.innerWidth / this.innerHeight,
            100,
            1 << 30
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
        // 初始化地图容器
        this.creatCss2DLayer()
        this.initCss2DGroup()
    }

    /**
     * 添加环境光和方向光到场景中
     */
    initLight() {
        var aLight = new THREE.AmbientLight(0xffffff, 0.3) // 环境光，柔和照明
        var dLight = new THREE.DirectionalLight(0xffffff, 1) // 方向光，产生阴影效果
        this.initLightPosition(dLight) // 设置方向光的位置
        this.scene.add(dLight)
        this.scene.add(aLight)
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
        const baseHeight = 20000 // 基础高度（zoom 8 时的高度）
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
            .forEach((line) => {
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
            this.customCoords.getCameraParams()
        this.camera.near = near
        this.camera.far = far
        this.camera.fov = fov
        this.camera.position.set(...position)
        this.camera.up.set(...up)
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
            .filter((item) => item.isProvince)
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
        let mapJson = this.filterFeatures(features)
        features.forEach((feature) => {
            const province = new THREE.Group() // 每个区域使用一个 Group 进行管理
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
                    const mesh = this.createMesh(shape)
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
            let provinceCenter = []
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
    }

    /**
     * 创建地图块 Mesh 对象
     * @param {THREE.Shape} shape - 地图块的二维形状
     * @returns {THREE.Mesh} 返回构建好的 Mesh 对象
     */
    createMesh(shape) {
        // 使用 ExtrudeGeometry 将二维形状挤出为三维体
        const geometry = new THREE.ExtrudeGeometry(shape, {
            color: '#0099FF',
            depth: this.depth,
            bevelEnabled: false,
        })
        // 使用 MeshStandardMaterial 创建材质
        const material = new THREE.MeshStandardMaterial({
            color: 0x2a58ac, // 地图块颜色
            transparent: true,
            opacity: 1,
            metalness: 0.1,
            roughness: 0.5,
            side: THREE.DoubleSide,
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
        console.log(this.CSS2DLayer.domElement)
        console.log('清空CSS2DLayer')
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
            const currentMesh = obj.object
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
    createHeatmapOverlay(heatData) {
        if (!heatData) return
        // 计算整个场景的中心作为热力图位置
        const bbox = new THREE.Box3().setFromObject(this.scene)
        const heatmapPosition = bbox.getCenter(new THREE.Vector3())
        // 1. 创建一个 canvas 并设置尺寸
        const canvas = markRaw(document.createElement('div'))
        // 根据你的需求设置画布尺寸，确保与地图覆盖区域匹配
        canvas.style.width = this.innerWidth + 'px'
        canvas.style.height = this.innerHeight + 'px'
        canvas.style.pointerEvents = 'none'
        canvas.style.zIndex = '-1'

        // 3. 创建 CSS2DObject，传入 canvas 作为 DOM 元素
        const heatmapLabel = new CSS2DObject(canvas)
        // 4. 设置热力图位置，使用传入的 heatmapPosition（THREE.Vector3），必要时再偏移
        heatmapLabel.position.copy(heatmapPosition)
        heatmapLabel.position.z = this.depth / 2 // 确保在地图之上

        // 如果需要微调，可以例如：
        // heatmapLabel.position.x += 20;
        // heatmapLabel.position.y += 20;

        // 5. 添加到场景中，CSS2DRenderer 会自动更新该对象的位置
        this.css2DGroup.add(heatmapLabel)
        // 2. 绘制热力图
        if (this.heatmapInstance) {
            this.heatmapInstance = null
        } else {
            this.heatmapInstance = h337.create({
                container: canvas,
                width: this.innerWidth,
                height: this.innerHeight,
                radius: 20, // 热点半径，单位为像素
                maxOpacity: 0.6, // 最大不透明度
                minOpacity: 0, // 最小不透明度
                blur: 0.75, // 模糊程度
                // 自定义渐变色
                gradient: {
                    '.4': 'blue',
                    '.6': 'cyan',
                    '.7': 'lime',
                    '.8': 'yellow',
                    '.95': 'red',
                },
            })
        }
        canvas.style.position = 'absolute !important'

        this.heatmapInstance && this.updateHeatmapData(heatData)
        // 如果你希望后续更新热力图，只需要重新绘制 canvas 并设置 texture.needsUpdate = true
        return heatmapLabel
    }
    updateHeatmapData(heatPoints) {
        const newData = heatPoints.data.map((pt) => {
            const threePos = this.customCoords.lngLatsToCoords([
                [pt.lng, pt.lat],
            ])[0]
            const vec = new THREE.Vector3(threePos[0], threePos[1], this.depth)
            vec.project(this.camera)

            return {
                x: Math.floor(((vec.x + 1) / 2) * innerWidth),
                y: Math.floor(((-vec.y + 1) / 2) * this.innerHeight),
                value: pt.value,
            }
        })
        console.log(newData, '触发渲染热力图')
        this.heatmapInstance.setData({
            max: 100,
            min: 0,
            data: newData,
        })
    }

    /**
     * 处理鼠标点击事件，调用外部传入的点击处理回调
     * @param {MouseEvent} event
     * @param {Function} handler 外部点击处理函数
     */
    handleMouseClick(event, handler) {
        const obj = this.initRay(event)
        if (obj) {
            const currentMesh = obj.object
            const properties = currentMesh.parent.properties
            handler && handler(properties)
        }
    }

    /**
     * 获取所有地区块对应的 Mesh 列表（过滤线和文字）
     * @returns {Array} 包含 Mesh 对象的数组
     */
    getAreaList() {
        return this.scene.children
            .filter((item) => item.isProvince)
            .map((item) => item.children)
            .flat()
            .filter((item) => item.type == 'Mesh')
    }

    /**
     * 获取所有 3D 文字标签列表
     * @returns {Array} 包含 CSS2DObject 的数组
     */
    getTextList() {
        return this.scene.children.filter((item) => item.isTextNode)
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
                item.material[0].oldColor = item.material[0].color.clone()
                // 设置高亮颜色
                item.material[0].color.set('#2ABDBB')
                if (!item.originalScale) {
                    item.originalScale = item.scale.clone()
                }
                // 增加高度，比如放大 20%（也可以调整为其他比例）
                item.scale.z = item.originalScale.z * 1.4
            }
        })
        this.getTextList().forEach((item) => {
            let id = item.properties[this.config.idKey]
            if (id == this.hoverId) {
                // 保存原始文字颜色
                item.oldColor = item.element.style.color
                // 设置文字颜色为白色
                item.element.style.color = '#fff'
            }
        })
        this.textMeshGroup.forEach((item) => {
            let id = item.properties[this.config.idKey]

            if (id == this.hoverId) {
                item.oldPosition = item.position.clone()
                item.oldColor = item.material.color.clone()
                item.material.color.set('#2C6BDD')
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
                    item.material[0].color.copy(item.material[0].oldColor) // 恢复原来的颜色
                    // 如果保存了原始 scale，则恢复 scale
                    if (item.originalScale) {
                        item.scale.copy(item.originalScale)
                    }
                }
            })
            // 恢复文字颜色
            textList.forEach((item) => {
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
        const textType = '3dtext'
        if (textType == '2dtext') {
            // 筛选场景中所有标记为地区块的对象
            const list = this.scene.children.filter((item) => item.isProvince)
            list.forEach((item) => {
                const { name, compCenter } = item.properties
                // 创建 DOM 元素作为文字标签
                const textDiv = document.createElement('div')
                textDiv.style.color = '#A1C3DD'
                textDiv.style.fontSize = '12px'
                textDiv.style.position = 'absolute'
                textDiv.textContent = name
                // 创建 CSS2DObject 包裹 DOM 元素
                const textLabel = new CSS2DObject(textDiv)
                // 设置文字标签位置为区域中心，并略微调整高度
                textLabel.position.copy(compCenter)
                textLabel.position.z += Math.floor(this.depth / 2)
                // 将区域属性挂载到文字标签上，方便后续处理
                textLabel.properties = item.properties
                // 标识该对象为文字标签
                textLabel.isTextNode = true
                // 添加到场景中
                this.css2DGroup.add(textLabel)
                this.textLabels.push(textLabel)
            })
            this.textLabels.forEach((label) => {
                this.CSS2DLayer.domElement.appendChild(label.element)
            })
        }
        if (textType == '3dtext') {
            const loader = new FontLoader()
            const font = loader.parse(fontData)
            this.cachedMeshes.map((item) => {
                const { name, compCenter } = item.properties
                const textGeometry = new TextGeometry(name, {
                    font,
                    size: 8000,
                    height: 1000,
                })
                const material = new THREE.MeshBasicMaterial({
                    color: new THREE.Color('#8FB1CE'),
                    depthTest: true,
                    depthWrite: true,
                })
                textGeometry.center()
                const textMesh = new THREE.Mesh(textGeometry, material)
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
            color: 0x2b64cc,
            linewidth: 1,
            resolution: new THREE.Vector2(this.innerWidth, this.innerHeight),
        })
        // 使用 Line2 构造可设置线宽的线对象
        const line = new Line2(lineGeometry, lineMaterial)
        line.computeLineDistances()
        return line
    }
    /**
     * 创建tooltip
     * @param {*} obj 使用 CSS2DRenderer 渲染tooltip
     */
    createTooltip(obj) {
        if (!this.showTooltip) return
        if (obj) {
            // 计算新的 tooltip 位置，避免累加偏移
            const offsetX = obj.point.x * 0.1 // 固定偏移量，例如10像素
            const offsetY = -70000 // 固定偏移量，例如10像素
            const newPos = obj.point.clone()
            newPos.x += offsetX
            newPos.y += offsetY
            newPos.z = this.depth * 4

            // 获取当前 mesh 的内容（如 name）
            const currentMesh = obj.object
            const { name } = currentMesh.parent.properties

            // 如果 tooltip 已存在，则直接更新位置和内容
            if (this.tooltip) {
                this.tooltip.position.copy(newPos)
                // 更新 tooltip 内部的文本内容
                const tooltipDiv = this.tooltip.element
                // 假设第2个 span 存储城市名称
                const valueSpan = tooltipDiv.querySelector('span:nth-child(2)')
                if (valueSpan) {
                    valueSpan.textContent = name
                }
            } else {
                // 不存在时，创建新的 tooltip
                const tooltipDiv = document.createElement('div')
                tooltipDiv.style.background = 'rgba(255, 255, 255, 1)'
                tooltipDiv.style.color = '#1E87FC'
                tooltipDiv.style.padding = '20px 30px'
                tooltipDiv.style.borderRadius = '4px'
                tooltipDiv.style.fontSize = '12px'
                tooltipDiv.style.zIndex = '1000'
                tooltipDiv.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                tooltipDiv.style.opacity = '1'
                tooltipDiv.style.position = 'absolute'

                const labelSpan = document.createElement('span')
                labelSpan.style.color = '#000000'
                labelSpan.style.fontSize = '12px'
                labelSpan.textContent = '城市：'

                const valueSpan = document.createElement('span')
                valueSpan.style.marginLeft = '5px'
                valueSpan.style.color = '#1E87FC'
                valueSpan.style.fontSize = '12px'
                valueSpan.textContent = name

                tooltipDiv.appendChild(labelSpan)
                tooltipDiv.appendChild(valueSpan)

                const tooltipLabel = new CSS2DObject(tooltipDiv)
                tooltipLabel.position.copy(newPos)
                tooltipLabel.isTooltip = true
                this.css2DGroup.add(tooltipLabel)
                // 确保 tooltip 被添加到 CSS2DRenderer 的 DOM 元素中 谁在css2dLayer 最上面 就显示在最上面
                this.CSS2DLayer.domElement.insertBefore(
                    tooltipLabel.element,
                    this.CSS2DLayer.domElement.firstChild
                )
                this.tooltip = tooltipLabel
            }
        } else {
            // 可选：当 obj 不存在时隐藏或移除 tooltip
            this.removeTooltip()
        }
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
            this.textLabels.forEach((label) => {
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
        this.scene.children.forEach((item) => {
            if (item.isLight) {
                this.initLightPosition(item)
            }
        })
        // 移除场景中所有非灯光对象
        if (this.scene && this.scene.children) {
            let i = this.scene.children.length
            while (i--) {
                const item = this.scene.children[i]
                if (!item.isLight) {
                    this.scene.remove(item)
                }
            }
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
