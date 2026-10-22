#!/bin/sh
# Ricostruisce la mappa con pxl e copia in assets/ i file usati dal sito.
# PXL può puntare a un clone locale: PXL="node ~/claude-pxl/bin/pxl.js" ./build.sh
set -e
cd "$(dirname "$0")"
PXL="${PXL:-npx --yes github:augusto-scarvalho/claude-pxl}"
$PXL build moonshae.px.js --out out --no-preview --only moonshae,moonshae_dati,icone,favicon
mkdir -p ../assets/mappa
cp out/scenes/moonshae/*.png ../assets/mappa/
cp out/scenes/moonshae_dati.png ../assets/mappa/dati.png
cp out/icone.png out/icone.json ../assets/
cp out/sprites/favicon.png ../assets/favicon.png
echo "assets aggiornati"
