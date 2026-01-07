# GSAP Effects 使用指南

GSAP 的 `effects` 机制允许我们将常用动画封装为自定义效果，方便复用和代码管理。下面我们将一步一步介绍如何注册、调用和在时间线上使用自定义效果。

---

## 第一步：注册自定义效果

使用 `gsap.registerEffect` 方法注册一个新的动画效果。  
在注册时需要提供以下参数：
- **name**：效果的名称（后续调用时使用）。
- **effect**：效果函数，定义具体的动画逻辑。该函数接收两个参数：
  - `targets`：目标元素或对象。
  - `config`：配置对象，用于传入自定义参数。
- **defaults**：默认参数（可选）。
- **extendTimeline**：布尔值，若为 `true`，可以直接在时间线上使用此效果（可选）。

**示例代码：**
```js
gsap.registerEffect({
  name: "fadeOut",         // 定义效果名称
  effect: (targets, config) => {
    // 定义效果逻辑：使目标元素淡出（opacity 变为 0）
    return gsap.to(targets, { duration: config.duration, opacity: 0 });
  },
  defaults: { duration: 1 }, // 默认持续时间为 1 秒
  extendTimeline: true       // 允许在时间线上直接使用该效果
});
```

## 第二步：调用自定义效果

注册完成后，可以直接使用 `gsap.effects.效果名` 来调用该效果。  
传入目标选择器和可选的配置参数（可覆盖默认参数）。

**示例代码：**
```js
// 对 .box 元素应用 fadeOut 效果，并将持续时间设为 2 秒
gsap.effects.fadeOut(".box", { duration: 2 });

const tl = gsap.timeline();
// 在时间轴中使用自定义的 fadeOut 效果
tl.fadeOut(".box", { duration: 2 });

```
# GSAP Global Timeline 使用指南

GSAP 的 `globalTimeline` 是全局根时间轴，它负责管理和驱动所有通过 GSAP 创建的补间动画和时间轴。使用 `gsap.globalTimeline` 可以对整个动画系统进行全局控制，比如暂停、播放以及调整播放速率等。

---

## 主要用途

- **全局控制**：统一管理所有动画，进行全局暂停、播放、重置等操作。
- **调试与同步**：方便对多个动画实例进行调试和全局同步处理。

---

## 常用方法

### 1. 暂停和播放所有动画

```js
// 暂停所有通过 GSAP 创建的动画
gsap.globalTimeline.pause();

// 恢复所有动画的播放
gsap.globalTimeline.play();
```
### 2. 调整播放速率

```js
// 设置全局时间比例为 0.5，所有动画速度将减半
gsap.globalTimeline.timeScale(0.5);

// 恢复全局动画的正常速度
gsap.globalTimeline.timeScale(1);
```
### 总结
通过 gsap.globalTimeline，你可以对整个动画系统进行全局控制，从而方便地暂停、恢复或调整所有动画的播放速率，这在调试和处理复杂动画场景时非常有用。

# GSAP Ticker 使用指南

GSAP 的 `ticker` 是动画引擎的“心跳”，它在每一帧更新全局时间，确保所有动画与浏览器的刷新频率同步。利用 `gsap.ticker`，你可以添加自定义回调函数，在每一帧执行特定操作，非常适合实时更新、调试和实现基于帧的交互逻辑。

---

## 主要用途

- **同步更新**：确保动画与浏览器的渲染帧同步。
- **自定义逻辑**：在每一帧执行自己的代码，比如实时监控或数据更新。
- **性能优化**：通过控制更新频率，优化动画性能。

---

## 常用方法

### 1. 添加回调函数

使用 `gsap.ticker.add` 方法可以将自定义函数添加到 ticker 中，该函数将在每一帧调用。

