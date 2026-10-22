// Isole Moonshae: mappa pixel art per un hexcrawl, disegnata con pxl.
//
// Una ricostruzione libera (non ufficiale) della geografia delle Moonshae, a 2 px per miglio.
// Le coste nascono dai poligoni delle isole deformati dal rumore; quota, foreste, paludi e
// brughiere vengono dalle regioni nominate qui sotto; alberi, montagne e colline sono sprite
// disegnati a mano e piazzati dove il terreno li vuole.
//
// Esporta:
//   scenes/moonshae/<livello>.png   un PNG per livello (mare, terra, fiumi, foreste, rilievi, nomi)
//   scenes/moonshae.png             la mappa composta
//   scenes/moonshae_dati.png        1 px per miglio: R = bioma * 12, G = isola * 20 (per l'app)
//   icone.png + icone.json          le icone dei punti di interesse
//
// Build: node <pxl>/bin/pxl.js build art/moonshae.px.js --out art/out --no-preview
// poi art/build.sh copia i file in assets/.

include("font5x7.px.js")

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

// ================================================================ geografia (in miglia)
const WM = 760, HM = 680, MI = 2, W = WM * MI, H = HM * MI, N = W * H

const ISLANDS = [
  { id: 1, name: "Gwynneth", pts: [236, 334, 252, 324, 270, 330, 286, 326, 300, 318, 318, 320, 334, 324, 350, 314, 368, 306, 384, 312, 392, 326, 404, 334, 416, 324, 430, 310, 448, 316, 466, 320, 484, 326, 500, 330, 514, 328, 526, 336, 536, 346, 546, 356, 548, 370, 548, 386, 546, 402, 552, 420, 562, 438, 556, 456, 548, 474, 546, 492, 538, 502, 524, 508, 518, 520, 528, 530, 540, 532, 536, 546, 526, 560, 510, 574, 492, 584, 470, 592, 450, 604, 428, 612, 406, 622, 386, 630, 366, 642, 348, 638, 336, 626, 324, 612, 312, 600, 300, 588, 290, 576, 280, 562, 268, 548, 258, 532, 250, 512, 254, 494, 246, 478, 240, 460, 248, 442, 242, 424, 236, 406, 244, 388, 240, 370, 232, 352] },
  { id: 2, name: "Alaron", pts: [458, 194, 452, 172, 460, 152, 470, 134, 482, 118, 492, 106, 502, 96, 516, 88, 530, 78, 546, 64, 558, 52, 570, 42, 584, 46, 592, 58, 604, 62, 620, 70, 634, 84, 650, 92, 664, 106, 678, 120, 690, 138, 700, 158, 704, 178, 698, 198, 690, 214, 700, 232, 708, 250, 702, 272, 690, 288, 676, 302, 662, 316, 646, 326, 630, 334, 622, 346, 620, 362, 612, 378, 604, 392, 594, 388, 588, 372, 586, 354, 578, 340, 566, 322, 552, 312, 536, 302, 520, 294, 506, 286, 492, 278, 480, 266, 470, 260, 474, 242, 464, 226, 466, 210] },
  { id: 3, name: "Oman", pts: [276, 134, 284, 118, 298, 104, 312, 94, 330, 88, 346, 94, 362, 82, 380, 86, 396, 94, 410, 106, 420, 120, 428, 138, 422, 152, 428, 168, 418, 184, 404, 196, 388, 206, 372, 212, 358, 208, 342, 214, 324, 210, 306, 202, 294, 190, 282, 176, 270, 160, 278, 148] },
  { id: 4, name: "Norland", pts: [84, 168, 98, 156, 116, 150, 134, 146, 152, 152, 170, 150, 188, 160, 204, 170, 220, 182, 232, 198, 240, 216, 236, 234, 244, 252, 246, 270, 238, 288, 232, 306, 222, 322, 208, 338, 192, 352, 176, 364, 158, 372, 140, 376, 122, 370, 108, 360, 96, 346, 86, 330, 80, 312, 72, 296, 70, 276, 64, 258, 72, 240, 66, 222, 76, 204, 72, 186] },
  { id: 5, name: "Moray", pts: [72, 410, 88, 398, 108, 392, 126, 398, 146, 390, 166, 396, 186, 402, 204, 414, 216, 430, 222, 448, 214, 462, 220, 478, 212, 496, 200, 512, 186, 528, 168, 540, 150, 550, 130, 548, 112, 540, 96, 528, 82, 512, 70, 494, 64, 476, 56, 458, 62, 440, 58, 424] },
  { id: 6, name: "Snowdown", pts: [596, 428, 606, 414, 622, 408, 640, 402, 656, 408, 672, 410, 688, 422, 700, 436, 708, 454, 702, 472, 698, 490, 684, 500, 668, 508, 650, 512, 632, 506, 618, 500, 606, 488, 600, 472, 590, 456, 598, 442] },
  { id: 7, name: "Flamsterd", pts: [185, 580, 210, 570, 235, 578, 240, 600, 220, 615, 192, 610] },
  { id: 8, name: "Isole Norheim", pts: [115, 105, 130, 80, 155, 55, 180, 42, 192, 50, 180, 75, 160, 98, 135, 115] },
  { id: 8, name: "Isole Norheim", pts: [190, 105, 215, 95, 235, 110, 225, 130, 200, 132] },
  { id: 8, name: "Isole Norheim", pts: [80, 70, 98, 62, 105, 78, 88, 85] },
  { id: 8, name: "Isole Norheim", pts: [225, 55, 245, 50, 252, 68, 232, 72] },
  { id: 8, name: "Isole Norheim", pts: [60, 120, 72, 114, 76, 128, 64, 132] },
  { id: 9, name: "Arcipelago di Korinn", pts: [440, 30, 460, 24, 472, 36, 456, 46] },
  { id: 9, name: "Arcipelago di Korinn", pts: [485, 50, 500, 44, 508, 58, 492, 64] },
  { id: 9, name: "Arcipelago di Korinn", pts: [420, 55, 430, 50, 434, 62, 423, 66] },
  { id: 9, name: "Arcipelago di Korinn", pts: [515, 25, 528, 22, 532, 33, 520, 36] },
]
// Acqua scavata nella terra: il Firth di Corwell, la Baia di Whitefish e i fiordi di Norland.
const CARVES = [
  [56, 224, 96, 232, 98, 236, 56, 241], [58, 280, 100, 288, 100, 292, 60, 299], [72, 320, 104, 326, 102, 330, 76, 337],
  [264, 572, 280, 550, 298, 536, 318, 522, 336, 510, 350, 508, 346, 520, 328, 534, 308, 550, 292, 568, 284, 584],
  [712, 248, 694, 256, 674, 260, 660, 268, 664, 282, 684, 288, 712, 282],
]
const LAKES = [
  [380, 395, 400, 390, 416, 396, 414, 408, 398, 414, 382, 410],      // Myrloch
  [600, 128, 610, 124, 616, 132, 606, 136],
  [170, 300, 180, 296, 184, 306, 174, 309],
  [470, 470, 480, 466, 484, 476, 474, 480],
]
// Bassifondi: la penisola sprofondata di Flamsterd.
const SHOALS = [195, 605, 240, 600, 262, 628, 246, 662, 205, 655]

