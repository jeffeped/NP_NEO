import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate} from '../engine.js';

const base={weight:.920,birthWeight:.990,day:10,gaWeeks:30,gaDays:0,fluidPhase:'stable',fluid:140,aa:3,lip:3,vig:6,na:2,k:0,ca:0,mg:0,p:1,znDose:400,seDose:7,access:'central',naSalt:'nacl',pSalt:'glycero',omit:{k:true,ca:true,mg:true,zn:true,se:true,va:true,vb:true,oligo:true}};
const run=changes=>{const r=calculate({...base,...changes});assert.equal(r.ok,true);return r;};
test('920 g: rounded phosphate supplies 1.9565 sodium; unmeasurable rounding residual is disclosed',()=>{
 const r=run({});
 assert.equal(r.volumes.phosphate,.9);assert.equal(r.volumes.sodium,0);
 assert.ok(Math.abs(r.effective.na-1.8/.920)<1e-12);
 assert.ok(Math.abs(r.sodiumBreakdown.omittedSupplementVolume-.04/1.7)<1e-12);
 assert.equal(r.canExport,true);assert.deepEqual(r.blocks,[]);
 assert.ok(r.notices.some(n=>/0,024 mL.*não foi acrescentado.*2,00.*1,96/.test(n)));
 assert.ok(r.rounding.includes('sodium'));
 assert.equal(run({birthWeight:1.1}).effective.na,r.effective.na);
});
test('990 g and exact phosphate volumes do not create a residual notice',()=>{
 for(const weight of [.990,1]){
  const r=run({weight});assert.equal(r.sodiumBreakdown.omittedSupplementVolume,undefined);
  assert.equal(r.volumes.sodium,0);assert.equal(r.canExport,true);
 }
});
test('genuine small sodium doses stay blocked, including with a phosphate contribution',()=>{
 for(const changes of [{weight:1,na:.04,p:0},{weight:1,na:.21,p:.1}]){
  const r=run(changes);assert.equal(r.canExport,false);
  assert.ok(r.blocks.some(b=>b.startsWith('Sal de sódio:')));
  assert.equal(r.sodiumBreakdown?.omittedSupplementVolume,undefined);
 }
});
test('measurable residual is added; explicit omission and other safety blocks remain',()=>{
 const r=run({weight:.945});assert.equal(r.volumes.sodium,.1);
 assert.equal(r.sodiumBreakdown.omittedSupplementVolume,undefined);
 const omitted=run({omit:{...base.omit,na:true}});
 assert.equal(omitted.sodiumBreakdown.omittedSupplementVolume,undefined);
 assert.equal(run({vig:13}).canExport,false);
 const tinyPhosphate=run({p:.01,na:.02});assert.equal(tinyPhosphate.canExport,false);
 assert.ok(tinyPhosphate.blocks.some(b=>b.startsWith('Sal de fósforo:')));
});
