# Isole Moonshae: mappa per l'hexcrawl

Mappa pixel art delle Isole Moonshae per una campagna privata di D&D 5e. Ha livelli attivabili,
una griglia esagonale, le città principali e punti di interesse che il DM rivela ai giocatori un
po' alla volta. È un sito statico pensato per GitHub Pages: niente server, niente database.

- **Giocatori**: aprono il link e vedono la mappa con i luoghi già scoperti. La pagina controlla
  gli aggiornamenti ogni minuto: un luogo appena rivelato pulsa e compare come "nuovo" nell'elenco.
- **DM**: con il pulsante **DM** e la password vede anche i luoghi nascosti e le proprie note.
  Può aggiungere luoghi, spostarli trascinandoli, rivelarli, segnare gli esagoni esplorati e
  pubblicare tutto su GitHub con un clic.

## Messa online (una volta sola)

1. **Attiva GitHub Pages**: nel repository vai su *Settings → Pages*, alla voce *Build and
   deployment* scegli *Deploy from a branch*, ramo `main`, cartella `/ (root)`. Dopo un minuto il
   sito è su `https://<utente>.github.io/moonshae-map/`.
2. **Crea un token per pubblicare dal browser**: *GitHub → Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token*.
   - *Repository access*: **Only select repositories** → `moonshae-map`
   - *Permissions → Repository permissions → Contents*: **Read and write**
   - una scadenza a piacere (alla scadenza se ne crea un altro)
3. **Apri il sito, premi DM e crea la password del DM** (almeno 10 caratteri). È l'unica chiave dei
   segreti: **non si può recuperare**, conservala in un gestore di password.
4. In **Altro → Impostazioni** incolla il token (utente e repository di solito sono già compilati)
   e premi **Pubblica**. Da qui in avanti il file della campagna contiene i segreti cifrati.

## Durante la campagna

| Cosa | Come |
|---|---|
| Aggiungere un luogo | **+ Luogo**, poi clic sulla mappa. Nasce *nascosto*: lo vedi solo tu, semitrasparente e con un quadratino viola. |
| Rivelarlo | Clic sul luogo → **Rivela ai giocatori** (oppure spunta *Visibile ai giocatori* nella scheda), poi **Pubblica**. |
| Spostarlo | In modalità DM trascinalo; nella scheda di modifica, *Al centro dell'esagono* lo aggancia al centro. |
| Note segrete | Il campo *Note del DM* non finisce mai in chiaro nel file pubblico. |
| Esplorazione | In *Impostazioni* accendi la nebbia, poi **Esplora** e clicca o trascina sugli esagoni. |
| Posizione del gruppo | Un luogo di tipo *Gruppo dei giocatori*, da trascinare dove si trovano. |
| Controllare cosa vedono i giocatori | **Vista giocatori** nasconde quello che è ancora segreto. |
| Distanze e tempi di viaggio | **Righello**: clic sui punti del percorso, doppio clic per finire. Dà miglia, esagoni e giorni (18/24/30 miglia al giorno a piedi, 48 in nave). |
| Link a un luogo | Nella scheda del luogo, **Copia link**. |

Le modifiche si salvano subito come bozza cifrata sul dispositivo del DM: chiudere la pagina
senza pubblicare non perde niente, e al successivo accesso ti viene proposto di riprenderle.
Dopo **Pubblica**, GitHub Pages aggiorna il sito in uno o due minuti e le pagine dei giocatori
si aggiornano da sole.

Senza token si può lavorare a mano: **Altro → Esporta campaign.json** e caricare il file al posto
di `data/campaign.json` dall'interfaccia web di GitHub.

## Cosa è segreto e cosa no

Con il piano gratuito di GitHub, Pages funziona solo con un repository **pubblico**: chiunque abbia
il link vede il sito, e chiunque guardi il repository vede i file. Per questo:

- i luoghi nascosti e tutte le note del DM sono cifrati nel campo `secret` di `data/campaign.json`
  (AES-GCM a 256 bit, chiave ricavata dalla password con PBKDF2 a 600.000 iterazioni). Senza la
  password sono illeggibili, anche nella cronologia dei commit;
- sono **in chiaro**: i luoghi già rivelati, gli esagoni esplorati, il titolo e le impostazioni;
- il token resta solo nel browser del DM e va solo ad `api.github.com`; i messaggi dei commit sono
  generici ("Aggiornamento mappa (rev N)"), quindi non svelano niente;
- la pagina chiede ai motori di ricerca di non indicizzarla.

Una password lunga è ciò che tiene al sicuro i segreti: con una corta, un giocatore curioso
potrebbe provarle tutte.

## La mappa

La mappa è disegnata in codice con [pxl](https://github.com/augusto-scarvalho/claude-pxl), un
linguaggio per la pixel art: tutto sta in [`art/moonshae.px.js`](art/moonshae.px.js). Ci sono la
geografia (isole, catene montuose, foreste, paludi, fiumi, insediamenti, in miglia), la palette,
gli sprite di alberi, montagne e colline, i nomi geografici e le icone dei luoghi.

```sh
# con un clone di pxl (Node 22.18 o più recente)
PXL="node ../claude-pxl/bin/pxl.js" art/build.sh
# oppure senza clone
art/build.sh
```

`build.sh` rigenera i livelli in `assets/mappa/` (mare, terra, fiumi, foreste, rilievi, nomi), la
mappa dei biomi usata per il terreno di ogni esagono (`dati.png`) e il foglio delle icone.
La scala è di 2 pixel per miglio; il file della campagna usa coordinate in miglia, quindi i
luoghi già piazzati restano al loro posto anche se ritocchi la mappa.

La geografia è una ricostruzione libera fatta per questa campagna, non la mappa ufficiale. Se una
città non è dove la ricordi, trascinala in modalità DM.

## Provarlo in locale

```sh
npx serve .
```

Poi apri l'indirizzo che stampa. La cifratura del browser richiede `localhost` o HTTPS.

## File

| Percorso | Contenuto |
|---|---|
| `index.html`, `css/`, `js/` | il sito (moduli JavaScript, nessuna build) |
| `js/map.js` | il disegno su canvas: livelli, griglia, nebbia, luoghi, righello |
| `js/app.js` | interfaccia, modalità DM, pubblicazione |
| `js/store.js`, `js/crypto.js`, `js/github.js` | file della campagna, cifratura, API di GitHub |
| `js/config.js` | livelli, tipi di luogo, biomi, andature |
| `data/campaign.json` | la campagna pubblicata |
| `art/` | la mappa in pxl e lo script che la ricostruisce |
| `assets/` | i PNG generati da pxl |

## Crediti

- Mappa e icone disegnate con [pxl](https://github.com/augusto-scarvalho/claude-pxl) (licenza MIT),
  compreso il suo font 5×7 (`art/font5x7.px.js`).
- Font dell'interfaccia: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) (SIL Open Font License).
- Forgotten Realms, Moonshae e Dungeons & Dragons sono marchi di Wizards of the Coast. Questo è un
  progetto amatoriale per uso privato, senza alcun legame con Wizards of the Coast.
