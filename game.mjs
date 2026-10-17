import {WORLD, createGame, startGame, stepGame} from './game-engine.mjs';
const canvas=document.querySelector('#game');
const ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const overlay=$('overlay');
const safeBest=()=>{try{return Math.max(0,Number(localStorage.getItem('fox-runner-best'))||0)}catch{return 0}};
const saveBest=v=>{try{localStorage.setItem('fox-runner-best',String(v))}catch{/* storage may be disabled */}};
let game=createGame(), best=safeBest(), jumpQueued=false, shootHeld=false, last=performance.now(), crashSaved=false;
const ground=WORLD.ground;
const floaters=[];let lastShotMs=-999;
// Tiny synthesized SFX via Web Audio: no assets, no network, graceful no-op when unavailable.
let audioCtx=null;
function ensureAudio(){if(audioCtx)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=new AC()}catch{audioCtx=null}}
function beep(freq,dur,type='square',vol=.12,slide=0){if(!audioCtx)return;const t=audioCtx.currentTime;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(audioCtx.destination);o.start(t);o.stop(t+dur)}
function noise(dur,vol=.25){if(!audioCtx)return;const t=audioCtx.currentTime;const n=audioCtx.createBufferSource();const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);n.buffer=buf;const g=audioCtx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);const f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;n.connect(f).connect(g).connect(audioCtx.destination);n.start(t)}
const hideOverlay=()=>overlay.classList.add('hidden');
function showOverlay(icon,title,message,button){$('overlay-icon').textContent=icon;$('overlay-title').textContent=title;$('overlay-message').textContent=message;$('start').textContent=button;overlay.classList.remove('hidden')}
function begin(){fxReset();shootHeld=false;game=startGame();jumpQueued=true;crashSaved=false;floaters.length=0;hideOverlay()}
function actJump(){if(game.phase==='ready'||game.phase==='over'){begin()}else if(game.phase==='playing'){jumpQueued=true}}
function actShootDown(){ensureAudio();if(game.phase==='ready'||game.phase==='over')begin();shootHeld=true}
function actShootUp(){shootHeld=false}
function togglePause(){if(game.phase==='playing'||game.phase==='paused'){game=stepGame(game,0,{togglePause:true});if(game.phase==='paused')showOverlay('⏸','In pausa','Premi P o RIPRENDI.','RIPRENDI');else hideOverlay()}}
$('jump').addEventListener('click',actJump);
$('shoot').addEventListener('pointerdown',e=>{e.preventDefault();actShootDown()});
$('shoot').addEventListener('pointerup',actShootUp);
$('shoot').addEventListener('pointerleave',actShootUp);
$('shoot').addEventListener('pointercancel',actShootUp);
$('start').addEventListener('click',()=>{if(game.phase==='paused')togglePause();else begin()});
$('pause').addEventListener('click',togglePause);
canvas.addEventListener('pointerdown',actJump);
window.addEventListener('keydown',event=>{
  if(['Space','ArrowUp','KeyW','KeyX','KeyK','KeyP','KeyR'].includes(event.code))event.preventDefault();
  if(event.repeat&&event.code!=='KeyP'&&event.code!=='KeyX'&&event.code!=='KeyK')return;
  if(['Space','ArrowUp','KeyW'].includes(event.code))actJump();
  if(['KeyX','KeyK'].includes(event.code))actShootDown();
  if(event.code==='KeyP'&&!event.repeat)togglePause();
  if(event.code==='KeyR')begin();
});
window.addEventListener('keyup',event=>{if(['KeyX','KeyK'].includes(event.code))actShootUp()});
window.addEventListener('blur',()=>{actShootUp();jumpQueued=false;if(game.phase==='playing')togglePause()});
// FOX-002 visual layer. Everything below is cosmetic: `game` is only ever read,
// never written, so physics, collision, controls and scoring stay untouched.
// All new identifiers carry the fx/FX_ prefix because build_browser.py concatenates
// game-engine.mjs and this file into one scope (a name clash would break only the bundle).
const FX_TAU=Math.PI*2;
const FX_REDUCED=(typeof matchMedia==='function')&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const FX_MOTION=FX_REDUCED?0.3:1;
const fxClamp=(v,lo,hi)=>v<lo?lo:(v>hi?hi:v);
let fxSeed=0x9e3779b9>>>0;
function fxRand(){fxSeed=(Math.imul(fxSeed,1664525)+1013904223)>>>0;return fxSeed/4294967296}
// Stars are built once: two depth layers, the near one keeping the original positions.
const FX_STARS=(()=>{const list=[];
  for(let i=0;i<24;i++)list.push({x:(i*173+42)%950,y:(i*83+18)%160,r:(i%3===0)?1.8:1,base:.34,amp:.26,tw:1.1+((i*37)%17)/12,ph:((i*29)%31)/31*FX_TAU,far:0});
  for(let i=0;i<30;i++)list.push({x:(i*211+91)%950,y:(i*57+11)%112,r:(i%4===0)?1.4:.9,base:.22,amp:.18,tw:.9+((i*23)%13)/10,ph:((i*17)%19)/19*FX_TAU,far:1});
  return list})();
