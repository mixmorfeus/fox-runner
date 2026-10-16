// FOX RUNNER - deterministic, dependency-free game logic.
export const WORLD = Object.freeze({width: 960, height: 360, ground: 284, foxX: 130, foxW: 49, foxH: 39});
const GRAVITY = 1740;
const JUMP_VELOCITY = -650;
const SPEED_START = 305;
const SPEED_MAX = 650;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function rand(seed) {
  const next = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return [next / 4294967296, next];
}

export function createGame(seed = 42) {
  return {
    phase: 'ready', score: 0, seconds: 0, distance: 0,
    speed: SPEED_START, nextObstacle: 1.20, seed: (seed >>> 0) || 1,
    fox: { y: WORLD.ground - WORLD.foxH, velocity: 0, onGround: true },
    obstacles: [],
  };
}

export function startGame(seed = 42) {
  return {...createGame(seed), phase: 'playing'};
}

export function stepGame(state, dt, controls = {}) {
  if (controls.restart) state = startGame(state.seed);
  if (controls.togglePause && state.phase === 'playing') return {...state, phase: 'paused'};
  if (controls.togglePause && state.phase === 'paused') return {...state, phase: 'playing'};
  if (state.phase === 'ready' && (controls.jump || controls.start)) state = startGame(state.seed);
  if (state.phase !== 'playing') return state;
  if (!Number.isFinite(dt) || dt < 0) return state;
  // A large wall-clock gap must not teleport obstacles into the fox.
  dt = clamp(dt, 0, 0.05);
  let {y, velocity, onGround} = state.fox;
  if (controls.jump && onGround) { velocity = JUMP_VELOCITY; onGround = false; }
  if (!onGround) {
    velocity += GRAVITY * dt;
    y += velocity * dt;
    if (y >= WORLD.ground - WORLD.foxH) {
      y = WORLD.ground - WORLD.foxH;
      velocity = 0;
      onGround = true;
    }
  }
  const distance = state.distance + state.speed * dt;
  const seconds = state.seconds + dt;
  const speed = clamp(SPEED_START + Math.floor(distance / 700) * 16, SPEED_START, SPEED_MAX);
  let nextObstacle = state.nextObstacle - dt;
  let seed = state.seed;
  let obstacles = state.obstacles
    .map(o => ({...o, x: o.x - state.speed * dt}))
    .filter(o => o.x + o.width >= -12);
  // Check the nearest obstacle after movement; measure clear space between edges.
  const lastObstacle = obstacles[obstacles.length - 1];
  const spawnX = WORLD.width + 8;
  const hasSpace = !lastObstacle || spawnX - (lastObstacle.x + lastObstacle.width) >= 90;
  if (nextObstacle <= 0 && hasSpace) {
    let roll;
    [roll, seed] = rand(seed);
    const kind = roll < 0.52 ? 'log' : 'bush';
    obstacles.push({x: spawnX, kind, width: kind === 'log' ? 38 : 45, height: kind === 'log' ? 32 : 43});
    [roll, seed] = rand(seed);
    nextObstacle = 0.94 + roll * 0.52 + Math.max(0, (speed - SPEED_START) / 350) * 0.07;
  }
  const foxRect = {left: WORLD.foxX + 9, right: WORLD.foxX + WORLD.foxW - 9,
    top: y + 5, bottom: y + WORLD.foxH - 5};
  const hit = obstacles.some(o => {
    const rect = {left: o.x + 6, right: o.x + o.width - 5,
      top: WORLD.ground - o.height + 5, bottom: WORLD.ground - 2};
    return foxRect.left < rect.right && foxRect.right > rect.left &&
      foxRect.top < rect.bottom && foxRect.bottom > rect.top;
  });
  return {
    ...state, phase: hit ? 'over' : 'playing',
    score: Math.floor(distance / 10), seconds, distance, speed, nextObstacle, seed,
    fox: {y, velocity, onGround}, obstacles,
  };
}
