"""Bundle the two game modules for direct file:// opening without dependencies."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = "import {WORLD, createGame, startGame, stepGame} from './game-engine.mjs';"


def build_bundle(root=ROOT):
    engine = (root / 'game-engine.mjs').read_text(encoding='utf-8-sig')
    game = (root / 'game.mjs').read_text(encoding='utf-8-sig')
    first_line, separator, body = game.partition('\n')
    if first_line != IMPORT or not separator:
        raise ValueError('Unexpected game.mjs engine import; bundle was not written')
    engine = engine.replace('export const ', 'const ').replace('export function ', 'function ')
    return ("'use strict';\n// Generated from game-engine.mjs + game.mjs. Do not edit directly.\n"
            + '(()=>{\n' + engine + '\n' + body + '\n})();\n')


if __name__ == '__main__':
    content = build_bundle()
    (ROOT / 'game-browser.js').write_text(content, encoding='utf-8', newline='\n')
