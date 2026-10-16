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
