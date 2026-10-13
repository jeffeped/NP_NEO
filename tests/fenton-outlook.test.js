import test from 'node:test';import assert from 'node:assert/strict';
const sample=(z=-1.8)=>({data:{sex:'F',birthGaWeeks:25,birthGaDays:0,measurements:[{weeks:25,days:0,weightGrams:1000},{weeks:26,days:0,weightGrams:1100}]},scores:[{weeks:25,days:0,weight:{value:1000,z:.2,percentile:60}},{weeks:26,days:0,weight:{value:1100,z,percentile:3}}]});
test('alerta usa queda estritamente maior que2Z desde nascimento, não último intervalo',async()=>{
 const {analyzeWeightTrend}=await import('../fenton-outlook.js');assert.equal(analyzeWeightTrend(sample()).risk,false);const r=analyzeWeightTrend(sample(-1.80001));assert.equal(r.risk,true);assert.ok(r.dropZ>2);
});
test('artefato binário em -2,98 para -4,98 não dispara queda maior que2Z',async()=>{
 const {analyzeWeightTrend}=await import('../fenton-outlook.js');const a=sample(-4.98);a.scores[0].weight.z=-2.98;assert.equal(analyzeWeightTrend(a).dropZ,2);assert.equal(analyzeWeightTrend(a).risk,false);a.scores[1].weight.z=-4.98001;assert.equal(analyzeWeightTrend(a).risk,true);
});
test('medida posterior ao nascimento não é usada como nascimento; escore ausente não gera alerta',async()=>{
 const {analyzeWeightTrend}=await import('../fenton-outlook.js');const a=sample(-4);a.data.birthGaWeeks=24;assert.equal(analyzeWeightTrend(a).risk,false);assert.match(analyzeWeightTrend(a).reason,/nascimento/);a.data.birthGaWeeks=25;a.scores[0].weight=null;assert.equal(analyzeWeightTrend(a).risk,false);
});
test('projeções14/28 usam última VC válida e não modificam medidas reais',async()=>{
 const {makeWeightProjections}=await import('../fenton-outlook.js');const rows=[{weeks:25,days:0,weightGrams:1000},{weeks:26,days:0,headCm:25},{weeks:27,days:0,weightGrams:1140}],before=JSON.stringify(rows);const r=makeWeightProjections(rows);
 assert.ok(Math.abs(r.velocity-140000/(1070*14))<1e-10);assert.deepEqual(r.points.map(p=>[p.daysAhead,p.weeks,p.days]),[[14,29,0],[28,31,0]]);
 assert.ok(Math.abs(r.points[0].weightGrams-1140*Math.exp((140000/(1070*14))*14/1000))<1e-8);assert.equal(JSON.stringify(rows),before);
});
test('projeção conserva perda/zero; falta de duas pesagens e extrapolaçãoforaFenton são explicitadas',async()=>{
 const {makeWeightProjections}=await import('../fenton-outlook.js');assert.throws(()=>makeWeightProjections([{weeks:25,days:0,weightGrams:1000}]),/duas/);
 const stable=makeWeightProjections([{weeks:47,days:0,weightGrams:5000},{weeks:48,days:0,weightGrams:5000}]);assert.equal(stable.points[0].weightGrams,5000);assert.equal(stable.points[0].inRange,true);assert.equal(stable.points[1].inRange,false);
 const loss=makeWeightProjections([{weeks:25,days:0,weightGrams:1000},{weeks:26,days:0,weightGrams:900}]);assert.ok(loss.points[1].weightGrams<loss.points[0].weightGrams);assert.ok(loss.points[0].weightGrams<900);
});