// Catene: polilinea, mezza larghezza (mi), altezza.
const RANGES = [
  { pts: [482, 140, 500, 138, 518, 152, 536, 164, 552, 180, 566, 186, 580, 200, 596, 210, 608, 224, 624, 232, 636, 246], w: 12, h: 0.8 }, // Fairheight
  { pts: [596, 210, 590, 230, 588, 248], w: 6, h: 0.5 },                                  // Fairheight, sperone sud
  { pts: [350, 386, 366, 366, 384, 356, 402, 352, 420, 356, 436, 364, 450, 380], w: 9, h: 0.72 }, // Myrloch, nord
  { pts: [436, 364, 452, 346, 470, 336], w: 7, h: 0.55 },                                 // verso Winterglen
  { pts: [346, 394, 340, 412, 344, 430, 354, 450], w: 8, h: 0.62 },                       // Myrloch, ovest
  { pts: [452, 390, 458, 406, 456, 426, 446, 446], w: 8, h: 0.6 },                        // Myrloch, est
  { pts: [98, 176, 94, 198, 100, 220, 96, 244, 104, 266, 108, 290, 118, 312, 124, 336], w: 12, h: 0.78 }, // spina di Norland
  { pts: [100, 220, 130, 232], w: 7, h: 0.5 }, { pts: [108, 290, 140, 302], w: 7, h: 0.5 },
  { pts: [300, 128, 322, 122, 345, 138, 366, 140, 388, 152], w: 16, h: 0.5 },             // Altipiani di Grampalt
  { pts: [128, 100, 152, 72, 176, 52], w: 7, h: 0.72 },                                   // Jotunspine
  { pts: [110, 450, 130, 462, 150, 470, 168, 460, 185, 455], w: 15, h: 0.44 },            // colline di Moray
  { pts: [625, 440, 655, 460, 680, 450], w: 14, h: 0.44 },                                // colline di Snowdown
  { pts: [318, 600, 345, 612, 380, 612], w: 10, h: 0.46 },                                // penisola sud
  { pts: [600, 85, 640, 112, 660, 140], w: 10, h: 0.5 },                                  // Alaron nord
  { pts: [260, 470, 280, 440, 300, 425], w: 10, h: 0.4 },                                 // Gwynneth ovest
]
const REGIONS = {
  forest: [
    [350, 560, 400, 558, 450, 548, 500, 540, 525, 555, 495, 588, 452, 606, 410, 618, 372, 628, 346, 612, 338, 585],   // Llyrath
    [298, 575, 322, 568, 336, 588, 318, 606, 298, 594],                              // Goewin
    [366, 384, 395, 376, 426, 384, 434, 405, 421, 427, 395, 432, 368, 423, 360, 405], // Valle di Myrloch
    [595, 280, 630, 278, 655, 290, 662, 312, 632, 332, 600, 326, 585, 305],          // Dernall
    [100, 500, 150, 495, 185, 505, 175, 535, 140, 545, 105, 535],                    // Moray sud
    [640, 440, 675, 445, 680, 475, 655, 490, 632, 470],                              // Snowdown
    [500, 230, 540, 240, 560, 280, 530, 295, 495, 275],                              // Alaron sud-ovest
  ],
  pine: [
    [450, 330, 490, 328, 515, 345, 505, 372, 470, 378, 448, 360],                    // Winterglen
    [170, 190, 215, 195, 228, 235, 225, 290, 200, 320, 170, 300, 160, 240],          // Norland est
    [560, 80, 610, 75, 650, 105, 665, 145, 630, 160, 585, 140, 555, 115],            // Alaron nord
    [300, 100, 345, 92, 380, 100, 370, 118, 320, 120],                               // Oman nord
  ],
  swamp: [
    [258, 350, 290, 342, 312, 360, 305, 388, 278, 395, 256, 378],                    // Paludi del Fallon
    [420, 598, 455, 590, 470, 600, 445, 612, 420, 615],                              // acquitrini di Llyrath
    [120, 430, 150, 425, 160, 445, 135, 455],                                        // torbiera di Moray
  ],
  moor: [
    [262, 500, 295, 494, 316, 508, 302, 528, 270, 528],                              // Brughiera di Kimball
    [75, 410, 200, 410, 215, 470, 170, 490, 90, 490],                                // Moray
    [290, 130, 400, 125, 410, 175, 350, 200, 290, 180],                              // Grampalt
    [95, 165, 160, 158, 165, 185, 100, 195],                                         // Norland nord
  ],
}
// Fiumi: dalla sorgente alla foce.
const RIVERS = [
  [395, 412, 386, 440, 372, 468, 358, 492, 348, 508],      // dal Myrloch al Firth di Corwell
  [448, 430, 478, 458, 508, 488, 532, 518],                 // verso Kingsbay
  [396, 360, 392, 336, 386, 314],                           // costa nord di Gwynneth
  [345, 420, 310, 432, 280, 442, 250, 446],                 // costa ovest di Gwynneth
  [470, 400, 500, 405, 530, 420, 552, 430],                 // costa est di Gwynneth
  [600, 230, 628, 250, 656, 266],                           // nella Baia di Whitefish
  [540, 150, 522, 122, 506, 102],                           // verso Gnarhelm
  [560, 195, 532, 240, 508, 284],                           // Alaron sud-ovest
  [650, 150, 680, 175, 700, 200],                           // Alaron est
  [110, 230, 150, 240, 190, 250, 232, 262],                 // verso Rogarsheim
  [118, 300, 160, 320, 200, 340],                           // Norland sud
  [345, 140, 350, 175, 352, 210],                           // verso Iron Keep
  [150, 465, 180, 462, 212, 462],                           // verso Caer Moray
  [655, 455, 630, 452, 600, 452],                           // verso Caer Westphal
]
// Insediamenti: radure, campi intorno, e un controllo che stiano sulla terra.
const SETTLEMENTS = [
  ["Caer Corwell", 345, 500, 22], ["Kingsbay", 530, 520, 14], ["Dynnatt", 321, 517, 10],
  ["Caer Callidyrr", 650, 265, 22], ["Gnarhelm", 507, 103, 14], ["Sunderstaad", 575, 58, 8],
  ["Kythyss", 593, 380, 8], ["Caer Westphal", 600, 452, 16], ["Iron Keep", 350, 205, 10],
  ["Rogarsheim", 230, 262, 14], ["Hammerstaad", 168, 82, 6], ["Greystaad", 212, 128, 6],
  ["Caer Moray", 212, 462, 12], ["Torre di Flamsterd", 215, 592, 0],
]

