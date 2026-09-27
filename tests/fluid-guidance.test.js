import test from 'node:test';
import assert from 'node:assert/strict';
import {fluidGuidance} from '../fluid-guidance.js';
import {calculate} from '../engine.js';

// Tabelas 1–3: Jochum et al., Clin Nutr. 2018;37:2344–2353.
for(const [gaWeeks,birthWeight,maxima] of [
  [39,3.2,[60,70,80,100,140]],
  [30,1.6,[80,100,120,140,160]],
  [30,1.0,[90,110,130,150,180]],
  [27,0.999,[100,120,140,160,180]]
])for(let day=1;day<=5;day++)test(`referência hídrica D${day}, IG ${gaWeeks}, PN ${birthWeight}`,()=>{
  assert.equal(fluidGuidance({day,gaWeeks,birthWeight}).max,maxima[day-1]);
});
test('peso de 1500 g pertence à faixa 1000–1500 g; 1501 g passa à faixa acima',()=>{
  assert.equal(fluidGuidance({day:5,gaWeeks:30,birthWeight:1.5}).max,180);
  assert.equal(fluidGuidance({day:5,gaWeeks:30,birthWeight:1.501}).max,160);
});
test('D6–D30 requer fase clínica; termo tem 170/160, prematuro 160/160',()=>{
  assert.throws(()=>fluidGuidance({day:6,gaWeeks:39}),/selecione fase/);
  for(const day of [6,30]){
    assert.equal(fluidGuidance({day,gaWeeks:39,phase:'intermediate'}).max,170);
    assert.equal(fluidGuidance({day,gaWeeks:39,phase:'stable'}).max,160);
    assert.equal(fluidGuidance({day,gaWeeks:30,phase:'intermediate'}).max,160);
    assert.equal(fluidGuidance({day,gaWeeks:30,phase:'stable'}).max,160);
  }
  assert.equal(fluidGuidance({day:31,gaWeeks:30}).max,null);
});

const base={weight:1,birthWeight:0.8,day:1,gaWeeks:27,gaDays:0,fluidPhase:'',fluid:100,aa:2,lip:2,vig:5,na:0,k:0,ca:0,mg:0,p:0,znDose:400,seDose:7,naSalt:'nacl',pSalt:'glycero',access:'central',omit:{va:true,vb:true,oligo:true,zn:true,se:true}};
test('taxa solicitada e efetiva: igualdade permitida, excesso bloqueia mesmo com VT ajustado',()=>{
  const at=calculate(base);assert.equal(at.canExport,true,at.blocks.join(' | '));
  const above=calculate({...base,fluid:100.1});assert.equal(above.canExport,false);
  assert.ok(above.blocks.some(b=>b.includes('Taxa hídrica da NPP acima de 100')));
  const adjusted=calculate({...base,aa:3.5,lip:4,vig:50/2.88});
  assert.equal(adjusted.totals.requestedVolume,100);
  assert.ok(adjusted.totals.totalVolume>100);
  assert.ok(adjusted.notices.some(n=>n.includes('volume efetivo')));
  assert.ok(adjusted.blocks.some(b=>b.includes('Taxa hídrica da NPP acima de 100')));
});
test('após D30, a referência informa a lacuna sem travar por taxa hídrica',()=>{
  const r=calculate({...base,day:31,fluid:180,birthWeight:null});
  assert.equal(r.ok,true);
  assert.equal(r.fluidReference.max,null);
  assert.ok(r.notices.some(n=>n.includes('Após o 30º dia')));
  assert.equal(r.blocks.some(b=>b.includes('Taxa hídrica da NPP')),false);
});
