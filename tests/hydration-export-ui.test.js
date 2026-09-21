import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {initHydration} from '../hydration-ui.js';
vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
const logo=readFileSync(new URL('../assets/uea-logo.png',import.meta.url));
globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>logo});
function setup(){
 const {document,window}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 window.HTMLElement.prototype.scrollIntoView=function(){};
 const ui=initHydration(document),el=id=>document.getElementById('hv-'+id);
 const event=(id,type)=>el(id).dispatchEvent(new window.Event(type,{bubbles:true,cancelable:true}));
 const set=(id,v)=>{el(id).value=String(v);event(id,'input');};
 el('doseUnit').querySelector('[value="perKgDay"]').selected=true;
 for(const [id,v] of Object.entries({weight:2,fluid:100,vig:5,na:1.7,k:1.34,ca:0.5,mg:0.8}))set(id,v);
 return {ui,el,event,set,calculate:()=>event('form','submit')};
}
async function finish(app){for(let i=0;i<100&&app.el('export').disabled;i++)await new Promise(r=>setTimeout(r,5));}
test('HV export: display order, final line, current PDF download and invalidation',async()=>{
 const a=setup();a.calculate();assert.equal(a.el('export').disabled,false);
 assert.match(a.el('summary').textContent,/Concentração final de glicose7,2%Osmolaridade calculada453 mOsm\/L/);
 assert.match(a.el('final-summary').textContent,/200,0 mL \| 8,4 mL\/h/);
 a.event('export','click');await finish(a);assert.equal(a.el('pdf-download').hidden,false);assert.match(a.el('pdf-download').href,/^blob:/);
 a.set('osm-sg5',278);assert.equal(a.el('result').hidden,true);assert.equal(a.el('pdf-download').hasAttribute('href'),false);assert.equal(a.el('export').disabled,true);
 a.calculate();assert.equal(a.el('export').disabled,false);
 a.set('vig',0);a.calculate();assert.equal(a.el('export').disabled,true);assert.equal(a.el('composition').hidden,true);
});
test('HV export: edits during async generation cannot restore obsolete download',async()=>{
 const a=setup();a.calculate();
 let release;const pending=new Promise(r=>release=r);
 const original=globalThis.fetch;globalThis.fetch=async()=>{await pending;return {ok:true,arrayBuffer:async()=>logo};};
 try{a.event('export','click');a.set('vig',6);release();await new Promise(r=>setTimeout(r,100));assert.equal(a.el('pdf-download').hasAttribute('href'),false);assert.equal(a.el('pdf-download').hidden,true);assert.equal(a.el('export').disabled,true);}
 finally{globalThis.fetch=original;}
});
test('HV export: generation failure permits retry; reset invalidates state',async()=>{
 const a=setup();a.calculate();const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('offline asset absent');};
 try{a.event('export','click');await finish(a);assert.match(a.el('pdf-status').textContent,/Não foi possível/);assert.equal(a.el('export').disabled,false);}
 finally{globalThis.fetch=original;}
 // linkedom does not implement form.reset; simulate native reset for this check.
 a.el('form').reset=()=>{};a.ui.reset();assert.equal(a.ui.getResult(),null);assert.equal(a.el('export').disabled,true);
});
