// Isole Moonshae: mappa pixel art per un hexcrawl, disegnata con pxl.
//
// La geografia segue la mappa ufficiale delle Moonshae: coste, laghi, foreste, rilievo e fondali
// sono ricalcati in art/geo.px.js (da estrai-geo.mjs), a 2 px per miglio. Qui diventano pixel art
// a 4 px per miglio: suolo, sprite di alberi, montagne e colline disegnati a mano, nomi col font 5x7.
//
// Esporta:
//   scenes/moonshae/<livello>.png   un PNG per livello (mare, terra, fiumi, foreste, rilievi, nomi)
//   scenes/moonshae_dati.png        1 px per miglio: R = bioma * 12, G = isola * 20 (per l'app)
//   icone.png + icone.json          le icone dei punti di interesse
//
// Build: art/build.sh (copia i file in assets/).

include("font5x7.px.js")
include("geo.px.js")
include("luoghi.px.js")

pal({
  k: "#16171f",                                                    // inchiostro
  1: "#14213d", 2: "#1b2f55", 3: "#234170", 4: "#2e5a8e",          // mare, dal profondo
  5: "#4a7fb0", 6: "#7fb0d0", f: "#d8ecf2",                        // bassifondi, schiuma
  A: "#b09868", a: "#dcc98f",                                      // sabbia bagnata, sabbia
  H: "#1f3b2c", h: "#2f5a37", G: "#4a7d3f", g: "#6fa04a", l: "#9cc25f", // erba e chiome
  Y: "#a88f45", y: "#d4bb62",                                      // campi
  M: "#6e6447", m: "#938660", V: "#5e4a62", v: "#8a6a85",          // brughiera, erica
  S: "#3d5240", s: "#5b7352",                                      // palude
  q: "#1a3631", P: "#28524a", p: "#3c7262",                        // conifere
  T: "#3b3833", t: "#625c51", R: "#8f8775", r: "#bdb5a0",          // roccia
  W: "#aebfd0", w: "#eef3f6",                                      // neve
  U: "#757560", u: "#9e9c80",                                      // terre brulle
  o: "#5a3d2b", n: "#9a6b43",                                      // legno
  X: "#7a2e2b", x: "#b8483a",                                      // tetti
  Z: "#a5762a", z: "#e6bb4f",                                      // oro
  J: "#4f3585", j: "#8f62c9",                                      // magia
  C: "#2f8f9e", c: "#77dce3",                                      // pozzo lunare
  E: "#b8431f", e: "#e8743b",                                      // fuoco
  I: "#c2b79a", i: "#efe6cf",                                      // osso, intonaco
  D: "#8a2626", d: "#d23c3c",                                      // rosso
  B: "#a8704a", Q: "#d9a066",                                      // pelle
})
ramps("123456f", "Aa", "HhGgl", "Yy", "Mm", "Vv", "Ss", "qPp", "TtRr", "Ww", "Uu", "on", "Xx",
  "Zz", "Jj", "Cc", "Ee", "Ii", "Dd", "BQ")


// ================================================================ dimensioni
const WM = 269, HM = 392, MI = 4, W = WM * MI, H = HM * MI, N = W * H
const GW = GEO.w, GH = GEO.h, GN = GW * GH, GS = MI / 2       // pixel della mappa per cella di GEO

// ================================================================ raster
const clamp = (v, a, b) => v < a ? a : v > b ? b : v
function boxBlur(src, r, w = W, h = H) {
  const n = w * h, tmp = new Float32Array(n), out = new Float32Array(n), d = 2 * r + 1
  for (let y = 0; y < h; y++) {
    const o = y * w
    let s = 0
    for (let x = -r; x <= r; x++) s += src[o + clamp(x, 0, w - 1)]
    for (let x = 0; x < w; x++) { tmp[o + x] = s / d; s += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)] }
  }
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, h - 1) * w + x]
    for (let y = 0; y < h; y++) { out[y * w + x] = s / d; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x] }
  }
  return out
}
const soften = (a, r, w, h) => boxBlur(boxBlur(a, r, w, h), r, w, h)
// Una griglia di GEO letta in un pixel della mappa, interpolata fra i centri delle celle.
function sampleG(a, x, y) {
  const gx = clamp((x + 0.5) / GS - 0.5, 0, GW - 1.001), gy = clamp((y + 0.5) / GS - 0.5, 0, GH - 1.001)
  const x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0, i = y0 * GW + x0
  return (a[i] * (1 - fx) + a[i + 1] * fx) * (1 - fy) + (a[i + GW] * (1 - fx) + a[i + GW + 1] * fx) * fy
}
// Distanza (px, metrica 1/√2) dal pixel sorgente più vicino.
function distanceTo(src) {
  const D = new Float32Array(N), b = Math.SQRT2
  for (let i = 0; i < N; i++) D[i] = src[i] ? 0 : 1e9
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    let d = D[i]
    if (d === 0) continue
    if (x > 0) d = Math.min(d, D[i - 1] + 1)
    if (y > 0) {
      d = Math.min(d, D[i - W] + 1)
      if (x > 0) d = Math.min(d, D[i - W - 1] + b)
      if (x < W - 1) d = Math.min(d, D[i - W + 1] + b)
    }
    D[i] = d
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x
    let d = D[i]
    if (d === 0) continue
    if (x < W - 1) d = Math.min(d, D[i + 1] + 1)
    if (y < H - 1) {
      d = Math.min(d, D[i + W] + 1)
      if (x < W - 1) d = Math.min(d, D[i + W + 1] + b)
      if (x > 0) d = Math.min(d, D[i + W - 1] + b)
    }
    D[i] = d
  }
  return D
}
// Maggioranza 3x3: toglie i pixel isolati, così la costa non ha briciole.
function majority(m) {
  const out = new Uint8Array(N)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x
    const s = m[i - W - 1] + m[i - W] + m[i - W + 1] + m[i - 1] + m[i] + m[i + 1] + m[i + W - 1] + m[i + W] + m[i + W + 1]
    out[i] = s >= 5 ? 1 : 0
  }
  return out
}
// Componenti connesse (4 vicini) di una maschera su una griglia w x h.
function components(mask, w, h) {
  const id = new Int32Array(w * h).fill(-1), comps = []
  for (let k0 = 0; k0 < w * h; k0++) {
    if (!mask[k0] || id[k0] >= 0) continue
    const c = { cells: [], x0: w, x1: 0, y0: h, y1: 0 }, st = [k0]
    id[k0] = comps.length
    while (st.length) {
      const k = st.pop(), x = k % w, y = (k / w) | 0
      c.cells.push(k); c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); c.y1 = Math.max(c.y1, y)
      for (const j of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1])
        if (j >= 0 && mask[j] && id[j] < 0) { id[j] = comps.length; st.push(j) }
    }
    comps.push(c)
  }
  return { id, comps }
}

