// L'applicazione: carica mappa e campagna, gestisce pannelli, modalità DM e pubblicazione.

import { MAP, BASE_LAYERS, OVERLAYS, TYPES, TYPE, PACES, HEX_SIZES } from "./config.js"
import { MapView } from "./map.js"
import { hexAt, hexCenter, hexKey, hexLabel } from "./hex.js"
import { openVault, toBase64 } from "./crypto.js"
import { loadPublished, normalize, unlock, openWith, buildFile, newId, saveDraft, loadDraft, clearDraft, loadSeen, saveSeen } from "./store.js"
import { loadConfig, saveConfig, fetchRemote, publish } from "./github.js"

const $ = (s) => document.querySelector(s)
const LAYER_STORE = "moonshae:livelli"
const POLL_MS = 60000

const state = {
  published: null, markers: [], explored: new Set(), settings: {}, rev: 0,
  vault: null, dm: false, playerView: false, dirty: false,
  seen: new Set(), newIds: new Set(), selected: null, mode: "view",
}
let view, icons

// ================================================================ avvio
boot().catch((e) => {
  console.error(e)
  $("#loading").textContent = `Errore: ${e.message}`
})

async function boot() {
  const img = (src) => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error(`immagine mancante: ${src}`)); i.src = src })
  const [layers, sheet, frames, dati, published] = await Promise.all([
    Promise.all(BASE_LAYERS.map((l) => img(l.file))),
    img("assets/icone.png"),
    fetch("assets/icone.json").then((r) => r.json()),
    img("assets/mappa/dati.png"),
    loadPublished(),
  ])
  icons = { image: sheet, frames: frames.frames }

  view = new MapView($("#map"), {
    hover: onHover, click: onClick, drag: onDrag, dragEnd: onDragEnd, paint: onPaint,
    measure: onMeasure, measureEnd: () => setMode("view"), view: updateScale,
  })
  view.setLayers(Object.fromEntries(BASE_LAYERS.map((l, k) => [l.id, layers[k]])))
  view.setIcons(icons)
  view.setTerrain(readPixels(dati))
  buildLayerPanel()
  buildTypeOptions()
  bindUi()

  applyPublished(published, { first: true })
  $("#loading").hidden = true
  document.fonts?.load('12px "Pixelify Sans"').then(() => view.request())
  openFromHash()
  setInterval(poll, POLL_MS)
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") poll() })
}

function readPixels(image) {
  const c = document.createElement("canvas")
  c.width = image.width
  c.height = image.height
  const g = c.getContext("2d", { willReadFrequently: true })
  g.drawImage(image, 0, 0)
  return g.getImageData(0, 0, c.width, c.height).data
}

// Il file pubblicato diventa lo stato dei giocatori (il DM lo usa solo per impostazioni ed esplorazione).
function applyPublished(pub, { first = false } = {}) {
  const before = new Set(state.markers.map((m) => m.id))
  state.published = pub
  state.rev = pub.rev
  state.settings = { ...pub.settings }
  state.explored = new Set(pub.explored)
  if (!state.dm) state.markers = structuredClone(pub.markers)
  $("#title").textContent = state.settings.title
  document.title = state.settings.title

  const ids = pub.markers.map((m) => m.id)
  const seen = loadSeen()
  if (!seen) { state.seen = new Set(ids); saveSeen(state.seen) } else state.seen = seen
  state.newIds = new Set(ids.filter((id) => !state.seen.has(id)))
  const appeared = first ? [...state.newIds] : ids.filter((id) => !before.has(id))
  if (appeared.length) {
    view.pulse(appeared)
    if (!first) toast(`Nuovi luoghi sulla mappa: ${appeared.map((id) => pub.markers.find((m) => m.id === id)?.name).filter(Boolean).join(", ")}`, "gold", 8000)
  }
  refresh()
}

async function poll() {
  if (state.dm || document.visibilityState !== "visible") return
  try {
    const pub = await loadPublished()
    if (pub.rev > state.rev) applyPublished(pub)
  } catch { /* rete assente: si riprova al prossimo giro */ }
}

