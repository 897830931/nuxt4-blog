import * as THREE from 'three'
import {
    Line2,
    LineMaterial,
    LineGeometry,
    CSS2DRenderer,
    CSS2DObject,
    FontLoader,
    TextGeometry,
} from 'three-stdlib'
import fontData from '@/assets/Json/three/font.json'

export default class ThreeMap {
    constructor({ dom, gl, zoom = 9, customCoords, config, renderedFun }) {
        // 合并传入的配置和默认配置
        this.config = Object.assign(
            {
                idKey: 'id',
                cpKey: 'cp',
                showTooltip: true, // 是否显示提示信息
                labelType: '2d', // 区域标题展示类型 2d 3d
                labelHoverColor: '#ffff00', // 区域标题悬浮颜色
                areaHoverColor: '#ff0000', // 区域悬浮颜色
                createTooltipElement: null, // 创建提示信息元素
                lineColor: '#87cefa', //线颜色
                lineWidth: 1, //线宽
                areaColor: '#ffffff', //区域颜色
            },
            config
        )

        this.dom = dom // 地图容器 DOM 元素
        this.domRect = null // 存储 DOM 元素的尺寸信息
        this.tooltip = null // 用于显示提示信息的 DOM 元素
        this.innerWidth = 0 // DOM 宽度
        this.innerHeight = 0 // DOM 高度
        this.heatmapInstance = null // 热力图实例
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

    setDomRect() {
        this.domRect = this.dom.getBoundingClientRect()
        this.innerWidth = this.domRect.width
        this.innerHeight = this.domRect.height
    }

    animation() {
        requestAnimationFrame(() => this.animation())
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera)
        }
        if (this.CSS2DLayer) {
            this.CSS2DLayer.render(this.scene, this.camera)
            this.CSS2DLayer.setSize(this.innerWidth, this.innerHeight)
        }
        if (this.renderedFun) {
            this.renderedFun()
        }
    }

    init(gl) {
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.innerWidth / this.innerHeight,
            100,
            1 << 30
        )
        this.renderer = new THREE.WebGLRenderer({
            context: gl,
        })
        this.renderer.autoClear = false
        this.scene = new THREE.Scene()
        this.initLight()
        this.creatCss2DLayer()
        this.initCss2DGroup()
    }

    initLight() {
        var aLight = new THREE.AmbientLight(0xffffff, 0.3)
        var dLight = new THREE.DirectionalLight(0xffffff, 1)
        this.initLightPosition(dLight)
        this.scene.add(dLight)
        this.scene.add(aLight)
    }

    initLightPosition(dLight) {
        dLight.position.set(1000, -100, 900)
    }

    setDepth(zoom) {
        const baseHeight = 20000 // 基础高度（zoom 8 时的高度）
        const targetZoom = 8 // 目标缩放级别
        const zoomRange = 1.5 // zoom 6 到 8 的差值
        const depth = baseHeight * Math.pow(2, (targetZoom - zoom) / zoomRange)
        this.depth = depth
    }

    render() {
        const lineObject = this.scene.children
            .filter((item) => item.type === 'Object3D' && item.children.length)
            .map((item) => item.children[1])
            .filter((item) => item)
        lineObject.forEach((line) => {
            if (line.material && line.material.resolution) {
                line.material.resolution.set(this.innerWidth, this.innerHeight)
            }
        })

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

        this.renderer.render(this.scene, this.camera)

        if (this.CSS2DLayer) {
            this.CSS2DLayer.render(this.scene, this.camera)
            this.CSS2DLayer.setSize(this.innerWidth, this.innerHeight)
        }

        this.renderer.resetState()
    }

    initRay(event) {
        const rect = this.domRect
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
        this.raycaster.setFromCamera(this.mouse, this.camera)
        const intersects = this.raycaster.intersectObjects(this.cachedMeshes)
        return intersects && intersects.length > 0 ? intersects[0] : null
    }

    updateMeshCache() {
        this.cachedMeshes = this.scene.children
            .filter((item) => item.isProvince)
            .map((item) => item.children)
            .flat()
            .filter((item) => item.type === 'Mesh')
    }

    initArea(features) {
        // 计算区域的面机，过滤掉面机小于指定阈值的区域
        let mapJson = this.filterFeatures(features, 0.005)
        features.forEach((feature) => {
            const province = new THREE.Group()
            const coordinates = feature.geometry.coordinates
            coordinates.forEach((coordinate) => {
                coordinate.forEach((item) => {
                    const coords = this.customCoords.lngLatsToCoords(item)
                    const vertices = []
                    const shape = new THREE.Shape()
                    coords.forEach((coord, index) => {
                        if (index === 0) {
                            shape.moveTo(coord[0], coord[1])
                        } else {
                            shape.lineTo(coord[0], coord[1])
                            vertices.push(coord[0], coord[1], this.depth + 1)
                        }
                    })
                    const mesh = this.createMesh(shape)
                    mesh.properties = feature.properties
                    const line = this.createLine(vertices)
                    province.add(mesh, line)
                })
            })
            province.properties = feature.properties
            let provinceCenter = null
            if (provinceCenter && provinceCenter.length) {
                let newCenter =
                    this.customCoords.lngLatsToCoords(provinceCenter)[0]
                provinceCenter = new THREE.Vector3(
                    newCenter[0],
                    newCenter[1],
                    this.depth / 2
                )
            } else {
                console.log(feature.geometry.coordinates)
                if (!feature.geometry.coordinates.length) {
                    return
                }
                const ring = feature.geometry.coordinates[0][0]
                const validPoints = ring.filter((pt) => pt && pt.length >= 2)
                if (validPoints.length >= 3) {
                    const convertedPoints = validPoints.map((pt) => {
                        return this.customCoords.lngLatsToCoords(pt)[0]
                    })
                    const [Cx, Cy] = this.computeCentroid(convertedPoints)
                    provinceCenter = new THREE.Vector3(Cx, Cy, this.depth / 2)
                } else {
                    const center = new THREE.Vector3()
                    new THREE.Box3().setFromObject(province).getCenter(center)
                    provinceCenter = center
                }
            }
            province.properties.compCenter = provinceCenter
            province.isProvince = true
            this.scene.add(province)
            this.updateMeshCache()
        })
        this.creatCss2DLayer()
        this.initCss2DGroup()
    }

    createMesh(shape) {
        const geometry = new THREE.ExtrudeGeometry(shape, {
            color: '#0099FF',
            depth: this.depth,
            bevelEnabled: false,
        })
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            metalness: 0.1,
            roughness: 0.5,
            side: THREE.DoubleSide,
        })
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
        const mesh = new THREE.Mesh(geometry, [material, sideMaterial])
        mesh.position.z = 0
        return mesh
    }

    updateMapStyles(dataList, ranges, defaultColor = this.config.areaColor) {
        this.cachedMeshes.forEach((mesh) => {
            const areaId = mesh.properties[this.config.idKey]
            const dataItem = dataList.find((item) => item.areaId == areaId)
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

            const box = new THREE.Box3().setFromObject(mesh)
            const size = new THREE.Vector3()
            box.getSize(size)
            const scale = 1
            let computedWidth = Math.ceil(size.x * scale)
            let computedHeight = Math.ceil(size.y * scale)
            const maxDimension = 2048
            const canvasWidth = Math.min(computedWidth, maxDimension)
            const canvasHeight = Math.min(computedHeight, maxDimension)
            if (canvasWidth <= 0 || canvasHeight <= 0) return
            const canvas = document.createElement('canvas')
            canvas.width = canvasWidth
            canvas.height = canvasHeight
            let ctx = canvas.getContext('2d')
            ctx.fillStyle = fillColor
            ctx.fillRect(0, 0, canvasWidth, canvasHeight)
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

    creatCss2DLayer() {
        this.CSS2DLayer = new CSS2DRenderer()
        this.CSS2DLayer.setSize(this.innerWidth, this.innerHeight)
        this.CSS2DLayer.domElement.style.position = 'absolute'
        this.CSS2DLayer.domElement.style.left = '0px'
        this.CSS2DLayer.domElement.style.top = '0px'
        this.CSS2DLayer.domElement.style.pointerEvents = 'none'
        this.dom.appendChild(this.CSS2DLayer.domElement)
    }

    clearCss2DLayer() {
        if (this.css2DGroup) {
            while (this.css2DGroup.children.length > 0) {
                this.css2DGroup.remove(this.css2DGroup.children[0])
            }
        }
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

    handleMouseMove(event) {
        const obj = this.initRay(event)
        this.hoverReset()
        this.createTooltip(obj)
        if (obj) {
            const currentMesh = obj.object
            this.hoverId = currentMesh.properties[this.config.idKey]
            this.setSelectArea(this.hoverId)
        } else {
            this.hoverId = ''
        }
    }

    handleMouseOut(event) {
        this.hoverReset()
        this.hoverId = ''
    }

    removeTooltip() {
        if (this.tooltip) {
            this.scene.remove(this.tooltip)
            if (this.tooltip.element && this.tooltip.element.parentNode) {
                this.tooltip.element.parentNode.removeChild(
                    this.tooltip.element
                )
            }
            if (
                this.css2DGroup &&
                this.css2DGroup.children.includes(this.tooltip)
            ) {
                this.css2DGroup.remove(this.tooltip)
            }
            this.tooltip = null
        }
    }

    handleMouseClick(event, handler) {
        const obj = this.initRay(event)
        if (obj) {
            const currentMesh = obj.object
            const properties = currentMesh.parent.properties
            handler && handler(properties)
        }
    }

    getAreaList() {
        return this.scene.children
            .filter((item) => item.isProvince)
            .map((item) => item.children)
            .flat()
            .filter((item) => item.type == 'Mesh')
    }

    getTextList() {
        return this.scene.children.filter((item) => item.isTextNode)
    }

    createColorTexture(color, width = 256, height = 256) {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = color
        ctx.fillRect(0, 0, width, height)
        const texture = new THREE.CanvasTexture(canvas)
        texture.needsUpdate = true
        return texture
    }

    setSelectArea(curId) {
        this.getAreaList().forEach((item) => {
            let id = item.properties[this.config.idKey]
            if (id == curId) {
                item.material[0].oldColor = item.material[0].map.clone()
                item.material[0].map = this.createColorTexture(
                    this.config.areaHoverColor
                )
                if (!item.originalScale) {
                    item.originalScale = item.scale.clone()
                }
                item.scale.z = item.originalScale.z * 1.4
            }
        })
        this.textLabels.forEach((item) => {
            let id = item.properties[this.config.idKey]
            if (id == curId) {
                item.oldColor = item.element.style.color
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

    hoverReset() {
        const meshes = this.getAreaList()
        const textList = this.getTextList()
        if (this.hoverId) {
            meshes.forEach((item) => {
                let id = item.properties[this.config.idKey]
                if (id == this.hoverId) {
                    item.material[0].map.copy(item.material[0].oldColor)
                    if (item.originalScale) {
                        item.scale.copy(item.originalScale)
                    }
                }
            })
            this.textLabels.forEach((item) => {
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

    createText() {
        if (this.config.labelType === '2d') {
            const list = this.scene.children.filter((item) => item.isProvince)
            list.forEach((item) => {
                const { name, compCenter } = item.properties
                let textDiv
                if (
                    this.config.createLabelElement &&
                    typeof this.config.createLabelElement === 'function'
                ) {
                    // 用户自定义创建标签，传入区域名称和中心位置，要求返回一个 HTMLElement
                    textDiv = this.config.createLabelElement(name, compCenter)
                } else {
                    // 默认创建 2d 标签
                    textDiv = document.createElement('div')
                    textDiv.style.color = '#A1C3DD'
                    textDiv.style.fontSize = '12px'
                    textDiv.style.position = 'absolute'
                    textDiv.textContent = name
                }
                const textLabel = new CSS2DObject(textDiv)
                textLabel.position.copy(compCenter)
                textLabel.position.z += Math.floor(this.depth / 2)
                textLabel.properties = item.properties
                textLabel.isTextNode = true
                this.css2DGroup.add(textLabel)
                this.textLabels.push(textLabel)
            })
            this.textLabels.forEach((label) => {
                this.CSS2DLayer.domElement.insertBefore(
                    label.element,
                    this.CSS2DLayer.domElement.firstChild
                )
            })
        }
        // 如果 labelType 为 '3d'，这里可以保持原有逻辑
        if (this.config.labelType == '3d') {
            const loader = new FontLoader()
            const font = loader.parse(fontData)
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

    createLine(vertices) {
        if (vertices.length === 0) {
            console.error('Vertices array is empty')
            return
        }
        const lineGeometry = new LineGeometry()
        lineGeometry.setPositions(vertices)
        const lineMaterial = new LineMaterial({
            color: new THREE.Color(this.config.lineColor).getHex(),
            linewidth: this.config.lineWidth,
            resolution: new THREE.Vector2(this.innerWidth, this.innerHeight),
        })
        const line = new Line2(lineGeometry, lineMaterial)
        line.computeLineDistances()
        return line
    }

    createTooltip(obj) {
        if (!this.config.showTooltip) return
        if (obj) {
            const newPos = obj.point.clone()
            newPos.z = this.depth * 2
            const currentMesh = obj.object
            const { name } = currentMesh.parent.properties
            let tooltipElement
            if (
                this.config.createTooltipElement &&
                typeof this.config.createTooltipElement === 'function'
            ) {
                tooltipElement = this.config.createTooltipElement(
                    name,
                    newPos,
                    obj
                )
            } else {
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
                const tooltipLabel = new CSS2DObject(tooltipElement)
                tooltipLabel.position.copy(newPos)
                tooltipLabel.isTooltip = true
                this.css2DGroup.add(tooltipLabel)
                this.CSS2DLayer.domElement.insertBefore(
                    tooltipLabel.element,
                    this.CSS2DLayer.domElement.firstChild
                )
                this.tooltip = tooltipLabel
            }
        } else {
            this.removeTooltip()
        }
    }

    clear() {
        if (this.CSS2DLayer) {
            this.CSS2DLayer.domElement.remove()
            this.CSS2DLayer = null
        }
        if (this.textLabels.length) {
            this.textLabels.forEach((label) => {
                label.element.remove()
            })
            this.textLabels = []
        }
        if (this.textMeshGroup.length) {
            this.textMeshGroup.forEach((item) => {
                this.scene.remove(item)
            })
            this.textMeshGroup = []
        }
        this.scene.children.forEach((item) => {
            if (item.isLight) {
                this.initLightPosition(item)
            }
        })
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

    resize() {
        this.setDomRect()
        if (this.renderer) {
            this.renderer.setSize(this.innerWidth, this.innerHeight)
        }
        if (this.camera) {
            this.camera.aspect = this.innerWidth / this.innerHeight
            this.camera.updateProjectionMatrix()
        }
    }

    destroy() {
        this.clear()
        if (this.scene) {
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0])
            }
            this.scene = null
        }
        if (this.renderer) {
            this.renderer.dispose()
            this.renderer.forceContextLoss()
            this.renderer = null
        }
        if (this.camera) {
            this.camera = null
        }
        this.raycaster = null
        this.mouse = null
        this.hoveredMesh = null
        this.hoveredText = null
        if (this.dom && this.dom.getContext) {
            const gl = this.dom.getContext('webgl')
            if (gl) {
                gl.getExtension('WEBGL_lose_context') &&
                    gl.getExtension('WEBGL_lose_context').loseContext()
            }
        }
    }

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

    filterFeatures(features, minArea = 0.1) {
        const filteredFeatures = features
            .map((feature) => {
                let coordinates = feature.geometry.coordinates
                let newCoordinates = []
                for (let j = 0; j < coordinates.length; j++) {
                    let coordinatesItem = coordinates[j]
                    let newCoordinatesItem = []
                    for (let k = 0; k < coordinatesItem.length; k++) {
                        let validRing = coordinatesItem[k].filter((item) => {
                            return item && item.length && item[0] && item[1]
                        })
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