```js
// 定义一个回调函数
function myTick(time, deltaTime, frame) {
  console.log("当前时间:", time, "帧间隔:", deltaTime, "当前帧数:", frame);
}

// 添加回调函数到 ticker
gsap.ticker.add(myTick);

// 从 ticker 中移除回调函数
gsap.ticker.remove(myTick);

// 设置期望帧率为 60 帧/秒
gsap.ticker.fps(60);

// 获取当前设置的帧率
const currentFPS = gsap.ticker.fps();
console.log("当前帧率:", currentFPS);
```
### 总结
总结
gsap.ticker 是 GSAP 的核心组件之一，它通过在每一帧调用注册的回调函数来保证动画更新的同步性。你可以利用它来添加实时更新逻辑、调试动画过程或优化动画性能，同时可以设置帧率来控制更新频率。
类似`requestAnimationFrame`

# GSAP Utils 使用指南

`gsap.utils` 是 GSAP 提供的一组实用工具函数，帮助开发者在动画中进行常见的数值计算、数组处理、单位转换等操作。下面我们将一步步介绍常用的工具函数及其使用示例。

---

## 1. 将类似数组转换为真正数组

### `gsap.utils.toArray()`

将 NodeList 或者选择器返回的结果转换为真正的数组，方便进行遍历和其他数组操作。

```js
// 示例：将所有 .box 元素转换为数组
const boxes = gsap.utils.toArray(".box");
boxes.forEach(box => {
  console.log(box);
});
```
## 限制数值范围

### `gsap.utils.clamp(min, max, value)`
限制数值在指定范围内，防止超出范围。

```js
// 示例：将值限制在 0 到 100 之间
const clampValue = gsap.utils.clamp(0, 100);
console.log(clampValue(150)); // 输出：100
console.log(clampValue(-20)); // 输出：0
```
### 返回范围内的随机数

### `gsap.utils.random(min, max)`
返回指定范围内的随机数。

```js
// 示例：生成 1 到 5 之间的随机整数（第三个参数 1 表示步长）
console.log(gsap.utils.random(1, 5, 1));

// 示例：从数组中随机选择一个值
const colors = ["red", "green", "blue"];
console.log(gsap.utils.random(colors));
```

### 数值分布
### `gsap.utils.distribute(values, total)`
将一组数值分布到指定的总长度上。

```js
// 示例：定义一个分布函数，将值分布到 0 到 100 的范围内，并以中心为基准
const distribute = gsap.utils.distribute({
  base: 0,
  amount: 100,
  from: "center"
});

// 假设有一个目标数组，可以用该函数生成对应的数值
const targets = [{}, {}, {}];
const values = distribute(targets);
console.log(values); // 输出示例： [50, 0, 50]（具体结果视配置而定）
```
## gsap.utils.mapRange 介绍

`gsap.utils.mapRange` 是 GSAP 提供的一个实用函数，用于将一个数值从一个数值范围线性映射到另一个范围。简单来说，它能把一个区间内的数值转换为另一个区间内的对应数值。

---

## 功能说明

假设你有两个数值区间：
- 原始区间：\[a, b\]
- 目标区间：\[c, d\]

`gsap.utils.mapRange(a, b, c, d)` 会返回一个函数，该函数接收一个数值 `value`，并将其按下面的公式进行线性映射：
  
```js
// 创建一个映射函数，将 0～100 映射到 0～window.innerWidth 的范围
const mapToScreenWidth = gsap.utils.mapRange(0, 100, 0, window.innerWidth);

// 示例：将数值 50 映射后应得到屏幕宽度的一半
const mappedValue = mapToScreenWidth(50);
console.log(mappedValue); // 输出：window.innerWidth / 2（大致值）

// 可以进行归一化处理
```

### snap

```js
// 示例：创建一个 snap 函数，步长为 5
var snap = gsap.utils.snap(5); // 定义一个 snap 函数，步长为 5

// 
console.log(snap(0.5)); // 0
console.log(snap(4)); // 5
console.log(snap(21)); // 20
```