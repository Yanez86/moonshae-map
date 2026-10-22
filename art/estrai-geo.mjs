// Estrae la geografia dalla mappa di riferimento (lo screenshot della mappa delle Moonshae, 1290x2117,
// non incluso nel repository) e la scrive in art/geo.px.js, a 2 px per miglio:
//   rows    . mare, w lago, l terra, f foresta
//   relief  a-j densità del tratteggio delle montagne
//   rivers  r tratti di fiume
//   depth   a-c profondità del mare (bassa, media, alta)
// Uso: node art/estrai-geo.mjs <mappa.jpg> [cartella per l'immagine di controllo]
// Serve Playwright con Chromium (PLAYWRIGHT_CHROMIUM per un eseguibile diverso).
import { chromium } from "playwright"
import fs from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
const [img, outDir = "."] = process.argv.slice(2)
const b = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {})
const p = await b.newPage()
p.on("console", (m) => console.log(m.text()))
const data = fs.readFileSync(img).toString("base64")
const out = await p.evaluate(async (d) => {
  const i = new Image(); i.src = "data:image/jpeg;base64," + d; await i.decode()
  const SW = i.width, SH = i.height, Y0 = 221, PPM = 4.8, MI = 2
  const c = document.createElement("canvas"); c.width = SW; c.height = SH
  const g = c.getContext("2d"); g.drawImage(i, 0, 0)
  const px = g.getImageData(0, 0, SW, SH).data
  const S = 1.0583 // coordinate dello screenshot visto -> originale
  // zone sopra il mare da trattare come mare: legenda, rose dei venti, barre di scala
  const SEA = [[70, 250, 320, 385], [1095, 285, 1160, 410], [25, 1700, 100, 1840], [690, 1905, 1170, 1945], [1175, 450, 1205, 960]]
    .map((r) => r.map((v) => v * S))
  const SUNK = [[770, 1775, 1000, 1860], [20, 1905, 200, 1965]].map((r) => r.map((v) => v * S))
  const W = Math.round(SW / PPM * MI), H = Math.round((SH - Y0) / PPM * MI)
  const N = SW * SH
  const cls = new Uint8Array(N)   // 0 acqua, 1 terra, 2 foresta, 9 ignoto
  const lumA = new Float32Array(N)
  for (let k = 0; k < N; k++) {
    const r = px[k * 4], gg = px[k * 4 + 1], bb = px[k * 4 + 2], lum = (r + gg + bb) / 3
    lumA[k] = lum
    let v = 9
    if (lum > 100 && lum < 238 && bb - r > 2 && bb - gg > -13) v = 0
    else if (lum > 95 && lum < 240 && gg - r > 6 && gg - bb > 12 && lum < 200) v = 2
    else if (lum > 95 && lum < 240 && (r - bb > 12 || gg - bb > 14)) v = 1
    cls[k] = v
  }
  const inR = (R, x, y) => R.some(([a, b2, c2, d2]) => x >= a && x <= c2 && y >= b2 && y <= d2)
  const cls0 = cls.slice()
  // profondità: 0 bassa, 1 media, 2 alta, 9 ignota (testo, aloni, linee)
  const dep = new Uint8Array(N).fill(9)
  for (let k = 0; k < N; k++) if (cls0[k] === 0) { const l = lumA[k]; dep[k] = l >= 200 ? 0 : l >= 179 ? 1 : l >= 150 ? 2 : 9 }
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const k = y * SW + x
    if (y < Y0 || inR(SEA, x, y)) { cls[k] = 0; dep[k] = 1 }
    else if (inR(SUNK, x, y)) cls[k] = 0
  }
  // riempi gli ignoti dalla maggioranza dei vicini noti
  for (let pass = 0; pass < 14; pass++) {
    let left = 0
    const next = cls.slice()
    for (let y = 1; y < SH - 1; y++) for (let x = 1; x < SW - 1; x++) {
      const k = y * SW + x
      if (cls[k] !== 9) continue
      const n = [0, 0, 0]
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = cls[k + dy * SW + dx]; if (v < 3) n[v]++ }
      const best = n[0] >= n[1] + n[2] ? 0 : n[2] > n[1] ? 2 : 1
      if (n[0] + n[1] + n[2]) next[k] = best; else left++
    }
    cls.set(next)
    if (!left) break
  }
  for (let pass = 0; pass < 20; pass++) {
    const next = dep.slice()
    for (let y = 1; y < SH - 1; y++) for (let x = 1; x < SW - 1; x++) {
      const k = y * SW + x
      if (dep[k] !== 9) continue
      const n = [0, 0, 0]
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = dep[k + dy * SW + dx]; if (v < 3) n[v]++ }
      if (n[0] + n[1] + n[2]) next[k] = n.indexOf(Math.max(...n))
    }
    dep.set(next)
  }
  // rilievo: tratteggio marrone (varianza locale alta su toni bruni)
  const LABELS = [[640, 1688, 765, 1745], [955, 1165, 1040, 1200], [70, 1310, 150, 1345], [1040, 1680, 1160, 1745], [535, 1000, 640, 1055]]
    .map((r) => r.map((v) => v * S))
  const shadow = new Uint8Array(N)
  for (let k = 0; k < N; k++) {
    const r = px[k * 4], gg = px[k * 4 + 1], bb = px[k * 4 + 2], lum = (r + gg + bb) / 3
    shadow[k] = lum > 55 && lum < 165 && r - bb > 22 && r - gg < 38 && r - gg > 4 ? 1 : 0
  }
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (LABELS.some(([a, b2, c2, d2]) => x >= a && x <= c2 && y >= b2 && y <= d2)) shadow[y * SW + x] = 0
  const I = new Uint32Array((SW + 1) * (SH + 1))
  for (let y = 0; y < SH; y++) { let row = 0; for (let x = 0; x < SW; x++) { row += shadow[y * SW + x]; I[(y + 1) * (SW + 1) + x + 1] = I[y * (SW + 1) + x + 1] + row } }
  const RR = 6, relief = new Float32Array(N)
  for (let y = RR; y < SH - RR; y++) for (let x = RR; x < SW - RR; x++) {
    const a = I[(y - RR) * (SW + 1) + x - RR], b2 = I[(y - RR) * (SW + 1) + x + RR + 1], c2 = I[(y + RR + 1) * (SW + 1) + x - RR], d2 = I[(y + RR + 1) * (SW + 1) + x + RR + 1]
    relief[y * SW + x] = (d2 - b2 - c2 + a) / ((2 * RR + 1) ** 2)
  }
  // ricampiona a 2 px per miglio
  const G = new Uint8Array(W * H), R = new Uint8Array(W * H), D = new Uint8Array(W * H)
  for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
    const x0 = Math.floor(u * PPM / MI), x1 = Math.ceil((u + 1) * PPM / MI), y0 = Math.floor(Y0 + v * PPM / MI), y1 = Math.ceil(Y0 + (v + 1) * PPM / MI)
    const n = [0, 0, 0], nd = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; let rs = 0, rc = 0
    for (let y = y0; y < Math.min(SH, y1); y++) for (let x = x0; x < Math.min(SW, x1); x++) { n[cls[y * SW + x]]++; nd[dep[y * SW + x]]++; rs += relief[y * SW + x]; rc++ }
    D[v * W + u] = nd[0] >= nd[1] && nd[0] >= nd[2] ? 0 : nd[1] >= nd[2] ? 1 : 2
    G[v * W + u] = n[0] >= n[1] + n[2] ? 0 : n[2] > n[1] * 0.6 ? 2 : 1
    R[v * W + u] = Math.min(9, Math.round(rs / Math.max(1, rc) / 0.35 * 9))
  }
  // pulizia: maggioranza 3x3 sulla terra
  const land = (a) => a.map((v) => v ? 1 : 0)
  let L = land(G)
  for (let pass = 0; pass < 2; pass++) {
    const o = L.slice()
    for (let v = 1; v < H - 1; v++) for (let u = 1; u < W - 1; u++) {
      let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += L[(v + dy) * W + u + dx]
      o[v * W + u] = s >= 5 ? 1 : 0
    }
    L = o
  }
  // laghi: acqua non raggiungibile dal bordo
  const ocean = new Uint8Array(W * H), stack = []
  for (let u = 0; u < W; u++) { stack.push(u, (H - 1) * W + u) }
  for (let v = 0; v < H; v++) { stack.push(v * W, v * W + W - 1) }
  while (stack.length) { const k = stack.pop(); if (ocean[k] || L[k]) continue; ocean[k] = 1; const u = k % W, v = (k / W) | 0; if (u > 0) stack.push(k - 1); if (u < W - 1) stack.push(k + 1); if (v > 0) stack.push(k - W); if (v < H - 1) stack.push(k + W) }
  const RV = new Uint8Array(W * H)
  for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
    const x0 = Math.floor(u * PPM / MI), x1 = Math.ceil((u + 1) * PPM / MI), y0 = Math.floor(Y0 + v * PPM / MI), y1 = Math.ceil(Y0 + (v + 1) * PPM / MI)
    let n = 0
    for (let y = y0; y < Math.min(SH, y1); y++) for (let x = x0; x < Math.min(SW, x1); x++) if (cls0[y * SW + x] === 0) n++
    RV[v * W + u] = n > 0 && L[v * W + u] ? 1 : 0
  }
  const nearOcean = (k) => { const u = k % W, v = (k / W) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const uu = u + dx, vv = v + dy; if (uu < 0 || vv < 0 || uu >= W || vv >= H || ocean[vv * W + uu]) return true } return false }
  for (let k = 0; k < W * H; k++) if (RV[k] && nearOcean(k)) RV[k] = 0
  const seen = new Uint8Array(W * H)
  for (let k0 = 0; k0 < W * H; k0++) {
    if (!RV[k0] || seen[k0]) continue
    const comp = [], st = [k0]; seen[k0] = 1
    while (st.length) { const k = st.pop(); comp.push(k); const u = k % W, v = (k / W) | 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const uu = u + dx, vv = v + dy, j = vv * W + uu; if (uu >= 0 && vv >= 0 && uu < W && vv < H && RV[j] && !seen[j]) { seen[j] = 1; st.push(j) } } }
    const us = comp.map((k) => k % W), vs = comp.map((k) => (k / W) | 0)
    const span = Math.hypot(Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs))
    if (comp.length < 8 || span < 7) for (const k of comp) RV[k] = 0
  }
  // classi finali: . mare, w lago, l terra, f foresta
  const chars = new Array(W * H)
  for (let k = 0; k < W * H; k++) chars[k] = L[k] ? (G[k] === 2 ? "f" : "l") : ocean[k] ? "." : "w"
  // RLE per riga
  const rle = (rowChars) => { let s = "", run = 1; for (let j = 1; j <= rowChars.length; j++) { if (j < rowChars.length && rowChars[j] === rowChars[j - 1]) run++; else { s += (run > 1 ? run : "") + rowChars[j - 1]; run = 1 } } return s }
  const rows = [], rrows = []
  for (let v = 0; v < H; v++) { rows.push(rle(chars.slice(v * W, v * W + W))); rrows.push(rle(Array.from(R.slice(v * W, v * W + W), (n) => "abcdefghij"[n]))) }
  // immagine di controllo
  const dbg = document.createElement("canvas"); dbg.width = W; dbg.height = H
  const dg = dbg.getContext("2d"), dd = dg.createImageData(W, H)
  const COL = { ".": [40, 70, 120], w: [80, 160, 230], l: [200, 190, 140], f: [40, 110, 50] }
  for (let k = 0; k < W * H; k++) { let c3 = COL[chars[k]]; if (chars[k] !== "." && chars[k] !== "w" && R[k] >= 2) c3 = R[k] >= 5 ? [150 + R[k] * 10, 60, 50] : [190, 140, 100]; if (RV[k]) c3 = [0, 220, 255]; dd.data.set([...c3, 255], k * 4) }
  dg.putImageData(dd, 0, 0)
  const rv = []; for (let v = 0; v < H; v++) rv.push(rle(Array.from(RV.slice(v * W, v * W + W), (n) => n ? "r" : ".")))
  const dr = []; for (let v = 0; v < H; v++) dr.push(rle(Array.from(D.slice(v * W, v * W + W), (n) => "abc"[n])))
  return { W, H, rows, rrows, rv, dr, png: dbg.toDataURL("image/png") }
}, data)
fs.writeFileSync(`${outDir}/geo-debug.png`, Buffer.from(out.png.split(",")[1], "base64"))
const geo = { w: out.W, h: out.H, rows: out.rows, relief: out.rrows, rivers: out.rv, depth: out.dr }
fs.writeFileSync(`${outDir}/geo.json`, JSON.stringify(geo))
const here = dirname(fileURLToPath(import.meta.url))
fs.writeFileSync(join(here, "geo.px.js"), "// Generato da estrai-geo.mjs: geografia delle Moonshae a 2 px per miglio, righe compresse (RLE).\n" +
  "const GEO = {\n w: " + geo.w + ", h: " + geo.h + ",\n" +
  ["rows", "relief", "rivers", "depth"].map((k) => " " + k + ": [\n" + geo[k].map((r) => "  " + JSON.stringify(r)).join(",\n") + "\n ]").join(",\n") + "\n}\n")
console.log("grid", out.W, out.H, "bytes", JSON.stringify(out.rows).length, JSON.stringify(out.rrows).length)
await b.close()
