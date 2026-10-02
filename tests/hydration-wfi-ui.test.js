import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {initHydration} from '../hydration-ui.js';
import {initEnteral} from '../enteral-ui.js';
import {intravenousFromResult} from '../enteral.js';
import {calculateHydration} from '../hydration.js';
import {createHydrationReport,createHydrationReviewReport} from '../hydration-pdf.js';
vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
const logo=readFileSync(new URL('../assets/uea-logo.png',import.meta.url));
globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>logo});
function setup(){
 const {document,window}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 window.HTMLElement.prototype.scrollIntoView=function(){};
 const ui=initHydration(document),el=id=>document.getElementById('hv-'+id);
 const event=(id,type)=>el(id).dispatchEvent(new window.Event(type,{bubbles:true,cancelable:true}));
 const set=(id,v)=>{el(id).value=String(v);event(id,'input');};
 el('access').querySelector('[value="central"]').setAttribute('checked','');el('doseUnit').querySelector('[value="perKgDay"]').selected=true;
 for(const [id,v] of Object.entries({day:8,weight:2000,fluid:100,vig:2,na:4,k:2,ca:1,mg:.2}))set(id,v);
 const check=(id,checked)=>{el(id).checked=checked;event(id,'change');};
 check('allow-wfi',true);
 return {document,window,ui,el,event,set,check,calculate:()=>event('form','submit')};
}
async function waitFor(app){for(let i=0;i<100&&app.el('pdf-status').textContent==='Preparando PDF no aparelho…';i++)await new Promise(r=>setTimeout(r,5));}
test('WFI UI: exact theoretical composition, metrics, review label, clinical PDF blocked',()=>{
 const a=setup();a.calculate();assert.equal(a.el('composition').hidden,false);assert.equal(a.el('export').disabled,true);assert.equal(a.el('review').hidden,false);
 assert.match(a.el('rows').textContent,/Água para injetáveis.*72,609/);assert.match(a.el('rows').textContent,/SG 5%115,2/);
 assert.match(a.el('summary').textContent,/glicose2,88%Osmolaridade estimada282 mOsm\/LNa final40 mmol\/LK final20 mmol\/L/);
 assert.match(a.el('final-summary').textContent,/200,0 mL \| 8,33333333333 mL\/h/);assert.match(a.el('volume-note').textContent,/Confira a oferta efetiva/);
});
test('WFI UI: opt-out restores blocked legacy math; opting in alone does not authorize review PDF',()=>{
 const a=setup();a.check('allow-wfi',false);a.calculate();assert.equal(a.el('composition').hidden,true);assert.equal(a.el('review').hidden,true);
 a.check('allow-wfi',true);a.calculate();a.event('export','click');assert.equal(a.el('pdf-download').hasAttribute('href'),false);assert.equal(a.el('review-ack').checked,false);
});
test('WFI UI: prescriber acknowledgment enables clinical PDF and revocation removes its download',async()=>{
 const a=setup();a.calculate();a.check('review-ack',true);assert.equal(a.el('export').disabled,false);a.event('export','click');await waitFor(a);
 assert.equal(a.el('pdf-download').hidden,false);assert.equal(a.el('pdf-download').download,'GROW_NEO-hidratacao-venosa.pdf');assert.match(a.el('pdf-status').textContent,/PDF gerado/);assert.equal(a.el('export').disabled,false);assert.equal(a.ui.getResult().canPrepare,true);assert.equal(a.ui.getResult().clinicalReviewAcknowledged,true);
 a.check('review-ack',false);assert.equal(a.el('pdf-download').hasAttribute('href'),false);
});
test('WFI UI: every edit or recalculation clears acknowledgment and stale downloads',async()=>{
 const a=setup();a.calculate();a.check('review-ack',true);a.event('export','click');await waitFor(a);
 a.set('na',5);assert.equal(a.ui.getResult(),null);assert.equal(a.el('review-ack').checked,false);assert.equal(a.el('pdf-download').hasAttribute('href'),false);a.calculate();
 a.check('review-ack',true);a.calculate();assert.equal(a.el('review-ack').checked,false);
});
test('WFI UI: edits during async generation do not resurrect PDF',async()=>{
 const a=setup();a.calculate();a.check('review-ack',true);let release;const pending=new Promise(r=>release=r),original=globalThis.fetch;
 globalThis.fetch=async()=>{await pending;return {ok:true,arrayBuffer:async()=>logo};};
 try{a.event('export','click');a.set('vig',1);release();await new Promise(r=>setTimeout(r,70));assert.equal(a.el('pdf-download').hasAttribute('href'),false);}finally{globalThis.fetch=original;}
});
test('WFI UI: withdrawing and renewing acknowledgment invalidates in-flight generation',async()=>{
 const a=setup();a.calculate();a.check('review-ack',true);let release;const pending=new Promise(r=>release=r),original=globalThis.fetch;
 globalThis.fetch=async()=>{await pending;return {ok:true,arrayBuffer:async()=>logo};};
 try{a.event('export','click');a.check('review-ack',false);a.check('review-ack',true);release();await new Promise(r=>setTimeout(r,70));assert.equal(a.el('pdf-download').hasAttribute('href'),false);assert.equal(a.el('export').disabled,false);}finally{globalThis.fetch=original;}
});
test('WFI UI: failure is retryable, repeated click starts once, reset clears prototype state',async()=>{
 const a=setup();a.calculate();a.check('review-ack',true);const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('missing asset');};
 try{a.event('export','click');a.event('export','click');await waitFor(a);assert.equal(calls,1);assert.equal(a.el('export').disabled,false);assert.match(a.el('pdf-status').textContent,/Não foi possível/);}finally{globalThis.fetch=original;}
 a.el('form').reset=()=>{};a.ui.reset();assert.equal(a.el('allow-wfi').checked,false);assert.equal(a.el('review-ack').checked,false);assert.equal(a.ui.getResult(),null);assert.equal(a.el('review').hidden,true);
});
test('WFI PDF: genuine review PDF warns on every page and preserves full computation',async()=>{
 const a=setup();a.calculate();const r=a.ui.getResult(),lines=[],original=PDFLib.PDFPage.prototype.drawText;
 PDFLib.PDFPage.prototype.drawText=function(text,opts){lines.push(String(text));return original.call(this,text,opts);};
 let bytes;try{bytes=await createHydrationReviewReport(r,{acknowledged:true});}finally{PDFLib.PDFPage.prototype.drawText=original;}
 const doc=await PDFLib.PDFDocument.load(bytes);assert.equal(doc.getTitle(),'HV - REVISÃO - NÃO ADMINISTRAR');assert.ok(lines.filter(x=>x==='REVISÃO - NÃO PREPARAR / ADMINISTRAR').length===doc.getPageCount());
 for(const expected of ['Água para injetáveis - diluente da mistura','72,6090430202','2,88%','282 mOsm/L','40 / 20 mmol/L'])assert.ok(lines.includes(expected),expected);
 assert.match(lines.join(' '),/não estabelece tonicidade segura/);assert.match(lines.join(' '),/Confira a oferta efetiva/);
 await assert.rejects(createHydrationReport(r),/not exportable/);
});
test('WFI PDF: recomputation prevents forged review eligibility from bypassing access limits',async()=>{
 const a=setup();a.set('na',50);a.el('access').querySelector('[value="central"]').removeAttribute('checked');a.el('access').querySelector('[value="peripheral"]').setAttribute('checked','');a.calculate();const r=a.ui.getResult();assert.equal(r.canReview,false);
 await assert.rejects(createHydrationReviewReport({...r,canReview:true},{acknowledged:true}),/not exportable/);
});


