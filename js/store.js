// La campagna: data/campaign.json com'è pubblicato, e lo stato completo del DM.
//
// Nel file pubblico ci sono solo i luoghi visibili ai giocatori (senza note del DM). Lo stato
// completo, luoghi nascosti e note compresi, è nel campo "secret", cifrato con la password del DM.

import { openVault, seal, unseal } from "./crypto.js"

export const FORMAT = "moonshae-campagna"
const DRAFT = "moonshae:bozza"
const SEEN = "moonshae:visti"

export function normalize(c) {
  return {
    format: FORMAT, version: 1, rev: c.rev ?? 0, updated: c.updated ?? null,
    settings: { title: "Isole Moonshae", hexMiles: 6, fog: false, ...(c.settings || {}) },
    markers: Array.isArray(c.markers) ? c.markers : [],
    explored: Array.isArray(c.explored) ? c.explored : [],
    secret: c.secret ?? null,
  }
}

export async function loadPublished() {
  const res = await fetch(`data/campaign.json?t=${Date.now()}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Non riesco a leggere data/campaign.json (${res.status})`)
  return normalize(await res.json())
}

// Sblocca con la password. Senza "secret" la password è nuova e protegge da qui in avanti.
export async function unlock(published, password) {
  return openWith(published, await openVault(password, published.secret))
}

// Come unlock, con una chiave già derivata (stessa password e stesso sale).
export async function openWith(published, vault) {
  if (!published.secret) return { vault, markers: structuredClone(published.markers) }
  let full
  try {
    full = await unseal(vault, published.secret)
  } catch {
    throw new Error("Password sbagliata.")
  }
  // un luogo pubblico che il DM non ha (aggiunto a mano nel JSON) non va perso
  const ids = new Set(full.markers.map((m) => m.id))
  const markers = [...full.markers, ...published.markers.filter((m) => !ids.has(m.id))]
  return { vault, markers }
}

const publicMarker = ({ notes, hidden, ...m }) => m

export async function buildFile(state) {
  return {
    format: FORMAT, version: 1, rev: state.rev + 1, updated: new Date().toISOString(),
    settings: state.settings,
    markers: state.markers.filter((m) => !m.hidden).map(publicMarker),
    explored: [...state.explored].sort(),
    secret: await seal(state.vault, { markers: state.markers }),
  }
}

export function newId(name) {
  const slug = (name || "luogo").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32)
  return `${slug || "luogo"}-${Math.random().toString(36).slice(2, 7)}`
}

// ---------------------------------------------------------------- bozza locale (cifrata)
export async function saveDraft(state) {
  try {
    const box = await seal(state.vault, { markers: state.markers, explored: [...state.explored], settings: state.settings })
    localStorage.setItem(DRAFT, JSON.stringify({ baseRev: state.rev, at: Date.now(), box }))
  } catch { /* archiviazione piena o non disponibile */ }
}
export async function loadDraft(vault) {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) || "null")
    if (!d) return null
    return { ...(await unseal(vault, d.box)), baseRev: d.baseRev, at: d.at }
  } catch {
    return null
  }
}
export function clearDraft() {
  try { localStorage.removeItem(DRAFT) } catch { /* niente da togliere */ }
}

// ---------------------------------------------------------------- luoghi già visti dal giocatore
export function loadSeen() {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN) || "null")
    return v ? new Set(v) : null
  } catch {
    return null
  }
}
export function saveSeen(set) {
  try { localStorage.setItem(SEEN, JSON.stringify([...set])) } catch { /* solo per comodità */ }
}
