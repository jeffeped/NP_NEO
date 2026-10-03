import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {initEnteral} from '../enteral-ui.js';
import {initGrowth} from '../growth-ui.js';
import {initFentonNutritionReport} from '../fenton-nutrition-ui.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const response=(url,request)=>{
 if(url.endsWith('/chart'))return new Response(new Blob(['test chart'],{type:'image/jpeg'}));
 const rows=JSON.parse(request.body).measurements.map(m=>[`${m.weeks} ${m.days}/7`,m.weightGrams,-.5,30,0,'','','','','','','',''].join(','));
 return new Response(new Blob(['GA (wk),Wt (g),Z,%tile,dZ(birth),Head (cm),Z,%tile,dZ(birth),Length (cm),Z,%tile,dZ(birth)\n'+rows.join('\n')],{type:'text/csv'}));
};
function setup({fetcher=response,iv=()=>({})}={}){
 const {document,window}=parseHTML(html),$=id=>document.getElementById(id),requests=[],reports=[];
 const nativeFetch=globalThis.fetch;
 let growth;
 try{globalThis.fetch=(url,request)=>{requests.push(url);return fetcher(url,request);};growth=initGrowth(document);}
 finally{globalThis.fetch=nativeFetch;}
 const enteral=initEnteral(document,iv,()=>growth.getResult());
 let downloads=0;$('fenton-total-download').click=()=>downloads++;
 const report=initFentonNutritionReport(document,{
  getNutrition:()=>enteral.getResult(),getGrowth:()=>growth.getResult(),getChart:()=>growth.fenton.getChart(),
  prepareNutrition:()=>enteral.prepareReport(),prepareGrowth:()=>growth.prepareReport(),ensureChart:()=>growth.fenton.ensureChart(),
  validateNutrition:n=>{if(n.integrated.source!=='none')iv(n.integrated.source);},
  createReport:async snapshot=>{reports.push(snapshot);return new Uint8Array([1,2]);}
 });
 const set=(id,value)=>{
  const el=$(id);
  if(el.tagName==='SELECT'){for(const o of el.options)o.removeAttribute('selected');Array.from(el.options).find(o=>o.value===String(value)).selected=true;}
  else el.value=String(value);
  el.dispatchEvent(new window.Event('input',{bubbles:true}));el.dispatchEvent(new window.Event('change',{bubbles:true}));
 };
 set('en-source','none');set('en-type','lhop');set('en-rate','150');set('en-fm85','1');
 set('fenton-sex','F');set('fenton-ga-weeks','25');
 const measure=(field,value)=>{const el=document.querySelector(`[data-field="${field}"]`);el.value=String(value);el.dispatchEvent(new window.Event('input',{bubbles:true}));};
 measure('weeks',27);measure('weightGrams',775);
 const click=()=>$('fenton-total-export').click();
 const done=async()=>{for(let i=0;i<50&&$('fenton-total-export').disabled;i++)await new Promise(r=>setImmediate(r));assert.equal($('fenton-total-export').disabled,false);};
 return {$,set,measure,window,enteral,growth,requests,reports,click,done,get downloads(){return downloads;},report};
}
const fillGrowth=a=>{
 for(const [id,v]of Object.entries({'gr-sex':'female','gr-birth-weight':775,'gr-ga-weeks':25,'gr-initial-day':8,'gr-initial-weight':625,'gr-final-day':17,'gr-final-weight':775}))a.set(id,v);
};

test('one click calculates filled nutrition and growth, fetches chart and scores, and downloads',async()=>{
 const a=setup();fillGrowth(a);assert.equal(a.enteral.getResult(),null);assert.equal(a.growth.getResult(),null);
 a.click();await a.done();assert.equal(a.downloads,1,a.$('fenton-total-status').textContent);
 assert.equal(a.reports[0].nutrition.integrated.total.calories,123.3);assert.equal(a.reports[0].growth.intervalDays,9);
 assert.equal(a.reports[0].chart.scores[0].weight.value,775);assert.equal(a.requests.length,2);
});
test('empty optional growth is omitted; edited nutrition recalculates while unchanged chart is reused',async()=>{
 const a=setup();a.click();await a.done();assert.equal(a.reports[0].growth,null);
 a.set('en-rate',100);a.click();await a.done();assert.equal(a.downloads,2);assert.equal(a.requests.length,2);
 assert.equal(a.reports[1].nutrition.integrated.total.fluid,100);
});
test('partially filled growth reports the missing fields before any external request',async()=>{
 const a=setup();a.set('gr-initial-weight',625);a.click();await a.done();assert.equal(a.downloads,0);assert.equal(a.requests.length,0);
 assert.match(a.$('fenton-total-status').textContent,/Velocidade de crescimento/);
});
test('invalid enteral data and unconfirmed IV inputs stop before requesting Fenton',async()=>{
 const a=setup({iv:()=>{throw new Error('Confira e aceite as doses na aba Resultados');}});
 a.set('en-rate','');a.click();await a.done();assert.match(a.$('fenton-total-status').textContent,/Enteral.*taxa/);
 a.set('en-rate',150);a.set('en-source','individual');a.click();await a.done();assert.match(a.$('fenton-total-status').textContent,/aceite as doses/);
 assert.equal(a.requests.length,0);assert.equal(a.downloads,0);
});
test('double click shares one operation and edits during chart request discard the report',async()=>{
 let finish;const a=setup({fetcher:(url,request)=>url.endsWith('/chart')?new Promise(resolve=>{finish=()=>resolve(response(url,request));}):response(url,request)});
 a.click();a.click();assert.equal(a.requests.length,1);a.set('en-rate',100);finish();await a.done();
 assert.equal(a.downloads,0);assert.match(a.$('fenton-total-status').textContent,/Dados alterados/);
 a.click();await a.done();assert.equal(a.downloads,1);assert.equal(a.requests.length,2);
});
test('editing Fenton during a request cannot export the old measurements',async()=>{
 let finish;const a=setup({fetcher:(url,request)=>new Promise(resolve=>{finish=()=>resolve(response(url,request));})});
 a.click();a.measure('weightGrams',800);finish();await a.done();assert.equal(a.downloads,0);assert.equal(a.growth.fenton.getChart(),null);
});
test('an in-flight preview is awaited without requesting a second chart',async()=>{
 let finish;const a=setup({fetcher:(url,request)=>url.endsWith('/chart')?new Promise(resolve=>{finish=()=>resolve(response(url,request));}):response(url,request)});
 a.$('fenton-form').dispatchEvent(new a.window.Event('submit',{cancelable:true}));a.click();finish();await a.done();
 assert.equal(a.downloads,1,a.$('fenton-total-status').textContent);assert.equal(a.requests.length,2);
});
test('network failure unlocks the main action and retry can finish',async()=>{
 let fail=true;const a=setup({fetcher:(url,request)=>fail?new Response('failed',{status:503}):response(url,request)});
 a.click();await a.done();assert.equal(a.downloads,0);assert.match(a.$('fenton-total-status').textContent,/conexão/);
 fail=false;a.click();await a.done();assert.equal(a.downloads,1);
});
test('revoking the HV review removes a generated download',async()=>{
 const a=setup();a.click();await a.done();assert.equal(a.$('fenton-total-download').hidden,false);
 a.$('hv-form').dispatchEvent(new a.window.Event('hv-review-change'));assert.equal(a.$('fenton-total-download').hidden,true);
});
