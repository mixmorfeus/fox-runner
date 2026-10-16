import {WORLD, createGame, startGame, stepGame} from './game-engine.mjs';
const canvas=document.querySelector('#game');
const ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const overlay=$('overlay');
const safeBest=()=>{try{return Math.max(0,Number(localStorage.getItem('fox-runner-best'))||0)}catch{return 0}};
const saveBest=v=>{try{localStorage.setItem('fox-runner-best',String(v))}catch{/* storage may be disabled */}};
let game=createGame(), best=safeBest(), jumpQueued=false, last=performance.now(), crashSaved=false;
const ground=WORLD.ground;
const hideOverlay=()=>overlay.classList.add('hidden');
function showOverlay(icon,title,message,button){$('overlay-icon').textContent=icon;$('overlay-title').textContent=title;$('overlay-message').textContent=message;$('start').textContent=button;overlay.classList.remove('hidden')}
function begin(){game=startGame();jumpQueued=true;crashSaved=false;hideOverlay()}
function actJump(){if(game.phase==='ready'||game.phase==='over'){begin()}else if(game.phase==='playing'){jumpQueued=true}}
function togglePause(){if(game.phase==='playing'||game.phase==='paused'){game=stepGame(game,0,{togglePause:true});if(game.phase==='paused')showOverlay('⏸','In pausa','Premi P o RIPRENDI.','RIPRENDI');else hideOverlay()}}
$('jump').addEventListener('click',actJump);
$('start').addEventListener('click',()=>{if(game.phase==='paused')togglePause();else begin()});
$('pause').addEventListener('click',togglePause);
canvas.addEventListener('pointerdown',actJump);
window.addEventListener('keydown',event=>{
  if(['Space','ArrowUp','KeyW','KeyP','KeyR'].includes(event.code))event.preventDefault();
  if(event.repeat&&event.code!=='KeyP')return;
  if(['Space','ArrowUp','KeyW'].includes(event.code))actJump();
  if(event.code==='KeyP'&&!event.repeat)togglePause();
  if(event.code==='KeyR')begin();
});
function roundRect(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawBackground(){
  const sky=ctx.createLinearGradient(0,0,0,360);sky.addColorStop(0,'#111f42');sky.addColorStop(.8,'#2d4768');sky.addColorStop(1,'#19334a');ctx.fillStyle=sky;ctx.fillRect(0,0,960,360);
  ctx.fillStyle='#ffffff55'; for(let i=0;i<24;i++){const x=(i*173+42)%950,y=(i*83+18)%160;ctx.beginPath();ctx.arc(x,y,(i%3===0)?1.8:1,0,2*Math.PI);ctx.fill()}
  ctx.fillStyle='#dbeafa';ctx.globalAlpha=.63;ctx.beginPath();ctx.arc(806,64,27,0,2*Math.PI);ctx.fill();ctx.globalAlpha=1;
  const offset=game.distance*.15;ctx.fillStyle='#273f5a';ctx.beginPath();ctx.moveTo(0,ground);for(let x=-40;x<=1000;x+=40){const h=43+27*Math.sin((x+offset)/115)+13*Math.sin((x+offset)/41);ctx.lineTo(x,ground-45-h)}ctx.lineTo(960,ground);ctx.fill();
  ctx.fillStyle='#355b60';ctx.beginPath();ctx.moveTo(0,ground);for(let x=-40;x<=1000;x+=35){const h=24+18*Math.sin((x+offset*1.6)/82);ctx.lineTo(x,ground-h)}ctx.lineTo(960,ground);ctx.fill();
  ctx.fillStyle='#243347';ctx.fillRect(0,ground,960,360-ground);
  ctx.fillStyle='#63c7aa';ctx.fillRect(0,ground,960,4);
  ctx.fillStyle='#456373';for(let x=-30-(game.distance%70);x<970;x+=70){roundRect(x,ground+31,38,4,2,'#647e83')}
  for(let x=20-(game.distance%135);x<960;x+=135){ctx.fillStyle='#6f9482';ctx.beginPath();ctx.moveTo(x,ground);ctx.lineTo(x-5,ground-10);ctx.lineTo(x+3,ground);ctx.lineTo(x+9,ground-8);ctx.lineTo(x+7,ground);ctx.fill()}
}
function drawFox(){const x=WORLD.foxX, y=game.fox.y,run=game.fox.onGround?Math.sin(game.seconds*23):0;
  ctx.save();ctx.translate(x,y);
  // Large plume of a tail with white tip.
  ctx.fillStyle='#e67940';ctx.beginPath();ctx.moveTo(19,27);ctx.bezierCurveTo(-5,26,-11,-7,-42,4);ctx.bezierCurveTo(-44,25,-16,45,23,34);ctx.fill();
  ctx.fillStyle='#fff2d5';ctx.beginPath();ctx.moveTo(-42,4);ctx.bezierCurveTo(-31,8,-29,15,-25,21);ctx.bezierCurveTo(-39,17,-43,10,-42,4);ctx.fill();
  ctx.strokeStyle='#a94f2f';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(17,27);ctx.lineTo(15+run*4,38);ctx.moveTo(38,27);ctx.lineTo(42-run*5,38);ctx.stroke();
  ctx.fillStyle='#f78b48';ctx.beginPath();ctx.ellipse(25,23,28,17,-.06,0,2*Math.PI);ctx.fill();
  ctx.fillStyle='#fff1d9';ctx.beginPath();ctx.ellipse(30,29,18,8,0,0,2*Math.PI);ctx.fill();
  ctx.fillStyle='#ff9d55';ctx.beginPath();ctx.moveTo(25,10);ctx.lineTo(29,-15);ctx.lineTo(43,2);ctx.lineTo(54,-11);ctx.lineTo(56,20);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d86643';ctx.beginPath();ctx.moveTo(32,4);ctx.lineTo(30,-6);ctx.lineTo(40,3);ctx.moveTo(46,4);ctx.lineTo(52,-3);ctx.lineTo(53,10);ctx.fill();
  ctx.fillStyle='#fff0d8';ctx.beginPath();ctx.moveTo(46,17);ctx.lineTo(59,19);ctx.lineTo(46,27);ctx.closePath();ctx.fill();
  ctx.fillStyle='#111b2e';ctx.beginPath();ctx.arc(44,11,2.6,0,2*Math.PI);ctx.arc(59,19,2.7,0,2*Math.PI);ctx.fill();
  ctx.restore()
}
function drawObstacle(o){const x=o.x,y=ground-o.height;
  if(o.kind==='log'){
    roundRect(x,y+4,o.width,o.height-4,8,'#724b42');roundRect(x+5,y+9,o.width-10,o.height-14,5,'#9a694e');
    ctx.strokeStyle='#d8a978';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+12,y+12);ctx.lineTo(x+12,y+o.height-8);ctx.stroke();
    ctx.fillStyle='#ba8a66';ctx.beginPath();ctx.ellipse(x+o.width-4,y+o.height/2+2,7,13,0,0,2*Math.PI);ctx.fill();
  }else{
    roundRect(x+8,y+17,o.width-15,o.height-17,5,'#2b7255');
    for(const [dx,dy,r] of [[12,19,14],[30,22,16],[21,9,13]]){ctx.fillStyle='#3eaf75';ctx.beginPath();ctx.arc(x+dx,y+dy,r,0,2*Math.PI);ctx.fill()}
    ctx.fillStyle='#8bdf99';ctx.beginPath();ctx.arc(x+21,y+13,4,0,2*Math.PI);ctx.fill();
  }
}
function draw(){drawBackground();for(const obstacle of game.obstacles)drawObstacle(obstacle);drawFox();
  $('score').textContent=String(game.score).padStart(5,'0');$('best').textContent=String(best).padStart(5,'0');
  $('speed').textContent=(game.speed/305).toFixed(1)+'×';$('pause').textContent=game.phase==='paused'?'▶ Riprendi':'⏸ Pausa';
}
function frame(now){const dt=(now-last)/1000;last=now;game=stepGame(game,dt,{jump:jumpQueued});jumpQueued=false;
  if(game.phase==='over'&&!crashSaved){best=Math.max(best,game.score);saveBest(best);crashSaved=true;showOverlay('💥','Ops, un ostacolo!','Punti: '+game.score+' · Record: '+best+' · Premi R per ricominciare','RIPROVA →')}
  draw();requestAnimationFrame(frame)}
draw();requestAnimationFrame(frame);