// ================================================================ raster
const clamp = (v, a, b) => v < a ? a : v > b ? b : v
const px = (pts) => pts.map((v) => v * MI)

// Scanline, pari-dispari, sui centri dei pixel.
function fillPoly(arr, pts, val) {
  const n = pts.length / 2
  let y0 = Infinity, y1 = -Infinity
  for (let i = 1; i < pts.length; i += 2) { y0 = Math.min(y0, pts[i]); y1 = Math.max(y1, pts[i]) }
  const xs = []
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++) {
    const cy = y + 0.5
    xs.length = 0
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const yi = pts[2 * i + 1], yj = pts[2 * j + 1]
      if ((yi > cy) !== (yj > cy)) xs.push(pts[2 * i] + (cy - yi) / (yj - yi) * (pts[2 * j] - pts[2 * i]))
    }
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(W - 1, Math.floor(xs[k + 1] - 0.5)); x++) arr[y * W + x] = val
  }
}
function boxBlur(src, r) {
  const tmp = new Float32Array(N), out = new Float32Array(N), d = 2 * r + 1
  for (let y = 0; y < H; y++) {
    const o = y * W
    let s = 0
    for (let x = -r; x <= r; x++) s += src[o + clamp(x, 0, W - 1)]
    for (let x = 0; x < W; x++) { tmp[o + x] = s / d; s += src[o + Math.min(W - 1, x + r + 1)] - src[o + Math.max(0, x - r)] }
  }
  for (let x = 0; x < W; x++) {
    let s = 0
    for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, H - 1) * W + x]
    for (let y = 0; y < H; y++) { out[y * W + x] = s / d; s += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x] }
  }
  return out
}
const soften = (a, r) => boxBlur(boxBlur(a, r), r)
function sample(a, x, y) {
  x = clamp(x, 0, W - 1.001); y = clamp(y, 0, H - 1.001)
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * W + x0
  return (a[i] * (1 - fx) + a[i + 1] * fx) * (1 - fy) + (a[i + W] * (1 - fx) + a[i + W + 1] * fx) * fy
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

// ---------------------------------------------------------------- deformazione delle coste
const WX = new Float32Array(N), WY = new Float32Array(N)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const u = x / MI, v = y / MI, i = y * W + x
  WX[i] = ((fbm(u / 60, v / 60, 4) - 0.5) * 60 + (fbm(u / 14 + 50, v / 14, 3) - 0.5) * 22 + (vnoise(u / 5 + 9, v / 5) - 0.5) * 4) * MI
  WY[i] = ((fbm(u / 60 + 17, v / 60 + 9, 4) - 0.5) * 60 + (fbm(u / 14, v / 14 + 50, 3) - 0.5) * 22 + (vnoise(u / 5, v / 5 + 9) - 0.5) * 4) * MI
}
// Un poligono deformato: soglia sul campo sfumato letto nel punto spostato.
function warpedMask(polys, blur, amp, rough, seed) {
  const raw = new Float32Array(N)
  for (const p of polys) fillPoly(raw, px(p), 1)
  const soft = soften(raw, blur)
  const out = new Uint8Array(N)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    const v = sample(soft, x + WX[i] * amp, y + WY[i] * amp) + (fbm(x / (5 * MI) + seed, y / (5 * MI) + seed, 3) - 0.5) * rough
    out[i] = v > 0.5 ? 1 : 0
  }
  return out
}