// ================================================================ geografia ricalcata
function unrle(row) {
  const out = []
  for (const m of row.matchAll(/(\d*)(\D)/g)) for (let k = 0, n = m[1] ? +m[1] : 1; k < n; k++) out.push(m[2])
  return out
}
const gLand = new Float32Array(GN), gLake = new Float32Array(GN), gForestRaw = new Uint8Array(GN)
const gRelief = new Float32Array(GN), gRiver = new Uint8Array(GN), gDepth = new Float32Array(GN)
for (let v = 0; v < GH; v++) {
  const r = unrle(GEO.rows[v]), rl = unrle(GEO.relief[v]), rv = unrle(GEO.rivers[v]), dp = unrle(GEO.depth[v])
  for (let u = 0; u < GW; u++) {
    const k = v * GW + u, ch = r[u]
    gLand[k] = ch === "." ? 0 : 1
    gLake[k] = ch === "w" ? 1 : 0
    gForestRaw[k] = ch === "f" ? 1 : 0
    gRelief[k] = "abcdefghij".indexOf(rl[u]) / 9
    gRiver[k] = rv[u] === "r" ? 1 : 0
    gDepth[k] = "abc".indexOf(dp[u]) / 2
  }
}
// Le foreste ricalcate hanno buchi dove c'erano scritte e strade: maggioranza 5x5.
const gForest = new Float32Array(GN)
for (let v = 2; v < GH - 2; v++) for (let u = 2; u < GW - 2; u++) {
  let s = 0
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) s += gForestRaw[(v + dy) * GW + u + dx]
  gForest[v * GW + u] = s >= 10 ? 1 : 0
}
// Rilievo: le montagne sono macchie fitte; le scritte lasciano strisce orizzontali sottili.
const gReliefSoft = soften(gRelief, 1, GW, GH)
const gHill = new Float32Array(GN)
{
  const mask = gRelief.map((r) => r >= 3 / 9 ? 1 : 0)
  const { comps } = components(mask, GW, GH)
  for (const c of comps) {
    const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1
    const mountain = c.cells.some((k) => gReliefSoft[k] >= 0.5)
    const bar = h <= 7 && w / h >= 2.2
    if (mountain || (!bar && c.cells.length >= 40)) for (const k of c.cells) gHill[k] = 1
  }
}
const gDepthSoft = soften(gDepth, 3, GW, GH)

// ---------------------------------------------------------------- terra e acqua
let LAND = new Uint8Array(N)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
  LAND[y * W + x] = sampleG(gLand, x, y) + (fbm(x / (1.6 * MI) + 3, y / (1.6 * MI) + 7, 3) - 0.5) * 0.45 > 0.5 ? 1 : 0
LAND = majority(majority(LAND))
const LAKE = new Uint8Array(N)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x
  LAKE[i] = LAND[i] && sampleG(gLake, x, y) + (fbm(x / MI + 9, y / MI, 2) - 0.5) * 0.25 > 0.5 ? 1 : 0
}
const WET = new Uint8Array(N)
for (let i = 0; i < N; i++) WET[i] = LAND[i] && !LAKE[i] ? 0 : 1
const DL = distanceTo(WET)                          // nella terra: distanza dall'acqua
const DS = distanceTo(LAND)                         // nel mare: distanza dalla terra
const DLAKE = distanceTo(LAKE)

