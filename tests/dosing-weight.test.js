import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDosingWeight} from '../dosing-weight.js';
import {calculate} from '../engine.js';
import {calculateHydration} from '../hydration.js';
import {calculateStandard} from '../standard.js';
import {intravenousFromResult,integrateNutrition,calculateEnteral} from '../enteral.js';
const input={weight:.920,birthWeight:.990,day:7,gaWeeks:30,gaDays:0,fluidPhase:'stable',fluid:100,aa:2,lip:2,vig:5,na:2,k:0,ca:0,mg:0,p:1,znDose:400,seDose:7,access:'central',naSalt:'nacl',pSalt:'glycero',omit:{va:true,vb:true,oligo:true,zn:true,se:true}};
const hv={...input,doseUnit:'perKgDay',concentrations:{na:1.7,k:1.34,ca:.5,mg:.8}};
const std={...input,mode:'fluid',value:100};
const calculators=[['individual',calculate,input],['hydration',calculateHydration,hv],['standard',calculateStandard,std]];
for(const [source,calc,base] of calculators){
 for(const day of [1,6,7,8])test(`${source}: day ${day} selects institutional weight and propagates it to total intake`,()=>{
  const r=calc({...base,day});assert.equal(r.ok,true,JSON.stringify(r.errors));
  const context=r.weightContext??r.input.weightContext;
  const expected=day<=7?.990:.920;
  assert.equal(context.calculationWeight,expected);assert.equal(context.currentWeight,.920);
  assert.equal(context.birthWeight,.990);assert.equal(context.basis,day<=7?'birth':'current');
  assert.ok(Math.abs(context.changePercent-(-7.07070707070707))<1e-10);
  const volume=source==='standard'?r.volume:r.totals.totalVolume;
  assert.equal(volume,day<=7?99:92);
  const iv=intravenousFromResult(source,r);assert.equal(iv.weight,expected);
  const all=integrateNutrition({source,parenteral:iv,enteral:calculateEnteral({type:'lhop',rate:50})});
  assert.equal(all.weightContext.basis,context.basis);assert.equal(all.weight,expected);
 });
 test(`${source}: missing birth weight blocks through D7; from D8 current weight is sufficient`,()=>{
  for(const day of [1,6,7])for(const birthWeight of [null,'',undefined])assert.equal(calc({...base,day,birthWeight}).ok,false);
  assert.equal(calc({...base,day:8,birthWeight:null}).ok,true);
  assert.equal(calc({...base,day:7,birthWeight:0}).ok,false);
  assert.equal(calc({...base,day:7,weight:0}).ok,false);
 });
}
test('first week uses PN even if current weight exceeds PN; measured gain is retained',()=>{
 const r=resolveDosingWeight({weight:1.02,birthWeight:.99,day:7});assert.equal(r.calculationWeight,.99);assert.ok(r.changePercent>0);
 for(const day of [0,7.5,NaN])assert.equal(resolveDosingWeight({weight:.92,birthWeight:.99,day}).ok,false);
});
test('reported sodium: D7 uses 990 g and D8 uses 920 g without changing measured weight',()=>{
 const early=calculate(input),late=calculate({...input,day:8});
 assert.equal(early.volumes.phosphate,1);assert.equal(late.volumes.phosphate,.9);
 assert.ok(Math.abs(early.effective.na-2/.99)<1e-12);
 assert.ok(Math.abs(late.effective.na-1.8/.92)<1e-12);
 assert.equal(early.sodiumBreakdown.omittedSupplementVolume,undefined);
 assert.ok(late.sodiumBreakdown.omittedSupplementVolume>0);
 assert.equal(early.input.currentWeight,.92);assert.equal(late.input.currentWeight,.92);
});
test('HV: total-day electrolyte quantities remain absolute while per-kg values use PN',()=>{
 const r=calculateHydration({...hv,doseUnit:'totalDay',na:2});
 assert.equal(r.rows[0].amountMeq,2);assert.equal(r.rows[0].perKgDay,2/.99);
});
test('HV: published access validation and peripheral glucose/osmolarity gates survive the weight change',()=>{
 assert.equal(calculateHydration({...hv,access:undefined}).ok,false);
 const highGlucose=calculateHydration({...hv,access:'peripheral',vig:12});
 assert.equal(highGlucose.canPrepare,false);assert.ok(highGlucose.blocks.some(b=>b.includes('12,5%')));
 const highOsm=calculateHydration({...hv,access:'peripheral',vig:7,na:20});
 assert.ok(highOsm.mixture.osmolarity>900);assert.equal(highOsm.canPrepare,false);
 assert.ok(highOsm.blocks.some(b=>b.includes('900 mOsm/L')));
 const central=calculateHydration({...hv,access:'central',vig:12});assert.equal(central.canPrepare,true);
});