// ---------------------------------------------------------------- terra e acqua
const landRaw = new Float32Array(N), ISLRAW = new Uint8Array(N)
for (const isl of ISLANDS) { fillPoly(landRaw, px(isl.pts), 1); fillPoly(ISLRAW, px(isl.pts), isl.id) }
for (const c of CARVES) fillPoly(landRaw, px(c), 0)
const landSoft = soften(landRaw, 4)
let LAND = new Uint8Array(N)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x
  const v = sample(landSoft, x + WX[i], y + WY[i]) + (fbm(x / (7 * MI) + 3, y / (7 * MI) + 7, 4) - 0.5) * 0.7
  LAND[i] = v > 0.5 ? 1 : 0
}
LAND = majority(majority(LAND))
const LAKE = warpedMask(LAKES, 3, 0.15, 0.3, 21)
for (let i = 0; i < N; i++) if (!LAND[i]) LAKE[i] = 0
const WET = new Uint8Array(N)                       // acqua di qualunque tipo
for (let i = 0; i < N; i++) WET[i] = LAND[i] && !LAKE[i] ? 0 : 1
const DL = distanceTo(WET)                          // nella terra: distanza dall'acqua
const DS = distanceTo(LAND)                         // nel mare: distanza dalla terra
const DLAKE = distanceTo(LAKE)