// Isole: componenti della terra, ognuna col nome del seme che contiene.
const ISLAND_SEEDS = [
  [1, 150, 300], [2, 210, 150], [2, 165, 100], [3, 110, 200], [4, 40, 130], [5, 35, 255], [6, 235, 315], [7, 38, 368],
  [8, 100, 35], [8, 148, 30], [8, 141, 48], [8, 66, 66], [8, 164, 8], [9, 200, 32], [9, 219, 19],
]
const ISL = new Uint8Array(N)
{
  const { id, comps } = components(LAND, W, H)
  const name = new Uint8Array(comps.length)
  for (const [n, u, v] of ISLAND_SEEDS) { const c = id[Math.round(v * MI) * W + Math.round(u * MI)]; if (c >= 0) name[c] = n }
  comps.forEach((c, k) => {
    if (!name[k]) {
      const cx = (c.x0 + c.x1) / 2 / MI, cy = (c.y0 + c.y1) / 2 / MI
      name[k] = cy < 45 && cx > 170 ? 9 : cy < 60 && cx < 175 ? 8 : 10
    }
    for (const i of c.cells) ISL[i] = name[k]
  })
}

// ---------------------------------------------------------------- quota
const E = new Float32Array(N)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x
  if (!LAND[i]) continue
  const u = x / MI, v = y / MI
  E[i] = 0.1 * Math.min(1, DL[i] / (10 * MI)) + 1.05 * sampleG(gReliefSoft, x, y) + 0.12 * (fbm(u / 6 + 40, v / 6 + 40, 3) - 0.5)
}

// ---------------------------------------------------------------- fiumi
// Ogni cella di fiume si lega con una linea di 1 px alle celle di fiume vicine.
const RIVER = new Uint8Array(N)
for (let v = 0; v < GH; v++) for (let u = 0; u < GW; u++) {
  if (!gRiver[v * GW + u]) continue
  const ax = Math.round((u + 0.5) * GS), ay = Math.round((v + 0.5) * GS)
  for (const [du, dv] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
    if (!gRiver[(v + dv) * GW + u + du]) continue
    const bx = Math.round((u + du + 0.5) * GS), by = Math.round((v + dv + 0.5) * GS)
    for (let s = 0, n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); s <= n; s++) {
      const i = Math.round(ay + (by - ay) * s / n) * W + Math.round(ax + (bx - ax) * s / n)
      if (LAND[i] && !LAKE[i]) RIVER[i] = 1
    }
  }
}
const DRIV = distanceTo(RIVER)

// ---------------------------------------------------------------- regioni a mano (miglia): [u, v, raggio u, raggio v]
const SWAMPS = [[34, 256, 7, 3.5], [88, 304, 9, 4], [151, 314, 8, 3], [188, 224, 5, 3], [125, 234, 4, 4], [36, 114, 6, 5]]
const MOORS = [[98, 342, 10, 4]]
const SALT = [[70, 368, 4, 11]]
const PINE_ZONES = [[155, 235, 26, 22]]
const inEllipse = (list, u, v, wobble) => list.some(([cu, cv, ru, rv]) => ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2 < 1 + wobble)

// ---------------------------------------------------------------- biomi
const B = { mare: 0, lago: 1, spiaggia: 3, pianura: 4, campi: 5, foresta: 6, conifere: 7, colline: 8,
  montagne: 9, vette: 10, brughiera: 11, palude: 12, brulle: 13, scogliera: 14 }
const TM = 0.5, TS = 1.02
const FARM_R = { capitale: 8, citta: 5, caer: 4, villaggio: 3 }
const FARMS = LUOGHI.filter(([, t]) => FARM_R[t]).map(([, t, u, v]) => [u, v, FARM_R[t]])
const TOWNS = LUOGHI.filter(([, t]) => FARM_R[t] || t === "rovina").map(([, , u, v]) => [u, v])
const farmAt = (u, v) => {
  const k = 0.55 + 0.9 * fbm(u / 5 + 3, v / 5 + 8, 3)
  return FARMS.some(([fu, fv, r]) => (u - fu) ** 2 + (v - fv) ** 2 < (r * k) ** 2)
}
const BIO = new Uint8Array(N)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, u = x / MI, v = y / MI
  if (!LAND[i]) { BIO[i] = B.mare; continue }
  if (LAKE[i]) { BIO[i] = B.lago; continue }
  const e = E[i], isl = ISL[i], wob = (fbm(u / 3 + 5, v / 3, 3) - 0.5) * 0.9
  let b = B.pianura
  const north = v < 125 || isl === 4 || isl === 8 || isl === 9 || inEllipse(PINE_ZONES, u, v, wob)
  if (e > TS) b = B.vette
  else if (e > TM) b = B.montagne
  else if (inEllipse(SWAMPS, u, v, wob)) b = B.palude
  else if (sampleG(gForest, x, y) > 0.5) b = north ? B.conifere : B.foresta
  else if (sampleG(gHill, x, y) > 0.5) b = B.colline
  else if (inEllipse(MOORS, u, v, wob)) b = B.brughiera
  else if (inEllipse(SALT, u, v, wob)) b = B.brulle
  else if (farmAt(u, v)) b = B.campi
  if (DL[i] <= 1.5 * MI / 2 && b !== B.palude) {
    if (e > 0.4) b = B.scogliera
    else if (e < 0.3 && fbm(u / 8 + 5, v / 8 + 5, 3) > 0.55 && b !== B.montagne) b = B.spiaggia
  }
  BIO[i] = b
}

