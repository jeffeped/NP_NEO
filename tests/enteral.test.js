import test from 'node:test';import assert from 'node:assert/strict';
import {calculateEnteral,compositionFor,integrateNutrition,lmoPhase,FM85} from '../enteral.js';
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
for(const [days,phase] of [[4,'lmo_colostrum'],[5,'lmo_transition'],[13,'lmo_transition'],[14,'lmo_mature']]) test(`LMO ${days} d`,()=>assert.equal(lmoPhase(days),phase));
for(const [name,input,kcal,protein] of [
 ['E01',{type:'lmo',lactationDays:4,rate:100},64.38,2.32],
 ['E02',{type:'lmo',lactationDays:5,rate:100},69.47,1.77],
 ['E03',{type:'lmo',lactationDays:14,rate:100},68.70,1.46],
 ['E04',{type:'lhop',rate:100},65,1.2],
 ['E05',{type:'fpt_prenan',rate:100},81,2.7],
 ['E06',{type:'fpt_aptamil_pre',rate:100},81,2.7],
 ['E07',{type:'fp_nan1',rate:100},67,1.2],
 ['E08',{type:'fp_aptamil1',rate:100},67,1.3],
 ['E09',{type:'lmo',lactationDays:14,rate:80},54.96,1.168],
 ['E10',{type:'lhop',rate:150},97.5,1.8]
]) test(name,()=>{const r=calculateEnteral(input);close(r.calories,kcal);close(r.protein,protein)});
test('E11 FM85 padrão',()=>{const r=calculateEnteral({type:'lmo',lactationDays:14,rate:100,fm85GramsPer100mL:FM85.standardGramsPer100mL});close(r.calories,85.9);close(r.protein,2.9)});
test('FM85 em dietas alternadas iguais: 1 g/25 mL em metade delas equivale a 0,5 g/25 mL em média',()=>{
 const gramsPer100mL=(1*4)/(25*8)*100;
 close(gramsPer100mL,2);
 const lmo=calculateEnteral({type:'lmo',lactationDays:14,rate:160,fm85GramsPer100mL:gramsPer100mL});
 close(lmo.composition.energy,77.3);close(lmo.composition.protein,2.18);close(lmo.calories,123.68);close(lmo.protein,3.488);
 const lhop=calculateEnteral({type:'lhop',rate:160,fm85GramsPer100mL:gramsPer100mL});
 close(lhop.composition.energy,73.6);close(lhop.composition.protein,1.92);close(lhop.calories,117.76);close(lhop.protein,3.072);
 assert.throws(()=>calculateEnteral({type:'fpt_prenan',rate:160,fm85GramsPer100mL:2}),/selecione LMO ou LHOP/);
});
test('regressão clínica: LHOP 165 mL/kg/dia com FM85 1 g/25 mL em dietas alternadas',()=>{
 const erroDeUnidade=calculateEnteral({type:'lhop',rate:165,fm85GramsPer100mL:0.5});
 close(erroDeUnidade.calories,110.7975);close(erroDeUnidade.protein,2.277);
 const correto=calculateEnteral({type:'lhop',rate:165,fm85GramsPer100mL:2});
 close(correto.composition.energy,73.6);close(correto.composition.protein,1.92);
 close(correto.calories,121.44);close(correto.protein,3.168);
});
test('E12 integração PN+EN',()=>{const e=calculateEnteral({type:'lmo',lactationDays:14,rate:80});const r=integrateNutrition({parenteral:{fluid:70,calories:48,protein:2},enteral:e});close(r.total.fluid,150);close(r.total.calories,102.96);close(r.total.protein,3.168)});
test('composição analisada substitui estimativa',()=>{const c=compositionFor({type:'lhop',analyzedEnergy:70,analyzedProtein:1.5});close(c.energy,70);close(c.protein,1.5);assert.equal(c.estimated,false)});
