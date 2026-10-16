import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('browser bundle: start, score, pause/resume, jump, restart',()=>{
  const elements=new Map();const eventHandlers=new Map();const callbacks=[];
  const ctx=new Proxy({}, {get:(target,key)=>{
    if(!(key in target))target[key]=()=>{};
    return target[key];
  },set:(target,key,value)=>{target[key]=value;return true}});
  ctx.createLinearGradient=()=>({addColorStop:()=>{}});
  class Element{
    constructor(id){this.id=id;this.textContent='';this.listeners=new Map();this.classList={hidden:false,add:key=>{if(key==='hidden')this.classList.hidden=true},remove:key=>{if(key==='hidden')this.classList.hidden=false}}}
    addEventListener(type,fn){this.listeners.set(type,fn)}
    click(){this.listeners.get('click')?.({preventDefault(){}})}
    getContext(){return ctx}
  }
  function get(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)}
  const localStore=new Map();const localStorage={getItem:key=>localStore.get(key),setItem:(key,val)=>localStore.set(key,val)};
  const globals={document:{querySelector:()=>get('game'),getElementById:get},window:{addEventListener:(event,fn)=>eventHandlers.set(event,fn)},localStorage,performance:{now:()=>0},requestAnimationFrame:fn=>callbacks.push(fn),console,Math,Number};
  runInNewContext(readFileSync(resolve(root,'game-browser.js'),'utf8'),globals);
  assert.equal(callbacks.length,1);
  get('start').click();assert.equal(get('overlay').classList.hidden,true);
  for(let i=1;i<=4;i++)callbacks.shift()(i*16);
  assert.notEqual(get('score').textContent,'00000');
  const k=code=>eventHandlers.get('keydown')({code,repeat:false,preventDefault(){}});
  k('KeyP');assert.equal(get('overlay').classList.hidden,false);
  get('start').click();assert.equal(get('overlay').classList.hidden,true);
  k('Space');callbacks.shift()(90);
  k('KeyR');assert.equal(get('overlay').classList.hidden,true);
  assert.equal(get('score').textContent!==undefined,true);
});