// ---------------------------------------------------------------- controlli
// Un luogo finito in acqua (o in un lago) va spostato nella tabella: qui si dice dove.
const AT_SEA = new Set(["Kressilacc", "Luce negli abissi", "Torre sommersa di Flamsterd", "Caer Allisynn", "Caer Allisynn (seconda posizione)"])
{
  const wet = []
  for (const [name, type, u, v] of LUOGHI) {
    const i = Math.round(v * MI) * W + Math.round(u * MI)
    if (LAND[i] && !LAKE[i]) continue
    if (AT_SEA.has(name)) continue
    let best = null
    for (let r = 1; r < 40 && !best; r++) for (let a = 0; a < 24 && !best; a++) {
      const x = Math.round(u * MI + Math.cos(a * Math.PI / 12) * r), y = Math.round(v * MI + Math.sin(a * Math.PI / 12) * r)
      if (LAND[y * W + x] && !LAKE[y * W + x]) best = [(x / MI).toFixed(1), (y / MI).toFixed(1)]
    }
    wet.push(`${name} (${u}, ${v}) è in acqua → ${best}`)
  }
  if (wet.length) console.error("LUOGHI IN ACQUA:\n" + wet.join("\n"))
  const count = new Array(16).fill(0)
  for (let i = 0; i < N; i++) count[BIO[i]]++
  console.error("biomi (px):", Object.entries(B).map(([k, v]) => `${k} ${count[v]}`).join(", "))
}

// ================================================================ sprite del terreno
// Luce da nord-ovest (in alto a sinistra), come su ogni carta: il versante sinistro è chiaro.
sprite("_mtn_l", { pivot: "bottom", outline: "T" }, `
  ......r......
  .....rrt.....
  ....rrRtt....
  ...rrRRttt...
  ..rrRRRttttT.
  .rrRRRRtttTT.
  rrRRRRttttTTT`)
sprite("_mtn_m", { pivot: "bottom", outline: "T" }, `
  ....r....
  ...rrt...
  ..rrRtt..
  .rrRRttT.
  rrRRRttTT`)
sprite("_mtn_s", { pivot: "bottom", outline: "T" }, `
  ...r...
  ..rRt..
  .rRRtt.
  rRRtttT`)
sprite("_mtn_d", { pivot: "bottom", outline: "T" }, `
  ....r............
  ...rrt......r....
  ..rrRtt....rrt...
  .rrRRttt..rrRtt..
  rrRRRtttTrrRRtttT
  rRRRRttTrrRRRttTT
  RRRRtttrRRRRttTTT`)
sprite("_mtn_l_neve", { base: "_mtn_l" }, grid(5, 1, `
  ..w..
  .wwW.
  wwwWt
  wr.W.`))
sprite("_mtn_d_neve", { base: "_mtn_d" }, grid(3, 1, `
  ..w..
  .wwW.
  wwrWt`), grid(12, 2, `
  .w.
  wwW`))

sprite("_hill_a", { pivot: "bottom" }, `
  ..llll...
  .lggggGG.
  lgggggGGh
  .GGGGhhh.`)
sprite("_hill_b", { pivot: "bottom" }, `
  ..lll..
  .lgggG.
  lggggGh
  .GGhhh.`)
sprite("_hill_a_moor", { base: "_hill_a", swap: { l: "m", g: "M", G: "V", h: "V" } })
sprite("_hill_b_moor", { base: "_hill_b", swap: { l: "m", g: "M", G: "V", h: "V" } })
sprite("_hill_a_neve", { base: "_hill_a", swap: { l: "w", g: "W", G: "R", h: "t" } })

// Chiome tonde: un ammasso scuro sotto, il corpo medio, la cima chiara verso la luce.
sprite("_tree_a", { pivot: "bottom" }, `
  .lgg.
  lgggG
  gGGGh
  .hHh.
  ..o..`)
sprite("_tree_b", { pivot: "bottom" }, `
  .lg.
  lggG
  GGGh
  .oH.`)
sprite("_tree_c", { pivot: "bottom" }, `
  ..lg..
  .lgggG
  lggGGh
  GGGGhh
  .hHoH.`)
sprite("_pine_a", { pivot: "bottom" }, `
  ..p..
  .pPq.
  .pPq.
  ppPqq
  .qoq.`)
sprite("_pine_b", { pivot: "bottom" }, `
  .p.
  .pq
  pPq
  pPq
  .o.`)
sprite("_pine_c", { pivot: "bottom" }, `
  ...p...
  ..pPq..
  ..pPq..
  .ppPqq.
  .pPPqq.
  ppPPqqq
  ..qoq..`)
sprite("_reed_a", { pivot: "bottom" }, `
  l.l.
  G.lG
  GGG.`)
sprite("_reed_b", { pivot: "bottom" }, `
  .l.
  lG.
  G.G`)
sprite("_rock_a", { pivot: "bottom" }, `
  .r.
  rRt
  RtT`)
sprite("_rock_b", { pivot: "bottom" }, `
  rR
  Rt`)
sprite("_wave_a", ".33.\n3..3")
sprite("_wave_b", ".333..\n3...33")


