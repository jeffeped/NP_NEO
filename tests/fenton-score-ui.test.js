import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {initFenton} from '../fenton-ui.js';

test('gráfico e escores fictícios associados à mesma consulta; edição revoga ambos',async()=>{
 const {document,window}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 const sent=[],csv='GA (weeks),Weight (g),Weight Z,Weight Percentile,Head (cm),Head Z,Head Percentile,Length (cm),Length Z,Length Percentile\n24+3,613,-1.12,13.1,21.5,-0.4,34.5,31,0.25,59.9\n';
 const controller=initFenton(document,{proxyUrl:'https://grow-neo-fenton-proxy.workers.dev',
  fetcher:async(url,request)=>{sent.push({url,request});return url.endsWith('/chart')?new Response(new Blob([Uint8Array.from([255,216,255])],{type:'image/jpeg'})):new Response(csv,{headers:{'content-type':'text/csv'}});},
  urls:{createObjectURL:()=>`blob:result-${sent.length}`,revokeObjectURL:()=>{}}
 });
 const form=document.getElementById('fenton-form');
 const sex=document.getElementById('fenton-sex');for(const option of sex.options)option.removeAttribute('selected');Array.from(sex.options).find(option=>option.value==='F').selected=true;
 document.getElementById('fenton-ga-weeks').value='24';document.getElementById('fenton-ga-days').value='3';
 for(const [key,value] of Object.entries({weeks:24,days:3,weightGrams:613,headCm:'21,5',lengthCm:31}))document.querySelector(`[data-field="${key}"]`).value=String(value);
 form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 for(let n=0;n<30&&!controller.getChart()?.scores;n++)await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(sent.length,2);assert.deepEqual(JSON.parse(sent[0].request.body),JSON.parse(sent[1].request.body));
 assert.equal(controller.getChart().scores[0].weight.z,-1.12);
 assert.equal(document.getElementById('fenton-csv-download').hidden,false);
 form.dispatchEvent(new window.Event('input',{bubbles:true}));
 assert.equal(controller.getChart(),null);assert.equal(document.getElementById('fenton-figure').hidden,true);
});
