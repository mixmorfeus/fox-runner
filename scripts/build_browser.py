"""Bundle the tiny two-module game for direct file:// opening without dependencies."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
engine = (ROOT/'game-engine.mjs').read_text(encoding='utf-8').replace('export const ', 'const ').replace('export function ', 'function ')
game = (ROOT/'game.mjs').read_text(encoding='utf-8')
assert game.startswith("import {WORLD, createGame, startGame, stepGame} from './game-engine.mjs';")
game = game.split('\n', 1)[1]
(ROOT/'game-browser.js').write_text("'use strict';\n// Generated from game-engine.mjs + game.mjs. Do not edit directly.\n(()=>{\n" + engine + '\n' + game + '\n})();\n',encoding='utf-8')
