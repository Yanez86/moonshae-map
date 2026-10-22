// Cifratura dei dati del DM: PBKDF2 (SHA-256) per la chiave, AES-GCM a 256 bit per i dati.
// Tutto con la Web Crypto del browser; niente esce dal dispositivo in chiaro.

const ITERATIONS = 600000
const enc = new TextEncoder(), dec = new TextDecoder()

export function toBase64(bytes) {
  bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ""
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
export function fromBase64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

export function newSalt() {
  return crypto.getRandomValues(new Uint8Array(16))
}

export async function deriveKey(password, salt, iterations = ITERATIONS) {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, base,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
}

// { key, salt, iterations } è la "cassaforte" sbloccata in memoria.
export async function seal(vault, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, vault.key, enc.encode(JSON.stringify(value)))
  return { alg: "AES-GCM", kdf: "PBKDF2-SHA256", iter: vault.iterations, salt: toBase64(vault.salt), iv: toBase64(iv), data: toBase64(data) }
}

// Lancia un errore se la password è sbagliata (AES-GCM verifica l'integrità).
export async function unseal(vault, box) {
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(box.iv) }, vault.key, fromBase64(box.data))
  return JSON.parse(dec.decode(data))
}

export async function openVault(password, box) {
  const salt = box ? fromBase64(box.salt) : newSalt()
  const iterations = box ? box.iter : ITERATIONS
  return { key: await deriveKey(password, salt, iterations), salt, iterations }
}
