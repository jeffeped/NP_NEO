import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateGrowth,fentonReference} from '../growth.js';

const base={sex:'female',birthWeight:1000,initialWeight:1100,finalWeight:1300,gaWeeks:28,gaDays:0,initialDay:10,finalDay:20};
test('crescimento usa o peso médio do período',()=>{
 const r=calculateGrowth(base);assert.equal(r.ok,true);assert.equal(r.intervalDays,10);assert.equal(r.averageWeight,1200);
 assert.equal(r.gramsPerDay,20);assert.ok(Math.abs(r.gramsPerKgDay-16.6666667)<1e-6);
});
test('D1 é nascimento e a referência usa IPM média e sexo',()=>{
 const r=calculateGrowth(base);assert.equal(r.midpointPmaWeeks,30);assert.deepEqual(r.reference,{startWeek:28,endWeek:31,gramsPerKgDay:16.6});
 assert.deepEqual(fentonReference('male',37),{startWeek:37,endWeek:40,gramsPerKgDay:9.1});
});
test('não compara percentual antes de recuperar o peso ao nascer',()=>{
 const r=calculateGrowth({...base,birthWeight:1400});assert.equal(r.birthWeightRecovered,false);assert.equal(r.percentOfReference,null);
});
test('sinaliza intervalo curto e valida cronologia',()=>{
 assert.equal(calculateGrowth({...base,finalDay:14}).shortInterval,true);
 const r=calculateGrowth({...base,finalDay:10});assert.equal(r.ok,false);assert.match(r.errors.map(e=>e.message).join(' '),/posterior/);
});
test('limites das seis faixas Fenton 2025',()=>{
 assert.equal(fentonReference('female',22).gramsPerKgDay,21.2);assert.equal(fentonReference('male',49.9).gramsPerKgDay,6);
 assert.equal(fentonReference('female',50),null);assert.equal(fentonReference('female',21.9),null);
});
