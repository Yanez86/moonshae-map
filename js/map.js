// La mappa su canvas: livelli pxl, nebbia, griglia esagonale, luoghi, righello.
// Coordinate del mondo in miglia; la camera è il centro (cx, cy) e la scala s in pixel del device per miglio.
// Per restare veloce anche sul telefono: i livelli della mappa sono fusi in un'unica immagine, la nebbia
// è un'immagine a parte rifatta solo quando cambia, la griglia traccia solo gli esagoni visibili.

import { MAP, TYPE, BIOMES, ISLANDS, ISLAND_LABELS } from "./config.js"
import { hexAt, hexCenter, hexCorners, hexesIn, hexKey, hexLabel, hexRadius } from "./hex.js"

const MIN_LEVEL = 0.2, MAX_LEVEL = 16                   // pixel del device per pixel della mappa
const BASE = ["mare", "terra", "fiumi", "foreste", "rilievi"]
const INK = "#16171f", BONE = "#efe6cf", GOLD = "#e6bb4f", MAGIC = "#8f62c9"
const FONT = '"Pixelify Sans", monospace'
const SETTLEMENT_RANK = { capitale: 0, caer: 1, citta: 2, porto: 3, villaggio: 4 }

export class MapView {
  constructor(canvas, events) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.ev = events                       // { hover, click, drag, dragEnd, measure }
    this.layers = {}                       // id -> Image
    this.visible = {}                      // id -> bool (livelli e sovrapposizioni)
    this.icons = null                      // { image, frames }
    this.data = { markers: [], explored: new Set(), settings: { hexMiles: 6, fog: false }, dm: false, playerView: false }
    this.selected = null
    this.hoverHex = null
    this.hoverMarker = null
    this.mode = "view"
    this.measure = []
    this.fresh = new Map()                 // id -> istante della rivelazione, per l'impulso
    this.cx = MAP.widthMi / 2
    this.cy = MAP.heightMi / 2
    this.s = 1
    this.pointers = new Map()
    this.fogCache = null
    this.raf = 0
    this.bind()
    new ResizeObserver(() => this.resize()).observe(canvas)
    this.resize()
  }

  // ---------------------------------------------------------------- dati
  setLayers(images) { this.layers = images; this.base = null; this.request() }
  setIcons(icons) { this.icons = icons; this.request() }
  setTerrain(pixels) { this.terrain = pixels }
  setVisible(id, on) {
    this.visible[id] = on
    if (BASE.includes(id)) this.base = null
    this.request()
  }
  setData(data) {
    if (data.explored !== this.data.explored || data.settings?.hexMiles !== this.data.settings?.hexMiles) this.fogCache = null
    this.data = { ...this.data, ...data }
    this.request()
  }
  invalidateFog() { this.fogCache = null; this.request() }
  setMode(mode) {
    this.mode = mode
    if (mode !== "measure") this.measure = []
    this.canvas.dataset.mode = mode
    this.request()
  }
  select(id) { this.selected = id; this.request() }
  pulse(ids) { const now = performance.now(); ids.forEach((id) => this.fresh.set(id, now)); this.request() }

  // ---------------------------------------------------------------- camera
  get dpr() { return window.devicePixelRatio || 1 }
  get level() { return this.s / MAP.pxPerMile }
  resize() {
    const r = this.canvas.getBoundingClientRect(), d = this.dpr
    this.canvas.width = Math.max(1, Math.round(r.width * d))
    this.canvas.height = Math.max(1, Math.round(r.height * d))
    if (!this.fitted && r.width > 0) { this.fit(false); this.fitted = true }
    this.request()
  }
  fitLevel() {
    const w = this.canvas.width, h = this.canvas.height
    const fit = Math.min(w / (MAP.widthMi * MAP.pxPerMile), h / (MAP.heightMi * MAP.pxPerMile))
    return fit < 1 ? Math.max(MIN_LEVEL, fit) : Math.floor(fit)
  }
  fit(animate = true) { this.zoomTo(this.fitLevel(), MAP.widthMi / 2, MAP.heightMi / 2, animate) }
  // Zoom tenendo fermo il punto del mondo (ax, ay) sotto lo stesso punto dello schermo.
  zoomTo(level, ax = this.cx, ay = this.cy, animate = true, centerOn = true) {
    const target = level * MAP.pxPerMile
    const from = { s: this.s, cx: this.cx, cy: this.cy }
    const to = centerOn ? { s: target, cx: ax, cy: ay } : {
      s: target, cx: ax - (ax - this.cx) * this.s / target, cy: ay - (ay - this.cy) * this.s / target,
    }
    cancelAnimationFrame(this.anim)
    if (!animate) { Object.assign(this, to); this.clampCamera(); this.request(); return }
    const t0 = performance.now(), dur = 160
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3
      const s = from.s * Math.pow(to.s / from.s, e)
      this.s = s
      // il punto d'ancora resta fermo durante lo zoom
      const f = centerOn ? e : 1 - from.s / s
      this.cx = centerOn ? from.cx + (to.cx - from.cx) * e : from.cx + (ax - from.cx) * f
      this.cy = centerOn ? from.cy + (to.cy - from.cy) * e : from.cy + (ay - from.cy) * f
      this.clampCamera()
      this.draw()
      if (k < 1) this.anim = requestAnimationFrame(step)
    }
    this.anim = requestAnimationFrame(step)
  }
  zoomStep(dir, sx, sy) {
    const next = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, this.level * (dir > 0 ? 2 : 0.5)))
    if (sx === undefined) return this.zoomTo(next, this.cx, this.cy, true, true)
    const p = this.toMap(sx, sy)
    this.zoomTo(next, p.x, p.y, true, false)
  }
  // Zoom immediato di un fattore, col punto sotto (sx, sy) che resta fermo (rotella, pizzico).
  zoomBy(factor, sx, sy) {
    const p = this.toMap(sx, sy), s = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, this.level * factor)) * MAP.pxPerMile
    this.cx = p.x - (p.x - this.cx) * this.s / s
    this.cy = p.y - (p.y - this.cy) * this.s / s
    this.s = s
    this.clampCamera()
    this.request()
  }
  flyTo(x, y, minLevel = 3) { this.zoomTo(Math.max(minLevel, this.level), x, y, true, true) }
  clampCamera() {
    const m = 40
    this.cx = Math.max(-m, Math.min(MAP.widthMi + m, this.cx))
    this.cy = Math.max(-m, Math.min(MAP.heightMi + m, this.cy))
  }
  // css px -> miglia, e ritorno (device px)
  toMap(sx, sy) {
    const d = this.dpr
    return { x: this.cx + (sx * d - this.canvas.width / 2) / this.s, y: this.cy + (sy * d - this.canvas.height / 2) / this.s }
  }
  offset() {
    return { tx: Math.round(this.canvas.width / 2 - this.cx * this.s), ty: Math.round(this.canvas.height / 2 - this.cy * this.s) }
  }
  toScreen(x, y) {
    const { tx, ty } = this.offset()
    return { x: x * this.s + tx, y: y * this.s + ty }
  }

  // ---------------------------------------------------------------- terreno
  terrainAt(x, y) {
    if (!this.terrain || x < 0 || y < 0 || x >= MAP.widthMi || y >= MAP.heightMi) return { biome: 0, island: 0 }
    const i = (Math.floor(y) * MAP.widthMi + Math.floor(x)) * 4
    return { biome: Math.round(this.terrain[i] / 12), island: Math.round(this.terrain[i + 1] / 20) }
  }
  hexInfo(col, row) {
    const size = this.data.settings.hexMiles, c = hexCenter(col, row, size), r = hexRadius(size) * 0.6
    const counts = {}, islands = {}
    const pts = [[0, 0], ...Array.from({ length: 6 }, (_, k) => [Math.cos(k * Math.PI / 3) * r, Math.sin(k * Math.PI / 3) * r])]
    for (const [dx, dy] of pts) {
      const t = this.terrainAt(c.x + dx, c.y + dy)
      counts[t.biome] = (counts[t.biome] || 0) + 1
      if (t.island) islands[t.island] = (islands[t.island] || 0) + 1
    }
    const land = Object.entries(counts).filter(([b]) => b !== "0").sort((a, b) => b[1] - a[1])
    const biome = land.length && land[0][1] >= (counts[0] || 0) * 0.5 ? Number(land[0][0]) : 0
    const island = Object.entries(islands).sort((a, b) => b[1] - a[1])[0]?.[0]
    return {
      col, row, x: c.x, y: c.y,
      label: hexLabel(col, row, size, MAP.widthMi, MAP.heightMi),
      terrain: BIOMES[biome]?.name ?? "Mare", hard: Boolean(BIOMES[biome]?.hard),
      island: island ? ISLANDS[island] : null, land: biome !== 0,
      explored: this.data.explored.has(hexKey(col, row)),
    }
  }

  // ---------------------------------------------------------------- luoghi visibili
  shownMarkers() {
    const { markers, dm, playerView } = this.data
    return markers.filter((m) => {
      const t = TYPE[m.type] || TYPE.segnaposto
      if (m.hidden && (!dm || playerView || !this.visible.nascosti)) return false
      return this.visible[t.group] !== false
    })
  }
  iconScale() {
    const d = this.dpr
    return Math.max(1, Math.round(this.level < 1 ? d * 1.5 : d * 2))
  }
  // slop: margine in px css intorno all'icona (più largo per un dito).
  markerAt(sx, sy, slop = 4) {
    const d = this.dpr, k = this.iconScale(), list = this.shownMarkers()
    for (let n = list.length - 1; n >= 0; n--) {
      const m = list[n], p = this.toScreen(m.x, m.y)
      const f = this.frame(m), w = (f ? f.w : 40) * k / 2 + slop * d, h = (f ? f.h : 12) * k / 2 + slop * d
      if (Math.abs(sx * d - p.x) <= w && Math.abs(sy * d - p.y) <= h) return m
    }
    return null
  }
  frame(m) {
    const t = TYPE[m.type] || TYPE.segnaposto
    return t.icon && this.icons ? this.icons.frames["icona_" + t.icon]?.frame : null
  }

  // ---------------------------------------------------------------- disegno
  request() {
    if (this.raf) return
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw() })
  }
  draw() {
    const { ctx, canvas } = this, W = canvas.width, H = canvas.height, s = this.s
    const { tx, ty } = this.offset()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = "#14213d"
    ctx.fillRect(0, 0, W, H)
    ctx.setTransform(s, 0, 0, s, tx, ty)
    const small = this.level < 1
    const view = { x0: (0 - tx) / s, y0: (0 - ty) / s, x1: (W - tx) / s, y1: (H - ty) / s }
    ctx.imageSmoothingEnabled = small
    this.blit(this.composite(), view)
    if (!small && this.layers.nomi && this.visible.nomi !== false) this.blit(this.layers.nomi, view)
    ctx.imageSmoothingEnabled = false
    if (this.data.settings.fog && this.visible.nebbia !== false) this.drawFog(view)
    if (this.visible.griglia !== false || this.mode === "explore") this.drawGrid(view, tx, ty)
    this.drawHover(tx, ty)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (small && this.visible.nomi !== false) this.drawIslandNames()
    this.drawMarkers()
    this.drawMeasure()
    // l'impulso dei luoghi appena rivelati dura qualche secondo
    if ([...this.fresh.values()].some((t) => performance.now() - t < 6000)) this.request()
    this.ev.view?.()
  }

  // I livelli di base fusi in un canvas della misura della mappa: un drawImage per fotogramma.
  composite() {
    if (this.base) return this.base
    const P = MAP.pxPerMile, c = document.createElement("canvas")
    c.width = MAP.widthMi * P
    c.height = MAP.heightMi * P
    const g = c.getContext("2d")
    for (const id of BASE) if (this.layers[id] && this.visible[id] !== false) g.drawImage(this.layers[id], 0, 0, c.width, c.height)
    this.base = c
    return c
  }
  // Copia solo il rettangolo dell'immagine che cade nello schermo.
  blit(img, view) {
    const P = img.width / MAP.widthMi
    const x0 = Math.max(0, Math.floor(view.x0 * P)), y0 = Math.max(0, Math.floor(view.y0 * P))
    const x1 = Math.min(img.width, Math.ceil(view.x1 * P)), y1 = Math.min(img.height, Math.ceil(view.y1 * P))
    if (x1 <= x0 || y1 <= y0) return
    this.ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0, x0 / P, y0 / P, (x1 - x0) / P, (y1 - y0) / P)
  }

  drawIslandNames() {
    const { ctx } = this, d = this.dpr
    ctx.save()
    ctx.font = `600 ${Math.round(15 * d)}px ${FONT}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.lineJoin = "round"
    ctx.lineWidth = 4 * d
    ctx.strokeStyle = INK
    ctx.fillStyle = BONE
    for (const [name, x, y] of ISLAND_LABELS) {
      const p = this.toScreen(x, y)
      ctx.strokeText(name.toUpperCase(), p.x, p.y)
      ctx.fillText(name.toUpperCase(), p.x, p.y)
    }
    ctx.restore()
  }

  // La nebbia è un'immagine della misura della mappa, col retino a scacchi sui pixel della mappa:
  // si rifà solo quando cambia l'esplorazione, poi costa un drawImage.
  drawFog(view) {
    const { ctx } = this, size = this.data.settings.hexMiles, P = MAP.pxPerMile
    if (!this.fogCache) {
      const c = document.createElement("canvas")
      c.width = MAP.widthMi * P
      c.height = MAP.heightMi * P
      const g = c.getContext("2d")
      const t = document.createElement("canvas")
      t.width = t.height = 2
      const tg = t.getContext("2d")
      tg.fillStyle = "rgba(12, 18, 36, 0.8)"; tg.fillRect(0, 0, 2, 2)
      tg.fillStyle = "rgba(12, 18, 36, 0.58)"; tg.fillRect(0, 0, 1, 1); tg.fillRect(1, 1, 1, 1)
      g.fillStyle = g.createPattern(t, "repeat")
      g.beginPath()
      for (const [col, row] of hexesIn(0, 0, MAP.widthMi, MAP.heightMi, size)) {
        if (this.data.explored.has(hexKey(col, row))) continue
        const p = hexCorners(col, row, size)
        g.moveTo(p[0][0] * P, p[0][1] * P)
        for (let k = 1; k < 6; k++) g.lineTo(p[k][0] * P, p[k][1] * P)
      }
      g.fill()
      this.fogCache = c
    }
    ctx.save()
    ctx.globalAlpha = this.data.dm && !this.data.playerView ? 0.45 : 1
    ctx.imageSmoothingEnabled = this.level < 1
    this.blit(this.fogCache, view)
    ctx.restore()
  }

  drawGrid(view, tx, ty) {
    const { ctx } = this, s = this.s, d = this.dpr, size = this.data.settings.hexMiles
    const hexPx = size * s, hexCss = hexPx / d
    let alpha = Math.max(0, Math.min(1, (hexCss - 9) / 14)) * 0.42
    if (this.mode === "explore") alpha = Math.max(alpha, 0.5)
    if (alpha <= 0.02) return
    const list = hexesIn(view.x0, view.y0, view.x1, view.y1, size)
    // Tre lati per esagono (basso-sinistra, alto-sinistra, alto) coprono tutta la griglia una volta
    // sola; una spezzata aperta, senza closePath, che con migliaia di esagoni è lentissimo.
    ctx.save()
    ctx.beginPath()
    for (const [c, r] of list) {
      const p = hexCorners(c, r, size)
      ctx.moveTo(p[2][0], p[2][1])
      ctx.lineTo(p[3][0], p[3][1])
      ctx.lineTo(p[4][0], p[4][1])
      ctx.lineTo(p[5][0], p[5][1])
    }
    ctx.lineWidth = Math.max(1, Math.round(d)) / s
    ctx.strokeStyle = `rgba(12, 16, 30, ${alpha})`
    ctx.stroke()
    ctx.restore()
    if (this.visible.coordinate && hexPx > 50 * d) {
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.font = `${Math.round(9 * d)}px ${FONT}`
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      ctx.lineWidth = 2 * d
      ctx.strokeStyle = "rgba(12, 16, 30, 0.7)"
      ctx.fillStyle = "rgba(239, 230, 207, 0.85)"
      for (const [c, r] of list) {
        if (c < 0 || r < 0) continue
        const ctr = hexCenter(c, r, size)
        const x = ctr.x * s + tx, y = (ctr.y - size / 2) * s + ty + 3 * d
        const label = hexLabel(c, r, size, MAP.widthMi, MAP.heightMi)
        ctx.strokeText(label, x, y)
        ctx.fillText(label, x, y)
      }
      ctx.restore()
    }
  }

  drawHover(tx, ty) {
    if (!this.hoverHex || this.pointers.size) return
    const show = this.mode === "explore" || this.mode === "add" || this.visible.griglia !== false
    if (!show || this.data.settings.hexMiles * this.s < 10 * this.dpr) return
    const { ctx } = this, s = this.s, p = hexCorners(this.hoverHex.col, this.hoverHex.row, this.data.settings.hexMiles)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(p[0][0], p[0][1])
    for (let k = 1; k < 6; k++) ctx.lineTo(p[k][0], p[k][1])
    ctx.closePath()
    ctx.lineWidth = Math.max(2, Math.round(2 * this.dpr)) / s
    ctx.strokeStyle = this.mode === "explore" ? "rgba(119, 220, 227, 0.95)" : "rgba(230, 187, 79, 0.9)"
    ctx.stroke()
    ctx.restore()
  }

  drawMarkers() {
    const { ctx } = this, d = this.dpr, k = this.iconScale(), level = this.level, now = performance.now()
    const list = this.shownMarkers().slice().sort((a, b) => (a.type === "gruppo") - (b.type === "gruppo") || a.y - b.y)
    const labels = []
    ctx.imageSmoothingEnabled = false
    for (const m of list) {
      const p = this.toScreen(m.x, m.y), x = Math.round(p.x), y = Math.round(p.y)
      if (x < -60 * d || y < -60 * d || x > this.canvas.width + 60 * d || y > this.canvas.height + 60 * d) continue
      const f = this.frame(m)
      ctx.globalAlpha = m.hidden ? 0.55 : 1
      const born = this.fresh.get(m.id)
      if (born && now - born < 6000) {
        const t = ((now - born) % 1200) / 1200
        ctx.strokeStyle = `rgba(230, 187, 79, ${1 - t})`
        ctx.lineWidth = 2 * d
        ctx.beginPath()
        ctx.arc(x, y, (8 + t * 18) * d, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (f) {
        const w = f.w * k, h = f.h * k
        ctx.drawImage(this.icons.image, f.x, f.y, f.w, f.h, x - Math.floor(w / 2), y - Math.floor(h / 2), w, h)
        if (m.hidden) this.hiddenBadge(x + w / 2, y - h / 2)
        if (m.id === this.selected) this.bracket(x, y, w / 2 + 3 * d, h / 2 + 3 * d)
      } else if (m.id === this.selected) this.bracket(x, y, 30 * d, 10 * d)
      ctx.globalAlpha = 1
      const name = this.wantsLabel(m, level)
      if (name) labels.push({ m, x, y: f ? y + (f.h * k) / 2 + 2 * d : y - 6 * d, rank: this.labelRank(m), textOnly: !f })
    }
    this.drawLabels(labels)
  }
  wantsLabel(m, level) {
    if (!m.name) return false
    if (m.id === this.selected || m === this.hoverMarker || m.type === "etichetta") return true
    if (this.visible.etichette === false) return false
    const rank = SETTLEMENT_RANK[m.type]
    if (rank !== undefined) return level >= (rank <= 1 ? 0.5 : rank <= 3 ? 1 : 2)
    return level >= 3
  }
  labelRank(m) {
    if (m.id === this.selected) return -2
    if (m === this.hoverMarker) return -1
    return SETTLEMENT_RANK[m.type] ?? 6
  }
  // Nomi con bordo scuro; un nome che ne coprirebbe uno più importante non si disegna.
  drawLabels(labels) {
    const { ctx } = this, d = this.dpr, placed = []
    labels.sort((a, b) => a.rank - b.rank)
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    for (const l of labels) {
      const big = l.m.type === "capitale" || l.textOnly
      ctx.font = `${big ? 600 : 400} ${Math.round((big ? 14 : 12) * d)}px ${FONT}`
      const w = ctx.measureText(l.m.name).width, h = (big ? 15 : 13) * d
      const box = { x0: l.x - w / 2 - 2 * d, x1: l.x + w / 2 + 2 * d, y0: l.y, y1: l.y + h }
      if (l.rank >= 0 && placed.some((b) => b.x0 < box.x1 && b.x1 > box.x0 && b.y0 < box.y1 && b.y1 > box.y0)) continue
      placed.push(box)
      ctx.globalAlpha = l.m.hidden ? 0.7 : 1
      ctx.lineJoin = "round"
      ctx.lineWidth = 3 * d
      ctx.strokeStyle = INK
      ctx.strokeText(l.m.name, l.x, l.y)
      ctx.fillStyle = l.m.type === "capitale" ? GOLD : l.m.hidden ? "#d6c3ec" : BONE
      ctx.fillText(l.m.name, l.x, l.y)
      ctx.globalAlpha = 1
    }
  }
  hiddenBadge(x, y) {
    const { ctx } = this, d = this.dpr, r = Math.round(3 * d)
    ctx.globalAlpha = 1
    ctx.fillStyle = INK
    ctx.fillRect(Math.round(x - r - d), Math.round(y - r - d), 2 * r + 2 * d, 2 * r + 2 * d)
    ctx.fillStyle = MAGIC
    ctx.fillRect(Math.round(x - r), Math.round(y - r), 2 * r, 2 * r)
    ctx.globalAlpha = 0.55
  }
  bracket(x, y, rx, ry) {
    const { ctx } = this, d = this.dpr, l = 5 * d
    ctx.save()
    ctx.globalAlpha = 1
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 2 * d
    ctx.beginPath()
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = x + sx * rx, cy = y + sy * ry
      ctx.moveTo(cx, cy - sy * l); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * l, cy)
    }
    ctx.stroke()
    ctx.restore()
  }

  drawMeasure() {
    if (this.mode !== "measure" || !this.measure.length) return
    const { ctx } = this, d = this.dpr
    const pts = [...this.measure, ...(this.measureHover ? [this.measureHover] : [])].map((p) => this.toScreen(p.x, p.y))
    ctx.save()
    ctx.lineWidth = 2 * d
    ctx.setLineDash([6 * d, 4 * d])
    ctx.strokeStyle = INK
    ctx.lineWidth = 4 * d
    ctx.beginPath()
    pts.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))
    ctx.stroke()
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 2 * d
    ctx.stroke()
    ctx.setLineDash([])
    for (const p of pts.slice(0, this.measure.length)) {
      ctx.fillStyle = INK
      ctx.fillRect(Math.round(p.x - 4 * d), Math.round(p.y - 4 * d), 8 * d, 8 * d)
      ctx.fillStyle = GOLD
      ctx.fillRect(Math.round(p.x - 2 * d), Math.round(p.y - 2 * d), 4 * d, 4 * d)
    }
    ctx.restore()
  }
  measureMiles() {
    const pts = [...this.measure, ...(this.measureHover ? [this.measureHover] : [])]
    let t = 0
    for (let k = 1; k < pts.length; k++) t += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y)
    return t
  }

  // ---------------------------------------------------------------- input
  bind() {
    const c = this.canvas
    c.addEventListener("pointerdown", (e) => this.down(e))
    c.addEventListener("pointermove", (e) => this.move(e))
    c.addEventListener("pointerup", (e) => this.up(e))
    c.addEventListener("pointercancel", (e) => this.up(e, true))
    c.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !this.pointers.size) { this.hoverHex = null; this.hoverMarker = null; this.ev.hover?.(null); this.request() } })
    c.addEventListener("wheel", (e) => {
      e.preventDefault()
      const r = c.getBoundingClientRect(), dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1)
      this.zoomBy(Math.exp(-Math.max(-300, Math.min(300, dy)) * 0.0022), e.clientX - r.left, e.clientY - r.top)
    }, { passive: false })
    c.addEventListener("dblclick", (e) => {
      if (this.mode === "measure") return this.ev.measureEnd?.()
      if (performance.now() - (this.touchZoomAt || 0) < 700) return   // il doppio tocco l'ha già fatto
      const r = c.getBoundingClientRect()
      this.zoomStep(1, e.clientX - r.left, e.clientY - r.top)
    })
    c.addEventListener("contextmenu", (e) => { if (this.mode === "measure") { e.preventDefault(); this.ev.measureEnd?.() } })
  }
  local(e) {
    const r = this.canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  down(e) {
    this.canvas.setPointerCapture(e.pointerId)
    const p = this.local(e)
    this.pointers.set(e.pointerId, p)
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()]
      this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: this.s, mid: this.toMap((a.x + b.x) / 2, (a.y + b.y) / 2) }
      this.press = null
      this.dragging = null
      return
    }
    const touch = e.pointerType !== "mouse"
    const m = this.data.dm && this.mode === "view" ? this.markerAt(p.x, p.y, touch ? 12 : 4) : null
    this.press = { x: p.x, y: p.y, cx: this.cx, cy: this.cy, moved: false, marker: m, touch }
  }
  move(e) {
    const p = this.local(e)
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p)
    if (this.pinch && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const minS = MIN_LEVEL * MAP.pxPerMile, maxS = MAX_LEVEL * MAP.pxPerMile
      this.s = Math.max(minS, Math.min(maxS, this.pinch.s * dist / this.pinch.dist))
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d = this.dpr
      this.cx = this.pinch.mid.x - (mid.x * d - this.canvas.width / 2) / this.s
      this.cy = this.pinch.mid.y - (mid.y * d - this.canvas.height / 2) / this.s
      this.clampCamera()
      this.request()
      return
    }
    const pr = this.press
    if (pr && this.pointers.has(e.pointerId)) {
      const dx = p.x - pr.x, dy = p.y - pr.y
      if (!pr.moved && Math.hypot(dx, dy) > (pr.touch ? 9 : 5)) pr.moved = true
      if (!pr.moved) return
      if (pr.marker) {
        const w = this.toMap(p.x, p.y)
        this.dragging = pr.marker
        this.ev.drag?.(pr.marker, w.x, w.y)
        this.request()
        return
      }
      if (this.mode === "explore" && e.pointerType === "mouse") return this.paint(p)
      const d = this.dpr
      this.cx = pr.cx - dx * d / this.s
      this.cy = pr.cy - dy * d / this.s
      this.clampCamera()
      this.request()
      return
    }
    this.hover(p)
  }
  hover(p) {
    const w = this.toMap(p.x, p.y), h = hexAt(w.x, w.y, this.data.settings.hexMiles)
    const m = this.markerAt(p.x, p.y)
    const changed = !this.hoverHex || h.col !== this.hoverHex.col || h.row !== this.hoverHex.row || m !== this.hoverMarker
    this.hoverHex = h
    this.hoverMarker = m
    this.canvas.style.cursor = m && this.mode === "view" ? "pointer" : ""
    if (this.mode === "measure" && this.measure.length) { this.measureHover = w; this.ev.measure?.(this.measureMiles()); this.request() }
    if (changed) { this.ev.hover?.(this.hexInfo(h.col, h.row), m); this.request() }
  }
  paint(p) {
    const w = this.toMap(p.x, p.y), h = hexAt(w.x, w.y, this.data.settings.hexMiles), key = hexKey(h.col, h.row)
    if (this.painted?.has(key)) return
    this.painted ??= new Set()
    this.painted.add(key)
    if (this.paintValue === undefined) this.paintValue = !this.data.explored.has(key)
    this.ev.paint?.(h.col, h.row, this.paintValue)
    this.hover(p)
  }
  up(e, cancelled) {
    this.pointers.delete(e.pointerId)
    if (this.pinch) {
      if (this.pointers.size < 2) this.pinch = null
      return
    }
    const pr = this.press
    this.press = null
    if (this.dragging) {
      this.ev.dragEnd?.(this.dragging)
      this.dragging = null
      return
    }
    const wasPainting = this.painted
    this.painted = null
    this.paintValue = undefined
    if (cancelled || !pr || pr.moved) return
    const p = this.local(e), w = this.toMap(p.x, p.y)
    if (this.mode === "explore") {
      if (!wasPainting) {
        this.paint(p)
        this.painted = null
        this.paintValue = undefined
      }
      return
    }
    if (this.mode === "measure") {
      this.measure.push(w)
      this.ev.measure?.(this.measureMiles())
      this.request()
      return
    }
    const m = this.markerAt(p.x, p.y, pr.touch ? 14 : 4)
    const h = hexAt(w.x, w.y, this.data.settings.hexMiles)
    if (pr.touch && !m && this.mode === "view") {
      // doppio tocco: avvicina; un tocco solo evidenzia l'esagono (niente hover sul telefono)
      const now = performance.now(), last = this.lastTap
      this.lastTap = { t: now, x: p.x, y: p.y }
      if (last && now - last.t < 320 && Math.hypot(p.x - last.x, p.y - last.y) < 30) {
        this.lastTap = null
        this.touchZoomAt = now
        return this.zoomStep(1, p.x, p.y)
      }
      this.hoverHex = h
      this.request()
    }
    this.ev.click?.({ x: w.x, y: w.y, marker: m, hex: this.hexInfo(h.col, h.row), touch: pr.touch })
  }
}
