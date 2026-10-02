import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {initFentonNutritionReport} from '../fenton-nutrition-ui.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function setup(options={}){
 const {document,window}=parseHTML(html),state={nutrition:{integrated:{source:'none'}},growth:null,chart:{blob:{},data:{measurements:[{}]},scores:[{}]}},revoked=[];
 let made=0,clicked=0;
 const $=id=>document.getElementById(id);
 const link=$('fenton-total-download');link.click=()=>{clicked++;};
 const ui=initFentonNutritionReport(document,{getNutrition:()=>state.nutrition,getGrowth:()=>state.growth,getChart:()=>state.chart,createReport:async()=>new Uint8Array([1,2,3]),urls:{createObjectURL:()=>{made++;return 'blob:test';},revokeObjectURL:u=>revoked.push(u)},...options});
 return {state,$,window,ui,revoked,get made(){return made},get clicked(){return clicked},click:()=>$('fenton-total-export').dispatchEvent(new window.Event('click'))};
}
const settle=()=>new Promise(r=>setImmediate(r));
test('missing inputs do not generate a report',async()=>{
 const a=setup();a.state.nutrition=null;a.click();await settle();assert.match(a.$('fenton-total-status').textContent,/Calcule o aporte/);assert.equal(a.made,0);
 a.state.nutrition={};a.state.chart=null;a.click();await settle();assert.match(a.$('fenton-total-status').textContent,/Ver gráfico/);assert.equal(a.made,0);
});
test('current results generate a downloadable local report',async()=>{
 const a=setup();a.click();await settle();assert.equal(a.made,1);assert.equal(a.clicked,1);assert.equal(a.$('fenton-total-download').hidden,false);
});
test('editing measurements revokes the existing download',async()=>{
 const a=setup();a.click();await settle();a.$('fenton-form').dispatchEvent(new a.window.Event('input'));assert.equal(a.$('fenton-total-download').hidden,true);assert.deepEqual(a.revoked,['blob:test']);
});
test('editing while PDF builds discards in-flight report',async()=>{
 let complete;const a=setup({createReport:()=>new Promise(r=>complete=r)});a.click();
 a.$('enteral-form').dispatchEvent(new a.window.Event('input'));complete(new Uint8Array([1]));await settle();
 assert.equal(a.made,0);assert.equal(a.$('fenton-total-export').disabled,false);assert.match(a.$('fenton-total-status').textContent,/Dados alterados/);
});
test('replacement chart during PDF generation cannot be exported',async()=>{
 let complete;const a=setup({createReport:()=>new Promise(r=>complete=r)});a.click();a.state.chart={};complete(new Uint8Array([1]));await settle();assert.equal(a.made,0);
});
test('dose acknowledgement gate prevents export',async()=>{
 const a=setup({validateNutrition:()=>{throw new Error('Confira e aceite as doses');}});
 a.click();await settle();assert.equal(a.made,0);assert.match(a.$('fenton-total-status').textContent,/aceite/);
});
test('revoking dose acknowledgement during generation discards report',async()=>{
 let complete;const a=setup({createReport:()=>new Promise(r=>complete=r)});a.click();
 a.$('acknowledgements').dispatchEvent(new a.window.Event('change'));complete(new Uint8Array([1]));await settle();assert.equal(a.made,0);
});