test('WFI PDF: clinical report records prescriber review, actual composition, dosing weight and issue date',async()=>{
 const a=setup();a.calculate();await assert.rejects(createHydrationReport(a.ui.getResult()),/not exportable/);a.check('review-ack',true);
 const lines=[],original=PDFLib.PDFPage.prototype.drawText;PDFLib.PDFPage.prototype.drawText=function(text,opts){lines.push(String(text));return original.call(this,text,opts);};
 let bytes;try{bytes=await createHydrationReport(a.ui.getResult());}finally{PDFLib.PDFPage.prototype.drawText=original;}
 const doc=await PDFLib.PDFDocument.load(bytes);assert.equal(doc.getTitle(),'Hidratação venosa neonatal');
 for(const expected of ['Água para injetáveis - diluente da mistura','72,6090430202','2,88%','282 mOsm/L','40 / 20 mmol/L'])assert.ok(lines.includes(expected),expected);
 assert.match(lines.join(' '),/prescritor declarou ter revisado a composição, a tonicidade e a compatibilidade/);assert.match(lines.join(' '),/Peso de cálculo: 2.000 g/);assert.match(lines.join(' '),/Emissão:/);assert.ok(!lines.some(x=>x.includes('REVISÃO - NÃO ADMINISTRAR')));
});
test('WFI UI: all relevant input edits clear prescriber confirmation',()=>{
 for(const id of ['weight','birth-weight','day','fluid','vig','na','k','ca','mg','concentration-na','concentration-k','concentration-ca','concentration-mg','osm-sg5','osm-sg50']){
  const a=setup();a.calculate();a.check('review-ack',true);a.event(id,'input');assert.equal(a.el('review-ack').checked,false,id);assert.equal(a.ui.getResult(),null,id);assert.equal(a.el('export').disabled,true,id);
 }
 for(const id of ['allow-wfi','doseUnit','access']){const a=setup();a.calculate();a.check('review-ack',true);a.event(id,'change');assert.equal(a.ui.getResult(),null,id);assert.equal(a.el('review-ack').checked,false,id);}
});
test('WFI integration: confirmation permits current totals; withdrawal invalidates them and blocks recalculation',()=>{
 const a=setup(),d=a.document;const en=initEnteral(d,source=>intravenousFromResult(source,a.ui.getResult()));
 const setSelect=(id,value)=>{const select=d.getElementById(id);for(const o of select.options)o.removeAttribute('selected');select.querySelector(`[value="${value}"]`).selected=true;};
 setSelect('en-source','hydration');setSelect('en-type','lhop');d.getElementById('en-rate').value='60';setSelect('en-fm85','0');
 const submit=()=>d.getElementById('enteral-form').dispatchEvent(new a.window.Event('submit',{bubbles:true,cancelable:true}));
 a.calculate();submit();assert.equal(en.getResult(),null);assert.match(d.getElementById('en-errors').textContent,/impedimentos/);
 a.check('review-ack',true);submit();assert.ok(en.getResult());assert.equal(en.getResult().integrated.parenteral.calories,11.52);
 a.check('review-ack',false);assert.equal(en.getResult(),null);assert.equal(d.getElementById('en-result').hidden,true);submit();assert.equal(en.getResult(),null);assert.match(d.getElementById('en-errors').textContent,/impedimentos/);
 a.check('review-ack',true);submit();assert.ok(en.getResult());a.set('vig',1);assert.equal(en.getResult(),null);
});
