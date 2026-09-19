import test from 'node:test';import assert from 'node:assert/strict';
import {intravenousFromResult,integrateNutrition,assessTransition} from '../enteral.js';
import {calculateHydration,HYDRATION_COMPONENTS} from '../hydration.js';
import {calculateStandard} from '../standard.js';
for(const weight of [.8,1,2])test(`HV ${weight} kg: energia normalizada por kg e precisão preservada`,()=>{
 const r=calculateHydration({weight,fluid:60,vig:5,na:0,k:0,ca:0,mg:0,doseUnit:'perKgDay',concentrations:Object.fromEntries(HYDRATION_COMPONENTS.map(c=>[c.id,c.concentration]))});
 const iv=intravenousFromResult('hydration',r);assert.ok(Math.abs(iv.calories-28.8)<1e-12);assert.equal(iv.fluid,60);assert.equal(iv.protein,0);
});
for(const source of ['standard','individual','hydration','none'])for(const rate of [50,50.1])for(const calories of [109.9,110])for(const protein of [2.49,2.5])test(`régua ${source} ${rate}/${calories}/${protein}`,()=>{
 const r=integrateNutrition({source,parenteral:{fluid:60,calories:10,protein:1},enteral:{rate,calories:calories-10,protein:protein-1}});
 const active=['standard','individual'].includes(source)&&rate===50.1;
 assert.equal(assessTransition(r).active,active);
 assert.equal(assessTransition(r).energyMet,active?calories===110:null);assert.equal(assessTransition(r).proteinMet,active?protein===2.5:null);
});
test('Numeta transfere valores internos sem usar volumes arredondados da tela',()=>{
 const r=calculateStandard({weight:.8,day:2,mode:'protein',value:2.49,access:'central'});
 const iv=intravenousFromResult('standard',r);assert.equal(iv.fluid,r.fluid);assert.equal(iv.calories,273*r.fluid/300);assert.equal(iv.protein,r.protein);
});
test('fonte desconhecida é rejeitada',()=>assert.throws(()=>intravenousFromResult('other',null),/Selecione/));