const FX_BUSH_BLOBS=[[12,19,14],[30,22,16],[21,9,13]];
const FX_GRAD={};
function fxGrad(key,x0,y0,x1,y1,stops){let g=FX_GRAD[key];
  if(!g){g=ctx.createLinearGradient(x0,y0,x1,y1);for(const s of stops)g.addColorStop(s[0],s[1]);FX_GRAD[key]=g}
  return g}
// Preallocated particle pool: reused via swap-remove, so a frame never allocates.
const FX_PARTICLE_CAP=140;
const FX_POOL=[];
for(let i=0;i<FX_PARTICLE_CAP;i++)FX_POOL.push({x:0,y:0,vx:0,vy:0,g:0,drag:0,r:1,life:0,life0:1,color:'#fff',alpha:1});
let fxCount=0, fxDustAcc=0, fxShakeT=0, fxShakeMag=0, fxFlash=0, fxSquash=0, fxTime=0, fxShakeX=0, fxShakeY=0;
function fxReset(){fxCount=0;fxDustAcc=0;fxShakeT=0;fxShakeMag=0;fxFlash=0;fxSquash=0;fxTime=0;fxShakeX=0;fxShakeY=0;fxSeed=0x9e3779b9>>>0}
function fxSpawn(x,y,vx,vy,g,drag,r,life,color,alpha){
  if(fxCount>=FX_PARTICLE_CAP)return;
  const p=FX_POOL[fxCount++];
  p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.g=g;p.drag=drag;p.r=r;p.life=life;p.life0=life;p.color=color;p.alpha=alpha}
function fxDust(){const teal=fxRand()<0.25;
  fxSpawn(WORLD.foxX+6,ground-1,-(game.speed*0.30+fxRand()*45),-(10+fxRand()*28),90,1.8,
    1.2+fxRand()*1.2,0.32+fxRand()*0.26,teal?'#63c7aa':'#8ea7b8',teal?0.5:0.55)}
function fxPuff(){const n=Math.max(2,Math.round((8+FX_MOTION*4)*(FX_REDUCED?0.4:1)));
  for(let i=0;i<n;i++)fxSpawn(WORLD.foxX+20,ground-2,(fxRand()-.5)*150,-(6+fxRand()*30),140,2.4,
    1.6+fxRand()*1.6,0.28+fxRand()*0.22,'#c9d6e2',0.6)}
function fxBurst(y){const n=Math.max(4,Math.round(20*(FX_REDUCED?0.4:1)));
  for(let i=0;i<n;i++){const roll=fxRand();
    const color=roll<.45?'#f78b48':roll<.72?'#ff9d55':roll<.86?'#fff0d8':'#243347';
    fxSpawn(WORLD.foxX+22,y,(fxRand()-.35)*180,-(40+fxRand()*120),620,0.9,
      1.5+fxRand()*2.2,0.5+fxRand()*0.4,color,0.85)}}
