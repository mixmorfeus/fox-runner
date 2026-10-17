// FOX RUNNER - deterministic, dependency-free game logic.
export const WORLD = Object.freeze({width: 960, height: 360, ground: 284, foxX: 130, foxW: 49, foxH: 39});
const GRAVITY = 1740;
const JUMP_VELOCITY = -650;
const SPEED_START = 305;
const SPEED_MAX = 650;
const BULLET_SPEED = 900;
const SHOOT_COOLDOWN = 0.26;
const ENEMY_DRIFT = 46;
const ENEMY_RADIUS = 20;
const BULLET_RADIUS = 6;
const EXPLOSION_RADIUS = 96;
const EXPLOSION_TIME = 0.5;
const COMBO_WINDOW = 2.0;
const KILL_BASE = 50;
const BARREL_POINTS = 30;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function rand(seed) {
  const next = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return [next / 4294967296, next];
}

// Enemy vertical position is a pure function of elapsed time (no per-frame drift).
function enemyY(e, seconds) {
  const amp = e.kind === 'bat' ? 6 : 14;
  const freq = e.kind === 'bat' ? 4.2 : 2.6;
  return e.baseY + Math.sin(seconds * freq + e.phase) * amp;
}

function obstacleSize(kind) {
  if (kind === 'log') return [38, 32];
  if (kind === 'bush') return [45, 43];
  return [34, 42]; // barrel
}

