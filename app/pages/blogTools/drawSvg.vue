<template>
  <div class="panel">
    <div
      ref="padRef"
      class="pad"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    >
      <!-- 预览：实时把 strokes 画成 SVG -->
      <svg class="svg" :viewBox="`0 0 ${w} ${h}`" fill="none">
        <path
          v-for="(d, i) in paths"
          :key="i"
          :d="d"
          stroke="#fff"
          stroke-width="10"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <div class="actions">
      <button @click="clear">清空</button>
      <button @click="copySvg">复制 SVG</button>
    </div>

    <textarea class="out" :value="svgText" readonly></textarea>
  </div>
</template>

<script setup>

const padRef = ref(null)

const w = 800
const h = 300

let drawing = [] // Drawing: Stroke[]
let current = null // Stroke | null

const paths = ref([]) // 每一笔的 path d

function getLocalPoint(e) {
  const rect = padRef.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * w
  const y = ((e.clientY - rect.top) / rect.height) * h
  return { x, y, t: performance.now(), p: e.pressure ?? 0.5 }
}

// 简单去抖：距离太近就不记点（降低噪声）
function shouldAddPoint(stroke, pt, minDist = 1.5) {
  if (!stroke.length) return true
  const last = stroke[stroke.length - 1]
  const dx = pt.x - last.x
  const dy = pt.y - last.y
  return Math.hypot(dx, dy) >= minDist
}

// 点序列 -> 平滑 path（Q 曲线 midpoint）
function strokeToPath(stroke) {
  if (stroke.length === 0) return ""
  if (stroke.length === 1) {
    const p = stroke[0]
    return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
  }

  const p0 = stroke[0]
  let d = `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`
  for (let i = 1; i < stroke.length - 1; i++) {
    const p = stroke[i]
    const next = stroke[i + 1]
    const mx = (p.x + next.x) / 2
    const my = (p.y + next.y) / 2
    d += ` Q ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`
  }
  // 最后一段用 T 或者直接 Q 到最后点
  const last = stroke[stroke.length - 1]
  const prev = stroke[stroke.length - 2]
  d += ` Q ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} ${last.x.toFixed(2)} ${last.y.toFixed(2)}`
  return d
}

function refreshPaths() {
  paths.value = drawing.map(strokeToPath)
}

function onDown(e) {
  e.preventDefault()
  padRef.value.setPointerCapture(e.pointerId)

  current = []
  drawing.push(current)

  const pt = getLocalPoint(e)
  current.push(pt)
  refreshPaths()
}

function onMove(e) {
  if (!current) return
  const pt = getLocalPoint(e)
  if (shouldAddPoint(current, pt)) {
    current.push(pt)
    refreshPaths()
  }
}

function onUp() {
  current = null
}

function clear() {
  drawing = []
  current = null
  paths.value = []
}

const svgText = computed(() => {
  const pathEls = paths.value
    .filter(Boolean)
    .map(
      (d) =>
        `<path d="${d}" stroke="#000" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    )
    .join("\n  ")
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="none">\n  ${pathEls}\n</svg>`
})

async function copySvg() {
  await navigator.clipboard.writeText(svgText.value)
  alert("已复制 SVG 到剪贴板")
}
</script>

<style scoped>
.panel { display: grid; gap: 12px; }
.pad {
  position: relative;
  width: min(900px, 96vw);
  aspect-ratio: 800 / 300;
  background: #0b0f17;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 12px;
  overflow: hidden;
  touch-action: none; /* 关键：防止触屏滚动 */
}
.svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.actions { display: flex; gap: 10px; }
.out { width: min(900px, 96vw); height: 220px; }
button { padding: 8px 12px; }
</style>