// ================================================================ ridisegno di tutto ciò che dipende dallo stato
function refresh() {
  view.setData({ markers: state.markers, explored: state.explored, settings: state.settings, dm: state.dm, playerView: state.playerView })
  view.invalidateFog()
  renderPlaces()
  const n = state.newIds.size
  $("#badge-new").hidden = !n || state.dm
  $("#badge-new").textContent = n
  $("#btn-seen").hidden = !n || state.dm
  $("#dirty").hidden = !state.dirty
  $("#btn-dm").classList.toggle("on", state.dm)
  $("#dm-bar").hidden = !state.dm
  $("#dm-overlays").hidden = !state.dm
  if (state.selected) {
    const m = state.markers.find((x) => x.id === state.selected)
    if (m) showMarker(m)
    else closeInfo()
  }
  updateScale()
}

// ================================================================ pannello livelli
function buildLayerPanel() {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(LAYER_STORE) || "{}") } catch { /* default */ }
  const row = (host, id, label, on) => {
    const value = saved[id] ?? on
    view.setVisible(id, value)
    const l = document.createElement("label")
    l.innerHTML = `<input type="checkbox"${value ? " checked" : ""}> <span></span>`
    l.querySelector("span").textContent = label
    l.querySelector("input").addEventListener("change", (e) => {
      view.setVisible(id, e.target.checked)
      saved[id] = e.target.checked
      try { localStorage.setItem(LAYER_STORE, JSON.stringify(saved)) } catch { /* solo comodità */ }
    })
    host.append(l)
  }
  BASE_LAYERS.forEach((l) => row($("#list-base"), l.id, l.label, true))
  OVERLAYS.forEach((o) => row($("#list-overlays"), o.id, o.label, o.on))
  row($("#dm-overlays"), "nascosti", "Luoghi nascosti (solo DM)", true)
}

function buildTypeOptions() {
  for (const t of TYPES) {
    $("#mk-type").append(new Option(t.label, t.id))
    $("#filter-type").append(new Option(t.label, t.id))
  }
  for (const n of HEX_SIZES) $("#st-hex").append(new Option(`${n} miglia`, n))
}

// ================================================================ elenco dei luoghi
function iconCanvas(type, scale = 2) {
  const c = document.createElement("canvas")
  c.className = "ico"
  const f = TYPE[type]?.icon && icons.frames["icona_" + TYPE[type].icon]?.frame
  c.width = c.height = 13 * scale
  if (f) {
    const g = c.getContext("2d")
    g.imageSmoothingEnabled = false
    g.drawImage(icons.image, f.x, f.y, f.w, f.h, Math.floor((13 - f.w) / 2) * scale, Math.floor((13 - f.h) / 2) * scale, f.w * scale, f.h * scale)
  }
  return c
}

function renderPlaces() {
  const q = $("#search").value.trim().toLowerCase(), type = $("#filter-type").value
  const list = $("#place-list")
  list.replaceChildren()
  const shown = state.markers.filter((m) => {
    if (m.hidden && (!state.dm || state.playerView)) return false
    if (type && m.type !== type) return false
    return !q || `${m.name} ${m.text || ""}`.toLowerCase().includes(q)
  })
  const groups = [["insediamenti", "Insediamenti"], ["luoghi", "Punti di interesse"], ["gruppo", "Gruppo"]]
  for (const [g, title] of groups) {
    const items = shown.filter((m) => (TYPE[m.type]?.group ?? "luoghi") === g)
      .sort((a, b) => (state.newIds.has(b.id) - state.newIds.has(a.id)) || a.name.localeCompare(b.name, "it"))
    if (!items.length) continue
    const head = document.createElement("li")
    head.className = "group"
    head.textContent = title
    list.append(head)
    for (const m of items) {
      const li = document.createElement("li"), b = document.createElement("button")
      b.type = "button"
      b.append(iconCanvas(m.type))
      const nm = document.createElement("span")
      nm.className = "nm"
      nm.textContent = m.name || "(senza nome)"
      const sub = document.createElement("span")
      sub.className = "sub"
      sub.textContent = `${TYPE[m.type]?.label ?? m.type} · ${hexName(m)}`
      nm.append(sub)
      b.append(nm)
      if (m.hidden) b.append(tag("nascosto", "hid"))
      else if (state.newIds.has(m.id) && !state.dm) b.append(tag("nuovo", "new"))
      b.addEventListener("click", () => { selectMarker(m, true); if (matchMedia("(max-width: 640px)").matches) togglePanel("luoghi", false) })
      li.append(b)
      list.append(li)
    }
  }
  if (!list.children.length) {
    const li = document.createElement("li")
    li.className = "empty"
    li.textContent = q || type ? "Nessun luogo corrisponde." : "Nessun luogo ancora scoperto."
    list.append(li)
  }
}
const tag = (text, cls) => Object.assign(document.createElement("span"), { className: `tag ${cls}`, textContent: text })
const hexName = (m) => { const h = hexAt(m.x, m.y, state.settings.hexMiles); return `esagono ${hexLabel(h.col, h.row, state.settings.hexMiles, MAP.widthMi, MAP.heightMi)}` }

