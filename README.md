# 🦊 FOX RUNNER

Minigioco runner open source con una volpe, giocabile nel browser e nel terminale Windows. È anche un progetto di collaudo per il coordinamento di agenti di sviluppo tramite Agent Dev Hub; la versione iniziale è un prototipo creato da ChatGPT, non un risultato autonomo degli agenti.

## Giocare

- **Browser:** apri `index.html` direttamente, senza server o librerie esterne. Il file `game-browser.js` è già incluso.
- **Terminale Windows:** usa `AVVIA-FOX-RUNNER-TERMINALE.cmd` oppure esegui `py -3 terminal/fox_runner.py` dalla radice del progetto.
- **Comandi:** Spazio, freccia su o W per saltare; P per mettere in pausa; R per ricominciare. Su telefono usa il pulsante SALTA.

## Test

Richiedono Node.js 18+ e Python 3.

```powershell
node --test tests/*.test.mjs
node --check game-engine.mjs
node --check game.mjs
node --check game-browser.js
py -3 scripts/build_browser.py
py -3 -m py_compile terminal/fox_runner.py
```

`game-browser.js` è generato da `game-engine.mjs` e `game.mjs`. Rigeneralo quando cambiano questi moduli e verifica il risultato prima del commit. GitHub Actions controlla che il bundle sia aggiornato, esegue i test del gioco e verifica la sintassi dello script PowerShell di commit.

## GitHub Pages

Per pubblicare il sito da questo repository, usa **Settings → Pages → Deploy from a branch → main / (root)**. L'indirizzo previsto è [mixmorfeus.github.io/fox-runner](https://mixmorfeus.github.io/fox-runner/), solo dopo l'attivazione e la conferma di pubblicazione da GitHub.

## Sviluppo controllato con gli agenti

Il primo collaudo autentico con gli agenti richiede una modifica verificabile del gioco, test, diff e un rapporto di handoff. Lo script `scripts/AUTO-COMMIT-FOX.ps1` è un ausilio manuale: controlla repository, branch `agent/opencode/FOX-001`, file ammessi e test, poi richiede una conferma esplicita prima del commit e del push. **Non esegue merge automatici su `main`.**

Per avviarlo dalla radice del repository, dopo aver verificato le modifiche:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\AUTO-COMMIT-FOX.ps1
```

Non inserire credenziali, token, file personali o documenti riservati in questo repository pubblico. Le autorizzazioni degli agenti vanno limitate anche al di fuori dello script; la sola lista di file ammessi non costituisce un perimetro di sicurezza.

## Licenza

MIT. Consulta `LICENSE`.