// ---------------------------------------------------------------- piazzamento
// Griglia sfalsata con uno scarto pseudo-casuale: alberi fitti ma senza righe visibili.
function placements(step, rowStep, jitter, seed, pick) {
  const out = []
  for (let gy = 0, row = 0; gy < H; gy += rowStep, row++)
    for (let gx = (row % 2) * step / 2; gx < W; gx += step) {
      const x = Math.round(gx + (hash(gx * 3 + seed, gy) - 0.5) * jitter), y = Math.round(gy + (hash(gx, gy * 7 + seed) - 0.5) * jitter)
      if (x < 2 || y < 4 || x > W - 3 || y > H - 2) continue
      const name = pick(x, y, y * W + x, hash(x + seed, y))
      if (name) out.push([name, x, y])
    }
  return out
}
// Intorno a città e rovine il bosco è tagliato.
const clearing = (u, v) => TOWNS.some(([tu, tv]) => (u - tu) ** 2 + (v - tv) ** 2 < 2.2)
const TREES = placements(4, 3, 2, 1, (x, y, i, h) => {
  const b = BIO[i]
  if (b !== B.foresta && b !== B.conifere) return null
  if (DRIV[i] < 3 || DLAKE[i] < 3 || DL[i] < 2 || clearing(x / MI, y / MI)) return null
  if (b === B.conifere) return h < 0.4 ? "_pine_a" : h < 0.75 ? "_pine_b" : "_pine_c"
  return h < 0.45 ? "_tree_a" : h < 0.8 ? "_tree_b" : "_tree_c"
})
const RELIEF = [
  ...placements(10, 6, 5, 2, (x, y, i, h) => {
    const b = BIO[i]
    if (b === B.vette) return h < 0.5 ? "_mtn_l_neve" : "_mtn_d_neve"
    if (b !== B.montagne || DL[i] < 2) return null
    if (E[i] > 0.7) return h < 0.6 ? "_mtn_l" : "_mtn_d"
    return h < 0.5 ? "_mtn_m" : "_mtn_s"
  }),
  ...placements(10, 6, 3, 3, (x, y, i, h) => {
    if (BIO[i] !== B.colline || DRIV[i] < 3 || DL[i] < 3) return null
    return h < 0.55 ? "_hill_a" : "_hill_b"
  }),
  ...placements(7, 5, 3, 4, (x, y, i, h) => {
    if (BIO[i] === B.palude && h < 0.55 && DRIV[i] > 2) return h < 0.3 ? "_reed_a" : "_reed_b"
    if (BIO[i] === B.brughiera && h < 0.22) return h < 0.11 ? "_hill_b_moor" : "_rock_b"
    if (BIO[i] === B.brulle && h < 0.2) return "_rock_b"
    return null
  }),
]
const WAVES = placements(30, 20, 14, 5, (x, y, i, h) =>
  !LAND[i] && DS[i] > 6 * MI && sampleG(gDepthSoft, x, y) > 0.55 && h < 0.45 ? (h < 0.2 ? "_wave_b" : "_wave_a") : null)
console.error(`alberi ${TREES.length}, rilievi ${RELIEF.length}, onde ${WAVES.length}`)

// ================================================================ colori del suolo
const bandKey = (t, keys, edges) => { let k = 0; while (k < edges.length && t > edges[k]) k++; return keys[k] }
// Esposizione al mare aperto: quanta terra c'è nel raggio di ~10 miglia. Poca = onde e schiuma.
const landNear = soften(Float32Array.from(LAND), 20)
// Rilievo: il versante che guarda a nord-ovest prende la luce.
const slope = (i) => (E[i + 1] - E[i - 1]) + (E[i + W] - E[i - W])

// I fondali vengono dalla mappa ricalcata (bassi, medi, profondi), sfumati col retino.
function seaKey(x, y, i) {
  const u = x / MI, v = y / MI
  if (DS[i] <= 1) return landNear[i] < 0.12 && fbm(u / 3, v / 3, 2) > 0.5 ? "f" : "6"
  const d = sampleG(gDepthSoft, x, y) * 2 + Math.min(1, DS[i] / (14 * MI)) * 0.45 + (fbm(u / 9 + 8, v / 9, 3) - 0.5) * 0.15
  return bandKey(d + (bayer(x, y) - 0.5) * 0.22, "54321", [0.38, 0.85, 1.4, 1.95])
}
function landKey(x, y, i) {
  const b = BIO[i], u = x / MI, v = y / MI, e = E[i], dith = bayer(x, y) - 0.5
  const s = slope(i) * 22 + dith * 0.5
  switch (b) {
    case B.spiaggia: return DL[i] <= 1 ? "A" : "a"
    case B.scogliera: return DL[i] <= 1 ? "T" : "t"
    case B.vette: return s > 0.2 ? "w" : "W"
    case B.montagne: return s > 0.3 ? "r" : s > -0.2 ? "R" : "t"
    case B.foresta: return "h"
    case B.conifere: return "q"
    case B.palude: {
      const pool = fbm(u / 1.6 + 11, v / 1.6 + 7, 3)
      return pool > 0.66 ? "4" : pool > 0.6 ? "S" : "s"
    }
    case B.brughiera: {
      const heather = fbm(u / 2.5 + 31, v / 2.5 + 3, 3) + dith * 0.08
      return heather > 0.66 ? "v" : s < -0.25 ? "M" : "m"
    }
    case B.brulle: return fbm(u / 2, v / 2, 3) + dith * 0.1 > 0.5 ? "a" : "u"
    case B.campi: {
      // Campi con siepi: strisce di ~1 miglio, una coltura ciascuna.
      const cy = Math.floor(v / 0.9), cx = Math.floor(u / 1.3 + hash(cy, 7) * 3), fu = u / 1.3 + hash(cy, 7) * 3 - cx
      if (fu < 0.2 && hash(cx, cy + 50) < 0.6) return "G"
      const crop = hash(cx, cy)
      return crop < 0.22 ? "y" : crop < 0.6 ? "l" : "g"
    }
    case B.colline: return s > 0.25 ? "l" : s < -0.3 ? "G" : "g"
    default: {
      const wet = fbm(u / 7 + 7, v / 7 + 2, 3) + dith * 0.07 - Math.min(0.2, 1.5 / (1 + DRIV[i]))
      return e > 0.3 && s > 0.15 ? "l" : wet < 0.42 ? "G" : wet > 0.6 ? "l" : "g"
    }
  }
}
const notLake = new Uint8Array(N)
for (let i = 0; i < N; i++) notLake[i] = LAKE[i] ? 0 : 1
const distLakeShore = distanceTo(notLake)
const lakeKey = (i) => distLakeShore[i] <= 1 ? "5" : distLakeShore[i] < 2 * MI ? "4" : "3"

