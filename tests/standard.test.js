import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateStandard} from '../standard.js';
const calc=(changes={})=>calculateStandard({weight:1,day:2,mode:'fluid',value:100,access:'central',...changes});
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
test('Numeta: whole bag composition scales to 100 mL without rounded concentration drift',()=>{
 const r=calc();near(r.protein,9.4/3);near(r.volume,100);near(r.rate,100/24);near(r.vig,9.25925925925926);
 near(r.rows.find(x=>x.label==='Energia total').total,91);
 near(r.rows.find(x=>x.label==='Cálcio').total,7.6/3);
 near(r.rows.find(x=>x.label==='Magnésio').total,.94/3);
 near(r.rows.find(x=>x.label==='Fósforo').total,3.8/3);
});
test('Numeta 2:1: composição de 240 mL e composição por 100 mL seguem a bula, sem fração lipídica',()=>{
 const r=calc({formulation:'2in1',value:80});
 near(r.volume,80);near(r.protein,9.4/3);near(r.vig,40/3*1000/1440);
 for(const [name,bagAmount] of [['Glicose',40],['Proteína (aminoácidos)',9.4],['Lipídios',0],['Energia total',198],['Energia não proteica',160],['Sódio',6.4],['Fósforo',3.2],['Cálcio',7.6]]){
  const row=r.rows.find(x=>x.label===name);near(row.per100,bagAmount/2.4);near(row.perKg,bagAmount/3);
 }
 assert.ok(r.alerts.some(x=>x.includes('Lipídios infundidos à parte')));
 assert.equal(r.alerts.some(x=>x.includes('Lipídios acima')),false);
 const three=calc({formulation:'3in1',value:80});
 assert.ok(r.protein>three.protein);assert.ok(r.vig>three.vig);
});
test('Numeta 2:1: proteína determina volume menor; limite de bula e AA são específicos',()=>{
 const r=calc({formulation:'2in1',mode:'protein',value:3,weight:.8});
 near(r.fluid,3*240/9.4);near(r.volume,3*240/9.4*.8);
 near(r.rows.find(x=>x.label==='Energia total').perKg,3*198/9.4);
 assert.equal(r.blocks.length,0);
 assert.equal(calc({formulation:'2in1',value:102.3}).blocks.some(x=>x.includes('máximo de bula')),false);
 assert.ok(calc({formulation:'2in1',value:102.3001}).blocks.some(x=>x.includes('102,3')));
 assert.ok(calc({formulation:'2in1',value:122.41}).blocks.some(x=>x.includes('5,1 mL/kg/h')));
 assert.ok(calc({formulation:'2in1',mode:'protein',value:3.5001}).blocks.some(x=>x.includes('Aminoácidos acima de 3,5')));
});
test('Numeta: protein mode inverts fluid mode and weight scales totals only',()=>{
 const r=calc({mode:'protein',value:'3,0',weight:'0,8'});near(r.fluid,95.74468085106383);near(r.protein,3);near(r.volume,76.59574468085107);
 const other=calc({value:r.fluid,weight:1.6});near(other.volume,2*r.volume);near(other.vig,r.vig);
});
test('Numeta: daily maximum and peripheral access block prescription',()=>{
 assert.equal(calc({value:127.9}).blocks.some(x=>x.includes('máximo de bula')),false);assert.ok(calc({value:127.9001}).blocks.some(x=>x.includes('máximo de bula')));
 assert.ok(calc({access:'peripheral'}).blocks.length);assert.ok(calc({value:160}).blocks.some(x=>x.includes('Vazão')));
});
test('Numeta: AA acima de 3,5 g/kg/dia bloqueia ambos os modos, inclusive peso ≥1 kg',()=>{
 assert.equal(calc({weight:2,mode:'protein',value:3.5}).blocks.length,0);
 assert.ok(calc({weight:2,mode:'protein',value:3.5001}).blocks.some(x=>x.includes('Aminoácidos acima de 3,5')));
 assert.ok(calc({weight:2,value:112}).blocks.some(x=>x.includes('Aminoácidos acima de 3,5')));
});
test('Numeta: invalid inputs cannot produce a prescription',()=>{
 for(const changes of [{weight:0},{weight:'abc'},{value:-1},{value:''},{value:Infinity},{mode:'other'},{formulation:''},{formulation:'other'},{day:0},{day:1.5},{access:''}])assert.equal(calc(changes).ok,false);
});

test('Numeta: os quatro indicadores aparecem mesmo quando fixos',async()=>{
 const {standardSummary}=await import('../standard.js');
 const a=new Map(standardSummary(calc({value:60}))),b=new Map(standardSummary(calc({value:100})));
 assert.equal(a.get('Concentração de glicose'),'13,3%');assert.equal(a.get('Proteína / calorias não proteicas'),'1 : 25,0');
 assert.equal(a.get('Concentração de glicose'),b.get('Concentração de glicose'));
 assert.notEqual(a.get('Taxa hídrica'),b.get('Taxa hídrica'));assert.notEqual(a.get('Taxa calórica'),b.get('Taxa calórica'));
});

test('Numeta: Ca/P molar vem após P/cal e permanece 1,0 : 1 nos dois modos',async()=>{
 const {standardSummary}=await import('../standard.js');
 for(const input of [{value:60},{mode:'protein',value:3,weight:0.8}]){
  const rows=standardSummary(calc(input));
  const i=rows.findIndex(([name])=>name==='Proteína / calorias não proteicas');
  assert.deepEqual(rows[i+1],['Relação Ca/P (mmol/mmol)','1,0 : 1']);
 }
});
test('Numeta 2:1: cálcio/fósforo, calorias não proteicas, glicose e osmolaridade mudam na tela',async()=>{
 const {standardSummary}=await import('../standard.js');
 const summary=new Map(standardSummary(calc({formulation:'2in1',value:80})));
 assert.equal(summary.get('Relação Ca/P (mmol/mmol)'),'1,2 : 1');
 assert.equal(summary.get('Proteína / calorias não proteicas'),'1 : 17,0');
 assert.equal(summary.get('Concentração de glicose'),'16,7%');
 assert.equal(summary.get('Osmolaridade da bolsa (aproximada)'),'1.400,0 mOsm/L');
});