// ================================================================ dettagli
function selectMarker(m, fly = false) {
  state.selected = m.id
  view.select(m.id)
  if (fly) view.flyTo(m.x, m.y, 3)
  if (state.newIds.delete(m.id)) {
    state.seen.add(m.id)
    saveSeen(state.seen)
    renderPlaces()
    refreshBadges()
  }
  history.replaceState(null, "", `#luogo=${encodeURIComponent(m.id)}`)
  showMarker(m)
}
function refreshBadges() {
  const n = state.newIds.size
  $("#badge-new").hidden = !n || state.dm
  $("#badge-new").textContent = n
  $("#btn-seen").hidden = !n || state.dm
}

function showMarker(m) {
  const t = TYPE[m.type] || TYPE.segnaposto, h = hexAt(m.x, m.y, state.settings.hexMiles), info = view.hexInfo(h.col, h.row)
  $("#info-title").textContent = m.name || "(senza nome)"
  const body = $("#info-body")
  body.innerHTML = ""
  body.append(el("p", "meta", `${t.label} · esagono ${info.label}${info.island ? " · " + info.island : ""}${m.hidden ? " · nascosto ai giocatori" : ""}`))
  const text = el("div", "text")
  text.innerHTML = rich(m.text) || '<p class="empty">Nessuna descrizione.</p>'
  body.append(text)
  if (state.dm && m.notes) {
    const n = el("div", "notes")
    n.append(el("h4", "", "Note del DM"))
    const t2 = el("div", "")
    t2.innerHTML = rich(m.notes)
    n.append(t2)
    body.append(n)
  }
  const actions = el("div", "actions")
  actions.append(button("Centra", () => view.flyTo(m.x, m.y, 3)))
  if (state.dm) {
    actions.append(button("Modifica", () => editMarker(m)))
    actions.append(button(m.hidden ? "Rivela ai giocatori" : "Nascondi", () => setHidden(m, !m.hidden), m.hidden ? "btn-gold" : ""))
  } else {
    actions.append(button("Copia link", () => copyLink(m)))
  }
  body.append(actions)
  $("#panel-info").hidden = false
}

function showHex(info) {
  state.selected = null
  view.select(null)
  $("#info-title").textContent = `Esagono ${info.label}`
  const body = $("#info-body")
  body.innerHTML = ""
  const dl = el("dl", "facts")
  const fact = (k, v) => { dl.append(el("dt", "", k), el("dd", "", v)) }
  fact("Terreno", info.terrain + (info.hard ? " (terreno difficile)" : ""))
  if (info.island) fact("Isola", info.island)
  if (state.settings.fog) fact("Esplorato", info.explored ? "sì" : "no")
  fact("Larghezza", `${state.settings.hexMiles} miglia`)
  body.append(dl)
  const here = view.shownMarkers().filter((m) => { const h = hexAt(m.x, m.y, state.settings.hexMiles); return h.col === info.col && h.row === info.row })
  if (here.length) {
    body.append(el("p", "meta", "In questo esagono:"))
    const ul = el("ul", "places")
    for (const m of here) {
      const li = document.createElement("li"), b = document.createElement("button")
      b.type = "button"
      b.append(iconCanvas(m.type), el("span", "nm", m.name))
      b.addEventListener("click", () => selectMarker(m))
      li.append(b)
      ul.append(li)
    }
    body.append(ul)
  }
  if (state.dm) {
    const actions = el("div", "actions")
    actions.append(button("Aggiungi un luogo qui", () => newMarker(info.x, info.y, true), "btn-gold"))
    actions.append(button(info.explored ? "Segna come inesplorato" : "Segna come esplorato", () => {
      onPaint(info.col, info.row, !info.explored)
      showHex(view.hexInfo(info.col, info.row))
    }))
    body.append(actions)
  }
  history.replaceState(null, "", location.pathname + location.search)
  $("#panel-info").hidden = false
}