// Isola di ogni pixel di terra: quella del poligono nel punto deformato, o la più vicina.
const ISL = new Uint8Array(N)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x
  if (!LAND[i]) continue
  let id = ISLRAW[clamp(Math.round(y + WY[i]), 0, H - 1) * W + clamp(Math.round(x + WX[i]), 0, W - 1)]
  for (let r = 2; !id && r < 40; r += 3)
    for (let k = 0; k < 8 && !id; k++) {
      const a = k * Math.PI / 4
      id = ISLRAW[clamp(Math.round(y + Math.sin(a) * r), 0, H - 1) * W + clamp(Math.round(x + Math.cos(a) * r), 0, W - 1)]
    }
  ISL[i] = id || 10
}

// ---------------------------------------------------------------- quota
function segDist(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1)
  return Math.hypot(x - ax - t * dx, y - ay - t * dy)
}
const E = new Float32Array(N)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x
  if (!LAND[i]) continue
  const u = x / MI, v = y / MI
  let e = 0.24 * Math.min(1, DL[i] / (26 * MI)) + 0.2 * (fbm(u / 50 + 40, v / 50 + 40, 4) - 0.5) + 0.06
  for (let r = 0; r < RANGES.length; r++) {
    const R = RANGES[r], p = R.pts
    let d = Infinity
    for (let k = 0; k + 3 < p.length; k += 2) d = Math.min(d, segDist(u, v, p[k], p[k + 1], p[k + 2], p[k + 3]))
    const w = R.w * (0.6 + 0.8 * fbm(u / 24 + r * 7, v / 24, 3))
    if (d < w * 2.5) e += R.h * Math.exp(-((d / w) ** 2)) * (0.62 + 0.76 * fbm(u / 11 + r * 13, v / 11, 3))
  }
  E[i] = e
}

