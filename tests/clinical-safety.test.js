import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate} from '../engine.js';
import {calculateStandard} from '../standard.js';
import {PN_SAFETY_NOTES} from '../alerts.js';

const base={weight:1,birthWeight:1,day:8,gaWeeks:30,gaDays:0,fluidPhase:'stable',fluid:100,aa:3,lip:2,vig:5,na:0,k:0,ca:2,mg:0,p:1,naSalt:'nacl',pSalt:'glycero',access:'central',omit:{va:true,vb:true,oligo:true,zn:true,se:true}};
const run=changes=>{const r=calculate({...base,...changes});assert.equal(r.ok,true,JSON.stringify(r.errors));return r;};
const byId=(r,id)=>r.alerts.find(a=>a.id===id);
for(const [urea,expected] of [[0,false],[34,false],[34.1,true],['34,1',true],[1000,true]])test(`ureia ${urea}: apoio sem alterar oferta ou bloqueio`,()=>{
 const before=run({}),r=run({urea});
 assert.equal(Boolean(byId(r,'UREA_HIGH')),expected);
 assert.deepEqual(r.volumes,before.volumes);assert.deepEqual(r.effective,before.effective);assert.deepEqual(r.blocks,before.blocks);assert.equal(r.canExport,true);
 if(expected){const a=byId(r,'UREA_HIGH');assert.equal(a.level,'caution');assert.equal(a.blocking,false);assert.match(a.message,/enteral.*evidência limitada.*não determina redução automática/);assert.match(a.message,/desidratação ou disfunção renal.*energético adequado/);}
});
for(const [triglycerides,id] of [[249.9,null],[250,'TRIGLYCERIDES_BORDERLINE'],[265,'TRIGLYCERIDES_BORDERLINE'],[265.1,'TRIGLYCERIDES_HIGH'],['265,1','TRIGLYCERIDES_HIGH']])test(`TG ${triglycerides}: fronteira sem reduzir lipídios ou bloquear`,()=>{
 const r=run({triglycerides}),a=r.alerts.find(a=>a.nutrient==='triglycerides');
 assert.equal(a?.id??null,id);assert.equal(r.canExport,true);assert.equal(r.effective.lip,2);
 if(a){assert.equal(a.blocking,false);assert.equal(a.level,'caution');assert.match(a.message,/Não há consenso universal/);assert.match(a.message,id==='TRIGLYCERIDES_HIGH'?/evitar progressão.*considerar redução/:/limítrofes.*reavaliar progressão/);}
});
for(const value of [undefined,null,'','  '])test(`exames opcionais ausentes: ${String(value)}`,()=>{
 const r=run({urea:value,triglycerides:value});assert.deepEqual(r.clinicalContext,[]);
 assert.equal(r.input.urea,null);assert.equal(r.input.triglycerides,null);
 assert.equal(r.alerts.some(a=>a.kind==='laboratory'),false);assert.equal(r.canExport,true);
});
for(const value of [-1,Infinity,'NaN','abc','34mg','1e309'])test(`exame inválido ${value}: avisa sem interpretar como normal nem bloquear`,()=>{
 const r=run({urea:value,triglycerides:value});assert.equal(r.canExport,true);
 assert.equal(r.input.urea,null);assert.equal(r.input.triglycerides,null);
 assert.equal(r.notices.filter(n=>n.includes('valor inválido, não interpretado')).length,2);
 assert.equal(r.alerts.some(a=>a.kind==='laboratory'),false);
});
for(const [changes,expected] of [
 [{p:0},true],[{p:.9},true],[{p:1},false],
 [{aa:2.9,p:.9},false],[{aa:3,p:.9},true],
 [{aa:3,p:.9,lip:0,vig:0},false],
 [{aa:3,p:0,ca:0},true],
 [{aa:3,p:1,ca:2.6},false],[{aa:3,p:1,ca:2.8},true],
 [{day:1,fluid:80,p:1,ca:2},false],[{day:1,fluid:80,p:1,ca:2.2},true],
 [{aa:3,p:.9,omit:{...base.omit,aa:true}},false],
 [{aa:3,p:1,omit:{...base.omit,p:true}},true],
 [{aa:2.999,p:.9},true], // AA de preparo arredonda para 3,0.
 [{p:.96,ca:2},false], // P de preparo arredonda para 1,0.
 [{p:1,pSalt:'kphos'},true] // 0,9 mL de fosfato fornece 0,99 mmol.
])test(`triagem anabólica: ${JSON.stringify(changes)}`,()=>{
 const r=run(changes),a=byId(r,'ANABOLIC_HYPOPHOSPHATEMIA');assert.equal(Boolean(a),expected);
 assert.equal(r.canExport,true,r.blocks.join('; '));
 if(a){assert.equal(a.blocking,false);assert.match(a.message,/fósforo, potássio e magnésio séricos/);assert.match(a.message,/Ca:P.*Triagem operacional, sem diagnóstico automático/);}
 if(changes.ca===2.8)assert.ok(byId(r,'CAP_LATE_HIGH'));
});
for(const ceftriaxone of [false,true])for(const ca of [0,2])test(`ceftriaxona ${ceftriaxone}, Ca ${ca}`,()=>{
 const r=run({ceftriaxone,ca}),a=byId(r,'CEFTRIAXONE_CALCIUM');assert.equal(Boolean(a),ceftriaxone&&ca>0);assert.equal(r.canExport,true);
 if(a){assert.equal(a.level,'critical');assert.equal(a.blocking,false);assert.match(a.message,/não devem ser administradas concomitantemente.*linhas de infusão separadas/);}
});
test('cálcio omitido não gera alerta contextual de ceftriaxona',()=>{
 assert.equal(byId(run({ceftriaxone:true,omit:{...base.omit,ca:true}}),'CEFTRIAXONE_CALCIUM'),undefined);
});
for(const access of ['central','peripheral'])for(const [osmolarity,glucose,na] of [[900,22,.68],[900.1,22.1,.51]])test(`osmolaridade ${osmolarity}, via ${access}: motor real sem arredondar decisão`,()=>{
 const r=run({access,aa:2.08,p:0,ca:0,vig:glucose/2.88,na});
 assert.ok(Math.abs(r.totals.osmolarity-osmolarity)<1e-10);
 assert.ok(r.totals.glucosePercent<12.5);
 assert.equal(r.canExport,access==='central'||osmolarity===900);
 assert.equal(r.blocks.some(b=>b.startsWith('Osmolaridade')),access==='peripheral'&&osmolarity>900);
 const a=byId(r,'osmolarity-high');assert.equal(Boolean(a),osmolarity>900);
 if(a)assert.match(a.message,/Esta osmolaridade exige acesso venoso central/);
});
test('notas de segurança estão disponíveis para NP individualizada e padrão',()=>{
 assert.deepEqual(run({}).safetyNotes,PN_SAFETY_NOTES);
 const r=calculateStandard({birthWeight:1,weight:1,day:8,mode:'protein',value:3,access:'central'});
 for(const note of PN_SAFETY_NOTES)assert.ok(r.alerts.includes(note));
 assert.deepEqual(r.blocks,[]);
});