function closeInfo() {
  $("#panel-info").hidden = true
  state.selected = null
  view.select(null)
  history.replaceState(null, "", location.pathname + location.search)
}

function openFromHash() {
  const id = decodeURIComponent((location.hash.match(/luogo=([^&]+)/) || [])[1] || "")
  const m = id && state.markers.find((x) => x.id === id)
  if (m) selectMarker(m, true)
}

async function copyLink(m) {
  const url = `${location.origin}${location.pathname}#luogo=${encodeURIComponent(m.id)}`
  try { await navigator.clipboard.writeText(url); toast("Link copiato.", "ok") } catch { prompt("Link al luogo:", url) }
}

// ================================================================ eventi della mappa
function onHover(info, marker) {
  if (!info) { $("#status-hex").textContent = "—"; $("#status-terrain").textContent = ""; return }
  $("#status-hex").textContent = info.label
  const bits = [info.terrain + (info.hard ? " (difficile)" : ""), info.island].filter(Boolean)
  if (marker) bits.unshift(marker.name)
  $("#status-terrain").textContent = bits.join(" · ")
}

let tappedHex = null
function onClick({ x, y, marker, hex, touch }) {
  if (state.mode === "add") return newMarker(x, y, true)
  if (marker) return selectMarker(marker)
  if (touch) {
    // sul telefono il primo tocco mostra l'esagono nella barra in basso, il secondo apre la scheda
    const same = tappedHex === hex.label
    tappedHex = same ? null : hex.label
    onHover(hex, null)
    if (!same) { if (!$("#panel-info").hidden) closeInfo(); return }
    return showHex(hex)
  }
  if (!$("#panel-info").hidden && !state.selected) {
    // un secondo tocco su un esagono già mostrato chiude il pannello
    if ($("#info-title").textContent === `Esagono ${hex.label}`) return closeInfo()
  }
  showHex(hex)
}

function onDrag(m, x, y) {
  m.x = Math.round(x * 10) / 10
  m.y = Math.round(y * 10) / 10
  view.request()
}
function onDragEnd(m) {
  markDirty()
  if (state.selected === m.id) showMarker(m)
}

function onPaint(col, row, value) {
  if (!state.dm) return
  const key = hexKey(col, row)
  if (value) state.explored.add(key)
  else state.explored.delete(key)
  view.invalidateFog()
  markDirty()
}

function onMeasure(miles) {
  const hexes = miles / state.settings.hexMiles
  const days = PACES.map((p) => `${p.label}: ${formatDays(miles / p.miles)}`).join(" · ")
  hint(`${miles.toFixed(1)} miglia · ${hexes.toFixed(1)} esagoni — ${days}. Doppio clic o Esc per finire.`)
}
const formatDays = (d) => d < 1 ? `${Math.max(1, Math.round(d * 8))} h di marcia` : `${d.toFixed(1).replace(".", ",")} g`

// ================================================================ modalità
function setMode(mode) {
  if (state.mode === mode) mode = "view"
  state.mode = mode
  view.setMode(mode)
  $("#btn-measure").setAttribute("aria-pressed", mode === "measure")
  $("#dm-add").setAttribute("aria-pressed", mode === "add")
  $("#dm-explore").setAttribute("aria-pressed", mode === "explore")
  const hints = {
    add: "Clicca sulla mappa dove vuoi il nuovo luogo. Esc per annullare.",
    explore: "Clicca o trascina sugli esagoni per segnarli come esplorati (o di nuovo inesplorati).",
    measure: "Clicca i punti del percorso. Doppio clic o Esc per finire.",
  }
  if (mode === "explore" && !state.settings.fog) hints.explore += " La nebbia è spenta: accendila nelle impostazioni."
  hint(hints[mode] || "")
}
function hint(text) {
  $("#mode-hint").hidden = !text
  $("#mode-hint").textContent = text
}

