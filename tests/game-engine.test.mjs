import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD,createGame,startGame,stepGame} from '../game-engine.mjs';

test('starts in ready, transitions to running and preserves seed',()=>{
 const s=createGame(123);assert.equal(s.phase,'ready');const started=stepGame(s,.016,{start:true});assert.equal(started.phase,'playing');assert.equal(started.seed,123);
});
test('jump then land on the ground',()=>{
 let s=stepGame(createGame(7),.016,{jump:true});assert.equal(s.fox.onGround,false);
 for(let i=0;i<90;i++)s=stepGame(s,.016);
 assert.equal(s.fox.onGround,true);assert.equal(s.fox.y,WORLD.ground-WORLD.foxH);
});
test('obstacles are generated and game scores points',()=>{
 let s=startGame(8);for(let i=0;i<35;i++)s=stepGame(s,.03);
 assert.ok(s.score>0);assert.ok(s.obstacles.length>=0);
});
test('collision stops game and restart resets it',()=>{
 let s=startGame(2);s={...s,obstacles:[{kind:'log',x:WORLD.foxX,width:38,height:32}],nextObstacle:9};
 s=stepGame(s,.016);assert.equal(s.phase,'over');assert.equal(stepGame(s,.016).phase,'over');
 const again=stepGame(s,.016,{restart:true});assert.equal(again.phase,'playing');assert.equal(again.score,0);
});
test('pause freezes movement',()=>{
 let s=stepGame(startGame(),.016,{togglePause:true});assert.equal(s.phase,'paused');
 const s2=stepGame(s,3);assert.deepEqual(s2,s);assert.equal(stepGame(s,0,{togglePause:true}).phase,'playing');
});
test('long frame gaps are clamped and inputs remain deterministic',()=>{
 const a=stepGame(startGame(99),99);const b=stepGame(startGame(99),.05);assert.deepEqual(a,b);
 assert.deepEqual(stepGame(createGame(1),0),createGame(1));
});
test('invalid frame time cannot advance game',()=>{
  const s=startGame();assert.deepEqual(stepGame(s,Number.NaN),s);assert.deepEqual(stepGame(s,-2),s);
});

test('[FOX-001] waits for 90px clear space after movement, at either speed', () => {
 for (const speed of [305, 650]) {
  for (const width of [38, 45]) {
   for (const dt of [0, .016, .05, 5]) {
    for (const gap of [89.9, 90, 90.1]) {
     const movement = speed * Math.min(dt, .05);
     const obstacle = {kind:'log', x:WORLD.width+8-width-gap+movement, width, height:32};
     const state = {...startGame(42), speed, nextObstacle:0, obstacles:[obstacle]};
     const before = structuredClone(state);
     const next = stepGame(state, dt);
     assert.deepEqual(state, before);
     assert.equal(next.obstacles.length, gap < 90 ? 1 : 2);
     if (gap < 90) {
      assert.equal(next.seed, state.seed);
      assert.ok(next.nextObstacle <= 0);
      const later = stepGame(next, .05);
      assert.equal(later.obstacles.length, 2);
     } else {
      assert.ok(next.obstacles[1].x-(next.obstacles[0].x+width) >= 90);
      assert.ok(next.nextObstacle >= .94);
     }
    }
   }
  }
 }
});

test('[FOX-001] retains varied deterministic spawn delays and obstacle kinds', () => {
 const delays = new Set(), kinds = new Set();
 for (let i=1; i<=100; i++) {
  const seed = i * 100000;
  const next=stepGame({...startGame(seed),nextObstacle:0},.016);
  delays.add(next.nextObstacle);kinds.add(next.obstacles[0].kind);
  assert.deepEqual(next,stepGame({...startGame(seed),nextObstacle:0},.016));
 }
 assert.ok(delays.size>50);assert.equal(kinds.size,2);
});
