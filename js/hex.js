// Esagoni con il lato piatto in alto ("flat-top"), colonne dispari spostate in giù di mezzo esagono.
// La misura di un esagono è la distanza fra due lati opposti, come negli hexcrawl (6 miglia).
// Le coordinate sono in miglia; la colonna 0, riga 0 ha il centro nell'angolo della mappa.

const SQRT3 = Math.sqrt(3)

export function hexRadius(size) {
  return size / SQRT3
}

export function hexCenter(col, row, size) {
  const r = hexRadius(size)
  return { x: 1.5 * r * col, y: size * (row + 0.5 * (col & 1)) }
}

export function hexAt(x, y, size) {
  const r = hexRadius(size)
  const q = (2 / 3) * x / r
  const s = (-1 / 3) * x / r + (SQRT3 / 3) * y / r
  // arrotondamento in coordinate cubiche
  let rq = Math.round(q), rs = Math.round(s), rz = Math.round(-q - s)
  const dq = Math.abs(rq - q), ds = Math.abs(rs - s), dz = Math.abs(rz + q + s)
  if (dq > ds && dq > dz) rq = -rs - rz
  else if (ds > dz) rs = -rq - rz
  return { col: rq, row: rs + (rq - (rq & 1)) / 2 }
}

export function hexCorners(col, row, size) {
  const { x, y } = hexCenter(col, row, size), r = hexRadius(size)
  const pts = []
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k
    pts.push([x + r * Math.cos(a), y + r * Math.sin(a)])
  }
  return pts
}

export const hexKey = (col, row) => `${col},${row}`

// Nome di un esagono come nelle mappe da hexcrawl: colonna e riga da 1, con gli zeri davanti.
export function hexLabel(col, row, size, widthMi, heightMi) {
  const cols = Math.ceil(widthMi / (1.5 * hexRadius(size))) + 1
  const rows = Math.ceil(heightMi / size) + 1
  const pad = (n, max) => String(n).padStart(String(max).length, "0")
  return `${pad(col + 1, cols)}.${pad(row + 1, rows)}`
}

// Esagoni che toccano un rettangolo in miglia.
export function hexesIn(x0, y0, x1, y1, size) {
  const r = hexRadius(size)
  const c0 = Math.floor(x0 / (1.5 * r)) - 1, c1 = Math.ceil(x1 / (1.5 * r)) + 1
  const r0 = Math.floor(y0 / size) - 1, r1 = Math.ceil(y1 / size) + 1
  const out = []
  for (let c = c0; c <= c1; c++) for (let w = r0; w <= r1; w++) out.push([c, w])
  return out
}