// ================================================================ interfaccia
function bindUi() {
  document.querySelectorAll("[data-panel]").forEach((b) => b.addEventListener("click", () => togglePanel(b.dataset.panel)))
  document.querySelectorAll(".panel [data-close]").forEach((b) => b.addEventListener("click", () => {
    const p = b.closest(".panel")
    if (p.id === "panel-info") closeInfo()
    else togglePanel(p.id.replace("panel-", ""), false)
  }))
  document.querySelectorAll("dialog [data-cancel]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close("cancel")))
  $("#search").addEventListener("input", renderPlaces)
  $("#filter-type").addEventListener("change", renderPlaces)
  $("#btn-seen").addEventListener("click", () => {
    state.newIds.forEach((id) => state.seen.add(id))
    state.newIds.clear()
    saveSeen(state.seen)
    renderPlaces()
    refreshBadges()
  })
  $("#btn-measure").addEventListener("click", () => setMode("measure"))
  $("#zoom-in").addEventListener("click", () => view.zoomStep(1))
  $("#zoom-out").addEventListener("click", () => view.zoomStep(-1))
  $("#zoom-fit").addEventListener("click", () => view.fit())

  $("#btn-dm").addEventListener("click", () => state.dm ? toggleMenu() : enterDm())
  $("#dm-add").addEventListener("click", () => setMode("add"))
  $("#dm-explore").addEventListener("click", () => setMode("explore"))
  $("#dm-player").addEventListener("click", () => {
    state.playerView = !state.playerView
    $("#dm-player").setAttribute("aria-pressed", state.playerView)
    refresh()
  })
  $("#dm-publish").addEventListener("click", publishNow)
  $("#dm-menu").addEventListener("click", toggleMenu)
  $("#dm-settings").addEventListener("click", () => { toggleMenu(false); openSettings() })
  $("#dm-export").addEventListener("click", () => { toggleMenu(false); exportFile() })
  $("#dm-import").addEventListener("click", () => { toggleMenu(false); $("#import-file").click() })
  $("#import-file").addEventListener("change", importFile)
  $("#dm-lock").addEventListener("click", () => { toggleMenu(false); leaveDm() })

  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select, dialog")) return
    if (e.key === "Escape") {
      if (state.mode !== "view") setMode("view")
      else if (!$("#panel-info").hidden) closeInfo()
    } else if (e.key === "+" || e.key === "=") view.zoomStep(1)
    else if (e.key === "-") view.zoomStep(-1)
    else if (e.key === "0") view.fit()
  })
  window.addEventListener("beforeunload", (e) => { if (state.dm && state.dirty) e.preventDefault() })
}

function togglePanel(name, force) {
  const p = $(`#panel-${name}`), btn = document.querySelector(`[data-panel="${name}"]`)
  const open = force ?? p.hidden
  if (open && matchMedia("(max-width: 640px)").matches) {
    // sul telefono un pannello alla volta
    document.querySelectorAll(".panel").forEach((x) => { if (x !== p) x.hidden = true })
    document.querySelectorAll("[data-panel]").forEach((b) => b.setAttribute("aria-expanded", "false"))
  }
  p.hidden = !open
  btn?.setAttribute("aria-expanded", open)
  if (open && name === "luoghi") renderPlaces()
}
function toggleMenu(force) {
  const m = $("#dm-menu-list")
  m.hidden = !(force ?? m.hidden)
}

let lastScale = 0
function updateScale() {
  if (!view || view.s === lastScale) return
  lastScale = view.s
  const perMile = view.s / view.dpr                      // css px per miglio
  const nice = [1, 2, 3, 6, 12, 24, 48, 96, 192]
  const miles = nice.find((n) => n * perMile >= 60) ?? 192
  $("#scale-bar").style.width = `${Math.round(miles * perMile)}px`
  $("#scale-text").textContent = `${miles} mi`
}