// ---------------------------------------------------------------- fiumi
// Spostamento del punto medio, deterministico: un fiume serpeggia ma resta dove l'ho messo.
function meander(pts, seed) {
  let P = []
  for (let k = 0; k < pts.length; k += 2) P.push([pts[k], pts[k + 1]])
  for (let d = 0; d < 4; d++) {
    const Q = []
    for (let k = 0; k + 1 < P.length; k++) {
      const [ax, ay] = P[k], [bx, by] = P[k + 1], len = Math.hypot(bx - ax, by - ay)
      const off = (hash(seed * 31 + d, k) - 0.5) * 0.42 * len
      Q.push(P[k], [(ax + bx) / 2 - (by - ay) / len * off, (ay + by) / 2 + (bx - ax) / len * off])
    }
    Q.push(P[P.length - 1])
    P = Q
  }
  return P
}
const RIVER = new Uint8Array(N)
RIVERS.forEach((r, n) => {
  const P = meander(r, n + 1)
  for (let k = 0; k + 1 < P.length; k++) {
    const wide = k > P.length * 0.6
    const [ax, ay] = P[k].map((v) => v * MI), [bx, by] = P[k + 1].map((v) => v * MI)
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2)
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(ax + (bx - ax) * s / steps), y = Math.round(ay + (by - ay) * s / steps)
      for (const [dx, dy] of wide ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[0, 0]]) {
        const i = clamp(y + dy, 0, H - 1) * W + clamp(x + dx, 0, W - 1)
        if (LAND[i] && !LAKE[i]) RIVER[i] = 1
      }
    }
  }
})
// Un fiume largo 1 px va solo in orizzontale o verticale da un pixel all'altro: niente scalini a L doppi.
const DRIV = distanceTo(RIVER)

// ---------------------------------------------------------------- biomi
const B = { mare: 0, lago: 1, spiaggia: 3, pianura: 4, campi: 5, foresta: 6, conifere: 7, colline: 8,
  montagne: 9, vette: 10, brughiera: 11, palude: 12, brulle: 13, scogliera: 14 }
const TH = 0.42, TM = 0.6, TS = 0.86
const FOREST = warpedMask(REGIONS.forest, 6, 0.8, 0.9, 5)
const PINE = warpedMask(REGIONS.pine, 6, 0.8, 0.9, 9)
const SWAMP = warpedMask(REGIONS.swamp, 5, 0.6, 0.9, 13)
const MOOR = warpedMask(REGIONS.moor, 6, 0.8, 0.8, 17)
const SHOAL = soften((() => { const a = new Float32Array(N); fillPoly(a, px(SHOALS), 1); return a })(), 16)
const nearTown = (u, v) => {
  const k = 0.45 + 1.1 * fbm(u / 10 + 3, v / 10 + 8, 3)
  for (const [, sx, sy, r] of SETTLEMENTS) if (r && (u - sx) ** 2 + (v - sy) ** 2 < (r * k) ** 2) return Math.sqrt((u - sx) ** 2 + (v - sy) ** 2) / (r * k)
  return 2
}
const BIO = new Uint8Array(N)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, u = x / MI, v = y / MI
  if (!LAND[i]) { BIO[i] = B.mare; continue }
  if (LAKE[i]) { BIO[i] = B.lago; continue }
  const e = E[i], isl = ISL[i], town = nearTown(u, v)
  const wild = fbm(u / 36 + 90, v / 36 + 12, 4)
  let b = B.pianura
  if (e > TS) b = B.vette
  else if (e > TM) b = B.montagne
  else if (SWAMP[i]) b = B.palude
  else if (PINE[i] || (wild > 0.63 && (v < 250 || e > 0.34) && town > 1.15)) b = B.conifere
  else if (FOREST[i] || (wild > 0.63 && town > 1.15)) b = B.foresta
  else if (e > TH) b = B.colline
  else if (MOOR[i] || (isl === 5 && wild < 0.5)) b = B.brughiera
  else if (isl === 8 || isl === 9) b = wild > 0.55 ? B.conifere : B.brulle
  else if (town < 1 && e < 0.36) b = B.campi
  if (DL[i] <= 1.5 * MI && b !== B.palude) {
    if (e > 0.4) b = B.scogliera
    else if (e < 0.3 && fbm(u / 22 + 5, v / 22 + 5, 3) > 0.52 && b !== B.montagne) b = B.spiaggia
  }
  BIO[i] = b
}

