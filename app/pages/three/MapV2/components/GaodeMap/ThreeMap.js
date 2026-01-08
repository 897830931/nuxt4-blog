import * as THREE from 'three'
import gsap from 'gsap';
import {
    Line2,
    LineMaterial,
    LineGeometry,
    CSS2DRenderer,
    CSS2DObject,
    FontLoader,
    TextGeometry,

} from 'three-stdlib'
// 高德地图和three共享gl无法使用后处理
import fontData from './font.json'
import h337 from 'heatmap.js'

export default class ThreeMap {
    constructor({ dom, gl, zoom = 9, customCoords, config, renderedFun }) {
        // 合并传入的配置和默认配置
        this.config = Object.assign(
            {
                idKey: 'id',
                cpKey: 'cp',
                hoverHeight: false, // 是否显式高度过渡
                showTooltip: true, // 是否显示提示信息
                showLabel: true, // 是否显示区域标题
                labelType: '2d', // 区域标题展示类型 2d 3d
                labelHoverColor: '#ffff00', // 区域标题悬浮颜色
                areaHoverColor: '#ff0000', // 区域悬浮颜色
                createTooltipElement: null, // 创建提示信息元素 返回一个dom元素 参数是区块数据
                createLabelElement: null, // 创建区域标题元素 返回一个dom元素 参数是区块数据
                lineColor: '#87cefa', //线颜色
                lineWidth: 1, //线宽
                areaColor: 'rgb(124, 205, 230, 0.8)', //区域颜色
                tooltipHeight:3.5
            },
            config
        )
        this._tweens = [];//所有动画
        this.flightGroup = new THREE.Group()//飞线组
        this.BarsGroup = new THREE.Group()//柱状图组
        this._barLabel2D = [];
        this.dom = dom // 地图容器 DOM 元素
        this.domRect = null // 存储 DOM 元素的尺寸信息
        this.tooltip = null // 用于显示提示信息的 DOM 元素
        this.innerWidth = 0 // DOM 宽度
        this.innerHeight = 0 // DOM 高度
        this._heatmapMesh = null // 热力图实例
        this.setDomRect() // 初始化 DOM 尺寸

        // 初始化属性（稍后赋值）
        this.renderedFun = renderedFun || null //地图渲染器
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
        this.depth = 0.2
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
      requestAnimationFrame(() => this.animation());
      // 1）先画高德地图
      this.renderedFun?.();
      if(this.renderer.clearDepth){
        this.renderer.clearDepth();
      }
      this.renderer.render(this.scene, this.camera); 
     
      // 4）叠加 2D 层
      this.CSS2DLayer?.setSize(this.innerWidth, this.innerHeight);
      this.CSS2DLayer?.render(this.scene, this.camera);
     
    }