// ================================================================ DM: accesso
function askPassword({ title, text, confirm = false, okLabel = "Entra" }) {
  const d = $("#dlg-password")
  $("#pw-title").textContent = title
  $("#pw-text").textContent = text
  $("#pw-2-row").hidden = !confirm
  $("#pw-1").value = $("#pw-2").value = ""
  $("#pw-1").autocomplete = confirm ? "new-password" : "current-password"
  $("#pw-ok").textContent = okLabel
  $("#pw-error").hidden = true
  d.returnValue = ""
  d.showModal()
  return new Promise((resolve) => {
    const form = d.querySelector("form")
    const onSubmit = (e) => {
      const a = $("#pw-1").value
      if (confirm && (a.length < 10 || a !== $("#pw-2").value)) {
        e.preventDefault()
        $("#pw-error").hidden = false
        $("#pw-error").textContent = a.length < 10 ? "Usa almeno 10 caratteri: è l'unica cosa che protegge i segreti." : "Le due password non coincidono."
        return
      }
    }
    form.addEventListener("submit", onSubmit)
    d.addEventListener("close", () => {
      form.removeEventListener("submit", onSubmit)
      resolve(d.returnValue === "ok" ? $("#pw-1").value : null)
    }, { once: true })
  })
}

async function enterDm() {
  const fresh = !state.published.secret
  const pw = await askPassword(fresh
    ? { title: "Crea la password del DM", text: "Non c'è ancora una password: quella che scegli ora cifrerà i luoghi nascosti e le tue note. Non si può recuperare, conservala bene.", confirm: true, okLabel: "Crea" }
    : { title: "Modalità DM", text: "Inserisci la password per vedere e modificare i luoghi nascosti." })
  if (pw === null) return
  try {
    toast("Sblocco…")
    const { vault, markers } = await unlock(state.published, pw)
    state.vault = vault
    state.markers = markers
    state.dm = true
    state.dirty = fresh
    if (fresh) await offerSuggested()
    const draft = await loadDraft(vault)
    if (draft && draft.baseRev >= state.rev && await confirmBox("Bozza non pubblicata",
      `Su questo dispositivo c'è una bozza del ${new Date(draft.at).toLocaleString("it-IT")} con modifiche non pubblicate. Vuoi riprenderla?`, "Riprendi")) {
      state.markers = draft.markers
      state.explored = new Set(draft.explored)
      state.settings = { ...state.settings, ...draft.settings }
      state.dirty = true
    }
    refresh()
    toast(fresh ? "Password creata. Pubblica per salvarla nel file della campagna." : "Modalità DM attiva.", "ok")
  } catch (e) {
    toast(e.message, "err")
    if (e.message === "Password sbagliata.") enterDm()
  }
}

// Alla prima password: i luoghi notevoli della mappa ufficiale (data/suggeriti.json), già nascosti.
async function offerSuggested() {
  let list
  try {
    const res = await fetch(`data/suggeriti.json?t=${Date.now()}`, { cache: "no-store" })
    if (!res.ok) return
    list = (await res.json()).markers || []
  } catch { return }
  const ids = new Set(state.markers.map((m) => m.id))
  const add = list.filter((m) => !ids.has(m.id))
  if (!add.length || !await confirmBox("Luoghi della mappa ufficiale",
    `Vuoi aggiungere ${add.length} luoghi notevoli della mappa ufficiale (dungeon, rovine, pozzi lunari, rocche)? Saranno nascosti ai giocatori finché non li riveli.`, "Aggiungi")) return
  state.markers.push(...add.map((m) => ({ ...m, hidden: true })))
}

async function leaveDm() {
  if (state.dirty && !await confirmBox("Modifiche non pubblicate",
    "Le modifiche restano salvate come bozza cifrata su questo dispositivo, ma i giocatori non le vedono finché non pubblichi. Uscire lo stesso?", "Esci")) return
  state.dm = false
  state.vault = null
  state.dirty = false
  state.playerView = false
  $("#dm-player").setAttribute("aria-pressed", "false")
  setMode("view")
  applyPublished(state.published)
}

// ================================================================ DM: luoghi
function newMarker(x, y, snap) {
  setMode("view")
  editMarker({ id: null, type: "segnaposto", name: "", x, y, text: "", notes: "", hidden: true }, snap)
}