// ---------------------------------------------------------------- controlli
const wet = []
for (const [name, sx, sy] of SETTLEMENTS) {
  const i = Math.round(sy * MI) * W + Math.round(sx * MI)
  if (!LAND[i] || LAKE[i]) {
    let best = null
    for (let r = 1; r < 30 && !best; r++) for (let a = 0; a < 16 && !best; a++) {
      const x = Math.round(sx * MI + Math.cos(a * Math.PI / 8) * r), y = Math.round(sy * MI + Math.sin(a * Math.PI / 8) * r)
      if (LAND[y * W + x] && !LAKE[y * W + x]) best = [x / MI, y / MI]
    }
    wet.push(`${name} (${sx}, ${sy}) è in acqua; la terra più vicina è a ${best}`)
  }
}
if (wet.length) throw new Error(wet.join("\n"))
{
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
const clearing = (u, v) => SETTLEMENTS.some(([, sx, sy]) => (u - sx) ** 2 + (v - sy) ** 2 < 25)
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
    if (b !== B.montagne) return null
    if (E[i] > 0.75) return h < 0.6 ? "_mtn_l" : "_mtn_d"
    return h < 0.5 ? "_mtn_m" : "_mtn_s"
  }),
  ...placements(11, 7, 3, 3, (x, y, i, h) => {
    if (BIO[i] !== B.colline || DRIV[i] < 3 || DL[i] < 3) return null
    const moor = MOOR[i] || ISL[i] === 5
    return h < 0.55 ? (moor ? "_hill_a_moor" : "_hill_a") : (moor ? "_hill_b_moor" : "_hill_b")
  }),
  ...placements(7, 5, 3, 4, (x, y, i, h) => {
    if (BIO[i] === B.palude && h < 0.55 && DRIV[i] > 2) return h < 0.3 ? "_reed_a" : "_reed_b"
    if (BIO[i] === B.brulle && h < 0.3) return h < 0.12 ? "_rock_a" : "_rock_b"
    return null
  }),
]
const WAVES = placements(30, 20, 14, 5, (x, y, i, h) =>
  !LAND[i] && DS[i] > 14 * MI && h < 0.45 ? (h < 0.2 ? "_wave_b" : "_wave_a") : null)
console.error(`alberi ${TREES.length}, rilievi ${RELIEF.length}, onde ${WAVES.length}`)

// ================================================================ colori del suolo
const bandKey = (t, keys, edges) => { let k = 0; while (k < edges.length && t > edges[k]) k++; return keys[k] }
// Esposizione al mare aperto: quanta terra c'è nel raggio di ~20 miglia. Poca = onde e schiuma.
const landNear = soften(Float32Array.from(LAND), 20)
// Rilievo: il versante che guarda a nord-ovest prende la luce.
const slope = (i) => (E[i + 1] - E[i - 1]) + (E[i + W] - E[i - W])

