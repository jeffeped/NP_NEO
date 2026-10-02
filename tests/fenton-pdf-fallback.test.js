import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {initFenton} from '../fenton-ui.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),scores=[{weeks:24,days:3,weight:{value:613,z:-1.12,percentile:13.1}}];
const settle=async a=>{for(let i=0;i<100&&a.document.getElementById('fenton-chart-button').disabled;i++)await new Promise(r=>setTimeout(r,5));};
function setup(options={}){
 const {document,window}=parseHTML(html),sent=[];
 const controller=initFenton(document,{proxyUrl:'https://grow-neo-fenton-proxy.workers.dev',fetcher:async(url,req)=>{
  sent.push({url,data:JSON.parse(req.body)});
  return url.endsWith('/chart')?new Response(new Blob([Uint8Array.of(255,216,255)],{type:'image/jpeg'})):url.endsWith('/zscores')?new Response('unavailable',{status:502}):new Response(new Blob(['%PDF-test'],{type:'application/pdf'}));
 },extractPdfScores:async()=>scores,urls:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}},...options});
 const sex=document.getElementById('fenton-sex');for(const o of sex.options)o.removeAttribute('selected');Array.from(sex.options).find(o=>o.value==='F').selected=true;
 document.getElementById('fenton-ga-weeks').value='24';document.getElementById('fenton-ga-days').value='3';
 for(const [k,v] of Object.entries({weeks:24,days:3,weightGrams:613}))document.querySelector('[data-field="'+k+'"]').value=String(v);
 const form=document.getElementById('fenton-form');
 return {document,window,controller,sent,form,submit:()=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}))};
}
test('unavailable CSV falls back to PDF with the same measurements',async()=>{
 const a=setup();a.submit();await settle(a);
 assert.deepEqual(a.sent.map(s=>s.url.split('/').at(-1)),['chart','zscores','chart-pdf']);assert.deepEqual(a.sent[0].data,a.sent[2].data);
 assert.deepEqual(a.controller.getChart().scores,scores);assert.equal(a.controller.getChart().scoresSource,'pdf');assert.equal(a.document.getElementById('fenton-pdf-download').hidden,false);
});
test('unrecognized CSV also uses PDF and does not expose invalid CSV as scores',async()=>{
 const a=setup({fetcher:async url=>new Response(url.endsWith('/chart')?new Blob([Uint8Array.of(255,216,255)],{type:'image/jpeg'}):url.endsWith('/zscores')?new Blob(['invalid'],{type:'text/csv'}):new Blob(['%PDF-test'],{type:'application/pdf'}))});
 a.submit();await settle(a);assert.equal(a.controller.getChart().scoresSource,'pdf');assert.equal(a.document.getElementById('fenton-csv-download').hidden,true);
});
test('editing during PDF extraction discards recovered scores',async()=>{
 let finish;const a=setup({extractPdfScores:()=>new Promise(r=>finish=r)});a.submit();
 for(let i=0;i<100&&!finish;i++)await new Promise(r=>setTimeout(r,5));assert.ok(finish);
 a.form.dispatchEvent(new a.window.Event('input',{bubbles:true}));finish(scores);await settle(a);assert.equal(a.controller.getChart(),null);
});
test('unusable PDF leaves the chart intact without validated scores',async()=>{
 const a=setup({extractPdfScores:async()=>{throw new Error('Medidas divergentes');}});a.submit();await settle(a);
 assert.equal(a.controller.getChart().scores,null);assert.equal(a.document.getElementById('fenton-figure').hidden,false);
});
test('PDF button recovers scores for the current chart',async()=>{
 let fail=true;const a=setup({extractPdfScores:async()=>{if(fail)throw new Error('unavailable');return scores;}});a.submit();await settle(a);fail=false;
 a.document.getElementById('fenton-pdf-button').dispatchEvent(new a.window.Event('click'));await settle(a);assert.deepEqual(a.controller.getChart().scores,scores);
});
test('rate limit does not cause an extra PDF request',async()=>{
 let n=0;const a=setup({fetcher:async url=>{n++;return url.endsWith('/chart')?new Response(new Blob([Uint8Array.of(255,216,255)],{type:'image/jpeg'})):new Response('limit',{status:429});}});
 a.submit();await settle(a);assert.equal(n,2);assert.equal(a.controller.getChart().scores,null);
});
