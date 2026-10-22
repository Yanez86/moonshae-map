// Pubblicazione di data/campaign.json con l'API di GitHub, direttamente dal browser del DM.
// Il token resta nel browser (localStorage o sessionStorage) e va solo a api.github.com.

import { toBase64, fromBase64 } from "./crypto.js"

const STORE = "moonshae:github"

export function guessRepo() {
  const host = location.hostname
  if (!host.endsWith(".github.io")) return { owner: "", repo: "" }
  const owner = host.split(".")[0]
  const first = location.pathname.split("/").filter(Boolean)[0]
  return { owner, repo: first || `${owner}.github.io` }
}

export function loadConfig() {
  const base = { ...guessRepo(), branch: "main", path: "data/campaign.json", token: "", remember: false }
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "{}")
    const token = saved.token || sessionStorage.getItem(STORE + ":token") || ""
    return { ...base, ...saved, token, remember: Boolean(saved.token) }
  } catch {
    return base
  }
}

export function saveConfig(cfg) {
  const { token, remember, ...rest } = cfg
  try {
    localStorage.setItem(STORE, JSON.stringify(remember ? { ...rest, token } : rest))
    if (remember) sessionStorage.removeItem(STORE + ":token")
    else sessionStorage.setItem(STORE + ":token", token)
  } catch { /* archiviazione non disponibile: il token vale solo per questa pagina */ }
}

function api(cfg) {
  if (!cfg.owner || !cfg.repo || !cfg.token) throw new Error("Configura GitHub nelle impostazioni: utente, repository e token.")
  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${cfg.path.split("/").map(encodeURIComponent).join("/")}`
  const headers = { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
  return { url, headers }
}

async function failure(res) {
  let msg = ""
  try { msg = (await res.json()).message } catch { /* corpo non JSON */ }
  if (res.status === 401) return new Error("Token non valido o scaduto.")
  if (res.status === 403 || res.status === 404) return new Error(`GitHub ha rifiutato l'accesso (${res.status}): controlla repository, ramo e permessi del token (Contents: read and write). ${msg}`)
  return new Error(`Errore GitHub ${res.status}: ${msg}`)
}

// Il file com'è ora sul ramo: { sha, json } oppure null se non esiste ancora.
export async function fetchRemote(cfg) {
  const { url, headers } = api(cfg)
  const res = await fetch(`${url}?ref=${encodeURIComponent(cfg.branch)}&t=${Date.now()}`, { headers, cache: "no-store" })
  if (res.status === 404) return null
  if (!res.ok) throw await failure(res)
  const body = await res.json()
  const text = new TextDecoder().decode(fromBase64(body.content.replace(/\n/g, "")))
  return { sha: body.sha, json: JSON.parse(text) }
}

export async function publish(cfg, text, sha, message) {
  const { url, headers } = api(cfg)
  const body = { message, content: toBase64(new TextEncoder().encode(text)), branch: cfg.branch }
  if (sha) body.sha = sha
  const res = await fetch(url, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) })
  if (res.status === 409 || res.status === 422) throw new Error("Il file su GitHub è cambiato nel frattempo: ricarica e riprova.")
  if (!res.ok) throw await failure(res)
  return (await res.json()).content.sha
}