function fxUpdate(dt){
  const raw=(Number.isFinite(dt)&&dt>0)?dt:0;
  const step=Math.min(raw,0.05);
  fxTime+=raw;
  fxShakeT=Math.max(0,fxShakeT-raw);
  fxFlash=Math.max(0,fxFlash-raw/0.16);
  fxSquash=Math.max(0,fxSquash-raw/0.22);
  const frozen=(game.phase==='paused');
  const sdt=frozen?0:step;
  let i=0;
  while(i<fxCount){
    const p=FX_POOL[i];
    p.x+=p.vx*sdt;p.y+=p.vy*sdt;p.vy+=p.g*sdt;p.vx-=p.vx*p.drag*sdt;
    p.life-=sdt;
    if(p.life<=0||p.x<-40||p.x>1000||p.y>400){FX_POOL[i]=FX_POOL[fxCount-1];FX_POOL[fxCount-1]=p;fxCount--}
    else i++}
  if(!frozen&&game.phase==='playing'&&game.fox.onGround){
    const interval=(0.075-0.035*fxClamp((game.speed-305)/345,0,1))/FX_MOTION;
    fxDustAcc=Math.min(fxDustAcc+raw,interval);
    if(fxDustAcc>=interval){fxDustAcc-=interval;fxDust()}}
  else fxDustAcc=0}
// Frame-to-frame edge detection. `prev` is the state before the step, so events are
// derived from the engine's own output instead of adding anything to it.
function fxDetect(prev,cur){
  if(prev.phase==='playing'&&cur.phase==='over'){
    fxShakeT=0.38;fxShakeMag=9*FX_MOTION;fxFlash=1;fxSquash=1;fxBurst(cur.fox.y+20)}
  else if(prev.phase==='playing'&&cur.phase==='playing'&&!prev.fox.onGround&&cur.fox.onGround){fxSquash=1;fxPuff()}}
