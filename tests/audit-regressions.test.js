import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {calculateGrowth} from '../growth.js';
import {initGrowth} from '../growth-ui.js';
import {initEnteral} from '../enteral-ui.js';
import {calculateEnteral,integrateNutrition,intravenousFromResult,assessTransition} from '../enteral.js';
import {calculateStandard} from '../standard.js';
import {createEnteralReport} from '../enteral-pdf.js';

vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const growthInput={sex:'female',birthWeight:1000,initialWeight:1100,finalWeight:1300,gaWeeks:28,gaDays:0,initialDay:10,finalDay:20};

test('growth interprets grouped gram weights without changing the gain scale',()=>{
 const r=calculateGrowth({...growthInput,birthWeight:'1.000',initialWeight:'1.100',finalWeight:'1.300'});
 assert.equal(r.ok,true);assert.equal(r.input.birthWeight,1000);assert.equal(r.averageWeight,1200);assert.equal(r.totalGain,200);assert.equal(r.gramsPerDay,20);
});
test('grouped birthweight does not imply recovery before 1000 grams',()=>{
 const r=calculateGrowth({...growthInput,birthWeight:'1.000',initialWeight:950,finalWeight:990});
 assert.equal(r.birthWeightRecovered,false);assert.equal(r.percentOfReference,null);
});

function open(getParenteral=()=>({})){
 const {document,window}=parseHTML(html),el=id=>document.getElementById(id);
 const growth=initGrowth(document),enteral=initEnteral(document,getParenteral,()=>growth.getResult());
 const dispatch=(id,event)=>el(id).dispatchEvent(new window.Event(event,{bubbles:true,cancelable:true}));
 const set=(id,value)=>{const input=el(id);if(input.tagName==='SELECT'){for(const option of input.options)option.removeAttribute('selected');input.querySelector(`[value="${value}"]`).selected=true;}else input.value=String(value);dispatch(id,'input');dispatch(id,'change');};
 for(const [id,value] of Object.entries({'en-source':'none','en-type':'lhop','en-fm85':'0','en-rate':120}))set(id,value);
 const fillGrowth=()=>{for(const [id,value] of Object.entries({'gr-sex':'female','gr-birth-weight':1000,'gr-initial-weight':1100,'gr-final-weight':1300,'gr-ga-weeks':28,'gr-ga-days':0,'gr-initial-day':10,'gr-final-day':20}))set(id,value);dispatch('growth-form','submit');};
 el('en-pdf-download').click=()=>dispatch('en-pdf-download','click');
 const exportPdf=async()=>{dispatch('en-export','click');for(let i=0;i<100&&el('en-export').disabled;i++)await new Promise(setImmediate);assert.equal(el('en-export').disabled,false);};
 return {document,window,el,set,dispatch,growth,enteral,fillGrowth,exportPdf};
}
test('enteral does not apply the under-1800g reference to a grouped 2000g birthweight',()=>{
 const app=open();app.set('en-type','fpt_prenan');app.set('en-rate',100);app.set('en-phase','growth');app.set('en-birth-weight','2.000');app.set('en-gestational-age',30);app.dispatch('enteral-form','submit');
 assert.equal(app.enteral.getResult().clinical.birthWeight,2000);assert.match(app.el('en-clinical-reference').textContent,/Referência não aplicada/);assert.doesNotMatch(app.el('en-clinical-reference').textContent,/faltam/);
});
for(const event of ['input','change','submit'])test(`growth ${event} removes an existing Enteral PDF but preserves nutrition totals`,async()=>{
 const app=open();app.fillGrowth();app.dispatch('enteral-form','submit');const nutrition=app.enteral.getResult();await app.exportPdf();assert.equal(app.el('en-pdf-download').hidden,false);
 app.dispatch('growth-form',event);
 assert.equal(app.el('en-pdf-download').hidden,true);assert.equal(app.el('en-pdf-download').hasAttribute('href'),false);assert.equal(app.enteral.getResult(),nutrition);
});
test('an edit to optional growth prevents a pending Enteral export from publishing old inputs',async()=>{
 const app=open();app.dispatch('enteral-form','submit');app.dispatch('en-export','click');app.set('gr-initial-weight',1100);
 for(let i=0;i<100&&app.el('en-export').disabled;i++)await new Promise(setImmediate);
 assert.equal(app.el('en-export').disabled,false);assert.equal(app.el('en-pdf-download').hidden,true);
});
test('Enteral download validates the growth object used to create it',async()=>{
 const app=open();app.fillGrowth();app.dispatch('enteral-form','submit');await app.exportPdf();
 app.growth.invalidate();const allowed=app.dispatch('en-pdf-download','click');assert.equal(allowed,false);assert.equal(app.el('en-pdf-download').hidden,true);
});
test('a stale PDF failure after growth edit preserves the nutrition result',async()=>{
 const app=open();app.dispatch('enteral-form','submit');const nutrition=app.enteral.getResult();
 const original=PDFLib.PDFDocument.create;let reject;
 PDFLib.PDFDocument.create=()=>new Promise((resolve,fail)=>{reject=fail;});
 try{
  app.dispatch('en-export','click');app.set('gr-initial-weight',1100);reject(new Error('Synthetic delayed PDF failure'));
  for(let i=0;i<100&&app.el('en-export').disabled;i++)await new Promise(setImmediate);
  assert.equal(app.enteral.getResult(),nutrition);assert.equal(app.el('en-result').hidden,false);assert.equal(app.el('en-pdf-download').hidden,true);assert.equal(app.el('en-pdf-status').textContent,'');
 }finally{PDFLib.PDFDocument.create=original;}
});
test('download source failure still invalidates the nutrition result',async()=>{
 let valid=true;
 const app=open(()=>{if(!valid)throw new Error('Recalcule a fonte intravenosa.');return {fluid:40,calories:20,protein:1,weight:1};});
 app.set('en-source','individual');app.dispatch('enteral-form','submit');await app.exportPdf();valid=false;
 assert.equal(app.dispatch('en-pdf-download','click'),false);assert.equal(app.enteral.getResult(),null);assert.equal(app.el('en-result').hidden,true);
});