function editMarker(m, snap = false) {
  const d = $("#dlg-marker"), isNew = !m.id
  $("#mk-title").textContent = isNew ? "Nuovo luogo" : "Modifica luogo"
  $("#mk-name").value = m.name || ""
  $("#mk-type").value = m.type
  $("#mk-text").value = m.text || ""
  $("#mk-notes").value = m.notes || ""
  $("#mk-visible").checked = !m.hidden
  $("#mk-snap").checked = snap
  $("#mk-delete").hidden = isNew
  d.returnValue = ""
  d.showModal()
  $("#mk-name").focus()
  const del = async () => {
    d.close("cancel")
    if (!await confirmBox("Eliminare il luogo?", `“${m.name || "senza nome"}” sparirà dalla mappa al prossimo salvataggio.`, "Elimina")) return
    state.markers = state.markers.filter((x) => x.id !== m.id)
    closeInfo()
    markDirty()
  }
  $("#mk-delete").onclick = del
  d.addEventListener("close", () => {
    $("#mk-delete").onclick = null
    if (d.returnValue !== "ok") return
    const wasHidden = m.hidden
    m.name = $("#mk-name").value.trim()
    m.type = $("#mk-type").value
    m.text = $("#mk-text").value.trim()
    m.notes = $("#mk-notes").value.trim()
    m.hidden = !$("#mk-visible").checked
    if (!m.notes) delete m.notes
    if ($("#mk-snap").checked) {
      const h = hexAt(m.x, m.y, state.settings.hexMiles), c = hexCenter(h.col, h.row, state.settings.hexMiles)
      m.x = Math.round(c.x * 10) / 10
      m.y = Math.round(c.y * 10) / 10
    }
    if (wasHidden && !m.hidden) m.revealed = new Date().toISOString()
    if (isNew) {
      m.id = newId(m.name)
      state.markers.push(m)
    }
    markDirty()
    selectMarker(m)
  }, { once: true })
}

function setHidden(m, hidden) {
  m.hidden = hidden
  if (!hidden) {
    m.revealed = new Date().toISOString()
    view.pulse([m.id])
  }
  markDirty()
  showMarker(m)
  toast(hidden ? `“${m.name}” ora è nascosto.` : `“${m.name}” sarà visibile ai giocatori dopo la pubblicazione.`, hidden ? "" : "gold")
}

let draftTimer = 0
function markDirty() {
  state.dirty = true
  clearTimeout(draftTimer)
  draftTimer = setTimeout(() => saveDraft(state), 800)
  refresh()
}

// ================================================================ DM: pubblicazione
async function publishNow() {
  const cfg = loadConfig()
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    toast("Prima configura GitHub (utente, repository, token).", "err")
    return openSettings()
  }
  const btn = $("#dm-publish")
  btn.disabled = true
  try {
    toast("Pubblico su GitHub…")
    const remote = await fetchRemote(cfg)
    const remoteRev = remote?.json?.rev ?? 0
    if (remoteRev > state.rev && !await confirmBox("Versione più recente su GitHub",
      `Su GitHub c'è la revisione ${remoteRev}, più nuova di quella che hai caricato (${state.rev}): forse l'hai pubblicata da un altro dispositivo. Sovrascriverla?`, "Sovrascrivi")) return
    state.rev = Math.max(state.rev, remoteRev)
    const file = await buildFile(state)
    await publish(cfg, JSON.stringify(file, null, 1) + "\n", remote?.sha, `Aggiornamento mappa (rev ${file.rev})`)
    state.rev = file.rev
    state.published = normalize(file)
    state.dirty = false
    clearDraft()
    refresh()
    toast("Pubblicato. I giocatori lo vedranno appena GitHub Pages aggiorna il sito (di solito 1-2 minuti).", "ok", 7000)
  } catch (e) {
    toast(e.message, "err", 8000)
  } finally {
    btn.disabled = false
  }
}

async function exportFile() {
  const file = await buildFile(state)
  state.rev = file.rev
  const blob = new Blob([JSON.stringify(file, null, 1) + "\n"], { type: "application/json" })
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "campaign.json" })
  a.click()
  URL.revokeObjectURL(a.href)
  toast("File esportato: caricalo in data/campaign.json del repository.", "ok", 6000)
}