// ================================================================ nomi
// Ogni nome è uno sprite col font 5x7 e un bordo d'inchiostro: si legge su qualunque terreno.
// [testo, u, v, scala, colore, spaziatura]: isole in osso, regni in oro, acque in azzurro.
const LABELS = [
  ["GWYNNETH", 153, 335, 2, "i"], ["ALARON", 222, 213, 2, "i"], ["OMAN", 129, 177, 2, "i"], ["NORLAND", 41, 91, 2, "i"],
  ["MORAY", 24, 247, 2, "i"], ["SNOWDOWN", 242, 337, 1, "i"], ["FLAMSTERD", 38, 370, 1, "i"],
  ["ISOLE NORHEIM", 116, 14, 1, "i"], ["ARCIPELAGO DI KORINN", 196, 21, 1, "i"],
  ["SARIFAL", 136, 289, 2, "z"], ["GNARHELM", 162, 120, 1, "z"], ["CALLIDYRR", 224, 153, 1, "z"], ["NORHEIM", 126, 23, 1, "z"],
  ["GRONDSGRUNN", 22, 177, 1, "z"], ["VOR THOMIL", 126, 198, 1, "z"], ["STAGFORD", 189, 162, 1, "z"], ["TALFFOLK", 228, 170, 1, "z"],
  ["STIRGEWICK", 225, 194, 1, "z"], ["TEARGLADE", 238, 189, 1, "z"],
  ["JOTUNHAMMER DEL NORD", 26, 127, 1, "i"], ["JOTUNHAMMER DEL SUD", 27, 186, 1, "i"], ["CATENA GIANTSPINE", 104, 37, 1, "i"],
  ["HARDANGHEIGHT", 169, 96, 1, "i"], ["MONTI LISBUNT", 229, 94, 1, "i"], ["CATENA DI FAIRHEIGHT", 214, 113, 1, "i"],
  ["ALTIPIANI DI GRAMPALT", 107, 212, 1, "i"], ["CATENA TROLLDAW", 16, 234, 1, "i"], ["MONTI ORCSKILL", 34, 282, 1, "i"],
  ["MONTI NERI", 95, 258, 1, "i"], ["ASPENHEIGHT", 83, 282, 1, "i"], ["MONTI CAMBRO", 160, 292, 1, "i"], ["LE ALTURE", 126, 311, 1, "i"],
  ["ALTURE DI DAFYD", 171, 339, 1, "i"], ["ALTURE DI ANDOVER", 224, 318, 1, "i"],
  ["WINTERGLEN", 151, 237, 1, "i"], ["VALLE DI MYRLOCH", 124, 270, 1, "i"], ["FORESTA DI DERNALL", 199, 171, 1, "i"],
  ["FORESTA SOMMERSA", 191, 184, 1, "i"], ["BOSCO DI TORRIAGE", 240, 179, 1, "i"], ["BOSCO DI RUSHDOWN", 231, 224, 1, "i"],
  ["BOSCO DELLA VECCHIA PIETRA", 89, 181, 1, "i"], ["FORESTA DI LLYRATH", 142, 343, 1, "i"], ["BOSCHETTO DEI FUNGHI", 80, 293, 1, "i"],
  ["PALUDE DI BREASAL", 34, 256, 1, "i"], ["TORBIERE DI MEIRIG", 87, 304, 1, "i"], ["ACQUITRINI DEL FALLON", 151, 314, 1, "i"],
  ["PANTANO DI TAEYA", 188, 224, 1, "i"], ["BRUGHIERA DI KIMBALL", 97, 341, 1, "i"], ["SALINE DI DWYRACH", 70, 368, 1, "i"],
  ["FROSTFENN", 34, 115, 1, "i"], ["TERRE AMMANTATE", 101, 302, 1, "i"],
  ["GRANDE CAPO SUD", 219, 272, 1, "i"], ["CAPO NORD", 79, 152, 1, "i"], ["TESTA DI DRAGO", 122, 381, 1, "i"], ["ULTIMO CAPO", 24, 305, 1, "i"],
  ["MARE DI MOONSHAE", 104, 112, 1, "f", 2], ["MARE DI MOONSHAE", 58, 212, 1, "f", 2], ["MARE SENZA TRACCE", 32, 318, 1, "f", 2],
  ["MARE DELLE SPADE", 247, 267, 1, "f", 2], ["MARE DELLE SPADE", 238, 366, 1, "f", 2], ["MYRLOCH", 134, 297, 1, "f"],
  ["STRETTO DI ALARON", 195, 262, 1, "6"], ["STRETTO DI OMAN", 106, 230, 1, "6"], ["STRETTO SENZA TRACCE", 17, 211, 1, "6"],
  ["STRETTO DEL VENTO DEL NORD", 119, 47, 1, "6"], ["CANALE DEL PRINCIPE", 137, 146, 1, "6"], ["BAIA DI WHITEFISH", 229, 142, 1, "6"],
  ["BAIA DEI SALMONI", 185, 85, 1, "6"], ["BAIA DI NORLAND", 74, 137, 1, "6"], ["BAIA DI FERRO", 104, 185, 1, "6"],
  ["FIRTH DI CORWELL", 119, 325, 1, "6"], ["PORTO DI LLEWELLYN", 207, 250, 1, "6"], ["KINGSBAY", 200, 328, 1, "6"],
  ["ABISSO DI LOTAN", 58, 328, 1, "6"], ["SCOGLIERE DI OSSIAN", 17, 268, 1, "6"], ["DEEPVALE", 247, 125, 1, "6"],
  ["AMARUNE", 252, 68, 1, "6"], ["TIR FAOI THOINN", 194, 356, 1, "6"], ["KRESSILACC", 134, 166, 1, "f"],
]
const labelStamps = LABELS.map(([txt, lu, lv, scale, col, gap = 1], n) => {
  const name = "_nome_" + n
  sprite(name, { w: txt.length * 6 * scale * (gap + 1), h: 8 * scale, crop: true, outline: "k", pivot: "center" },
    text(0, 0, txt, col, { font: "5x7", scale, gap }))
  return stamp(name, Math.round(lu * MI), Math.round(lv * MI))
})

