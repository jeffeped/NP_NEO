import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateIntergrowth} from '../intergrowth.js';
import {calculateIntergrowthVelocity} from '../intergrowth-velocity.js';

const normalized=(measurements,sex='female')=>calculateIntergrowth({sex,measurements});
const example=()=>normalized([
 {weeks:40,days:0,weight:3000},
 {weeks:41,days:3,weight:3300}
]);
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} versus ${expected}`);

test('observed Average2pt velocity agrees with a hand-calculated 10-day example',()=>{
 const result=example(),before=JSON.stringify(result);
 const velocity=calculateIntergrowthVelocity(result,0,1);
 assert.equal(velocity.intervalDays,10);
 assert.equal(velocity.totalGain,300);
 assert.equal(velocity.averageWeight,3150);
 assert.equal(velocity.gramsPerDay,30);
 close(velocity.gramsPerKgDay,9.523809523809524);
 assert.deepEqual({
  initialIndex:velocity.initialIndex,finalIndex:velocity.finalIndex,
  initialEvaluation:velocity.initialEvaluation,finalEvaluation:velocity.finalEvaluation,
  startPmaDays:velocity.startPmaDays,endPmaDays:velocity.endPmaDays,
  startWeight:velocity.startWeight,endWeight:velocity.endWeight
 },{initialIndex:0,finalIndex:1,initialEvaluation:1,finalEvaluation:2,startPmaDays:280,endPmaDays:290,startWeight:3000,endWeight:3300});
 assert.equal(JSON.stringify(result),before);
 for(const field of ['reference','percentile','z','birthWeightRecovered'])assert.equal(Object.hasOwn(velocity,field),false);
});

test('IPM fractions of weeks use exact integer days, including across a week boundary',()=>{
 const result=normalized([{weeks:39,days:6,weight:2980},{weeks:40,days:2,weight:3070}]);
 const velocity=calculateIntergrowthVelocity(result,0,1);
 assert.equal(velocity.intervalDays,3);
 assert.equal(velocity.gramsPerDay,30);
 close(velocity.gramsPerKgDay,9.917355371900827);
});

test('selected endpoints allow intervening assessments without weight',()=>{
 const result=normalized([
  {weeks:40,days:0,weight:3000},
  {weeks:40,days:5,length:50},
  {weeks:41,days:3,weight:3300},
  {weeks:42,days:0,weight:3500}
 ]);
 const velocity=calculateIntergrowthVelocity(result,0,2);
 assert.equal(velocity.finalEvaluation,3);
 assert.equal(velocity.gramsPerDay,30);
 const later=calculateIntergrowthVelocity(result,2,3);
 assert.equal(later.intervalDays,4);
 assert.equal(later.gramsPerDay,50);
});

test('zero gain and weight loss remain visible as zero and negative velocities',()=>{
 for(const [finalWeight,totalGain,gramsPerDay,gramsPerKgDay] of [[3000,0,0,0],[2700,-300,-30,-10.526315789473685]]){
  const result=normalized([{weeks:40,days:0,weight:3000},{weeks:41,days:3,weight:finalWeight}]);
  const velocity=calculateIntergrowthVelocity(result,0,1);
  assert.equal(velocity.totalGain,totalGain);
  assert.equal(velocity.gramsPerDay,gramsPerDay);
  close(velocity.gramsPerKgDay,gramsPerKgDay);
 }
});

test('missing selected weights produce an explicit error for the corresponding assessment',()=>{
 for(const index of [0,1])for(const missing of [undefined,null]){
  const result=example();
  result.measurements[index].weight=missing;
  assert.throws(()=>calculateIntergrowthVelocity(result,0,1),new RegExp(`Avaliação ${index+1}: informe o peso`));
 }
});

test('malformed results and invalid or reversed selections are rejected',()=>{
 for(const result of [null,undefined,{}, {measurements:{}}, {measurements:[]}, {measurements:[example().measurements[0]]}, {measurements:new Array(21).fill(example().measurements[0])}])
  assert.throws(()=>calculateIntergrowthVelocity(result,0,1),/2 a 20 avaliações/);
 for(const indices of [[undefined,1],[0,undefined],['0',1],[0,'1'],[0.5,1],[0,1.5],[-1,1],[0,-1],[0,2],[2,1],[NaN,1],[0,Infinity]])
  assert.throws(()=>calculateIntergrowthVelocity(example(),...indices),/válidas/);
 for(const indices of [[0,0],[1,1],[1,0]])
  assert.throws(()=>calculateIntergrowthVelocity(example(),...indices),/posterior/);
});

test('invalid ages, repeated ages and out-of-order ages cannot produce velocity',()=>{
 for(const pmaDays of [188,449,280.5,NaN,Infinity,'280']){
  const result=example();result.measurements[0].pmaDays=pmaDays;
  assert.throws(()=>calculateIntergrowthVelocity(result,0,1),/IPM/);
 }
 for(const pmaDays of [280,279]){
  const result=example();result.measurements[1].pmaDays=pmaDays;
  assert.throws(()=>calculateIntergrowthVelocity(result,0,1),/ordem crescente/);
 }
 const malformed=example();malformed.measurements[0]=null;
 assert.throws(()=>calculateIntergrowthVelocity(malformed,0,1),/IPM/);
});

test('selected weights must be finite numeric grams within the accepted input range',()=>{
 for(const index of [0,1])for(const weight of [99,20001,0,-1,NaN,Infinity,'3000']){
  const result=example();result.measurements[index].weight=weight;
  assert.throws(()=>calculateIntergrowthVelocity(result,0,1),/peso em gramas/);
 }
 const limits=normalized([{weeks:27,days:0,weight:100},{weeks:64,days:0,weight:20000}]);
 const velocity=calculateIntergrowthVelocity(limits,0,1);
 assert.equal(velocity.intervalDays,259);
 assert.equal(velocity.totalGain,19900);
 assert.ok(Number.isFinite(velocity.gramsPerKgDay));
});
