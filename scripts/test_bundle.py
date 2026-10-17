"""Read-only bundle consistency and generator regression checks."""
import tempfile
import sys
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
from build_browser import IMPORT, ROOT, build_bundle


class BundleTests(unittest.TestCase):
    def test_committed_bundle_matches_modules(self):
        self.assertEqual((ROOT / 'game-browser.js').read_text(encoding='utf-8'), build_bundle())

    def test_generator_rejects_unexpected_import(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'game-engine.mjs').write_text('export const WORLD = {};', encoding='utf-8')
            for source in [IMPORT, IMPORT.replace('stepGame', 'other') + '\nbody']:
                (root / 'game.mjs').write_text(source, encoding='utf-8')
                with self.assertRaises(ValueError):
                    build_bundle(root)
            self.assertFalse((root / 'game-browser.js').exists())


if __name__ == '__main__':
    unittest.main()
