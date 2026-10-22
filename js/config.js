// Costanti condivise: la mappa disegnata con pxl (art/moonshae.px.js), i livelli, i tipi di luogo.

export const MAP = { widthMi: 269, heightMi: 392, pxPerMile: 4 }

// Livelli esportati da pxl, dal basso verso l'alto.
export const BASE_LAYERS = [
  { id: "mare", label: "Mare", file: "assets/mappa/mare.png" },
  { id: "terra", label: "Terreno", file: "assets/mappa/terra.png" },
  { id: "fiumi", label: "Fiumi e laghi", file: "assets/mappa/fiumi.png" },
  { id: "foreste", label: "Foreste", file: "assets/mappa/foreste.png" },
  { id: "rilievi", label: "Montagne e colline", file: "assets/mappa/rilievi.png" },
  { id: "nomi", label: "Nomi geografici", file: "assets/mappa/nomi.png" },
]

export const OVERLAYS = [
  { id: "griglia", label: "Griglia esagonale", on: true },
  { id: "coordinate", label: "Coordinate esagoni", on: false },
  { id: "nebbia", label: "Nebbia (esplorazione)", on: true },
  { id: "insediamenti", label: "Insediamenti", on: true },
  { id: "luoghi", label: "Punti di interesse", on: true },
  { id: "gruppo", label: "Posizione del gruppo", on: true },
  { id: "etichette", label: "Nomi dei luoghi", on: true },
]

// Codici di moonshae_dati.png: rosso = bioma * 12, verde = isola * 20.
export const BIOMES = {
  0: { name: "Mare" }, 1: { name: "Lago" }, 3: { name: "Spiaggia" }, 4: { name: "Pianura" },
  5: { name: "Campi coltivati" }, 6: { name: "Foresta", hard: true }, 7: { name: "Foresta di conifere", hard: true },
  8: { name: "Colline", hard: true }, 9: { name: "Montagne", hard: true }, 10: { name: "Vette innevate", hard: true },
  11: { name: "Brughiera" }, 12: { name: "Palude", hard: true }, 13: { name: "Terre brulle" }, 14: { name: "Scogliere", hard: true },
}
export const ISLANDS = {
  1: "Gwynneth", 2: "Alaron", 3: "Oman", 4: "Norland", 5: "Moray", 6: "Snowdown", 7: "Flamsterd",
  8: "Isole Norheim", 9: "Arcipelago di Korinn", 10: "Isolotto",
}

// Tipi di luogo: l'icona è il frame "icona_<icon>" di assets/icone.png.
export const TYPES = [
  { id: "capitale", label: "Capitale", group: "insediamenti", icon: "capitale" },
  { id: "caer", label: "Castello (caer)", group: "insediamenti", icon: "caer" },
  { id: "citta", label: "Città", group: "insediamenti", icon: "citta" },
  { id: "villaggio", label: "Villaggio", group: "insediamenti", icon: "villaggio" },
  { id: "porto", label: "Porto", group: "insediamenti", icon: "porto" },
  { id: "rovina", label: "Rovine", group: "luoghi", icon: "rovina" },
  { id: "dungeon", label: "Dungeon / caverna", group: "luoghi", icon: "dungeon" },
  { id: "tempio", label: "Tempio / santuario", group: "luoghi", icon: "tempio" },
  { id: "pozzo_lunare", label: "Pozzo lunare", group: "luoghi", icon: "pozzo_lunare" },
  { id: "cerchio", label: "Cerchio di pietre", group: "luoghi", icon: "cerchio" },
  { id: "bosco_sacro", label: "Bosco sacro", group: "luoghi", icon: "bosco_sacro" },
  { id: "torre", label: "Torre", group: "luoghi", icon: "torre" },
  { id: "portale", label: "Portale fatato", group: "luoghi", icon: "portale" },
  { id: "faro", label: "Faro", group: "luoghi", icon: "faro" },
  { id: "accampamento", label: "Accampamento", group: "luoghi", icon: "accampamento" },
  { id: "tana", label: "Tana di mostri", group: "luoghi", icon: "tana" },
  { id: "battaglia", label: "Battaglia / pericolo", group: "luoghi", icon: "battaglia" },
  { id: "tesoro", label: "Tesoro", group: "luoghi", icon: "tesoro" },
  { id: "missione", label: "Missione", group: "luoghi", icon: "missione" },
  { id: "png", label: "Personaggio (PNG)", group: "luoghi", icon: "png" },
  { id: "relitto", label: "Relitto", group: "luoghi", icon: "relitto" },
  { id: "nave", label: "Nave", group: "luoghi", icon: "nave" },
  { id: "segnaposto", label: "Segnaposto", group: "luoghi", icon: "segnaposto" },
  { id: "etichetta", label: "Solo testo", group: "luoghi", icon: null },
  { id: "gruppo", label: "Gruppo dei giocatori", group: "gruppo", icon: "gruppo" },
]
export const TYPE = Object.fromEntries(TYPES.map((t) => [t.id, t]))

// Andature di viaggio (miglia al giorno), dal Manuale del Dungeon Master.
export const PACES = [
  { label: "a piedi, lento", miles: 18 },
  { label: "a piedi, normale", miles: 24 },
  { label: "a piedi, veloce", miles: 30 },
  { label: "nave a vela", miles: 48 },
]

export const HEX_SIZES = [3, 6, 12, 24]

// Nomi delle isole disegnati dall'app quando la mappa è troppo piccola per leggere quelli di pxl.
export const ISLAND_LABELS = [
  ["Gwynneth", 153, 335], ["Alaron", 222, 213], ["Oman", 129, 177], ["Norland", 41, 91], ["Moray", 24, 247],
  ["Snowdown", 242, 337], ["Flamsterd", 38, 370], ["Isole Norheim", 116, 14], ["Korinn", 196, 21],
]