function roundRect(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawSky(){ctx.fillStyle=fxGrad('sky',0,0,0,360,[[0,'#111f42'],[0.8,'#2d4768'],[1,'#19334a']]);ctx.fillRect(0,0,960,360)}
function drawStars(){
  for(let i=0;i<FX_STARS.length;i++){const s=FX_STARS[i],par=s.far?0.022:0.050;
    let x=s.x-(game.distance*par)%960;if(x<0)x+=960;
    ctx.globalAlpha=fxClamp(s.base+(FX_REDUCED?0:s.amp*Math.sin(game.seconds*s.tw+s.ph)),0.05,1);
    ctx.fillStyle=s.far?'#cfe3ff':'#ffffff';
    ctx.beginPath();ctx.arc(x,s.y,s.r,0,FX_TAU);ctx.fill()}
  ctx.globalAlpha=1}
// Halo is stacked low-alpha discs: createRadialGradient is not usable here.
function drawMoon(){
  ctx.fillStyle='#dbeafa';
  for(const [r,a] of [[70,0.022],[56,0.034],[44,0.052]]){ctx.globalAlpha=a;ctx.beginPath();ctx.arc(806,64,r,0,FX_TAU);ctx.fill()}
  ctx.globalAlpha=0.92;ctx.beginPath();ctx.arc(806,64,27,0,FX_TAU);ctx.fill();
  ctx.globalAlpha=0.30;ctx.strokeStyle='#aac3e2';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(806,64,25.6,-0.55,1.15);ctx.stroke();
  ctx.fillStyle='#c3d6ef';ctx.globalAlpha=0.42;
  for(const [dx,dy,r] of [[-9,-6,4.2],[7,-9,2.8],[5,8,5.2],[-12,6,2.6],[15,1,2.0]]){ctx.beginPath();ctx.arc(806+dx,64+dy,r,0,FX_TAU);ctx.fill()}
  ctx.globalAlpha=0.22;ctx.strokeStyle='#f2f8ff';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(806,64,26.2,-2.5,-0.6);ctx.stroke();
  ctx.globalAlpha=1}
function drawHills(){
  const d=game.distance,o2=d*0.06,offset=d*0.15;
  ctx.fillStyle=fxGrad('hill2',0,ground-150,0,ground,[[0,'#22344c'],[1,'#31496a']]);
  ctx.beginPath();ctx.moveTo(0,ground);
  for(let x=-40;x<=1000;x+=40){const h=34+26*Math.sin((x+o2)/150)+9*Math.sin((x+o2)/52);ctx.lineTo(x,ground-45-h)}
  ctx.lineTo(960,ground);ctx.fill();
  ctx.fillStyle=fxGrad('hill1',0,ground-150,0,ground,[[0,'#283f59'],[1,'#3a5a7c']]);
  ctx.beginPath();ctx.moveTo(0,ground);
  for(let x=-40;x<=1000;x+=40){const h=43+27*Math.sin((x+offset)/115)+13*Math.sin((x+offset)/41);ctx.lineTo(x,ground-45-h)}
  ctx.lineTo(960,ground);ctx.fill();
  ctx.fillStyle=fxGrad('hillN',0,ground-150,0,ground,[[0,'#33605f'],[1,'#43766f']]);
  ctx.beginPath();ctx.moveTo(0,ground);
  for(let x=-40;x<=1000;x+=35){const h=24+18*Math.sin((x+offset*1.6)/82);ctx.lineTo(x,ground-h)}
  ctx.lineTo(960,ground);ctx.fill()}
function drawHorizonHaze(){ctx.fillStyle=fxGrad('haze',0,ground-90,0,ground,[[0,'#2d476800'],[1,'#2d47685e']]);ctx.fillRect(0,ground-90,960,90)}
function drawGround(){
  ctx.fillStyle=fxGrad('band',0,ground,0,360,[[0,'#2a3b52'],[0.45,'#22334a'],[1,'#1a2740']]);
  ctx.fillRect(0,ground,960,360-ground);
  ctx.globalAlpha=0.45;ctx.fillStyle='#33475f';ctx.fillRect(0,ground+3,960,3);ctx.globalAlpha=1;
  ctx.fillStyle='#63c7aa';ctx.fillRect(0,ground,960,4);
  ctx.globalAlpha=0.45;ctx.fillStyle='#84efdd';ctx.fillRect(0,ground+1,960,2);ctx.globalAlpha=1;
  for(let x=-30-(game.distance%70);x<970;x+=70)roundRect(x,ground+31,38,4,2,'#647e83');
  ctx.globalAlpha=0.8;
  for(let x=-30-(game.distance%43);x<970;x+=43)roundRect(x,ground+53,24,3,1.5,'#3d5468');
  ctx.globalAlpha=1;
  for(let x=20-(game.distance%135);x<960;x+=135){ctx.fillStyle='#6f9482';ctx.beginPath();ctx.moveTo(x,ground);ctx.lineTo(x-5,ground-10);ctx.lineTo(x+3,ground);ctx.lineTo(x+9,ground-8);ctx.lineTo(x+7,ground);ctx.fill()}
  if(game.speed>380){ctx.globalAlpha=fxClamp((game.speed-380)/270*0.35,0,0.35);ctx.fillStyle='#7fa4b8';
    for(let i=0;i<6;i++)ctx.fillRect(((i*211+game.distance*1.9)%1100)-70,ground+8+(i*17)%58,26+(i%3)*19,2);
    ctx.globalAlpha=1}}
function drawBackground(){drawSky();drawStars();drawMoon();drawHills();drawHorizonHaze();drawGround()}
function drawShadow(cx,cy,rx,ry,alpha){
  ctx.globalAlpha=alpha;ctx.fillStyle='#08101f';
  ctx.beginPath();ctx.ellipse(cx,cy,Math.max(.5,rx),Math.max(.5,ry),0,0,FX_TAU);ctx.fill();
  ctx.globalAlpha=1}
// The shadow follows the body, not the muzzle, so it never suggests a wider hitbox.
function drawFoxShadow(){
  const alt=fxClamp((ground-WORLD.foxH-game.fox.y)/130,0,1);
  drawShadow(WORLD.foxX+27,ground-1,30-12*alt,7-3*alt,0.34-0.20*alt)}
function drawParticles(){
  for(let i=0;i<fxCount;i++){const p=FX_POOL[i],k=p.life/p.life0;
    ctx.globalAlpha=fxClamp(p.alpha*k,0,1);ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.35,p.r*(0.55+0.45*k)),0,FX_TAU);ctx.fill()}
  ctx.globalAlpha=1}
function drawVignette(){
  ctx.fillStyle=fxGrad('vignette',0,0,960,0,[[0,'#050b1733'],[0.10,'#050b1700'],[0.90,'#050b1700'],[1,'#050b1733']]);
  ctx.fillRect(0,0,960,360)}