async function importFile(e) {
  const f = e.target.files[0]
  e.target.value = ""
  if (!f) return
  try {
    const pub = normalize(JSON.parse(await f.text()))
    if (!await confirmBox("Importare il file?", `Sostituisce i luoghi e l'esplorazione attuali con quelli di “${f.name}” (revisione ${pub.rev}).`, "Importa")) return
    let res
    try {
      res = await unlockImported(pub)
    } catch (err) {
      return toast(err.message, "err")
    }
    state.vault = res.vault
    state.markers = res.markers
    state.explored = new Set(pub.explored)
    state.settings = { ...pub.settings }
    state.rev = Math.max(state.rev, pub.rev)
    markDirty()
    toast("Importato. Pubblica per mandarlo ai giocatori.", "ok")
  } catch (err) {
    toast(`File non valido: ${err.message}`, "err")
  }
}
// Un file senza segreti o cifrato con la chiave di adesso non chiede la password.
async function unlockImported(pub) {
  if (!pub.secret || pub.secret.salt === toBase64(state.vault.salt)) {
    try { return await openWith(pub, state.vault) } catch { /* stesso sale ma altra password */ }
  }
  const pw = await askPassword({ title: "Password del file", text: "Inserisci la password con cui è stato cifrato il file importato." })
  if (pw === null) throw new Error("Importazione annullata.")
  return unlock(pub, pw)
}

// ================================================================ DM: impostazioni
function openSettings() {
  const d = $("#dlg-settings"), cfg = loadConfig()
  $("#st-title").value = state.settings.title
  $("#st-hex").value = state.settings.hexMiles
  $("#st-fog").checked = state.settings.fog
  $("#gh-owner").value = cfg.owner
  $("#gh-repo").value = cfg.repo
  $("#gh-branch").value = cfg.branch
  $("#gh-path").value = cfg.path
  $("#gh-token").value = cfg.token
  $("#gh-remember").checked = cfg.remember
  $("#st-password").onclick = changePassword
  d.returnValue = ""
  d.showModal()
  d.addEventListener("close", async () => {
    if (d.returnValue !== "ok") return
    saveConfig({
      owner: $("#gh-owner").value.trim(), repo: $("#gh-repo").value.trim(), branch: $("#gh-branch").value.trim() || "main",
      path: $("#gh-path").value.trim() || "data/campaign.json", token: $("#gh-token").value.trim(), remember: $("#gh-remember").checked,
    })
    const hex = Number($("#st-hex").value)
    if (hex !== state.settings.hexMiles && state.explored.size && !await confirmBox("Cambiare la griglia?",
      "Gli esagoni esplorati sono legati alla griglia attuale: cambiando dimensione l'esplorazione riparte da zero.", "Cambia")) return
    if (hex !== state.settings.hexMiles) state.explored = new Set()
    state.settings = { ...state.settings, title: $("#st-title").value.trim() || "Isole Moonshae", hexMiles: hex, fog: $("#st-fog").checked }
    $("#title").textContent = state.settings.title
    markDirty()
  }, { once: true })
}

async function changePassword() {
  $("#dlg-settings").close("cancel")
  const pw = await askPassword({ title: "Nuova password del DM", text: "Da qui in avanti i segreti saranno cifrati con la nuova password. Pubblica per applicarla.", confirm: true, okLabel: "Cambia" })
  if (pw === null) return
  state.vault = await openVault(pw, null)
  markDirty()
  toast("Password cambiata. Pubblica per salvarla.", "gold")
}

// ================================================================ piccoli aiuti
function confirmBox(title, text, ok = "Conferma") {
  const d = $("#dlg-confirm")
  $("#cf-title").textContent = title
  $("#cf-text").textContent = text
  $("#cf-ok").textContent = ok
  d.returnValue = ""
  d.showModal()
  return new Promise((resolve) => d.addEventListener("close", () => resolve(d.returnValue === "ok"), { once: true }))
}

function toast(text, kind = "", ms = 3500) {
  const t = el("div", `toast ${kind}`, text)
  $("#toasts").append(t)
  setTimeout(() => t.remove(), ms)
}

function el(tagName, cls, text) {
  const e = document.createElement(tagName)
  if (cls) e.className = cls
  if (text !== undefined) e.textContent = text
  return e
}
function button(label, onClick, cls = "") {
  const b = el("button", `btn small ${cls}`, label)
  b.type = "button"
  b.addEventListener("click", onClick)
  return b
}

// Testo con **grassetto**, *corsivo*, [link](https://…) e paragrafi; tutto il resto è testo.
function rich(src) {
  if (!src) return ""
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  return esc.split(/\n{2,}/).map((p) => "<p>" + p
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, "<br>") + "</p>").join("")
}
