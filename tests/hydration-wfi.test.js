import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHydration} from '../hydration.js';
import {intravenousFromResult} from '../enteral.js';
import {createHydrationReport,createHydrationReviewReport} from '../hydration-pdf.js';
const base={access:'central',day:8,weight:2,fluid:100,vig:2,na:4,k:2,ca:1,mg:0.2,doseUnit:'perKgDay',concentrations:{na:1.7,k:1.34,ca:0.5,mg:0.8},allowWfiReview:true};
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const noSalts={...base,weight:1,fluid:144,na:0,k:0,ca:0,mg:0};

test('WFI: synthetic 2kg example conserves mass, volume and all electrolyte doses',()=>{
 const r=calculateHydration(base);assert.equal(r.ok,true);assert.equal(r.canPrepare,false);assert.equal(r.canReview,true);assert.equal(r.reviewRequired,true);
 near(r.totals.electrolytesVolume,12.190956979806848);near(r.mixture.sg5,115.2);assert.equal(r.mixture.sg50,0);near(r.mixture.water,72.60904302019315);
 near(r.totals.totalVolume,200);near(r.mixture.glucoseGrams,5.76);near(r.mixture.glucosePercent,2.88);near(r.mixture.vig,2);
 near(r.mixture.sodiumMmolL,40);near(r.mixture.potassiumMmolL,20);near(r.mixture.osmolarity,282.3248);
 near(r.rows.reduce((s,x)=>s+x.volume,0)+r.mixture.sg5+r.mixture.sg50+r.mixture.water,200);
 for(const row of r.rows)near(row.volume*row.concentration,base[row.id]*2);
 assert.match(r.warnings.join(' '),/tonicidade ou compatibilidade/);
});
test('WFI: explicit opt-in preserves the legacy blocked result and rejects truthy strings',()=>{
 for(const allowWfiReview of [undefined,false]){const r=calculateHydration({...base,allowWfiReview});assert.equal(r.mixture,null);assert.equal(r.canPrepare,false);assert.equal(r.canReview,false);}
 for(const allowWfiReview of ['true','false',1,null])assert.equal(calculateHydration({...base,allowWfiReview}).ok,false);
});
test('WFI: SG5 exact lower boundary and immediate neighbors select the correct branch',()=>{
 const below=calculateHydration({...noSalts,vig:4.999999999999999}),at=calculateHydration({...noSalts,vig:5}),above=calculateHydration({...noSalts,vig:5.000000000000001});
 assert.ok(below.mixture.water>0);assert.equal(below.mixture.sg50,0);assert.equal(below.canPrepare,false);assert.equal(below.canReview,true);
 assert.equal(at.mixture.water,0);assert.equal(at.mixture.sg5,144);assert.equal(at.mixture.sg50,0);assert.equal(at.canPrepare,true);assert.equal(at.canReview,false);
 assert.equal(above.mixture.water,0);assert.ok(above.mixture.sg50>0);assert.equal(above.canPrepare,true);
});
test('WFI: SG50 exact upper boundary passes arithmetic; any excess stays blocked',()=>{
 const at=calculateHydration({...noSalts,vig:50}),above=calculateHydration({...noSalts,vig:50.00000000000001});
 assert.equal(at.mixture.water,0);assert.equal(at.mixture.sg50,144);assert.equal(at.mixture.sg5,0);
 assert.equal(above.mixture,null);assert.equal(above.canReview,false);assert.equal(above.canPrepare,false);
});
test('WFI: never expose a water-only composition or export',async()=>{
 const r=calculateHydration({...noSalts,vig:0});assert.equal(r.mixture,null);assert.equal(r.canReview,false);assert.equal(r.canPrepare,false);assert.match(r.blocks.join(' '),/isolada.*bloqueada/);
 await assert.rejects(createHydrationReport(r),/not exportable/);await assert.rejects(createHydrationReviewReport(r,{acknowledged:true}),/not exportable/);
});
test('WFI: zero glucose with solute stays blocked until prescriber confirmation',()=>{
 const r=calculateHydration({...base,vig:0});assert.equal(r.mixture.sg5,0);assert.equal(r.mixture.sg50,0);near(r.mixture.water,r.totals.glucoseSolutionsVolume);assert.equal(r.canReview,true);assert.equal(r.canPrepare,false);
});
test('WFI: electrolytes consuming all volume or more remain impossible',()=>{
 for(const na of [170,171]){const r=calculateHydration({...noSalts,fluid:100,na,doseUnit:'totalDay'});assert.equal(r.mixture,null);assert.equal(r.canReview,false);assert.equal(r.canPrepare,false);}
});
test('WFI: label changes alone do not unlock clinical use without confirmation',()=>{
 for(const sg5 of [150,200,250,275,280,300,900,1000]){const r=calculateHydration({...base,glucoseOsmolarity:{sg5,sg50:2775}});assert.equal(r.canPrepare,false);assert.equal(r.canReview,true);near(r.mixture.water,72.60904302019315);}
});
test('WFI: >900 peripheral gate blocks review PDF too; central still needs confirmation',async()=>{
 const high={...base,na:50};
 const p=calculateHydration({...high,access:'peripheral'});assert.ok(p.mixture.osmolarity>900);assert.ok(p.mixture.water>0);assert.equal(p.canReview,false);assert.equal(p.canPrepare,false);
 assert.match(p.blocks.join(' '),/acima de 900/);await assert.rejects(createHydrationReviewReport(p,{acknowledged:true}),/not exportable/);
 const c=calculateHydration(high);assert.equal(c.canReview,true);assert.equal(c.canPrepare,false);
});
test('WFI: existing peripheral glucose ceiling is unchanged when option selected',()=>{
 const at=calculateHydration({...noSalts,access:'peripheral',vig:5,fluid:57.6}),above=calculateHydration({...noSalts,access:'peripheral',vig:5,fluid:57.5});
 assert.equal(at.canPrepare,true);assert.equal(above.canPrepare,false);assert.equal(above.canReview,false);assert.match(above.blocks.join(' '),/acima de 12,5%/);
});
test('WFI: requested per-kg and total-day formulations are equivalent',()=>{
 const a=calculateHydration(base),b=calculateHydration({...base,doseUnit:'totalDay',na:8,k:4,ca:2,mg:0.4});assert.deepEqual(a.mixture,b.mixture);assert.deepEqual(a.rows.map(x=>x.volume),b.rows.map(x=>x.volume));
});
test('WFI: birth-weight D1-D7/current-weight D8 policy retained',()=>{
 for(const day of [1,7,8]){const r=calculateHydration({...base,day,birthWeight:2.5});assert.equal(r.input.weight,day<8?2.5:2);near(r.totals.totalVolume,(day<8?2.5:2)*100);near(r.mixture.vig,2);}
 assert.equal(calculateHydration({...base,day:7}).ok,false);
});
test('WFI: unconfirmed clinical PDF and IV-to-enteral integration remain blocked, including forged canPrepare',async()=>{
 const r=calculateHydration(base);assert.throws(()=>intravenousFromResult('hydration',r),/impedimentos/);await assert.rejects(createHydrationReport(r),/not exportable/);
 await assert.rejects(createHydrationReport({...r,canPrepare:true}),/not exportable/);
 await assert.rejects(createHydrationReviewReport(r),/not exportable/);await assert.rejects(createHydrationReviewReport(r,{acknowledged:'true'}),/not exportable/);
});
test('WFI: invalid clinical inputs stay invalid',()=>{
 for(const [key,value] of [['weight',0],['fluid',0],['vig',-1],['na',-1],['ca',''],['day',0],['access',''],['doseUnit','']])assert.equal(calculateHydration({...base,[key]:value}).ok,false);
 assert.equal(calculateHydration({...base,glucoseOsmolarity:{sg5:0,sg50:2775}}).ok,false);
});
test('WFI: 480 deterministic combinations conserve glucose, electrolyte doses and volume',()=>{
 for(const weight of [.1,.4,.8,1,2,4])for(const fluid of [40,60,100,144])for(const vig of [0,.01,.5,1,2,4,5,10,20,50])for(const doseUnit of ['perKgDay','totalDay']){
  const r=calculateHydration({...base,weight,fluid,vig,doseUnit});if(!r.mixture)continue;
  const m=r.mixture;assert.ok(m.sg5>=0&&m.sg50>=0&&m.water>=0);assert.ok(!(m.water>0&&m.sg50>0));
  near(r.rows.reduce((s,x)=>s+x.volume,0)+m.sg5+m.sg50+m.water,r.totals.totalVolume);near(.05*m.sg5+.5*m.sg50,vig*weight*1.44);near(m.vig,vig);
  for(const row of r.rows)near(row.volume*row.concentration,base[row.id]*(doseUnit==='perKgDay'?weight:1));
  if(m.water>0){assert.equal(r.canPrepare,false);assert.equal(r.reviewRequired,true);}
 }
});


