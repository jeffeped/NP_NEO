import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {calculateEnteral,compositionFor,integrateNutrition,enteralEnergyWarnings} from '../enteral.js';
import {initEnteral} from '../enteral-ui.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
for(const value of [-1,-0.001,-1e-12,-Number.MIN_VALUE,-Number.MAX_VALUE,'-2.75']){
 test(`negative analyzed energy ${value}: invalid input retained, calculation zero`,()=>{
  const en=calculateEnteral({type:'lhop',rate:150,analyzedEnergy:value,analyzedProtein:1.2});
  assert.equal(en.composition.energy,0);assert.equal(en.calories,0);
  assert.deepEqual(en.composition.energyValidation,{status:'invalid-negative',enteredValue:Number(value),calculationValue:0});
  close(en.protein,1.8);assert.equal(en.composition.estimated,false);
  assert.match(enteralEnergyWarnings(en).join(' '),/inválida.*Usado 0.*não é valor medido/);
 });
}
test('fortifier energy is added to the substituted zero milk energy only',()=>{
 const en=calculateEnteral({type:'lhop',rate:150,analyzedEnergy:-100,analyzedProtein:1.2,fm85GramsPer100mL:2});
 close(en.composition.energy,8.6);close(en.calories,12.9);close(en.protein,2.88);
 assert.equal(en.composition.energyValidation.calculationValue,0);
 assert.ok(enteralEnergyWarnings(en).some(line=>line.includes('FM85 acrescentada separadamente')));
});
for(const value of [0,-0,0.001,70,81,'70.25'])test(`valid analyzed energy ${value}: no warning or value change`,()=>{
 const en=calculateEnteral({type:'lhop',rate:150,analyzedEnergy:value,analyzedProtein:1.2});
 close(en.composition.energy,Number(value));close(en.calories,1.5*Number(value));
 assert.equal(en.composition.energyValidation,undefined);assert.deepEqual(enteralEnergyWarnings(en),[]);
});
test('API estimates only an absent pair and rejects incomplete or invalid composition',()=>{
 for(const input of [{},{analyzedEnergy:'',analyzedProtein:''},{analyzedEnergy:null,analyzedProtein:null}]){
  assert.equal(compositionFor({type:'lhop',...input}).energy,65);
 }
 for(const input of [{analyzedEnergy:undefined,analyzedProtein:1.2},{analyzedEnergy:'unknown',analyzedProtein:1.2},{analyzedEnergy:0,analyzedProtein:undefined},{analyzedEnergy:-1,analyzedProtein:undefined}]){
  assert.throws(()=>compositionFor({type:'lhop',...input}));
 }
});
test('negative protein now follows the explicitly approved zero fallback',()=>{
 const en=calculateEnteral({type:'lhop',rate:150,analyzedEnergy:70,analyzedProtein:-1});
 assert.equal(en.protein,0);assert.equal(en.calories,105);
 assert.deepEqual(en.composition.proteinValidation,{status:'invalid-negative',enteredValue:-1,calculationValue:0});
});
for(const source of ['none','individual','standard','hydration'])test(`integration ${source}: keeps nonnegative calories and explicit provenance`,()=>{
 const enteral=calculateEnteral({type:'lhop',rate:150,analyzedEnergy:-1,analyzedProtein:1.2});
 const all=integrateNutrition({source,enteral,parenteral:{fluid:60,calories:50,protein:2}});
 assert.equal(all.enteral.calories,0);assert.equal(all.total.calories,source==='none'?0:50);
 assert.deepEqual(all.enteral.energyValidation,enteral.composition.energyValidation);
 assert.match(enteralEnergyWarnings(enteral,all).join(' '),/inválida/);
 const legacy=integrateNutrition({source,enteral:{rate:150,calories:-1.5,protein:1.8},parenteral:{fluid:60,calories:50,protein:2}});
 assert.equal(legacy.enteral.calories,0);assert.equal(legacy.total.calories,source==='none'?0:50);
 assert.deepEqual(legacy.enteral.energyValidation,{status:'invalid-negative-total',enteredValue:-1.5,calculationValue:0});
 assert.match(enteralEnergyWarnings(null,legacy).join(' '),/-1,5 kcal\/kg\/dia.*Usado 0/);
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
 for(const [id,value] of Object.entries({'en-source':'none','en-type':'lhop','en-fm85':'0','en-rate':150,'en-protein':'1,2'}))set(id,value);
 return {el,set,dispatch,ui,window,submit:()=>dispatch('enteral-form','submit')};
}
for(const [value,mode] of [['-1','input'],['-0,125','paste'],['-2.75','programmatic'],['-1e-12','change']])test(`UI ${mode} negative ${value}: visible warning without blocking`,()=>{
 const app=open();app.set('en-energy',value,mode==='programmatic'?null:mode==='paste'?'input':mode);
 // Browser paste dispatches input after changing the value; no key filter is relied on.
 if(mode!=='programmatic'){assert.equal(app.el('en-energy-warning').hidden,false);assert.equal(app.el('en-energy').getAttribute('aria-invalid'),'true');}
 app.submit();assert.equal(app.el('en-energy').value,value);assert.equal(app.el('en-errors').hidden,true);
 assert.equal(app.el('en-result').hidden,false);assert.equal(app.el('en-nutrient-result-warning').hidden,false);
 assert.equal(app.el('en-energy-warning').hidden,false);assert.equal(app.el('en-energy').getAttribute('aria-invalid'),'true');
 assert.equal(app.el('en-energy').closest('.field').classList.contains('invalid'),true);
 assert.equal(app.ui.getResult().integrated.total.calories,0);assert.equal(app.el('en-export').disabled,false);
 assert.match(app.el('en-summary').textContent,/Energia enteral0,0 kcal\/kg\/dia/);
 assert.match(app.el('en-nutrient-result-warning').textContent,/inválida.*não é valor medido/);
 app.set('en-energy','70,25');assert.equal(app.ui.getResult(),null);
 assert.equal(app.el('en-energy-warning').hidden,true);assert.equal(app.el('en-energy').getAttribute('aria-invalid'),'false');
 assert.equal(app.el('en-energy').closest('.field').classList.contains('invalid'),false);
 app.submit();assert.equal(app.el('en-nutrient-result-warning').hidden,true);close(app.ui.getResult().enteral.calories,105.375);
 app.set('en-energy',0);app.submit();assert.equal(app.ui.getResult().enteral.calories,0);assert.equal(app.el('en-nutrient-result-warning').hidden,true);
});
test('UI blank composition keeps estimate; incomplete pair keeps existing validation',()=>{
 const app=open();app.set('en-energy','');app.set('en-protein','');app.submit();
 assert.equal(app.ui.getResult().enteral.composition.energy,65);assert.equal(app.el('en-energy-warning').hidden,true);
 app.set('en-energy',-1);app.submit();assert.equal(app.ui.getResult(),null);
 assert.match(app.el('en-errors').textContent,/informe energia e proteína/);
 assert.equal(app.el('en-energy-warning').hidden,false);
});
