import test from 'node:test';
import assert from 'node:assert/strict';
import * as growth from '../growth.js';
const calc=rows=>{assert.equal(typeof growth.calculateSerialWeightVelocity,'function');return growth.calculateSerialWeightVelocity(rows);};
test('VC em intervalos semanais conserva perda, ganho e primeira pesagem sem valor',()=>{
 const weights=[775,700,730,800,870],rows=weights.map((weightGrams,i)=>({weeks:25+i,days:0,weightGrams}));
 assert.deepEqual(calc(rows).map(v=>v==null?null:Number(v.toFixed(1))),[null,-14.5,6,13.1,12]);
});
test('VC usa os dias adicionais da IPM e peso médio sem arredondamento interno',()=>{
 const result=calc([{weeks:25,days:6,weightGrams:1000},{weeks:26,days:0,weightGrams:1007}]);
 assert.ok(Math.abs(result[1]-7000/1003.5)<1e-10);
});
test('linhas sem peso não geram VC; próxima pesagem usa a última pesagem válida',()=>{
 const result=calc([{weeks:25,days:0,weightGrams:1000},{weeks:26,days:0,headCm:25},{weeks:27,days:0,weightGrams:1140}]);
 assert.equal(result[0],null);assert.equal(result[1],null);assert.ok(Math.abs(result[2]-140000/(1070*14))<1e-10);
});
test('peso estável tem VC zero; idade repetida, peso não positivo ou inválido são recusados',()=>{
 assert.equal(calc([{weeks:25,days:0,weightGrams:1000},{weeks:26,days:0,weightGrams:1000}])[1],0);
 for(const rows of [[{weeks:25,days:0,weightGrams:1000},{weeks:25,days:0,weightGrams:1100}],[{weeks:25,days:0,weightGrams:0}],[{weeks:25,days:0,weightGrams:NaN}]])assert.throws(()=>calc(rows),/medidas|peso|IPM/i);
});