test('WFI: explicit prescriber review allows clinical output and integration only for feasible mixtures',()=>{
 const r=calculateHydration({...base,wfiClinicalReviewAcknowledged:true});assert.equal(r.canPrepare,true);assert.equal(r.clinicalReviewAcknowledged,true);assert.deepEqual(r.blocks,[]);assert.match(r.warnings.join(' '),/nunca para infusão isolada/);
 const iv=intravenousFromResult('hydration',r);near(iv.fluid,100);near(iv.calories,11.52);near(iv.protein,0);
});
test('WFI: confirmation is a strict boolean and never lifts water-only, impossible or access blocks',()=>{
 for(const value of [undefined,false]){const r=calculateHydration({...base,wfiClinicalReviewAcknowledged:value});assert.equal(r.canPrepare,false);assert.equal(r.clinicalReviewAcknowledged,false);}
 for(const value of ['true','false',1,null])assert.equal(calculateHydration({...base,wfiClinicalReviewAcknowledged:value}).ok,false);
 for(const changes of [{...noSalts,vig:0},{...noSalts,vig:51},{...base,na:50,access:'peripheral'}]){const r=calculateHydration({...changes,wfiClinicalReviewAcknowledged:true});assert.equal(r.canPrepare,false);assert.throws(()=>intravenousFromResult('hydration',r),/impedimentos/);}
});
test('WFI: no numerical lower osmolarity cutoff is substituted for prescriber review',()=>{
 const r=calculateHydration({...noSalts,vig:.01,wfiClinicalReviewAcknowledged:true});assert.ok(r.mixture.osmolarity<1);assert.equal(r.canPrepare,true);assert.match(r.warnings.join(' '),/não comprova tonicidade/);
 // This is a gate test with intentionally extreme synthetic values, not a safe clinical example.
});