function seaKey(x, y, i) {
  const u = x / MI, v = y / MI
  const shelf = 0.35 + 1.3 * fbm(u / 45 + 3, v / 45 + 3, 4)
  let d = DS[i] / MI / shelf + (fbm(u / 16 + 8, v / 16, 3) - 0.5) * 6
  if (SHOAL[i] > 0.05) d = Math.min(d, 4 + (1 - SHOAL[i]) * 12 + (fbm(u / 6, v / 6, 3) - 0.5) * 4)
  if (DS[i] <= 1) return landNear[i] < 0.22 && fbm(u / 7, v / 7, 2) > 0.5 ? "f" : "6"
  const t = d + (bayer(x, y) - 0.5) * 2
  return bandKey(t, "54321", [2.2, 6.5, 17, 34])
}
function landKey(x, y, i) {
  const b = BIO[i], u = x / MI, v = y / MI, e = E[i], dith = bayer(x, y) - 0.5
  const s = slope(i) * 40 + dith * 0.5
  switch (b) {
    case B.spiaggia: return DL[i] <= 1 ? "A" : "a"
    case B.scogliera: return DL[i] <= 1 ? "T" : "t"
    case B.vette: return s > 0.2 ? "w" : "W"
    case B.montagne: return s > 0.3 ? "r" : s > -0.2 ? "R" : "t"
    case B.foresta: return "h"
    case B.conifere: return "q"
    case B.palude: {
      const pool = fbm(u / 4 + 11, v / 4 + 7, 3)
      return pool > 0.66 ? "4" : pool > 0.6 ? "S" : "s"
    }
    case B.brughiera: {
      const heather = fbm(u / 6 + 31, v / 6 + 3, 3) + dith * 0.08
      return heather > 0.66 ? "v" : s < -0.25 ? "M" : "m"
    }
    case B.brulle: return fbm(u / 5, v / 5, 3) + dith * 0.1 > 0.52 ? "u" : "U"
    case B.campi: {
      // Campi a scacchiera con siepi: celle di ~3x2 miglia, una coltura ciascuna.
      const cy = Math.floor(v / 2), cx = Math.floor(u / 2.6 + hash(cy, 7) * 3), fu = u / 2.6 + hash(cy, 7) * 3 - cx
      if (fu < 0.2 && hash(cx, cy + 50) < 0.6) return "G"
      const crop = hash(cx, cy)
      return crop < 0.22 ? "y" : crop < 0.6 ? "l" : "g"
    }
    case B.colline: return s > 0.25 ? "l" : s < -0.3 ? "G" : "g"
    default: {
      const wet = fbm(u / 18 + 7, v / 18 + 2, 3) + dith * 0.07 - Math.min(0.2, 1.5 / (1 + DRIV[i]))
      return e > 0.3 && s > 0.15 ? "l" : wet < 0.42 ? "G" : wet > 0.6 ? "l" : "g"
    }
  }
}
const lakeKey = (i) => distLakeShore[i] <= 1 ? "5" : distLakeShore[i] < 3 * MI ? "4" : "3"
const notLake = new Uint8Array(N)
for (let i = 0; i < N; i++) notLake[i] = LAKE[i] ? 0 : 1
const distLakeShore = distanceTo(notLake)

// ================================================================ nomi
// Ogni nome è uno sprite col font 5x7 e un bordo d'inchiostro: si legge su qualunque terreno.
const LABELS = [
  ["GWYNNETH", 400, 470, 2, "i"], ["ALARON", 590, 190, 2, "i"], ["OMAN", 352, 160, 2, "i"],
  ["NORLAND", 150, 280, 2, "i"], ["MORAY", 140, 470, 2, "i"], ["SNOWDOWN", 650, 470, 1, "i"],
  ["FLAMSTERD", 212, 625, 1, "i"], ["ISOLE NORHEIM", 160, 25, 1, "i"], ["ARCIPELAGO DI KORINN", 475, 8, 1, "i"],
  ["MARE DI MOONSHAE", 368, 262, 1, "f", 2], ["MARE SENZA TRACCE", 120, 615, 1, "f", 2],
  ["MARE DELLE SPADE", 690, 600, 1, "f", 2], ["STRETTO DI ALARON", 512, 306, 1, "6", 1],
  ["STRETTO DEL VENTO DEL NORD", 150, 142, 1, "6", 1], ["FIRTH DI CORWELL", 282, 545, 1, "6", 1],
  ["BAIA DI WHITEFISH", 722, 300, 1, "6", 1],
  ["VALLE DI MYRLOCH", 398, 378, 1, "y"], ["FORESTA DI LLYRATH", 430, 580, 1, "y"],
  ["MONTI FAIRHEIGHT", 560, 165, 1, "y"], ["FORESTA DI DERNALL", 625, 318, 1, "y"],
  ["PALUDI DEL FALLON", 282, 398, 1, "y"], ["WINTERGLEN", 482, 342, 1, "y"],
  ["ALTIPIANI DI GRAMPALT", 345, 118, 1, "y"], ["BRUGHIERA DI KIMBALL", 288, 492, 1, "y"],
  ["GRANDE CAPO SUD", 560, 362, 1, "y"],
]
const labelStamps = LABELS.map(([txt, lx, ly, scale, col, gap = 1], n) => {
  const name = "_nome_" + n
  sprite(name, { w: txt.length * 6 * scale * (gap + 1), h: 8 * scale, crop: true, outline: "k", pivot: "center" },
    text(0, 0, txt, col, { font: "5x7", scale, gap }))
  return stamp(name, Math.round(lx * MI), Math.round(ly * MI))
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
    const i = (v * MI + 1) * W + u * MI + 1
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