function circleRect(cx, cy, r, left, right, top, bottom) {
  const nx = clamp(cx, left, right);
  const ny = clamp(cy, top, bottom);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

export function createGame(seed = 42) {
  return {
    phase: 'ready', score: 0, seconds: 0, distance: 0, bonus: 0, kills: 0, combo: 0, comboTimer: 0,
    speed: SPEED_START, nextObstacle: 1.20, nextEnemy: 2.2, seed: (seed >>> 0) || 1, shootCooldown: 0,
    fox: { y: WORLD.ground - WORLD.foxH, velocity: 0, onGround: true },
    obstacles: [], enemies: [], bullets: [], explosions: [], events: [],
  };
}

export function startGame(seed = 42) {
  return {...createGame(seed), phase: 'playing'};
}

export function stepGame(state, dt, controls = {}) {
  if (controls.restart) state = startGame(state.seed);
  if (controls.togglePause && state.phase === 'playing') return {...state, phase: 'paused', events: []};
  if (controls.togglePause && state.phase === 'paused') return {...state, phase: 'playing', events: []};
  if (state.phase === 'ready' && (controls.jump || controls.start || controls.shoot)) state = startGame(state.seed);
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
  let nextEnemy = state.nextEnemy - dt;
  let seed = state.seed;
  const events = [];
  let obstacles = state.obstacles
    .map(o => ({...o, x: o.x - state.speed * dt}))
    .filter(o => o.x + o.width >= -12);
  let enemies = state.enemies
    .map(e => ({...e, x: e.x - (state.speed + ENEMY_DRIFT) * dt, y: enemyY(e, seconds)}))
    .filter(e => e.x + ENEMY_RADIUS >= -24);
  const lastObstacle = obstacles[obstacles.length - 1];
  const spawnX = WORLD.width + 8;
  const hasSpace = !lastObstacle || spawnX - (lastObstacle.x + lastObstacle.width) >= 90;
  if (nextObstacle <= 0 && hasSpace) {
    let roll;
    [roll, seed] = rand(seed);
    const kind = roll < 0.38 ? 'log' : roll < 0.68 ? 'bush' : roll < 0.92 ? 'barrel' : 'bush';
    const [w, h] = obstacleSize(kind);
    obstacles.push({x: WORLD.width + 8, kind, width: w, height: h});
    [roll, seed] = rand(seed);
    nextObstacle = 0.94 + roll * 0.52 + Math.max(0, (speed - SPEED_START) / 350) * 0.07;
  }
  if (nextEnemy <= 0) {
    let roll;
    [roll, seed] = rand(seed);
    const kind = roll < 0.5 ? 'bat' : 'crow';
    [roll, seed] = rand(seed);
    const baseY = kind === 'bat' ? WORLD.ground - 46 - roll * 4 : WORLD.ground - 128 - roll * 24;
    [roll, seed] = rand(seed);
    const phase = roll * Math.PI * 2;
    enemies.push({x: WORLD.width + 24, kind, baseY, phase, y: enemyY({kind, baseY, phase}, seconds)});
    [roll, seed] = rand(seed);
    nextEnemy = 2.4 + roll * 2.2 + Math.max(0, (speed - SPEED_START) / 300) * 0.04;
  }
  let shootCooldown = Math.max(0, state.shootCooldown - dt);
  let bullets = state.bullets
    .map(b => ({...b, x: b.x + BULLET_SPEED * dt}))
    .filter(b => b.x - BULLET_RADIUS <= WORLD.width + 24);
  if (controls.shoot && shootCooldown <= 0) {
    const bx = WORLD.foxX + WORLD.foxW + 6, by = y + 11;
    bullets.push({x: bx, y: by});
    shootCooldown = SHOOT_COOLDOWN;
    events.push({type: 'shot', x: bx, y: by});
  }
  const explosions = state.explosions
    .map(e => ({...e, t: e.t + dt}))
    .filter(e => e.t < EXPLOSION_TIME);
  let combo = state.combo, comboTimer = state.comboTimer, kills = state.kills, bonus = state.bonus;
  if (comboTimer > 0) {
    comboTimer = Math.max(0, comboTimer - dt);
    if (comboTimer === 0) combo = 0;
  }
  const killEnemy = (e) => {
    e.dead = true;
    combo += 1;
    comboTimer = COMBO_WINDOW;
    const mult = 1 + Math.min(4, Math.floor((combo - 1) / 2));
    const points = KILL_BASE * mult;
    kills += 1;
    bonus += points;
    events.push({type: 'kill', x: e.x, y: e.y, points, combo});
  };
  let barrels = 0;
  // Explosions damage enemies and chain into other barrels; they never hurt the fox.
  const detonate = (cx, cy) => {
    events.push({type: 'explosion', x: cx, y: cy});
    explosions.push({x: cx, y: cy, radius: EXPLOSION_RADIUS, t: 0});
    for (const o of obstacles) {
      if (o.kind !== 'barrel' || o.dead) continue;
      const ox = o.x + o.width / 2, oy = WORLD.ground - o.height / 2;
      if ((ox - cx) ** 2 + (oy - cy) ** 2 <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) {
        o.dead = true;
        barrels += 1;
        detonate(ox, oy);
      }
    }
    for (const e of enemies) {
      if (e.dead) continue;
      if ((e.x - cx) ** 2 + (e.y - cy) ** 2 <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) killEnemy(e);
    }
  };
  bullets = bullets.filter(b => {
    for (const e of enemies) {
      if (e.dead) continue;
      if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 <= (ENEMY_RADIUS + BULLET_RADIUS) ** 2) { killEnemy(e); return false; }
    }
    for (const o of obstacles) {
      if (o.kind !== 'barrel' || o.dead) continue;
      const ox = o.x + o.width / 2, oy = WORLD.ground - o.height / 2;
      if (Math.abs(b.x - ox) <= o.width / 2 + BULLET_RADIUS && Math.abs(b.y - oy) <= o.height / 2 + BULLET_RADIUS) {
        o.dead = true;
        barrels += 1;
        detonate(ox, oy);
        return false;
      }
    }
    return true;
  });
  if (barrels > 0) {
    bonus += barrels * BARREL_POINTS + (barrels > 1 ? (barrels - 1) * 40 : 0);
    if (barrels > 1) events.push({type: 'chain', barrels});
  }
  obstacles = obstacles.filter(o => !o.dead);
  enemies = enemies.filter(e => !e.dead);
  const foxRect = {left: WORLD.foxX + 9, right: WORLD.foxX + WORLD.foxW - 9, top: y + 5, bottom: y + WORLD.foxH - 5};
  const hitObstacle = obstacles.some(o => {
    const rect = {left: o.x + 6, right: o.x + o.width - 5, top: WORLD.ground - o.height + 5, bottom: WORLD.ground - 2};
    return foxRect.left < rect.right && foxRect.right > rect.left && foxRect.top < rect.bottom && foxRect.bottom > rect.top;
  });
  const hitEnemy = enemies.some(e => circleRect(e.x, e.y, ENEMY_RADIUS, foxRect.left, foxRect.right, foxRect.top, foxRect.bottom));
  const hit = hitObstacle || hitEnemy;
  return {
    ...state, phase: hit ? 'over' : 'playing',
    score: Math.floor(distance / 10) + bonus, bonus, kills, combo, comboTimer,
    seconds, distance, speed, nextObstacle, nextEnemy, seed, shootCooldown,
    fox: {y, velocity, onGround}, obstacles, enemies, bullets, explosions, events,
  };
}