function drawCrashFlash(){
  if(fxFlash<=0)return;
  ctx.globalAlpha=fxClamp(0.30*fxFlash*(FX_REDUCED?0.35:1),0,1);
  ctx.fillStyle='#fff1d9';ctx.fillRect(0,0,960,360);ctx.globalAlpha=1}
function drawFox(){
  const x=WORLD.foxX, y=game.fox.y, onGround=game.fox.onGround, vy=game.fox.velocity;
  const run=onGround?Math.sin(game.seconds*23):0;
  const airT=fxClamp(-vy/650,-1,1);
  let sx=1,sy=1;
  if(!onGround){sy=1+0.11*airT*FX_MOTION;sx=1-0.09*airT*FX_MOTION}
  else sy+=0.05*Math.abs(run)*FX_MOTION;
  sy*=1-0.20*fxSquash*FX_MOTION; sx*=1+0.16*fxSquash*FX_MOTION;
  const tailWave=Math.sin(game.seconds*23-1.1)*(onGround?2.6:4.4)*FX_MOTION;
  const tip=tailWave+(onGround?0:fxClamp(-vy*0.008,-4.5,4.5)*FX_MOTION);
  const headTilt=(onGround?Math.sin(game.seconds*23)*0.018:fxClamp(-vy*0.00018,-0.05,0.05))*FX_MOTION;
  // Blinking needs the playing guard: game.seconds freezes while paused.
  const blink=(game.phase==='playing'&&(game.seconds%3.2)<0.11)?0.15:1;
  ctx.save();ctx.translate(x,y);
  // Scale is anchored on the foot line so a landing squash keeps the paws on the grass.
  ctx.translate(0,38);ctx.rotate(-0.02+0.012*run*FX_MOTION);ctx.scale(sx,sy);ctx.translate(0,-38);
  // Large plume of a tail with white tip, whipping with the run cycle and the jump.
  ctx.fillStyle='#e67940';ctx.beginPath();ctx.moveTo(19,27);
  ctx.bezierCurveTo(-5,26+tip*0.35,-11,-7+tip*0.80,-42,4+tip);
  ctx.bezierCurveTo(-44,25+tip*0.80,-16,45+tip*0.30,23,34+tip*0.05);ctx.fill();
  ctx.fillStyle='#fff2d5';ctx.beginPath();ctx.moveTo(-42,4+tip);
  ctx.bezierCurveTo(-31,8+tip,-29,15+tip,-25,21+tip);
  ctx.bezierCurveTo(-39,17+tip,-43,10+tip,-42,4+tip);ctx.fill();
  ctx.strokeStyle='#a94f2f';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(17,27);ctx.lineTo(15+run*4,38);ctx.moveTo(38,27);ctx.lineTo(42-run*5,38);ctx.stroke();
  ctx.fillStyle='#f78b48';ctx.beginPath();ctx.ellipse(25,23,28,17,-.06,0,FX_TAU);ctx.fill();
  ctx.fillStyle='#fff1d9';ctx.beginPath();ctx.ellipse(30,29,18,8,0,0,FX_TAU);ctx.fill();
  ctx.save();ctx.translate(46,18);ctx.rotate(headTilt);ctx.translate(-46,-18);
  ctx.fillStyle='#ff9d55';ctx.beginPath();ctx.moveTo(25,10);ctx.lineTo(29,-15);ctx.lineTo(43,2);ctx.lineTo(54,-11);ctx.lineTo(56,20);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d86643';ctx.beginPath();ctx.moveTo(32,4);ctx.lineTo(30,-6);ctx.lineTo(40,3);ctx.moveTo(46,4);ctx.lineTo(52,-3);ctx.lineTo(53,10);ctx.fill();
  ctx.fillStyle='#fff0d8';ctx.beginPath();ctx.moveTo(46,17);ctx.lineTo(59,19);ctx.lineTo(46,27);ctx.closePath();ctx.fill();
  ctx.fillStyle='#111b2e';ctx.beginPath();ctx.arc(44,11,2.6,0,FX_TAU);ctx.ellipse(59,19,2.7,2.7*blink,0,0,FX_TAU);ctx.fill();
  ctx.restore();
  ctx.restore()}