// ================================================================ la mappa
scene("moonshae", { w: W, h: H, bg: "1", layers: true, world: { light: [-0.7, -1] } },
  layer("mare", (c) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!LAND[i]) c.px(x, y, seaKey(x, y, i)) }
  }, ...WAVES.map(([n, x, y]) => stamp(n, x, y))),
  layer("terra", (c) => {
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (LAND[i] && !LAKE[i]) c.px(x, y, landKey(x, y, i)) }
  }),
  layer("fiumi", (c) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (LAKE[i]) c.px(x, y, lakeKey(i))
      else if (RIVER[i]) c.px(x, y, "4")
    }
  }),
  layer("foreste", { sort: "y" }, ...TREES.map(([n, x, y]) => stamp(n, x, y))),
  layer("rilievi", { sort: "y" }, ...RELIEF.map(([n, x, y]) => stamp(n, x, y))),
  layer("nomi", ...labelStamps))

// Dati per l'app: 1 px per miglio, colore = bioma e isola. Letto da un canvas, mai mostrato.
scene("moonshae_dati", { w: WM, h: HM, bg: "#000000" }, (c) => {
  for (let v = 0; v < HM; v++) for (let u = 0; u < WM; u++) {
    const i = (v * MI + MI / 2) * W + u * MI + MI / 2
    const r = BIO[i] * 12, g = LAND[i] ? ISL[i] * 20 : 0
    c.px(u, v, "#" + [r, g, 0].map((n) => n.toString(16).padStart(2, "0")).join(""))
  }
})

// ================================================================ icone dei punti di interesse
// 11 px al massimo, contorno d'inchiostro: devono leggersi sopra qualunque terreno della mappa.
const ICON = { outline: "k", pivot: "center" }
sprite("_house", `
  ..x..
  .xxX.
  xxxXX
  .iiI.
  .itI.`)
sprite("_hut", `
  .xX.
  xxXX
  .iI.
  .tI.`)
sprite("icona_capitale", ICON, `
  .....Izzz..
  .....Izzz..
  .....I.....
  .x.r.r.R.x.
  xxXrrrrRxxX
  rRRrrrRRrRR
  rRRrrrRRrRR
  rRRrrtRRrRR
  rRRrrrRRrRR
  rRRrtTtRrRR
  rRRrtTtRrRR`)
sprite("icona_caer", ICON, `
  r.r.....r.r
  rRR.....rRR
  rRRr.r.RrRR
  rRRrrrrRrRR
  rRRrrtrRrRR
  rRRrrrrRrRR
  rRRrtTtRrRR
  rRRrtTtRrRR`)
sprite("icona_citta", { ...ICON, w: 11, h: 9 }, stamp("_house", 3, 0), stamp("_house", 0, 4), stamp("_house", 6, 4))
sprite("icona_villaggio", { ...ICON, w: 9, h: 7 }, stamp("_house", 0, 2), stamp("_hut", 5, 3))
sprite("icona_porto", ICON, `
  ...rrR...
  ...r.R...
  ...rrR...
  ....R....
  .rrrRRRR.
  ....R....
  r...R...R
  rR..R..RR
  .rR.R.RR.
  ..rrRRR..`)
sprite("icona_rovina", ICON, `
  .r.....r.
  .rR....rR
  .rR..r.rR
  .rR..rRrR
  .rR..rRrR
  .rR.r.rR.
  rtRrrRRtt`)
sprite("icona_dungeon", ICON, `
  ...rrrR....
  ..rrRRRt...
  .rrRTTTRt..
  .rRTkkkTt..
  rrRTkkkTtt.
  rRRTkkkTttt
  rRRTkkkTttT`)
sprite("icona_tempio", ICON, `
  .....r.....
  ...rrrrR...
  .rrrrrrrRR.
  rrrrrrrrrRR
  .rTrTrTrTR.
  .rTrTrTrTR.
  .rTrTrTrTR.
  rrrrrrrrrRR
  RRRRRRRRRRt`)