test('Enteral PDF keeps growth and warnings above the reserved footer',async()=>{
 const standard=calculateStandard({weight:.9,birthWeight:1,day:12,formulation:'2in1',mode:'fluid',value:40,access:'central'});
 const enteral=calculateEnteral({type:'lhop',rate:80,analyzedEnergy:-5,analyzedProtein:-1,fm85GramsPer100mL:4});
 const integrated=integrateNutrition({source:'standard',parenteral:intravenousFromResult('standard',standard),enteral});
 const growth=calculateGrowth({...growthInput,birthWeight:1000,initialWeight:800,finalWeight:900,initialDay:10,finalDay:12});
 const original=PDFLib.PDFPage.prototype.drawText,body=[],pages=new Map();
 PDFLib.PDFPage.prototype.drawText=function(value,options){
  if(!/^(Sem identificação|GROW_NEO by Prof|Emissão:)/.test(String(value))){body.push({value:String(value),...options});pages.set(String(value),this);}
  return original.call(this,value,options);
 };
 try{
  const bytes=await createEnteralReport({enteral,integrated,growth}),pdf=await PDFLib.PDFDocument.load(bytes);
  for(const line of body)assert.ok(line.y>=100,`Body overlaps footer: ${line.value} at ${line.y}`);
  assert.equal(pdf.getPageCount(),2);assert.notEqual(pages.get('Crescimento ponderal'),pages.get('Metas de transição PN / EN'));
  assert.ok(body.some(line=>line.value.includes('Intervalo inferior a 5 dias')));assert.ok(body.some(line=>line.value.includes('Proteína analisada inválida')));
 }finally{PDFLib.PDFPage.prototype.drawText=original;}
});
test('extreme finite Enteral inputs cannot produce infinite nutrient output',()=>{
 assert.throws(()=>calculateEnteral({type:'lhop',rate:100,analyzedEnergy:1e308,analyzedProtein:1e308}),/capacidade numérica|finito/i);
});
test('integration rejects nonfinite legacy nutrients and overflowing sums',()=>{
 assert.throws(()=>integrateNutrition({source:'individual',parenteral:{fluid:40,calories:10,protein:1},enteral:{rate:100,calories:Infinity,protein:Infinity}}),/capacidade numérica|finito/i);
 assert.throws(()=>integrateNutrition({source:'individual',parenteral:{fluid:40,calories:1e308,protein:1e308},enteral:{rate:100,calories:1e308,protein:1e308}}),/capacidade numérica|finito/i);
});
test('transition never classifies infinite totals as meeting targets',()=>{
 assert.throws(()=>assessTransition({source:'individual',parenteral:{fluid:40},enteral:{fluid:100},total:{calories:Infinity,protein:Infinity}}),/capacidade numérica|finito/i);
});
test('UI rejects numerical overflow without retaining totals or met targets',()=>{
 const app=open();app.set('en-energy','1e308');app.set('en-protein','1e308');app.dispatch('enteral-form','submit');
 assert.equal(app.enteral.getResult(),null);assert.equal(app.el('en-result').hidden,true);assert.equal(app.el('en-errors').hidden,false);assert.match(app.el('en-errors').textContent,/capacidade numérica|finito/i);
});