function drawObstacle(o){const x=o.x,y=ground-o.height;
  if(o.kind==='log'){
    roundRect(x,y+4,o.width,o.height-4,8,'#724b42');roundRect(x+5,y+9,o.width-10,o.height-14,5,'#9a694e');
    ctx.strokeStyle='#d8a978';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+12,y+12);ctx.lineTo(x+12,y+o.height-8);ctx.stroke();
    ctx.fillStyle='#ba8a66';ctx.beginPath();ctx.ellipse(x+o.width-4,y+o.height/2+2,7,13,0,0,2*Math.PI);ctx.fill();
  }else if(o.kind==='bush'){
    roundRect(x+8,y+17,o.width-15,o.height-17,5,'#2b7255');
    for(const [dx,dy,r] of [[12,19,14],[30,22,16],[21,9,13]]){ctx.fillStyle='#3eaf75';ctx.beginPath();ctx.arc(x+dx,y+dy,r,0,2*Math.PI);ctx.fill()}
    ctx.fillStyle='#8bdf99';ctx.beginPath();ctx.arc(x+21,y+13,4,0,2*Math.PI);ctx.fill();
  }else{
    roundRect(x+2,y+6,o.width-4,o.height-6,6,'#8a4a2b');
    ctx.fillStyle='#b8632f';ctx.fillRect(x+6,y+12,o.width-12,7);
    ctx.fillStyle='#d98a4a';ctx.beginPath();ctx.arc(x+o.width/2,y+9,4,0,2*Math.PI);ctx.fill();
    ctx.fillStyle='#ffd75e';ctx.beginPath();ctx.arc(x+o.width/2,y+9,2,0,2*Math.PI);ctx.fill();
  }
}
function drawEnemy(e){const x=e.x,y=e.y,flap=Math.sin(game.seconds*(e.kind==='bat'?16:11)+e.phase);
  ctx.save();ctx.translate(x,y);
  if(e.kind==='bat'){
    ctx.fillStyle='#2e2547';const w=12*flap;
    ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(-12-w,-9);ctx.lineTo(-14-w,2);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(2,0);ctx.lineTo(12+w,-9);ctx.lineTo(14+w,2);ctx.closePath();ctx.fill();
    ctx.fillStyle='#6a5a94';ctx.beginPath();ctx.ellipse(0,0,8,6,0,0,2*Math.PI);ctx.fill();
    ctx.fillStyle='#6a5a94';ctx.beginPath();ctx.moveTo(-5,-4);ctx.lineTo(-7,-10);ctx.lineTo(-1,-5);ctx.moveTo(5,-4);ctx.lineTo(7,-10);ctx.lineTo(1,-5);ctx.fill();
    ctx.fillStyle='#ff5470';ctx.beginPath();ctx.arc(-3,-1,1.5,0,2*Math.PI);ctx.arc(3,-1,1.5,0,2*Math.PI);ctx.fill();
  }else{
    ctx.fillStyle='#232a3d';
    ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(-17,-6-5*flap);ctx.lineTo(-14,4);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(2,0);ctx.lineTo(17,-6-5*flap);ctx.lineTo(14,4);ctx.closePath();ctx.fill();
    ctx.fillStyle='#3a4660';ctx.beginPath();ctx.ellipse(0,0,9,6,0,0,2*Math.PI);ctx.fill();
    ctx.fillStyle='#f6c453';ctx.beginPath();ctx.moveTo(5,-2);ctx.lineTo(12,-1);ctx.lineTo(5,1);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ff5470';ctx.beginPath();ctx.arc(2,-1,1.4,0,2*Math.PI);ctx.fill();
  }
  ctx.restore()
}
function drawBullet(b){ctx.strokeStyle='#ffd75e';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(b.x-14,b.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.arc(b.x,b.y,3,0,2*Math.PI);ctx.fill()}
function drawExplosion(e){const p=e.t/0.5,r=e.radius*(1-Math.pow(1-p,2));ctx.save();ctx.globalAlpha=Math.max(0,1-p);
  ctx.fillStyle='#ffb347';ctx.beginPath();ctx.arc(e.x,e.y,r,0,2*Math.PI);ctx.fill();
  ctx.globalAlpha=Math.max(0,(1-p)*.9);ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.arc(e.x,e.y,r*.55,0,2*Math.PI);ctx.fill();
  ctx.globalAlpha=Math.max(0,.9-p);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(e.x,e.y,r*.25,0,2*Math.PI);ctx.fill();
  ctx.restore()}
function drawFloaters(now){for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];f.t=now-f.born;if(f.t>=f.ttl){floaters.splice(i,1);continue}const a=1-f.t/f.ttl;ctx.save();ctx.globalAlpha=Math.max(0,a);ctx.fillStyle=f.color;ctx.font='700 16px ui-monospace,Consolas,monospace';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y-f.t*0.034);ctx.restore()}ctx.globalAlpha=1}
function draw(){
  if(fxShakeT>0){const k=(fxShakeT/0.38)*(fxShakeT/0.38);
    fxShakeX=fxShakeMag*k*Math.sin(fxTime*57);fxShakeY=fxShakeMag*k*Math.cos(fxTime*43)}
  else{fxShakeX=0;fxShakeY=0}
  ctx.save();
  if(fxShakeX||fxShakeY)ctx.translate(fxShakeX,fxShakeY);
  drawBackground();
  for(const o of game.obstacles)drawShadow(o.x+o.width/2,ground-1,o.width*0.62,5.5,0.30);
  for(const obstacle of game.obstacles)drawObstacle(obstacle);
  for(const e of game.enemies)drawEnemy(e);
  for(const b of game.bullets)drawBullet(b);
  for(const e of game.explosions)drawExplosion(e);
  drawFoxShadow();drawFox();
  roundRect(WORLD.foxX+55,game.fox.y+7,7,9,3,'#2a3648');
  roundRect(WORLD.foxX+60,game.fox.y+9,3,5,1,'#8fe9ff');
  const flash=Math.max(0,1-(game.seconds*1000-lastShotMs)/70);
  if(flash>0){ctx.save();ctx.globalAlpha=flash;ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.arc(WORLD.foxX+58,game.fox.y+11,7,0,FX_TAU);ctx.fill();ctx.restore()}
  drawParticles();drawFloaters(game.seconds*1000);drawVignette();
  ctx.restore();
  drawCrashFlash();
  $('score').textContent=String(game.score).padStart(5,'0');$('best').textContent=String(best).padStart(5,'0');
  $('kills').textContent=String(game.kills).padStart(2,'0');$('combo').textContent=game.combo?game.combo+'\u00d7':'\u2014';
  $('speed').textContent=(game.speed/305).toFixed(1)+'×';$('pause').textContent=game.phase==='paused'?'▶ Riprendi':'⏸ Pausa';
}
function consumeEvents(events,now){for(const e of events){
  if(e.type==='shot'){lastShotMs=now;beep(880,.07,'square',.08,-420)}
  else if(e.type==='kill'){floaters.push({x:e.x,y:e.y,text:'+'+e.points,color:'#8fe9ff',born:now,ttl:900});beep(660+e.combo*40,.1,'sine',.1,220)}
  else if(e.type==='explosion'){fxShakeT=.38;fxShakeMag=4*FX_MOTION;noise(.28,.3);beep(140,.25,'sawtooth',.12,-70)}
  else if(e.type==='chain'){floaters.push({x:WORLD.width/2,y:90,text:'CATENA ×'+e.barrels+'!',color:'#ffd75e',born:now,ttl:1200});beep(520,.18,'triangle',.12,420)}
}}
function frame(now){const dt=(now-last)/1000;last=now;
  const prev=game;game=stepGame(game,dt,{jump:jumpQueued,shoot:shootHeld});jumpQueued=false;
  if(prev.phase==='playing')consumeEvents(game.events,game.seconds*1000);
  fxUpdate(game.phase==='paused'?0:dt);fxDetect(prev,game);
  if(game.phase==='over'&&!crashSaved){best=Math.max(best,game.score);saveBest(best);crashSaved=true;showOverlay('💥','Ops, un ostacolo!','Punti: '+game.score+' · Record: '+best+' · Premi R per ricominciare','RIPROVA →')}
  draw();requestAnimationFrame(frame)}
draw();requestAnimationFrame(frame);