sprite("icona_pozzo_lunare", ICON, `
  .....ii....
  ....i......
  ....i......
  .....ii....
  ...rrrrR...
  .rrcccccRR.
  rRcccccCCRt
  rRRcCCCCRRt
  .rRRRRRRRt.
  ...RRRttt..`)
sprite("icona_cerchio", ICON, `
  ...r...r...
  ..rR..rR...
  r.rt..rt..r
  rR....r..rR
  rR...rR..rR
  Rt...Rt..Rt`)
sprite("icona_torre", ICON, `
  ....j....
  ...jjJ...
  ..jjjJJ..
  .jjjjJJJ.
  ...rRR...
  ...rRR...
  ...rjR...
  ...rRR...
  ...rRR...
  ..rrRRR..
  .rrRRRRt.`)
sprite("icona_accampamento", ICON, `
  ...n.......
  ..yyY......
  .yyyYY.....
  .yyoYYY..e.
  yyyoYYYY.ee
  yyooYYYY.eE
  ........nEn`)
sprite("icona_tana", ICON, `
  ..iiiii..
  .iiiiiiI.
  iiiiiiiiI
  ikkiikkiI
  ikkiikkiI
  .iiikiiI.
  ..iiiiI..
  ..iIiIi..`)
sprite("icona_battaglia", ICON, `
  r.........r
  .r.......r.
  ..r.....r..
  ...r...r...
  ....r.r....
  .....r.....
  ..z.r.r.z..
  ...z...z...
  ..n.z.z.n..
  .n.......n.
  z.........z`)
sprite("icona_tesoro", ICON, `
  .nnnnnnnnn.
  nnnzzzzznno
  nnnznnnznno
  ooozZzZzooo
  nnnzZzZznno
  nnnznnnznno
  ooozzzzzooo`)
sprite("icona_missione", ICON, `
  .zzZ.
  .zzZ.
  .zzZ.
  .zZZ.
  ..Z..
  .....
  .zzZ.
  .zZZ.`)
sprite("icona_png", ICON, `
  ...ooo...
  ..oQQQo..
  ..QQQQB..
  ..QQQBB..
  ...QBB...
  .xxxxxXX.
  xxxxxxXXX
  xxxxxxXXX`)
// Lo scafo affonda di prua, l'albero spezzato pende verso il mare.
sprite("icona_relitto", ICON, `
  n..........
  .n.........
  ..n......nn
  ...n...nnno
  ....nnnnnoo
  ..nnnnnooo.
  5onnnoooo5.
  .5.5.5.5.5.`)
sprite("icona_faro", ICON, `
  ....X....
  ...xXX...
  .z.zzZ.z.
  ..rrrRR..
  ...iiI...
  ...xxX...
  ...iiI...
  ..xxxXX..
  ..iiiII..
  .rrrrRRR.`)
sprite("icona_portale", ICON, `
  ..rrrR...
  .rRjjRt..
  rRjJJjRt.
  rjJjjJjt.
  rjJjJJjt.
  rjjJJjjt.
  rjjjjjjt.
  rRt..rRt.`)
sprite("icona_bosco_sacro", ICON, `
  ...lgggg...
  .llggcgGG..
  lggglgggGGh
  lgglggggGGh
  ggcgggGGGhh
  .GGGGGGhhh.
  ...hoooh...
  ....ono....
  ...oo.oo...`)
sprite("icona_gruppo", ICON, `
  .z.......
  .ndddddD.
  .nddzzdD.
  .ndzzzdDD
  .nddzddD.
  .ndddDD..
  .n.......
  .n.......
  .n.......
  nnn......`)
sprite("icona_nave", ICON, `
  .....n.....
  ....ii.....
  ...iiiI....
  ..iiiiII...
  .iiiiiII...
  .....n.....
  nnnnnnnnnno
  .onnnnnnno.
  ..ooooooo..`)
sprite("icona_segnaposto", ICON, `
  ..ddd..
  .dddDD.
  ddiddDD
  dddddDD
  .ddddD.
  ..dDD..
  ..dD...
  ...D...`)
sheet("icone", ["icona_*"], { pad: 1 })

// Prova di leggibilità: ogni icona su erba, foresta, mare e roccia.
const ICONE = ["capitale", "caer", "citta", "villaggio", "porto", "rovina", "dungeon", "tempio", "pozzo_lunare",
  "cerchio", "torre", "accampamento", "tana", "battaglia", "tesoro", "missione", "png", "relitto", "faro", "portale",
  "bosco_sacro", "gruppo", "nave", "segnaposto"]
scene("test_icone", { w: ICONE.length * 16 + 4, h: 72, bg: "g" },
  rect(0, 18, ICONE.length * 16 + 4, 18, "h"), rect(0, 36, ICONE.length * 16 + 4, 18, "3"), rect(0, 54, ICONE.length * 16 + 4, 18, "R"),
  ...ICONE.flatMap((n, k) => [0, 1, 2, 3].map((r) => stamp("icona_" + n, 10 + k * 16, 9 + r * 18))))

// Icona della scheda del browser: il castello della capitale sul mare.
sprite("favicon", { w: 16, h: 16 }, rect(0, 0, 16, 16, "2"), rect(0, 12, 16, 4, "3"), stamp("icona_capitale", 8, 8))
