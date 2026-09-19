import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {assessTransition,integrateNutrition,transitionLines} from '../enteral.js';
import {initEnteral} from '../enteral-ui.js';

// Resultados esperados independentes: as oito combinações dos limites aprovados.
for(const rate of [50,50.1])for(const energy of [109.9,110])for(const protein of [2.49,2.50]){
 test(`transição: EN ${rate}, energia ${energy}, proteína ${protein}`,()=>{
  const integrated=integrateNutrition({parenteral:{fluid:60,calories:energy-40,protein:protein-1},enteral:{rate,calories:40,protein:1}});
  assert.deepEqual(assessTransition(integrated),{active:rate===50.1,reason:rate===50?'enteral-threshold':null,energyMet:rate===50?null:energy===110,proteinMet:rate===50?null:protein===2.5});
 });
}
for(const rate of [0,50,50.1,150])test(`sem PN: EN ${rate} não ativa régua`,()=>{
 const result=integrateNutrition({enteral:{rate,calories:120,protein:3}});
 assert.equal(assessTransition(result).active,false);
 assert.match(transitionLines(result)[0],/sem PN/);
});
test('comparação não arredonda valores próximos às metas',()=>{
 const result=integrateNutrition({parenteral:{fluid:60,calories:109.9999,protein:2.49999},enteral:{rate:50.0001,calories:0,protein:0}});
 assert.deepEqual(assessTransition(result),{active:true,reason:null,energyMet:false,proteinMet:false});
});

function openEnteral(pn){
 const {document,window}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 const el=id=>document.getElementById(id);
 for(const select of document.querySelectorAll('select'))select.firstElementChild.selected=true;
 initEnteral(document,()=>pn);
 const dispatch=(id,type)=>el(id).dispatchEvent(new window.Event(type,{bubbles:true,cancelable:true}));
 const set=(id,value)=>{const input=el(id);if(input.tagName==='SELECT'){for(const opt of input.options)opt.removeAttribute('selected');Array.from(input.options).find(opt=>opt.value===value).selected=true;}else input.value=String(value);dispatch(id,'input');};
 set('en-source','individual');set('en-type','lhop');set('en-energy',40);set('en-protein',1);set('en-rate',100);
 return {el,set,dispatch};
}
for(const [energy,protein] of [[109.9,2.49],[110,2.5],[109.9,2.5],[110,2.49]])test(`interface mantém avaliações separadas: ${energy}/${protein}`,()=>{
 const app=openEnteral({fluid:60,calories:energy-40,protein:protein-1});app.dispatch('enteral-form','submit');
 assert.equal(app.el('en-result').hidden,false);
 assert.match(app.el('en-transition').textContent,new RegExp(`Energia total: ${energy===110?'meta atingida':'abaixo da meta'}`));
 assert.match(app.el('en-transition').textContent,new RegExp(`Proteína total: ${protein===2.5?'meta atingida':'abaixo da meta'}`));
 assert.ok(app.el('en-total-rows').textContent.includes(protein.toFixed(2).replace('.',',')));
});
test('interface ativa acima de 50; edição e novo cálculo de PN invalidam resultado',()=>{
 const app=openEnteral({fluid:60,calories:70,protein:1.5});
 app.set('en-rate','50,0');app.dispatch('enteral-form','submit');assert.match(app.el('en-transition').textContent,/Régua inativa/);
 app.set('en-rate','50,1');assert.equal(app.el('en-result').hidden,true);
 app.dispatch('enteral-form','submit');assert.match(app.el('en-transition').textContent,/Régua ativa/);
 app.dispatch('npp-form','submit');assert.equal(app.el('en-result').hidden,true);assert.equal(app.el('en-pdf-download').hidden,true);
 app.set('en-rate','inválido');app.dispatch('enteral-form','submit');assert.equal(app.el('en-result').hidden,true);assert.equal(app.el('en-errors').hidden,false);
});
