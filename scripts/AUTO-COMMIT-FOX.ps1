# FOX-001: commit/push ONLY on the dedicated fox-runner feature branch.
# Run manually after reviewing the agent's changes. Never merges to main.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$branch = 'agent/opencode/FOX-001'
$expectedRemote = 'https://github.com/mixmorfeus/fox-runner'
$files = @(
 '.github/workflows/test.yml', '.nojekyll',
 'AVVIA-FOX-RUNNER-TERMINALE.cmd', 'README.md',
 'game-browser.js', 'game-engine.mjs', 'game.mjs',
 'index.html', 'style.css', 'terminal/fox_runner.py',
 'tests/browser-smoke.test.mjs', 'tests/game-engine.test.mjs',
 'scripts/build_browser.py', 'scripts/AUTO-COMMIT-FOX.ps1'
)
function Assert-GitOk([string]$name) {
 if ($LASTEXITCODE -ne 0) { throw "${name}: exit $LASTEXITCODE" }
}
if (-not (Test-Path -LiteralPath (Join-Path $root '.git'))) { throw 'Non e il repository Git del gioco.' }
$top = (git -C $root rev-parse --show-toplevel).Trim()
Assert-GitOk 'git root'
if ([IO.Path]::GetFullPath($top).TrimEnd('\','/') -ine [IO.Path]::GetFullPath($root).TrimEnd('\','/')) { throw 'Repository root diverso: fermarsi.' }
$current = (git -C $root branch --show-current).Trim()
Assert-GitOk 'git branch'
if ($current -cne $branch) { throw "Branch inatteso: $current. Richiesto: $branch" }
$remote = (git -C $root remote get-url origin).Trim() -replace '\.git$', ''
Assert-GitOk 'git remote'
if ($remote -cne $expectedRemote) { throw "Remote inatteso: $remote" }
$status = @(git -C $root status --porcelain --untracked-files=all)
Assert-GitOk 'git status'
$changed = @($status | ForEach-Object { $_.Substring(3).Replace('\','/') })
$unexpected = @($changed | Where-Object { $_ -cnotin $files })
if ($unexpected.Count) { throw "File non autorizzati: $($unexpected -join ', ')" }
$staged = @(git -C $root diff --cached --name-only)
Assert-GitOk 'git staged'
if ($staged.Count) { throw 'Index Git non vuoto: fermarsi.' }
if (-not $changed.Count) { Write-Host 'Nessuna modifica da committare.'; exit 0 }
Write-Host '=== TEST FOX RUNNER ===' -ForegroundColor Cyan
& node --test (Join-Path $root 'tests\browser-smoke.test.mjs') (Join-Path $root 'tests\game-engine.test.mjs')
Assert-GitOk 'Node tests'
& node --check (Join-Path $root 'game-browser.js'); Assert-GitOk 'JS bundle'
& node --check (Join-Path $root 'game.mjs'); Assert-GitOk 'JS UI'
& node --check (Join-Path $root 'game-engine.mjs'); Assert-GitOk 'JS engine'
& py -3 -c "import pathlib; p=pathlib.Path(r'$root')/'terminal'/'fox_runner.py'; compile(p.read_text(encoding='utf-8'),str(p),'exec'); print('Terminal Python: sintassi OK')"
Assert-GitOk 'Python syntax'
Write-Host '=== MODIFICHE CANDIDATE ===' -ForegroundColor Cyan
git -C $root diff --stat; Assert-GitOk 'git diff stat'
$changed | ForEach-Object { Write-Host $_ }
$answer = Read-Host 'Scrivi COMMIT per registrare e pubblicare solo il branch FOX-001'
if ($answer -cne 'COMMIT') { Write-Host 'Annullato. Nessuna scrittura Git.'; exit 0 }
git -C $root add -- $changed; Assert-GitOk 'git add'
git -C $root diff --cached --check; Assert-GitOk 'git diff check'
git -C $root commit -m 'feat(fox): validated agent game iteration FOX-001'; Assert-GitOk 'git commit'
git -C $root push -u origin $branch; Assert-GitOk 'git push'
Write-Host 'Branch FOX-001 pubblicato, nessun merge su main.' -ForegroundColor Green
