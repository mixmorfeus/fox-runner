"""FOX RUNNER for a Windows terminal. SPACE jumps, P pauses, Q quits.

Single-file standard-library implementation; never touches other projects.
"""
import os
import random
import sys
import time

WIDTH = 66
GROUND = 12
FPS = 18


def main():
    try:
        import msvcrt  # Windows-only, no extra dependencies
    except ImportError:
        print('Questa versione terminale usa la console Windows (msvcrt).')
        return 1
    random.seed()
    x, jump, velocity, obstacles, tick, score, paused = 9, 0.0, 0.0, [], 0, 0, False
    sys.stdout.write('\x1b[2J\x1b[?25l')
    try:
        while True:
            while msvcrt.kbhit():
                key = msvcrt.getwch().lower()
                if key == 'q':
                    return 0
                if key == 'p':
                    paused = not paused
                if key == ' ' and jump == 0 and not paused:
                    velocity = 2.9
            if not paused:
                tick += 1
                if velocity or jump:
                    jump += velocity
                    velocity -= .40
                    if jump <= 0:
                        jump, velocity = 0, 0
                obstacles = [pos - 1 for pos in obstacles if pos > 0]
                if not obstacles or obstacles[-1] < WIDTH - random.randint(17, 26):
                    obstacles.append(WIDTH - 2)
                score += 1
            rows = [[' ' for _ in range(WIDTH)] for _ in range(GROUND + 2)]
            rows[GROUND] = ['─'] * WIDTH
            fox_row = GROUND - 1 - min(int(jump), GROUND-2)
            for i, ch in enumerate('>^.^<'):
                rows[fox_row][x + i] = ch
            for pos in obstacles:
                if 0 <= pos < WIDTH:
                    rows[GROUND - 1][pos] = '#'
            is_hit = jump < 1.0 and any(x-1 <= pos <= x+5 for pos in obstacles)
            sys.stdout.write('\x1b[HFOX RUNNER  |  PUNTI: {:05d}  |  SPAZIO salta  P pausa  Q esci\n'.format(score))
            if paused:
                sys.stdout.write('IN PAUSA - premi P per riprendere\n')
            else:
                sys.stdout.write(' ' * 42 + '\n')
            sys.stdout.write('\n'.join(''.join(row) for row in rows) + '\n')
            sys.stdout.flush()
            if is_hit:
                print('\nGAME OVER - Hai totalizzato', score, 'punti!')
                return 0
            time.sleep(1 / FPS)
    finally:
        sys.stdout.write('\x1b[?25h\n')
        sys.stdout.flush()


if __name__ == '__main__':
    raise SystemExit(main())
