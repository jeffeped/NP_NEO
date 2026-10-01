import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {calculateEnteral,integrateNutrition,enteralNutrientWarnings} from '../enteral.js';
import {initEnteral} from '../enteral-ui.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
for(const value of [-1,-0.125,-1e-12,-Number.MIN_VALUE,-Number.MAX_VALUE,'-2.75'])for(const energy of [70,-1])test(`protein ${value}, energy ${energy}: independent zero fallback and provenance`,()=>{
 const en=calculateEnteral({type:'lhop',rate:150,analyzedEnergy:energy,analyzedProtein:value});
 assert.equal(en.protein,0);assert.equal(en.composition.protein,0);assert.equal(en.calories,energy<0?0:105);
 assert.deepEqual(en.composition.proteinValidation,{status:'invalid-negative',enteredValue:Number(value),calculationValue:0});
 assert.match(enteralNutrientWarnings(en).join(' '),/Proteína analisada inválida.*usado 0.*não é valor medido.*recalcule/);
});
for(const source of ['none','individual','standard','hydration'])test(`protein integration ${source}: sanitize only invalid components, fortifier preserved`,()=>{
 const enteral=calculateEnteral({type:'lhop',rate:150,analyzedEnergy:-1,analyzedProtein:-1,fm85GramsPer100mL:2});
 const all=integrateNutrition({source,enteral,parenteral:{fluid:60,calories:50,protein:2}});
 close(enteral.protein,1.08);close(enteral.calories,12.9);
 close(all.total.protein,1.08+(['none','hydration'].includes(source)?0:2));
 assert.deepEqual(all.enteral.proteinValidation,enteral.composition.proteinValidation);
 const legacy=integrateNutrition({source,enteral:{rate:150,calories:-1.5,protein:-0.2},parenteral:{fluid:60,calories:50,protein:2}});
 assert.equal(legacy.enteral.calories,0);assert.equal(legacy.enteral.protein,0);
 assert.deepEqual(legacy.enteral.proteinValidation,{status:'invalid-negative-total',enteredValue:-0.2,calculationValue:0});
 assert.match(enteralNutrientWarnings(null,legacy).join(' '),/Proteína enteral recebida inválida: -0,2 g\/kg\/dia; usado 0/);
});
for(const protein of [0,-0,0.001,1.2,'2.75'])test(`nonnegative protein ${protein} unchanged`,()=>{
 const en=calculateEnteral({type:'lhop',rate:150,analyzedEnergy:70,analyzedProtein:protein});
 close(en.protein,1.5*Number(protein));assert.equal(en.composition.proteinValidation,undefined);assert.deepEqual(enteralNutrientWarnings(en),[]);
});

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function open(){
 const {document,window}=parseHTML(html),el=id=>document.getElementById(id);
 const ui=initEnteral(document,()=>({fluid:60,calories:50,protein:2}));
 const dispatch=(id,event)=>el(id).dispatchEvent(new window.Event(event,{bubbles:true,cancelable:true}));
 const set=(id,value,event='input')=>{
  const input=el(id);
  if(input.tagName==='SELECT'){for(const option of input.options)option.removeAttribute('selected');input.querySelector(`[value="${value}"]`).selected=true;}
  else input.value=String(value);
  if(event)dispatch(id,event);
 };
 for(const [id,value] of Object.entries({'en-source':'none','en-type':'lhop','en-fm85':'0','en-rate':150,'en-energy':70}))set(id,value);
 return {el,set,dispatch,ui,submit:()=>dispatch('enteral-form','submit')};
}
for(const [value,mode] of [['-1','input'],['-0,125','paste'],['-2.75','programmatic'],['-1e-12','change']])test(`UI protein ${mode} ${value}: invalid, recalculation request, nonblocking, recovery`,()=>{
 const app=open();app.set('en-protein',value,mode==='programmatic'?null:mode==='paste'?'input':mode);app.submit();
 assert.equal(app.el('en-protein').value,value);assert.equal(app.el('en-protein').getAttribute('aria-invalid'),'true');
 assert.equal(app.el('en-protein-warning').hidden,false);assert.match(app.el('en-protein-warning').textContent,/Revise o valor e recalcule/);
 assert.equal(app.el('en-errors').hidden,true);assert.equal(app.el('en-result').hidden,false);assert.equal(app.el('en-export').disabled,false);
 assert.equal(app.ui.getResult().integrated.total.protein,0);assert.equal(app.ui.getResult().integrated.total.calories,105);
 assert.match(app.el('en-nutrient-result-warning').textContent,/Proteína analisada inválida.*não é valor medido.*recalcule/);
 app.set('en-energy',-1);app.submit();assert.equal(app.ui.getResult().integrated.total.calories,0);
 assert.match(app.el('en-nutrient-result-warning').textContent,/Energia analisada inválida.*Proteína analisada inválida/);
 app.set('en-protein','1,2');assert.equal(app.ui.getResult(),null);assert.equal(app.el('en-protein-warning').hidden,true);
 assert.equal(app.el('en-protein').getAttribute('aria-invalid'),'false');app.submit();
 close(app.ui.getResult().integrated.total.protein,1.8);assert.equal(app.el('en-energy-warning').hidden,false);
 assert.doesNotMatch(app.el('en-nutrient-result-warning').textContent,/Proteína analisada inválida/);
 app.set('en-energy',70);app.submit();assert.equal(app.el('en-nutrient-result-warning').hidden,true);
 app.set('en-protein',0);app.submit();assert.equal(app.ui.getResult().enteral.protein,0);assert.equal(app.el('en-protein-warning').hidden,true);
 app.set('en-energy','');app.set('en-protein','');app.submit();close(app.ui.getResult().enteral.protein,1.8);
 assert.equal(app.el('en-nutrient-result-warning').hidden,true);assert.equal(app.el('en-estimated-note').hidden,false);
});

test('negative nutrients permit actual PDF download; editing invalidates the old report',async()=>{
 const vm=await import('node:vm');vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
 const app=open();app.set('en-energy',-1);app.set('en-protein',-.125);app.submit();
 app.dispatch('en-export','click');
 for(let i=0;i<100&&app.el('en-export').disabled;i++)await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(app.el('en-export').disabled,false);assert.equal(app.el('en-pdf-download').hidden,false);
 assert.match(app.el('en-pdf-download').href,/^blob:/);assert.match(app.el('en-pdf-status').textContent,/PDF gerado/);
 const bytes=await (await fetch(app.el('en-pdf-download').href)).arrayBuffer();
 assert.equal((await PDFLib.PDFDocument.load(bytes)).getPageCount(),2);
 app.set('en-protein',1.2);assert.equal(app.ui.getResult(),null);assert.equal(app.el('en-pdf-download').hidden,true);
 assert.equal(app.el('en-protein-warning').hidden,true);app.submit();assert.equal(app.ui.getResult().enteral.composition.proteinValidation,undefined);
});
