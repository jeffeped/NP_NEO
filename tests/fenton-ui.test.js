import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {initFenton,readFentonForm} from '../fenton-ui.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const setup=()=>{const {document,window}=parseHTML(html);return {document,window,form:document.getElementById('fenton-form'),set:(id,value)=>{const el=document.getElementById(id);if(el.tagName==='SELECT'){for(const option of el.options)option.removeAttribute('selected');Array.from(el.options).find(option=>option.value===String(value)).selected=true;}else el.value=String(value);}};};
const fill=app=>{
 app.set('fenton-sex','F');app.set('fenton-ga-weeks','24');app.set('fenton-ga-days','3');
 const row=app.document.querySelector('.fenton-measure');
 for(const [field,value] of Object.entries({weeks:24,days:3,weightGrams:613,headCm:'21,5',lengthCm:31}))row.querySelector(`[data-field="${field}"]`).value=String(value);
};

test('sem servidor configurado o formulário Fenton fica oculto; plotador externo removido',()=>{
 const a=setup();initFenton(a.document,{proxyUrl:''});
 assert.equal(a.document.getElementById('fenton-integration').hidden,true);
 assert.equal(a.document.querySelector('.growth-plotter'),null);
});

test('idade e medidas enviadas não incluem identificador nem data de nascimento',()=>{
 const a=setup();initFenton(a.document,{proxyUrl:'https://grow-neo-fenton-proxy.workers.dev'});fill(a);
 const data=readFentonForm(a.form);
 assert.deepEqual(data,{sex:'F',birthGaWeeks:24,birthGaDays:3,measurements:[{weeks:24,days:3,weightGrams:613,headCm:21.5,lengthCm:31}]});
 assert.doesNotMatch(JSON.stringify(data),/name|number|date|birthWeight/i);
});

test('entradas inválidas interrompem antes do envio ao serviço externo',()=>{
 const a=setup();initFenton(a.document,{proxyUrl:'https://grow-neo-fenton-proxy.workers.dev'});fill(a);
 a.document.querySelector('[data-field="weightGrams"]').value='0,8';
 assert.throws(()=>readFentonForm(a.form),/unidades/);
 a.document.querySelector('[data-field="weightGrams"]').value='613';
 a.document.querySelector('[data-field="weeks"]').value='22';
 assert.throws(()=>readFentonForm(a.form),/IPM/);
});

test('gráfico gerado é exibido no app e requisição carrega apenas as medidas',async()=>{
 const a=setup(),sent=[];let counter=0;
 initFenton(a.document,{proxyUrl:'https://grow-neo-fenton-proxy.workers.dev',
  fetcher:async(url,request)=>{sent.push({url,request});return new Response(new Blob([Uint8Array.from([255,216,255])],{type:'image/jpeg'}));},
  urls:{createObjectURL:()=>`blob:chart-${++counter}`,revokeObjectURL:()=>{}}
 });fill(a);
 a.form.dispatchEvent(new a.window.Event('submit',{bubbles:true,cancelable:true}));
 for(let attempt=0;attempt<20&&a.document.getElementById('fenton-status').textContent.includes('Consultando');attempt++)await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(sent.length,2);
 assert.match(sent[0].url,/\/chart$/);
 assert.match(sent[1].url,/\/zscores$/);
 assert.deepEqual(Object.keys(JSON.parse(sent[0].request.body)).sort(),['birthGaDays','birthGaWeeks','measurements','sex']);
 assert.equal(a.document.getElementById('fenton-figure').hidden,false,a.document.getElementById('fenton-status').textContent);
 assert.equal(a.document.getElementById('fenton-chart').getAttribute('src'),'blob:chart-1');
});

test('editar uma medida durante a consulta impede exibir gráfico da medida anterior',async()=>{
 const a=setup();let complete;
 initFenton(a.document,{proxyUrl:'https://grow-neo-fenton-proxy.workers.dev',
  fetcher:()=>new Promise(resolve=>{complete=resolve;}),
  urls:{createObjectURL:()=>{throw Error('outdated chart');},revokeObjectURL:()=>{}}
 });fill(a);
 a.form.dispatchEvent(new a.window.Event('submit',{bubbles:true,cancelable:true}));
 a.document.querySelector('[data-field="weightGrams"]').value='650';
 a.form.dispatchEvent(new a.window.Event('input',{bubbles:true}));
 complete(new Response(new Blob([Uint8Array.from([255,216,255])],{type:'image/jpeg'})));
 for(let attempt=0;attempt<20&&a.document.getElementById('fenton-chart-button').disabled;attempt++)await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(a.document.getElementById('fenton-figure').hidden,true);
 assert.match(a.document.getElementById('fenton-status').textContent,/Medidas alteradas/);
});