    init(gl) {
        // 创建透视相机
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.innerWidth / this.innerHeight,
            100,
            1 << 30
        )
        this.renderer = new THREE.WebGLRenderer({
            context: gl,
            // alpha: true,             // 关键：启用透明背景
            // preserveDrawingBuffer: true,
        })
        this.renderer.autoClear = false
        this.renderer.toneMapping = THREE.LinearToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.physicallyCorrectLights = false; // 开启物理正确光照
        this.scene = new THREE.Scene()
        this.initLight()
        this.creatCss2DLayer()
        this.initCss2DGroup()
    }
    // 初始化相机位置
    initCamera() {
        this.camera.position.set(0, 0, 0)
    }
    initLight() {
        var aLight = new THREE.AmbientLight(0xffffff, 0.3)
        var dLight = new THREE.DirectionalLight(0xffffff, 1)
        // 开启阴影，如果有物理发光就会显示在这个阴影上
        dLight.castShadow = false;
        this.initLightPosition(dLight)
        this.scene.add(dLight)
        this.scene.add(aLight)
    }
 

    // 初始化相机位置
    initLightPosition(dLight) {
        dLight.position.set(1000, 100, 900)
    }
    // 根据缩放级别设置地图块的深度
    setDepth(zoom) {
        const baseHeight = 30000 // 基础高度（zoom 8 时的高度）
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
        // 高德地图相机同步到3d场景中
        var { near, far, fov, up, lookAt, position } =this.customCoords.getCameraParams()
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
        // 获取地图容器 DOM 元素的尺寸信息
        const rect = this.domRect;
        // 将鼠标的 x 坐标转换为标准化设备坐标（NDC），范围为 -1 到 1
        // 先计算鼠标相对于地图容器左边界的偏移量，再除以容器宽度，乘以 2 后减 1
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        // 将鼠标的 y 坐标转换为标准化设备坐标（NDC），范围为 -1 到 1
        // 先计算鼠标相对于地图容器上边界的偏移量，再除以容器高度，乘以 2 后取反加 1
        // 因为在 NDC 中，y 轴正方向朝上，而鼠标坐标 y 轴正方向朝下
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        // 根据鼠标的标准化设备坐标和相机，设置射线发射器的起始位置和方向
        this.raycaster.setFromCamera(this.mouse, this.camera);
        // 执行射线检测，检测射线与 cachedMeshes 数组中的网格对象的相交情况
        // 返回一个包含所有相交结果的数组，按距离相机由近到远排序
        const intersects = this.raycaster.intersectObjects(this.cachedMeshes);
        // 如果存在相交结果，返回第一个相交结果（距离相机最近的对象）
        // 否则返回 null
        return intersects && intersects.length > 0 ? intersects[0] : null;
    }
    // 更新缓存的网格对象
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
    // 创建地图块
    // createMesh 完整实现：浅蓝色渐变
    createMesh(shape) {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: this.depth,
        bevelEnabled: false,
       
      });

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.config.areaColor),
        transparent: true,
        opacity: 1.0,
        metalness: 0.1,
        roughness: 0.1,
        side: THREE.FrontSide,
        toneMapped : false
      });

      const sideMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color1: { value: new THREE.Color('#71c1dd') }, // 最深(1)
          color2: { value: new THREE.Color('#3c78a7') }, // 中蓝(2)
          color3: { value: new THREE.Color('#155472') }, // 浅蓝(3)
          depth:  { value: this.depth },
          offset: { value: 1 },
          alpha:  { value: 0.8 },
        },
        vertexShader: `
          varying float vHeight;
          void main() {
            vHeight = position.z;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color1; // 1 步骤深
          uniform vec3 color2; // 2 步骤中
          uniform vec3 color3; // 3 步骤浅
          uniform float depth;
          uniform float offset;
          uniform float alpha;
          varying float vHeight;

          void main() {
            float h_raw = mod((vHeight - offset) / depth, 1.0);
            vec3 col;
            float w = 0.1;
            float g = 0.02;
            // 第一组 321 区间 [0,0.3]
            if (h_raw < w + g) {
              col = mix(color3, color2, smoothstep(0.0, w+g, h_raw));
            } else if (h_raw < 3.0 * w + g) {
              col = mix(color2, color1, smoothstep(w, 2.0*w+g, h_raw));
            } else if (h_raw < 5.0 * w + g) {
              col = color1;
            }
            // 第二组 321 区间 [0.3,0.6]
            else if (h_raw < 3.0*w + g + w + g) {
              float t = h_raw - (3.0*w + g);
              col = mix(color3, color2, smoothstep(0.0, w+g, t));
            } else if (h_raw < 3.0*w + g + 2.0*w+g) {
              float t = h_raw - (3.0*w + g + w + g);
              col = mix(color2, color1, smoothstep(0.0, w+g, t));
            } else if (h_raw < 3.0*(w+g)) {
              col = color1;
            }
            // 其余区间, 重复前 0.6 区
            else {
              float hh = mod(h_raw, 3.0*(w+g));
              if (hh < w+g) {
                col = mix(color3, color2, smoothstep(0.0, w+g, hh));
              } else if (hh < 2.0*w+g) {
                col = mix(color2, color1, smoothstep(w, 2.0*w+g, hh));
              } else {
                col = color1;
              }
            }
            gl_FragColor = vec4(col, alpha);
          }
        `,
        side: THREE.DoubleSide,
        transparent: true,
        opacity:0,
        blending: THREE.NormalBlending,
        depthWrite:  false
      });
      const mats = [];
      for (let i = 0; i < geometry.groups.length; i++) {
        // 我们约定：只有组 1（侧面）用 sideMaterial，其他都用 material
        mats.push(i === 1 ? sideMaterial : material);
      }
      const mesh = new THREE.Mesh(geometry, mats);
      mesh.position.z = 0;

      let tween = gsap.to(sideMaterial.uniforms.offset, {
        value: this.depth,
        duration: 6,
        ease: 'linear',
        repeat: -1,
        onUpdate: () => sideMaterial.needsUpdate = true
      });
      this._tweens.push(tween)

      return mesh;
    }  
    // 根据传入的数据，更新地图的样式
    updateMapStyles(dataList, ranges, defaultColor = this.config.areaColor) { 
        if(dataList.length==0){
          this.cachedMeshes.forEach((mesh) => {
            mesh.material[0].oldColor = this.createColorTexture(this.config.areaColor);
            
          })
        }
        this.cachedMeshes.forEach((mesh) => {
            const areaId = mesh.properties[this.config.idKey]
            const dataItem = dataList.find((item) => item.areaId == areaId)
            let fillColor
            if (dataItem) {
                // 优先匹配非 Infinity 的范围，采用 [min, max) 区间判断
                let matchedRange = ranges.find((range) => {
                    return range.max !== Infinity && dataItem.value >= range.min && dataItem.value < range.max
                })
                // 如果没有匹配到，再尝试匹配 max 为 Infinity 的范围
                if (!matchedRange) {
                    matchedRange = ranges.find((range) => {
                        return range.max === Infinity && dataItem.value >= range.min
                    })
                }
                fillColor = matchedRange ? matchedRange.color : defaultColor
            } else {
                fillColor = defaultColor
            }
            // 将计算出来的区域颜色存储到 mesh 上，便于后续使用
            mesh.userData.fillColor = fillColor
            const box = new THREE.Box3().setFromObject(mesh)
            const size = new THREE.Vector3()
            box.getSize(size)
            const scale = 1
            let computedWidth = Math.ceil(size.x * scale)
            let computedHeight = Math.ceil(size.y * scale)
            const maxDimension = 1024
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
                mesh.material[0].oldColor = texture;
            } else if (mesh.material) {
                mesh.material.map = [texture]
                mesh.material.needsUpdate = true
                mesh.material[0].oldColor = texture;
            }
            ctx = null
        })
    }
   /**
     * 只渲染柱状、环、波纹、发光晕和 2D 标签
     * @param {Array} dataList      // [{ areaId, value, … }]
     * @param {Array} rangeColors   // [{min, max, color}, …]
     */
    createBarsAndRings(dataList, rangeColors = []) {
      // 清理旧的
      this.BarsGroup?.clear();
      this.BarsGroup = new THREE.Group();
      this._barLabel2D.forEach(label => this.css2DGroup.remove(label));
      this._barLabel2D.length = 0;
      this._tweens.length = 0;
      if(dataList.length==0)return;
      // 找到最大值
      const maxItem = dataList.reduce((a, b) => a.value > b.value ? a : b, dataList[0]);
      const maxProv = this.scene.children.find(g =>
        g.isProvince && g.properties[this.config.idKey] == maxItem.areaId
      );
      if (!maxProv) return console.warn('找不到最大值省份', maxItem.areaId);

      // 遍历每个数据项，渲染柱子、环、波纹、发光和标签
      dataList.forEach(item => {
        if (item.value <= 0) return;

        // 当前省份组 & 中心
        const prov = this.scene.children.find(g =>
          g.isProvince && g.properties[this.config.idKey] == item.areaId
        );
        if (!prov) return;
        const center = prov.properties.compCenter.clone();

        // —— 根据 rangeColors 映射颜色 —— 
        let colorStr = '#81ffff', opacity = 1;;
        const range = rangeColors.find(r => item.value >= r.min && item.value < r.max)
                    || rangeColors.find(r => r.max === Infinity && item.value >= r.min);
        if (range) {
          colorStr = range.color;
          const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
          if (m) {
            colorStr = `rgb(${m[1]},${m[2]},${m[3]})`;
            if (m[4] != null) opacity = parseFloat(m[4]);
          }
        }
        const barColor = new THREE.Color(colorStr);

        // —— 渐变贴图（下→上 同色）——
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = 1; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, size, 0, 0);
        grad.addColorStop(0, colorStr);
        grad.addColorStop(1, colorStr);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 1, size);
        const gradientTexture = new THREE.CanvasTexture(canvas);
        gradientTexture.wrapS = THREE.ClampToEdgeWrapping;
        gradientTexture.wrapT = THREE.ClampToEdgeWrapping;

        // —— 1. 柱体 —— 
        const barW = this.depth * 0.2;
        const barH = (item.value / maxItem.value) * this.depth * 5;
        const regionTopZ = this.depth;
        const barCenterZ = regionTopZ + barH / 2 + 0.01;
        const barGeo = new THREE.CylinderGeometry(barW/2, barW/2, barH, 16);
        barGeo.rotateX(Math.PI/2);
        const barMat = new THREE.MeshStandardMaterial({
          map:               gradientTexture,
          color:             barColor,
          emissive:          barColor,
          emissiveIntensity: 1,
          transparent:       true,
          opacity:           0.8,
          side:              THREE.FrontSide,
        });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(center.x, center.y, barCenterZ);
        bar.properties = { areaId: item.areaId };
        this.BarsGroup.add(bar);

        // —— 2. 发光晕 —— 
        const glowGeo = barGeo.clone().scale(1.4, 1.2, 1);
        const glowMat = new THREE.ShaderMaterial({
          uniforms: {
            viewVector: { value: this.camera.position.clone() },
            c:          { value: 0.5 },
            p:          { value: 2.0 },
            glowColor:  { value: barColor },
          },
          vertexShader: `
            uniform vec3 viewVector; uniform float c; uniform float p;
            varying float intensity;
            void main(){
              vec3 vN = normalize(normalMatrix * normal);
              vec3 vL = normalize(normalMatrix*viewVector
                - (modelViewMatrix*vec4(position,1.0)).xyz);
              intensity = pow(c - dot(vN, vL), p);
              gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
            }`,
          fragmentShader: `
            uniform vec3 glowColor; varying float intensity;
            void main(){ gl_FragColor = vec4(glowColor*intensity, intensity); }`,
          side:        THREE.DoubleSide,
          blending:    THREE.AdditiveBlending,
          transparent: true,
          depthWrite:  false,
        });
        bar.add(new THREE.Mesh(glowGeo, glowMat));

        // —— 3. 环形效果 —— 
        const barBottomZ = regionTopZ + 1000;
        const outerInnerR = barW * 1.6;
        const outerOuterR = barW * 1.8;
        const innerInnerR = barW * 1;
        const innerOuterR = barW * 1.4;
        const radialSeg   = 64;
        const gapAngle    = Math.PI / 30;
        const segCount    = 3;
        const segAngle    = (2 * Math.PI - segCount * gapAngle) / segCount;

        const ringGroup = new THREE.Group();
        ringGroup.position.set(center.x, center.y, barBottomZ);
        this.BarsGroup.add(ringGroup);

        // 3.1 外环（三段）
        for (let i = 0; i < segCount; i++) {
          const thetaStart = i * (segAngle + gapAngle);
          const geo = new THREE.RingGeometry(
            outerOuterR, outerInnerR, radialSeg, 1, thetaStart, segAngle
          );
          const mat = new THREE.MeshBasicMaterial({
            color:       0xc2ffff,
            transparent: true,
            opacity:     0.6,
            side:        THREE.DoubleSide,
            depthWrite:  false,
          });
          const mesh = new THREE.Mesh(geo, mat);
         
          ringGroup.add(mesh);
        }

        // 3.2 内环（三段）
        const innerGroup = new THREE.Group();
        ringGroup.add(innerGroup);
        for (let i = 0; i < segCount; i++) {
          const thetaStart = i * (segAngle + gapAngle);
          const geo = new THREE.RingGeometry(
            innerInnerR, innerOuterR, radialSeg, 1, thetaStart, segAngle
          );
          const mat = new THREE.MeshBasicMaterial({
            color:       0x7cf9f5,
            transparent: true,
            opacity:     0.8,
            side:        THREE.DoubleSide,
            depthWrite:  false,
          });
          const mesh = new THREE.Mesh(geo, mat);;
       
          innerGroup.add(mesh);
        }
        // 内环自转
        const tween = gsap.to(innerGroup.rotation, {
          z:        Math.PI * 2,
          duration: 2,
          ease:     'linear',
          repeat:   -1,
        });
        this._tweens.push(tween);

        // 3.3 最大值波纹
        if (item.areaId === maxItem.areaId) {
          const rippleInnerR = outerOuterR + barW * 0.2;
          const rippleOuterR = rippleInnerR + barW * 0.2;
          const rippleGeo = new THREE.RingGeometry(rippleInnerR, rippleOuterR, radialSeg);
          const rippleMat = new THREE.MeshBasicMaterial({
            color:       0xffffff,
            transparent: true,
            opacity:     0.5,
            side:        THREE.DoubleSide,
            depthWrite:  false,
          });
          const ripple = new THREE.Mesh(rippleGeo, rippleMat);
          ringGroup.add(ripple);
          gsap.timeline({ repeat: -1 })
            .fromTo(ripple.scale,
              { x: 1, y: 1, z: 1 },
              { x: 1.5, y: 1.5, z: 1.5, duration: 0.6, ease: 'sine.out' }
            )
            .fromTo(rippleMat,
              { opacity: 0.5 },
              { opacity: 0, duration: 0.6, ease: 'sine.out',
                onRepeat() { rippleMat.opacity = 0.5; } },
              0
            );
        }

        // —— 4. 2D 标签 —— 
        const div = document.createElement('div');
        div.innerHTML = `
          <strong class="bar-label-value">${item.value}</strong>
          <span class="bar-label-name">${prov.properties.name}</span>
        `;
        div.style.pointerEvents = 'none';
        div.className = 'bar-label';
        const label2d = new CSS2DObject(div);
        label2d.position.set(center.x, center.y, barCenterZ + barH/2 +this.depth/2);
        this.css2DGroup.add(label2d);
        this._barLabel2D.push(label2d);
      });

      this.scene.add(this.BarsGroup);
    }
    /**
     * 只渲染飞线（底色管道 + 多段“亮片”）
     * @param {Array} dataList  // [{ areaId, value, … }]
     */
    createFlightLines(dataList) {
      // 清理旧的
      this.flightGroup?.clear();
      this._tweens.length = 0;

      if(dataList.length==0)return;
      // 找到最大值
      const maxItem = dataList.reduce((a, b) => a.value > b.value ? a : b, dataList[0]);
      const maxProv = this.scene.children.find(g =>
        g.isProvince && g.properties[this.config.idKey] == maxItem.areaId
      );
      if (!maxProv) return console.warn('找不到最大值省份', maxItem.areaId);

      // Shader 源
      const tubeVS = `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`;
      const tubeFS = `
        uniform float time;
        uniform float segments;
        uniform float length;
        uniform vec3 color;
        varying vec2 vUv;
        void main(){
          float p = fract((vUv.x + time) * segments);
          float d = abs(p - 0.5);
          float alpha = smoothstep(length, 0.0, d);
          gl_FragColor = vec4(color, alpha);
        }`;

      dataList.forEach(item => {
        if (item.value <= 0 || item.areaId === maxItem.areaId) return;

        const prov = this.scene.children.find(g =>
          g.isProvince && g.properties[this.config.idKey] == item.areaId
        );
        if (!prov) return;
        const center = prov.properties.compCenter.clone();

        // 计算飞线三点
        const start = new THREE.Vector3(
          maxProv.properties.compCenter.x,
          maxProv.properties.compCenter.y,
          this.depth
        );
        const end = new THREE.Vector3(center.x, center.y, this.depth);
        const mid = start.clone().lerp(end, 0.5);
        mid.z += this.depth * 2;

        // 1. 底色半透明管道
        const curve = new THREE.CatmullRomCurve3([start, mid, end]);
        const tubeGeo = new THREE.TubeGeometry(curve, 64, this.depth * 0.06, 16, false);
        const baseMat = new THREE.MeshBasicMaterial({
          color:       new THREE.Color(0xc2ffff),
          transparent: true,
          opacity:     0.4,
          depthWrite:  false,
        });
        this.flightGroup.add(new THREE.Mesh(tubeGeo, baseMat));

        // 2. 多段“亮片”飞线
        const highMat = new THREE.ShaderMaterial({
          uniforms: {
            time:     { value: 0 },
            segments: { value: 2 },
            length:   { value: 0.1 },
            color:    { value: new THREE.Color(0x7cf9f5) },
          },
          vertexShader:   tubeVS,
          fragmentShader: tubeFS,
          transparent:    true,
          depthWrite:     false,
        });
        const highLine = new THREE.Mesh(tubeGeo.clone(), highMat);
        this.flightGroup.add(highLine);
        const tween = gsap.to(highMat.uniforms.time, {
          value:    1,
          duration: 3,
          ease:     'linear',
          repeat:   -1,
        });
        this._tweens.push(tween);
      });

      this.scene.add(this.flightGroup);
    }



  
  // 场景中添加css2D元素的group
    initCss2DGroup() {
        this.css2DGroup = new THREE.Group()
        this.scene.add(this.css2DGroup)
    }
    // 创建CSS2DLayer,用展示文字，就是在地图的上方添加一层layer层，文字会渲染上去
    creatCss2DLayer() {
        this.CSS2DLayer = new CSS2DRenderer()
        this.CSS2DLayer.setSize(this.innerWidth, this.innerHeight)
        this.CSS2DLayer.domElement.style.position = 'absolute'
        this.CSS2DLayer.domElement.style.left = '0px'
        this.CSS2DLayer.domElement.style.top = '0px'
        this.CSS2DLayer.domElement.style.pointerEvents = 'none'
        this.dom.appendChild(this.CSS2DLayer.domElement)
    }
    // 清空CSS2DLayer
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
        
        console.log('清空CSS2DLayer')
    }
    // 鼠标移动事件
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
    // 清空hover状态移出后
    handleMouseOut(event) {
        this.hoverReset()
        this.hoverId = ''
    }
    // 移出提示框，只能有一个存在
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
    // 点击事件
    handleMouseClick(event, handler) {
        const obj = this.initRay(event)
        if (obj) {
            const currentMesh = obj.object
            const properties = currentMesh.parent.properties
            handler && handler(properties)
        }
    }
    // 获取渲染区域列表
    getAreaList() {
        return this.scene.children
            .filter((item) => item.isProvince)
            .map((item) => item.children)
            .flat()
            .filter((item) => item.type == 'Mesh')
    }
    // 获取渲染文本列表
    getTextList() {
        return this.scene.children.filter((item) => item.isTextNode)
    }
    // 创建颜色纹理，用于填充选中的块，可修改为自定义渲染，
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
// 选中区域
// 鼠标悬浮时调用
setSelectArea(curId) {
  
  // 区域高度与纹理处理
  this.getAreaList().forEach(item => {
    const id = item.properties[this.config.idKey];
    if (item._prevHover) {
      item.material.forEach(mat => {
        if (mat.emissive) mat.emissiveIntensity = 0;
        mat.needsUpdate = true;
      });
      item._prevHover = false;
    }
    if (id == curId) {
      // 记录原始 scale
      if (!item.originalScale) item.originalScale = item.scale.clone();
      // 停止已有高度动画
      item._hoverTween?.kill();
      // 高度过渡
      if(this.config.hoverHeight){
        item._hoverTween = gsap.to(item.scale, {
          z: item.originalScale.z * 1.2,
          duration: 0.5,
          ease: 'power2.out'
        });
      }
      this._tweens.push(item._hoverTween)
       // 发光高亮
       item.material.forEach(mat => {
        if (mat.emissive) {
          mat.emissive = new THREE.Color(this.config.areaHoverColor);
          mat.emissiveIntensity = 0.7;
          mat.needsUpdate = true;
        } else {
          mat.opacity = 0.8;
          mat.transparent = true;
          mat.needsUpdate = true;
        }
      });
      item._prevHover = true;
      // 保留原有颜色切换
      item.material[0].oldColor = item.material[0].map?.clone();
      item.material[0].map = this.createColorTexture(this.config.areaHoverColor);
      item.material[0].needsUpdate = true;
    }

  });

  // 2D 标签颜色
  this.textLabels.forEach(item => {
    const id = item.properties[this.config.idKey];
    if (id == curId) {
      item.oldColor = item.element.style.color;
      item.element.style.color = this.config.labelHoverColor;
    }
  });

  // 3D 文本颜色与位置动画
  this.textMeshGroup.forEach(item => {
    const id = item.properties[this.config.idKey];
    if (id == curId) {
      // 初次记录原始位置与颜色
      if (!item.originalPosition) item.originalPosition = item.position.clone();
      if (!item.oldColor) item.oldColor = item.material.color.clone();
      // 停止已有动画
      item._posTween?.kill();
      item._colorTween?.kill();
      // 获取对应 mesh
      const mesh = this.getAreaList().find(m => m.properties[this.config.idKey] == curId);
      // 计算 offset（基于 depth）
      const offset = item.originalPosition.z - (mesh.originalScale.z * this.depth);
      // 目标 z 为 mesh 新的高度（depth * scale.z）+ offset
      const targetZ = mesh.scale.z * (this.depth+1)+ offset;
      item._posTween = gsap.to(item.position, {
        z: targetZ,
        duration: 0.5,
        ease: 'power2.out'
      });
      // 颜色过渡
      const labelColor = new THREE.Color(this.config.labelHoverColor);
      item._colorTween = gsap.to(item.material.color, {
        r: labelColor.r,
        g: labelColor.g,
        b: labelColor.b,
        duration: 0.5,
        ease: 'power1.out',
        onUpdate: () => { item.material.needsUpdate = true; }
      });
      this._tweens.push(item._posTween)
      this._tweens.push(item._colorTween)
    }
  });

}

  // 鼠标移出时调用，恢复原始状态
  hoverReset() {
    // 恢复区域高度和纹理
    this.getAreaList().forEach(item => {
      item._hoverTween?.kill();
      const baseZ = item.originalScale ? item.originalScale.z : 1;
      item._hoverTween = gsap.to(item.scale, {
        z: baseZ,
        duration: 0.5,
        ease: 'power2.out'
      });
      // 取消发光
      if (item._prevHover) {
        item.material.forEach(mat => {
          if (mat.emissive) {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          } else {
            mat.opacity = 1.0;
          }
          mat.needsUpdate = true;
        });
        item._prevHover = false;
      }
      if (item.material[0].oldColor) {
        item.material[0].map = item.material[0].oldColor;
        item.material[0].needsUpdate = true;
      }
    });

    // 恢复 2D 标签颜色
    this.textLabels.forEach(item => {
      const id = item.properties[this.config.idKey];
      if (id == this.hoverId && item.oldColor) {
        item.element.style.color = item.oldColor;
      }
    });

    // 恢复 3D 文本位置与颜色
    this.textMeshGroup.forEach(item => {
      const id = item.properties[this.config.idKey];
      if (id != this.hoverId) {
        item._posTween?.kill();
        item._colorTween?.kill();
        if (item.originalPosition) item.position.copy(item.originalPosition);
        if (item.oldColor) item.material.color.copy(item.oldColor);
      }
    });
  }
  // 创建label
    createText() {
      if(!this.config.showLabel){
        return
      }
      if (this.config.labelType === '2d') {
        const list = this.scene.children.filter(item => item.isProvince);
        list.forEach(item => {
          const { name, compCenter } = item.properties;
          let textDiv;
          if (this.config.createLabelElement && typeof this.config.createLabelElement === 'function') {
            // 用户自定义创建标签，传入区域名称和中心位置，要求返回一个 HTMLElement
            textDiv = this.config.createLabelElement(item.properties);
          } else {
            // 默认创建 2d 标签
            textDiv = document.createElement('div');
            textDiv.style.color = '#A1C3DD';
            textDiv.style.fontSize = '12px';
            textDiv.style.position = 'absolute';
            textDiv.textContent = name;
          }
          const textLabel = new CSS2DObject(textDiv);
          textLabel.position.copy(compCenter);
          textLabel.position.z += Math.floor(this.depth / 2);
          textLabel.properties = item.properties;
          textLabel.isTextNode = true;
          this.css2DGroup.add(textLabel);
          this.textLabels.push(textLabel);
        });
        // 必须使用insertBefore，否则会导致文字显示在地图下方
        this.textLabels.forEach(label => {
          this.CSS2DLayer.domElement.insertBefore(label.element, this.CSS2DLayer.domElement.firstChild);
        });
      }
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
    // 创建线
    createLine(vertices) {
        if (vertices.length === 0) {
            console.error('Vertices array is empty')
            return
        }
        const lineGeometry = new LineGeometry()
        lineGeometry.setPositions(vertices);
        const lineMaterial = new LineMaterial({
            color: new THREE.Color(this.config.lineColor).getHex(),
            linewidth: this.config.lineWidth,
            resolution: new THREE.Vector2(this.innerWidth, this.innerHeight),
        })
        const line = new Line2(lineGeometry, lineMaterial)
        line.computeLineDistances()
        return line
    }
    // 创建提示信息
    createTooltip(obj) {
        this.removeTooltip()
        if (!this.config.showTooltip) return
        if (obj) {
          
            const newPos = obj.point.clone()
            // 控制地图上下位置
            newPos.z = this.depth * (this.config.tooltipHeight);
            const currentMesh = obj.object
            const { name } = currentMesh.parent.properties
            let tooltipElement
            if (
                this.config.createTooltipElement &&
                typeof this.config.createTooltipElement === 'function'
            ) {
                tooltipElement = this.config.createTooltipElement(
                    currentMesh.properties
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
   /**
    * 渲染热力图到 Three.js 场景中。
    * 
    * @param {Object} roundJson - 包含地图外圈数据的 JSON 对象，用于生成地图形状。
    * @param {Object} heatData - 热力图数据对象，包含 `data` 数组和 `max` 值。
    * @param {Object} heatConfig - 热力图配置对象，包含 `radius`、`maxOpacity`、`minOpacity`、`blur` 和 `gradient` 等配置项。
    */
    renderHeatmaps(roundJson, heatData, heatConfig) {
        if (!heatData?.data?.length&&this._heatmapMesh) {
          if (this._heatmapMesh) {
            // 顶面贴图清空
            const topMat = this._heatmapMesh.material[0];
            topMat.map = null;
            topMat.opacity = 0;
            topMat.needsUpdate = true;
            // 侧面已经是透明的，就不用管了
          }
          return;
        }
        // 1. 根据地图外圈数据生成全局形状（必须与地图形状一致）
        const mapShape = this.loadAllMap(roundJson);
        
        // 2. 使用 mapShape 生成 THREE.ExtrudeGeometry（替代平面几何），并设置挤出深度
        const extrudeSettings = {
          depth: 1, // 热力图层的厚度，可根据需求调整
          bevelEnabled: false
        };
        const geometry = new THREE.ExtrudeGeometry(mapShape, extrudeSettings);
        
        // 3. 计算几何体的包围盒，作为热力图数据归一化参考
        const bbox = new THREE.Box3().setFromObject(new THREE.Mesh(geometry));
        const size = bbox.getSize(new THREE.Vector3());
        
        // 限制最大 canvas 尺寸
        const maxDimension = 1024;
        const canvasWidth = Math.min(Math.ceil(size.x), maxDimension);
        const canvasHeight = Math.min(Math.ceil(size.y), maxDimension);
        // 若 canvas 宽高不合法则终止函数执行
        if (canvasWidth <= 0 || canvasHeight <= 0) return;
        
        // 4. 创建一个隐藏的 DOM 容器供 heatmap.js 渲染
        const container = document.createElement("div");
        container.style.width = canvasWidth + "px";
        container.style.height = canvasHeight + "px";
        container.style.display = "none";
        document.body.appendChild(container);
        
        // 5. 计算 bbox 宽高，用于将热力图数据点归一化到容器内
        const widthBox = bbox.max.x - bbox.min.x;
        const heightBox = bbox.max.y - bbox.min.y;
        const pointsInMap = [];
        // 遍历热力图数据，将经纬度转换为容器内的相对坐标
        console.log(heatData)
        heatData.data?.forEach(pt => {
          const coords = this.customCoords.lngLatsToCoords([[pt.lng, pt.lat]])[0];
          const ptVec = new THREE.Vector3(coords[0], coords[1], bbox.max.z);
          // 检查点是否在包围盒内
          if (bbox.containsPoint(ptVec)) {
            const relativeX = ((ptVec.x - bbox.min.x) / widthBox) * canvasWidth;
            const relativeY = ((ptVec.y - bbox.min.y) / heightBox) * canvasHeight;
            pointsInMap.push({
              x: Math.floor(relativeX),
              y: Math.floor(relativeY),
              value: pt.value
            });
          }
        });
        
        // 6. 使用 heatmap.js 创建热力图实例
        let heatmapInstance = h337.create({
          container: container,
          width: canvasWidth,
          height: canvasHeight,
          radius: heatConfig.radius || 50,
          maxOpacity: heatConfig.maxOpacity || 1,
          minOpacity: heatConfig.minOpacity || 1,
          blur: heatConfig.blur || 1,
          gradient: heatConfig.gradient || {
            ".10": "blue",
            ".30": "cyan",
            ".40": "lime",
            ".50": "yellow",
            ".95": "red"
          }
        });
        // 设置热力图数据
        heatmapInstance.setData({
          max: heatData.max,
          data: pointsInMap
        });
        
        // 7. 获取 heatmap.js 内部的 canvas，并创建 THREE.CanvasTexture
        const heatmapCanvas = heatmapInstance._renderer.canvas;
        const texture = new THREE.CanvasTexture(heatmapCanvas);
        texture.needsUpdate = true;
        
        // 8. 分别创建顶部和侧边材质
        const topMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 1.0,
          side: THREE.FrontSide
        });
        // 侧边设为全透明
        const sideMaterial = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide
        });
        
        // 使用两个材质构建 Mesh，数组顺序须与几何体的组顺序一致
        const heatmapMesh = new THREE.Mesh(geometry, [topMaterial, sideMaterial]);
        // 调整 UV 坐标
        this.changeUv(heatmapMesh.geometry);
        // 9. 将热力图层放置在整体区域中心，z 坐标根据需求调整（这里用 this.depth*1.05）
        const center = bbox.getCenter(new THREE.Vector3());
        heatmapMesh.position.set(0, 0, this.depth * 1.05);
        // 确保热力图在地图上方渲染
        heatmapMesh.renderOrder = 999; 
        
        // 10. 添加到场景中
        this._heatmapMesh = heatmapMesh;
        this.scene.add(heatmapMesh);
        
        // 11. 添加辅助对象显示该层的边界（便于调试）
        // const helper = new THREE.BoxHelper(heatmapMesh, 0xff0000);
        // this.scene.add(helper);
        
        // 12. 清理临时容器
        document.body.removeChild(container);
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
        this._tweens.forEach(tween => {
            tween.kill()
        })
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
