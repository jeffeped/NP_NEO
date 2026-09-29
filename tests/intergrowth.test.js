import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateIntergrowth,referenceValue,zScore,percentileFromZ,INTERGROWTH_MIN_DAYS,INTERGROWTH_MAX_DAYS} from '../intergrowth.js';

const input={sex:'male',measurements:[{weeks:40,days:0,weight:3430,length:50,head:35}]};
const close=(actual,expected,tolerance)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} versus ${expected} (tolerance ${tolerance})`);

test('independent examples printed in the original Appendix 8 at 34 weeks',()=>{
 // Weight examples printed in kg, head circumference in cm. K=-1.88 is the
 // approximate normal deviate used by the publication for its third centile.
 for(const [sex,metric,z,expected] of [
  ['male','weight',0,2040],['female','weight',0,1860],
  ['male','weight',-1.88,1510],['female','weight',-1.88,1380],
  ['male','head',0,31.27],['female','head',0,30.48],
  ['male','head',-1.88,29.15],['female','head',-1.88,28.35]
 ])close(referenceValue(sex,metric,34*7,z),expected,metric==='weight'?5:0.005);
});

test('published official tables: all six sex/indicator combinations and age boundaries',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/intergrowth-official.json',import.meta.url),'utf8'));
 assert.equal(fixture.tables.length,6);
 for(const table of fixture.tables){
  const sex=table.sex==='M'?'male':'female',unit=table.unit==='kg'?1000:1;
  const tolerance=(0.5*10**-table.precision+1e-6)*unit;
  for(const row of table.rows)for(const [i,expected] of row.values.entries()){
   const z=fixture.zScores[i],days=row.pmaWeeks*7;
   close(referenceValue(sex,table.metric,days,z),expected*unit,tolerance);
   // Inverting the rounded measurement interval must contain the table's Z.
   assert.ok(zScore(sex,table.metric,days,expected*unit-tolerance)<=z);
   assert.ok(zScore(sex,table.metric,days,expected*unit+tolerance)>=z);
  }
 }
});

test('PMA uses exact elapsed days, including 63+6 and exactly 64+0',()=>{
 const result=calculateIntergrowth({sex:'female',measurements:[
  {weeks:27,days:0,weight:615}, {weeks:40,days:3,length:50},
  {weeks:63,days:6,head:42}, {weeks:64,days:0,weight:7500}
 ]});
 assert.deepEqual(result.measurements.map(r=>r.pmaDays),[189,283,447,448]);
 assert.equal(INTERGROWTH_MIN_DAYS,189);assert.equal(INTERGROWTH_MAX_DAYS,448);
 const day0=referenceValue('female','length',280,0),day3=referenceValue('female','length',283,0),day7=referenceValue('female','length',287,0);
 assert.ok(day0<day3&&day3<day7);
 // Independent numerical evaluation of Appendix 8 at x=40+3/7 weeks.
 close(day3,49.74743119644386,1e-10);
});

test('known standard normal probabilities and symmetry',()=>{
 close(percentileFromZ(-3),0.13498980316300946,1e-10);
 close(percentileFromZ(1),84.1344746068543,1e-10);
 close(percentileFromZ(1.959963984540054),97.5,1e-10);
 assert.equal(percentileFromZ(0),50);
 for(const z of [0.5,2,4,7])close(percentileFromZ(-z)+percentileFromZ(z),100,1e-10);
 assert.equal(percentileFromZ(-100),0);assert.equal(percentileFromZ(100),100);
 assert.throws(()=>percentileFromZ(NaN));
});

test('measurement units and missing indicators remain explicit without mutating input',()=>{
 const data={sex:'male',measurements:[{weeks:34,days:0,weight:2035.0172698442832},{weeks:35,days:0,head:32}]};
 const before=JSON.stringify(data),r=calculateIntergrowth(data);
 close(r.measurements[0].scores.weight.z,0,1e-12);
 close(r.measurements[0].scores.weight.percentile,50,1e-10);
 assert.deepEqual(Object.keys(r.measurements[0].scores),['weight']);
 assert.equal(r.measurements[0].length,undefined);
 assert.equal(JSON.stringify(data),before);
 assert.throws(()=>calculateIntergrowth({...input,measurements:[{weeks:40,days:0,weight:3.43}]}),/gramas/);
});

test('invalid ages, unsupported extrapolation and nonincreasing follow-up are rejected',()=>{
 for(const row of [{weeks:26,days:6},{weeks:64,days:1},{weeks:65,days:0},{weeks:40.5,days:0},{weeks:40,days:7},{weeks:40,days:-1},{weeks:'40',days:0},{weeks:40,days:NaN}])
  assert.throws(()=>calculateIntergrowth({sex:'male',measurements:[{...row,weight:3000}]}));
 for(const weeks of [40,39])assert.throws(()=>calculateIntergrowth({sex:'male',measurements:[input.measurements[0],{weeks,days:0,weight:3000}]}),/ordem/);
 for(const days of [188,449,280.5,NaN])assert.throws(()=>referenceValue('male','weight',days,0));
});

test('invalid selection, empty rows and unit errors never produce a chartable result',()=>{
 for(const data of [null,{}, {...input,sex:'M'}, {...input,measurements:[]}, {...input,measurements:new Array(21).fill(input.measurements[0])}, {...input,measurements:[{weeks:40,days:0}]}])assert.throws(()=>calculateIntergrowth(data));
 for(const [metric,values] of Object.entries({weight:[0,-1,99,20001,NaN,Infinity,'3430'],length:[0,14,91,NaN],head:[0,9,61,NaN]}))
  for(const value of values)assert.throws(()=>calculateIntergrowth({sex:'male',measurements:[{weeks:40,days:0,[metric]:value}]}));
 assert.throws(()=>zScore('male','weight',280,0));assert.throws(()=>referenceValue('male','invalid',280,0));
});

test('all daily reference curves are finite, ordered, positive and increasing with PMA',()=>{
 for(const sex of ['male','female'])for(const metric of ['weight','length','head']){
  let previous=0;
  for(let day=189;day<=448;day++){
   const values=[-3,-2,-1,0,1,2,3].map(z=>referenceValue(sex,metric,day,z));
   assert.ok(values.every(Number.isFinite));assert.ok(values[0]>0);
   assert.ok(values.every((v,i)=>i===0||v>values[i-1]));
   assert.ok(values[3]>previous);previous=values[3];
  }
 }
});
