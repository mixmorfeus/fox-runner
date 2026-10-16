# 🦊 FOX RUNNER

An open-source fox runner game for browser and terminal, built to test autonomous AI-agent collaboration, development, testing, and continuous improvement with Agent Dev Hub.

## Gioca

- **Browser / GitHub Pages:** apri la pagina pubblicata oppure il file index.html. Funziona senza dipendenze esterne, anche da file locale.
- **Terminale Windows:** doppio clic su AVVIA-FOX-RUNNER-TERMINALE.cmd oppure esegui py -3 terminal/fox_runner.py.
- **Comandi:** Spazio, freccia su o W per saltare; P per pausa; R per ricominciare. Da smartphone usa SALTA.

## Test

Servono Node.js 18+ per i test JavaScript e Python 3 per il terminale.

~~~sh
node --test tests/*.test.mjs
node --check game-engine.mjs
node --check game.mjs
node --check game-browser.js
python scripts/build_browser.py
python -m py_compile terminal/fox_runner.py
~~~

Il file game-browser.js è generato dai moduli game-engine.mjs + game.mjs per poter aprire il gioco con un doppio clic. Rigenerarlo quando cambiano i moduli.

## GitHub Pages

Dopo la revisione della PR iniziale e il merge su main, attiva **Settings → Pages → Deploy from a branch → main / (root)**. L'indirizzo previsto sarà https://mixmorfeus.github.io/fox-runner/ solo dopo la conferma di GitHub.

## FOX-001 · collaudo Agent Dev Hub

Questo commit iniziale è un prototipo realizzato da **ChatGPT**, non dagli agenti locali. Il primo test autentico prevede un miglioramento del gioco prodotto da OpenCode e verificato separatamente da Claude Code/Codex: ogni contributo deve avere diff, test, commit e rapporto attribuiti correttamente.

Il codice del gioco risiede **soltanto** nel repository fox-runner; il repository privato agent-dev-hub conserva task e rapporti. Nessuna credenziale.

Lo script scripts/AUTO-COMMIT-FOX.ps1 verifica test e branch, mostra il diff e richiede conferma esplicita prima di commit e push; non fa merge automatici.
