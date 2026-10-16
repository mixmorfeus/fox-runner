@echo off
setlocal
pushd "%~dp0" || (echo ERRORE: cartella gioco non trovata & pause & exit /b 1)
py -3 "terminal\fox_runner.py"
if errorlevel 1 (echo Il gioco non si e' avviato correttamente.)
pause
popd
