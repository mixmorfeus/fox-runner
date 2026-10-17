FOX-004 integrated delivery

Base: origin/agent/opencode/FOX-001, 9aa9e042d784ece1c7a5dd113aa043de4d99fb63.
Branch: agent/codex/FOX-004-integrated. Separate worktree: .worktrees/FOX-004.
Sources: local FOX-002 and FOX-003 working files, including their uncommitted changes; read only. No source bundles copied.

Integrated FOX-002 parallax, stars, moon, gradients, fox running/jump/landing animation, particles, shadows, reduced-motion handling and crash effects with FOX-003 enemies, shooting, explosive barrels, chain reactions, combo scoring, HUD and synthesized audio.
Preserved FOX-001 minimum 90px obstacle clearance after movement, collision geometry, jump physics, pause/restart, desktop/mobile controls and offline file opening.
Fixed undefined enemy Y on spawn, points text lifetime (milliseconds/seconds mismatch), first shooting input, shooting release on blur, paused cosmetic timing, mobile HUD/actions spacing.
Bundle rebuilt with scripts/build_browser.py from sources.

Validation: Node test runner (18 tests), Python unittest (2 bundle tests), node --check, git diff --check. Real installed Edge via existing Playwright, no installations: desktop and mobile viewport, start, jump, shooting, pause/resume, restart, stable paused score, no JS page errors or horizontal mobile overflow. Combat screenshot uses injected deterministic state in a separate browser document; production files have no test hook. Four authentic browser screenshots in artifacts/.
Security audit: no network requests, remote dependencies, eval/Function, innerHTML or credential patterns in runtime sources; no new package dependencies; GitHub workflows, Pages and terminal unchanged.

Limitations: mobile checked through touch viewport emulation, not physical hardware; audio synthesis path not assessed by listening. Real browser script requires existing Python Playwright and installed Windows Edge. No exhaustive long-play balancing audit.
