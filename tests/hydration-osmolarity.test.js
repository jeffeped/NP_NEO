import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHydration} from '../hydration.js';
import {createHydrationReport} from '../hydration-pdf.js';
const base={weight:1,fluid:144,vig:5,na:0,k:0,ca:0,mg:0,doseUnit:'totalDay',concentrations:{na:1.7,k:1.34,ca:0.5,mg:0.8}};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('HV osmolarity: pure SG5 and pure SG50 reproduce their product labels',()=>{
  near(calculateHydration(base).mixture.osmolarity,252.3);
  near(calculateHydration({...base,vig:50}).mixture.osmolarity,2775);
});
test('HV osmolarity: all four salts use particle count and divalent conversion',()=>{
  // Every solution has 1 mEq/mL. 1 mL of each salt + 40 mL SG5
  // + 100 mL SG50 = 144 mL; glucose = 52 g; total particles
  // = 10.092 + 277.5 + 2 + 2 + 1.5 + 1 = 294.092 mOsm.
  const r=calculateHydration({...base,vig:52/1.44,na:1,k:1,ca:1,mg:1,concentrations:{na:1,k:1,ca:1,mg:1}});
  near(r.mixture.osmolarity,294.092/0.144);
});
test('HV osmolarity: label override changes osmolarity but preserves volumes and glucose',()=>{
  const a=calculateHydration({...base,vig:10});
  const b=calculateHydration({...base,vig:10,glucoseOsmolarity:{sg5:278,sg50:2525}});
  near(a.mixture.sg50,b.mixture.sg50);near(a.mixture.glucoseGrams,b.mixture.glucoseGrams);
  near(b.mixture.osmolarity,(b.mixture.sg5*278+b.mixture.sg50*2525)/144);
  assert.notEqual(a.mixture.osmolarity,b.mixture.osmolarity);
});
test('HV osmolarity: total and per-kg modes agree; weight is applied only once',()=>{
  const a=calculateHydration({...base,weight:2,na:2,k:2,ca:2,mg:2});
  const b=calculateHydration({...base,weight:2,na:1,k:1,ca:1,mg:1,doseUnit:'perKgDay'});
  near(a.mixture.osmolarity,b.mixture.osmolarity);
});
for(const value of ['',0,-1,'NaN',Infinity])test(`HV osmolarity: rejects invalid label ${value}`,()=>{
  assert.equal(calculateHydration({...base,glucoseOsmolarity:{sg5:value,sg50:2775}}).ok,false);
});
test('HV: impossible mixture has no osmolarity and cannot export',async()=>{
  const r=calculateHydration({...base,vig:0});assert.equal(r.mixture,null);
  await assert.rejects(createHydrationReport(r),/not exportable/);
});
