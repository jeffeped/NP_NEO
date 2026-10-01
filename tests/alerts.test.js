import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculate,parseNumber,VERSION} from '../engine.js';
import {nutritionAlerts} from '../alerts.js';

const base={weight:0.8,birthWeight:0.8,fluidPhase:'stable',day:1,gaWeeks:27,gaDays:0,fluid:100,aa:2,lip:2,vig:5,na:0,k:0,ca:0,mg:0,p:0,znDose:400,seDose:2,naSalt:'nacl',pSalt:'glycero',access:'central',omit:{va:true,vb:true,oligo:true,zn:true,se:true}};
// Formula-only fixtures default to D8; explicit day tests retain their day.
const run=changes=>{const r=calculate({...base,day:8,birthWeight:changes.weight<=10?changes.weight:base.weight,...changes});assert.equal(r.ok,true,JSON.stringify(r.errors));return r;};
const alertFor=(r,id)=>r.alerts.find(a=>a.nutrient===id);
const above20=r=>!!alertFor(r,'glucose');

test('oligoelementos: prematuro 36+6 sugere selênio 7, mas aceita edição com aviso',()=>{
  const omit={...base.omit,zn:false,se:false};
  for(const znDose of [400,500]){
    const r=run({weight:1.8,gaWeeks:36,gaDays:6,znDose,seDose:7,omit});
    assert.equal(r.offers.find(o=>o.id==='zn').requested,znDose);
    assert.equal(r.offers.find(o=>o.id==='se').requested,7);
  }
  assert.equal(calculate({...base,gaWeeks:36,gaDays:6,znDose:399,omit}).ok,false);
  assert.equal(calculate({...base,gaWeeks:36,gaDays:6,znDose:501,omit}).ok,false);
  const edited=run({weight:1.8,gaWeeks:36,gaDays:6,znDose:400,seDose:6,omit});
  assert.equal(edited.offers.find(o=>o.id==='se').requested,6);
  assert.ok(edited.notices.some(n=>n.includes('referência para prematuros: 7')));
});
test('oligoelementos: termo 37+0 usa zinco 250 e selênio 2–3',()=>{
  const omit={...base.omit,zn:false,se:false};
  for(const seDose of [2,3]){
    const r=run({weight:3,gaWeeks:37,gaDays:0,znDose:500,seDose,omit});
    assert.equal(r.offers.find(o=>o.id==='zn').requested,250);
    assert.equal(r.offers.find(o=>o.id==='se').requested,seDose);
  }
  assert.equal(calculate({...base,weight:3,gaWeeks:37,seDose:1.9,omit}).ok,false);
  assert.equal(calculate({...base,weight:3,gaWeeks:37,seDose:3.1,omit}).ok,false);
});
test('oligoelementos: tetos absolutos limitam zinco a 5 mg e selênio a 100 mcg',()=>{
  const omit={...base.omit,zn:false,se:false};
  const r=run({weight:20,day:8,gaWeeks:36,gaDays:0,znDose:500,seDose:7,omit});
  assert.equal(r.rows.find(row=>row.id==='zinc').quantity,5000);
  assert.ok(r.rows.find(row=>row.id==='selenium').quantity<=100);
  assert.ok(r.notices.some(n=>n.includes('5 mg/dia')));
});
test('validação: erros grosseiros de entrada impedem cálculo sem restringir doses de eletrólitos',()=>{
  const cases=[
    [{weight:0.001},'weight'],[{weight:0.099},'weight'],[{weight:20.01},'weight'],
    [{birthWeight:0.099},'birthWeight'],[{birthWeight:10.01},'birthWeight'],
    [{gaWeeks:17},'gaWeeks'],[{gaWeeks:46},'gaWeeks'],
    [{day:366},'day'],[{fluid:500.01},'fluid']
  ];
  for(const [changes,field] of cases){const r=calculate({...base,birthWeight:changes.weight??base.weight,...changes});assert.equal(r.ok,false,JSON.stringify(changes));assert.ok(r.errors.some(e=>e.field===field));}
  const boundary=run({weight:20,birthWeight:10,gaWeeks:45,day:365,fluid:500,aa:0,lip:0,vig:0});
  assert.equal(boundary.ok,true);
});

for(const access of ['peripheral','central']) {
  for(const [fluid,expected,name] of [[86.5,false,'abaixo'],[86.4,false,'exatamente'],[86.3,true,'imediatamente acima na precisão do preparo']]) {
    test(`glicose ${name} de 20% · ${access}`,()=>{
      const r=run({weight:.625,birthWeight:.625,fluid,vig:12,access});
      assert.equal(above20(r),expected);
      assert.equal(r.accessBlocked,access==='peripheral'); // Regra antiga de 12,5%.
      assert.equal(r.canExport,access==='central');
      if(expected){assert.equal(alertFor(r,'glucose').level,'caution');assert.equal(alertFor(r,'glucose').blocking,false);assert.match(alertFor(r,'glucose').message,/mesmo em acesso venoso central/);}
      if(fluid===86.4)assert.equal(r.totals.glucosePercent,20);
      if(fluid===86.3)assert.equal(r.totals.glucosePercent.toFixed(1),'20.0');
    });
  }
}
test('glicose: decimal imediatamente acima do limite não é eliminado por tolerância',()=>{
  const input={...base};
  const calculated={volumes:{aa:16,lip:8,glucose:40.00000000000001},effective:{aa:2,lip:2},totalVolume:100,glucosePercent:20.000000000000004};
  assert.equal(nutritionAlerts(input,calculated).find(a=>a.nutrient==='glucose').level,'caution');
});
test('glicose: igualdade decimal real não dispara por ruído binário',()=>{
  const r=run({weight:1,fluid:89.5,vig:35.8/2.88});
  assert.equal(r.volumes.glucose,35.8);
  assert.equal(above20(r),false);
});

for(const weight of [0.8,0.999,1,1.2])for(const day of [1,2,8])for(const aa of [0,2,3,3.5,3.6]) {
  test(`aminoácidos · ${weight} kg · dia ${day} · ${aa} g/kg/dia`,()=>{
    const r=run({weight,day,aa});const a=alertFor(r,'aa');
    const high=aa>3.5 || (weight===0.999&&aa===3.5); // 35,0 mL a 999 g aumenta a oferta efetiva.
    assert.equal(a.level,high?'high':aa===(day===1?2:3)?'info':'caution');
    assert.equal(a.blocking,false);
    // At D1, PN >=1000 g also activates the 80 mL/kg/day fluid ceiling.
    assert.equal(r.canExport,!high&&!(day===1&&weight>=1));
    assert.equal(a.weightKg,weight);assert.equal(a.day,day);
    assert.doesNotMatch(a.message,/Peso atual:|dia de vida:\s*\d+\s*[.;]/);
    assert.match(a.message,day===1?/inicial no 1º dia de vida.*2,0/:/progressão após o 1º dia de vida.*3,0/);
    if(high)assert.ok(r.blocks.some(b=>b.includes('Aminoácidos acima de 3,5')));
  });
}
for(const day of [1,2,8])for(const lip of [0,2,2.1,3,4,4.1]) {
  test(`lipídios · dia ${day} · ${lip} g/kg/dia`,()=>{
    const r=run({day,lip});const a=alertFor(r,'lip');
    assert.equal(a.level,lip>4?'high':lip===(day===1?2:3)?'info':'caution');
    assert.equal(r.canExport,lip<=4);assert.equal(a.blocking,false);
    assert.match(a.message,day===1?/inicial no 1º dia de vida.*2,0/:/progressão após o 1º dia de vida.*3,0/);
    if(lip<=4)assert.doesNotMatch(a.message,/Teto: 4,0|não é uma meta/);
    if(lip===4)assert.doesNotMatch(a.message,/ultrapassa/);
    if(lip>4)assert.match(a.message,/ultrapassa o teto de 4,0/);
  });
}
for(const [field,value] of [['aa',3.5000000000000004],['lip',4.000000000000001]]) {
  test(`${field}: valor solicitado imediatamente acima do teto`,()=>{
    const a=alertFor(run({[field]:value}),field);
    assert.equal(a.level,'high');assert.equal(a.value,value);
    assert.match(a.message,/ultrapassa o teto/);
  });
}
test('arredondamento do volume pode ultrapassar teto lipídico mesmo com solicitação no teto',()=>{
  const r=run({weight:0.999,lip:4});const a=alertFor(r,'lip');
  assert.ok(r.effective.lip>4);assert.equal(a.level,'high');
  assert.equal(r.canExport,false);
  assert.match(a.message,/efetiva após arredondamento dos volumes de preparo/);
});
test('3,5 g/kg/dia exatos em 900 g não disparam teto por erro de ponto flutuante',()=>{
  const r=run({weight:0.9,aa:3.5});assert.equal(r.volumes.aa,31.5);
  assert.notEqual(alertFor(r,'aa').level,'high');
});
for(const [day,ca,p,id,level] of [
  [1,1.4,1,'CAP_EARLY_LOW','caution'],  // 0,7:1
  [1,2,1,null,null],                    // 1,0:1
  [1,2.2,1,'CAP_EARLY_HIGH','caution'],// 1,1:1
  [2,1.4,1,'CAP_LATE_LOW','caution'],   // 0,7:1
  [2,2.4,1,null,null],                  // 1,2:1
  [2,2.6,1,'CAP_LATE_INFO','info'],     // 1,3:1
  [2,2.8,1,'CAP_LATE_HIGH','caution']  // 1,4:1
]) test(`relação molar Ca:P · dia ${day} · ${(ca/2/p).toFixed(1)}:1`,()=>{
  const r=run({weight:1,day,ca,p,fluid:day===1?80:100});
  const a=r.alerts.find(item=>item.nutrient==='ca-p');
  assert.equal(a?.id??null,id);assert.equal(a?.level??null,level);
  if(a){assert.equal(a.blocking,false);assert.equal(r.canExport,true);assert.match(a.message,/relação molar Ca:P/);}
});
test('relação Ca:P não é criada quando cálcio ou fósforo não é ofertado',()=>{
  assert.equal(run({ca:0,p:1}).alerts.some(a=>a.nutrient==='ca-p'),false);
  assert.equal(run({ca:2,p:0}).alerts.some(a=>a.nutrient==='ca-p'),false);
});
test('compatibilidade Ca/P: composição estudada exata não gera alerta',()=>{
  const r=run({weight:1,fluid:100,ca:5,p:2.5,pSalt:'glycero'});
  assert.equal(r.totals.calciumConcentration,50);
  assert.equal(r.totals.phosphorusConcentration,25);
  assert.equal(alertFor(r,'ca-p-compatibility'),undefined);
});
for(const [ca,p,reason] of [[5.05,2.5,'cálcio'],[5,2.6,'fósforo'],[5.05,2.6,'ambos']]) {
  test(`compatibilidade Ca/P: alerta acima da faixa estudada por ${reason}`,()=>{
    const r=run({weight:1,fluid:100,ca,p,pSalt:'glycero'});
    const a=alertFor(r,'ca-p-compatibility');
    assert.equal(a.id,'CAP_CONCENTRATION_STUDIED_RANGE');
    assert.equal(a.level,'caution');assert.equal(a.blocking,false);assert.equal(r.canExport,true);
    assert.match(a.message,/composição estudada.*Confirme a compatibilidade físico-química/);
  });
}
test('compatibilidade Ca/P: valor interno imediatamente acima aparece arredondado para cima',()=>{
  const input={...base,pSalt:'glycero',weight:1,birthWeight:1};
  const calculated={volumes:{glucose:0,aa:0,lip:0},effective:{aa:0,lip:0,ca:5.000000001,p:2.5},totalVolume:100,
    glucosePercent:0,osmolarity:0,calciumConcentration:50.00000001,phosphorusConcentration:25};
  const a=nutritionAlerts(input,calculated).find(x=>x.id==='CAP_CONCENTRATION_STUDIED_RANGE');
  assert.match(a.message,/Ca 50,1 mEq\/L/);
});
test('compatibilidade Ca/P: fosfato inorgânico exige curva específica',()=>{
  const r=run({weight:1,fluid:100,ca:2,p:1,pSalt:'kphos'});
  const a=alertFor(r,'ca-p-compatibility');
  assert.equal(a.id,'CAP_INORGANIC_COMPATIBILITY');
  assert.match(a.message,/fosfato inorgânico.*curva específica/);
  assert.equal(r.canExport,true);
});
test('compatibilidade Ca/P: não alerta sem associação dos dois minerais',()=>{
  assert.equal(alertFor(run({weight:1,fluid:100,ca:5.1,p:0}),'ca-p-compatibility'),undefined);
  assert.equal(alertFor(run({weight:1,fluid:100,ca:0,p:2.6}),'ca-p-compatibility'),undefined);
});
test('vírgula decimal, kg e omissões são preservados',()=>{
  const r=run({weight:'0,8',aa:'2,0',lip:'2,0',vig:'5,0'});
  assert.equal(r.input.weight,0.8);assert.equal(r.volumes.aa,16);assert.equal(r.volumes.lip,8);
  const omitted=run({aa:'',lip:'',vig:'',omit:{...base.omit,aa:true,lip:true,vig:true}});
  assert.equal(omitted.input.aa,0);assert.equal(omitted.effective.vig,0);assert.equal(omitted.canExport,true);
  assert.match(alertFor(omitted,'aa').message,/abaixo da referência/);
});
test('VIG mantém conversão mg/kg/min para glicose 50% em 24 horas',()=>{
  const r=run({weight:1.25,vig:5});
  assert.equal(r.volumes.glucose,18);assert.equal(r.grams.glucose,9);
  assert.equal(r.effective.vig,5);assert.equal(r.offers.find(o=>o.id==='vig').unit,'mg/kg/min');
});
test('VIG: teto 12 estrito na solicitação e na oferta efetiva após arredondar SG 50%',()=>{
  const exact=run({weight:.625,birthWeight:.625,vig:12});
  assert.equal(exact.effective.vig,12);
  assert.equal(exact.canExport,true);
  const requested=run({weight:.625,birthWeight:.625,vig:12.01});
  assert.equal(requested.effective.vig,12);
  assert.equal(requested.canExport,false);
  assert.ok(requested.blocks.some(b=>b.includes('VIG acima de 12')));
  const rounded=run({weight:1,birthWeight:1,vig:12});
  assert.ok(rounded.effective.vig>12);
  assert.equal(rounded.canExport,false);
  assert.ok(rounded.blocks.some(b=>b.includes('VIG acima de 12')));
});
for(const changes of [{weight:0},{weight:-1},{weight:'NaN'},{day:0},{day:1.5},{aa:-2},{aa:Infinity},{lip:'3x'},{vig:'1e309'},{access:'unknown'}]) {
  test(`entrada inválida mantém bloqueio: ${JSON.stringify(changes)}`,()=>assert.equal(calculate({...base,birthWeight:changes.weight??base.weight,...changes}).ok,false));
}
test('limite periférico antigo: 12,5% exatos liberados; acima bloqueia',()=>{
  // Sem aminoácidos, para isolar a regra da glicose da trava de osmolaridade (>900).
  const at=run({weight:1,fluid:100,aa:0,vig:125/14.4,access:'peripheral'});
  const above=run({weight:1,fluid:100,aa:0,vig:125.5/14.4,access:'peripheral'});
  assert.ok(at.totals.osmolarity<900);
  assert.equal(at.totals.glucosePercent,12.5);assert.equal(at.canExport,true);
  assert.equal(above.canExport,false);assert.equal(above20(above),false);
});
test('osmolaridade usa concentrações finais, fósforo elementar e sódio total',()=>{
  const r=run({weight:1,fluid:100,aa:2,lip:0,vig:5,na:3,p:1,pSalt:'glycero'});
  // O sal complementar de sódio arredonda para 0,6 mL: a equação deve usar
  // a oferta efetivamente preparada (3,02 mEq), não a dose solicitada (3,0).
  const expected=20*8+72*7+30.2*2+(10*30.973761998)*0.2-50;
  assert.ok(Math.abs(r.totals.osmolarity-expected)<1e-9);
});
test('sódio: discrimina glicerofosfato e NaCl após arredondamento do preparo',()=>{
  const r=run({weight:1,na:1,p:0.4,pSalt:'glycero',naSalt:'nacl'});
  assert.equal(r.volumes.phosphate,0.4);
  assert.equal(r.volumes.sodium,0.1);
  assert.equal(r.sodiumBreakdown.requested,1);
  assert.equal(r.sodiumBreakdown.phosphate,0.8);
  assert.equal(r.sodiumBreakdown.supplement,0.17);
  assert.ok(Math.abs(r.sodiumBreakdown.actual-0.97)<1e-9);
  assert.equal(r.rows.find(row=>row.id==='nacl').perKg,0.17);
});
test('sódio: registra contribuição mesmo acima da dose ou sem NaCl adicional',()=>{
  const r=run({weight:1,na:0,p:0.4,pSalt:'glycero'});
  assert.equal(r.sodiumBreakdown.phosphate,0.8);
  assert.equal(r.sodiumBreakdown.supplement,0);
  assert.equal(r.sodiumBreakdown.actual,0.8);
  assert.equal(r.adjustments.find(a=>a.id==='na').actual,0.8);
  assert.equal(run({weight:1,na:1,p:0.4,pSalt:'kphos'}).sodiumBreakdown,null);
  assert.equal(run({weight:1,na:1,p:0,pSalt:'glycero'}).sodiumBreakdown,null);
});
test('osmolaridade acima de 900: bloqueia em acesso periférico e só orienta em acesso central',()=>{
  const peripheral=run({weight:1,fluid:100,aa:3,vig:125/14.4,access:'peripheral'});
  assert.ok(peripheral.totals.osmolarity>900);
  assert.equal(peripheral.canExport,false);
  assert.ok(peripheral.blocks.some(b=>/^Osmolaridade estimada de \d+ mOsm\/L, acima de 900 mOsm\/L, em acesso periférico/.test(b)));
  assert.equal(alertFor(peripheral,'osmolarity').level,'caution');
  assert.match(alertFor(peripheral,'osmolarity').message,/900 mOsm\/L.*Acesso periférico selecionado: prescrição e PDF bloqueados/);
  const central=run({weight:1,fluid:100,aa:3,vig:125/14.4,access:'central'});
  assert.equal(alertFor(central,'osmolarity').level,'caution');
  assert.match(alertFor(central,'osmolarity').message,/Mantenha o acesso venoso central selecionado/);
  assert.equal(central.canExport,true);
  assert.equal(central.blocks.some(b=>b.startsWith('Osmolaridade')),false);
});
test('osmolaridade periférica: fronteira em 900 mOsm/L, sem bloqueio no limite',()=>{
  // Sem fósforo e sódio: osm = AA(g/L)×8 + glicose(g/L)×7 − 50. Com AA 20 g/L e
  // glicose 112,5 g/L (VIG 112,5/14,4 em 1 kg, 100 mL/kg): 160 + 787,5 − 50 = 897,5.
  const below=run({weight:1,fluid:100,aa:2,vig:112.5/14.4,access:'peripheral'});
  assert.ok(below.totals.osmolarity<=900);
  assert.equal(below.blocks.some(b=>b.startsWith('Osmolaridade')),false);
  const above=run({weight:1,fluid:100,aa:2,vig:113/14.4,access:'peripheral'});
  assert.ok(above.totals.osmolarity>900);
  assert.equal(above.canExport,false);
  assert.ok(above.blocks.some(b=>b.startsWith('Osmolaridade estimada de 901 mOsm/L')));
});
test('alertas não removem bloqueio por volume inviável',()=>{
  const r=run({fluid:20,aa:4,lip:5});assert.equal(r.canExport,false);
  assert.ok(r.blocks.some(b=>b.includes('Aminoácidos acima de 3,5')));
  assert.ok(r.totals.volumeAdjusted);
});

test('VT menor que os componentes vira cautela e volume efetivo coerente, sem impedir PDF',()=>{
  const r=run({weight:0.8,fluid:50,aa:2,lip:3,vig:6});
  assert.equal(r.canExport,true,r.blocks.join(' | '));
  assert.equal(r.totals.requestedVolume,40);
  assert.equal(r.totals.totalVolume,r.totals.componentsVolume);
  assert.equal(r.volumes.water,0);
  assert.equal(r.totals.fluid,r.totals.totalVolume/0.8);
  assert.ok(r.notices.some(n=>n.includes('Volume total solicitado')));
});
test('taxa hídrica abaixo de 80 avisa sobre glicerofosfato sem impedir PDF',()=>{
  const baseline=run({weight:1,birthWeight:1,fluid:80,ca:1,p:1,pSalt:'kphos'});
  assert.equal(baseline.notices.some(n=>n.includes('abaixo de 80')),false);
  const low=run({weight:1,birthWeight:1,fluid:79.9,ca:1,p:1,pSalt:'kphos'});
  assert.equal(low.canExport,true,low.blocks.join(' | '));
  assert.ok(low.notices.some(n=>n.includes('Considere selecionar glicerofosfato de sódio')));
  const alreadySelected=run({weight:1,birthWeight:1,fluid:79.9,ca:1,p:1,pSalt:'glycero'});
  assert.ok(alreadySelected.notices.some(n=>n.includes('Glicerofosfato de sódio já selecionado')));
  const effectiveLow=run({weight:.999,birthWeight:.999,fluid:80,aa:0,lip:0,vig:0});
  assert.ok(effectiveLow.totals.fluid<80);
  assert.ok(effectiveLow.notices.some(n=>n.includes('abaixo de 80')));
});

test('travas de concentração final e taxa lipídica usam valores efetivos e limites estritos',()=>{
  const aaEqual=run({weight:1,aa:3.2,lip:2,fluid:80});
  assert.equal(aaEqual.totals.aminoAcidPercent,4);
  assert.equal(aaEqual.canExport,true);
  const aaAbove=run({weight:1,aa:3.2,lip:2,fluid:79.9});
  assert.equal(aaAbove.canExport,false);
  assert.ok(aaAbove.blocks.some(b=>b.includes('Concentração final de aminoácidos acima de 4%')));
  const glucoseEqual=run({weight:1,aa:0,lip:0,fluid:100,vig:50/2.88});
  assert.equal(glucoseEqual.totals.glucosePercent,25);
  assert.ok(glucoseEqual.blocks.some(b=>b.includes('VIG acima de 12')));
  assert.ok(!glucoseEqual.blocks.some(b=>b.includes('Concentração final de glicose acima de 25%')));
  const glucoseAbove=run({weight:1,aa:0,lip:0,fluid:100,vig:50.1/2.88});
  assert.equal(glucoseAbove.canExport,false);
  assert.ok(glucoseAbove.blocks.some(b=>b.includes('Concentração final de glicose acima de 25%')));
  const lipidEqual=run({weight:1,aa:2,lip:4,fluid:100});
  assert.equal(lipidEqual.totals.lipidRate,4/24);
  assert.equal(lipidEqual.canExport,true);
  const lipidAbove=run({weight:0.999,aa:2,lip:4,fluid:100});
  assert.equal(lipidAbove.canExport,false);
  assert.ok(lipidAbove.blocks.some(b=>b.includes('Taxa de infusão de lipídios')));
});

const baseline=JSON.parse(readFileSync(new URL('./fixtures/baseline-0.3.5.json',import.meta.url)));
for(const {name,input,expected} of baseline.records.filter(record=>!['volume-insuficiente','volume-traco-zero'].includes(record.name)))test(`regressão 0.3.5: ${name}`,()=>{
  const actual=calculate({...input,birthWeight:input.weight,fluidPhase:'stable'});
  delete actual.weightContext;delete actual.input.currentWeight;delete actual.alerts;delete actual.version;delete actual.sodiumBreakdown;delete actual.fluidReference;delete actual.input.birthWeight;delete actual.input.fluidPhase;delete actual.totals.osmolarity;delete actual.totals.calciumConcentration;delete actual.totals.phosphorusConcentration;delete actual.totals.aminoAcidPercent;delete actual.totals.lipidRate;delete actual.totals.requestedVolume;delete actual.totals.volumeAdjusted;
  const previous=structuredClone(expected);delete actual.blocks;delete actual.canExport;delete previous.blocks;delete previous.canExport;
  assert.deepEqual(actual,previous); // Fórmulas e demais saídas antigas, excluindo as novas decisões de segurança.
});
test('aplicativo e PDF usam VIG e o cache inclui o novo módulo',()=>{
  for(const file of ['engine.js','alerts.js','app.js','index.html','pdf.js'])assert.doesNotMatch(readFileSync(new URL('../'+file,import.meta.url),'utf8'),/\bGIR\b/i);
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.ok(sw.includes(`npp-neo-static-${VERSION}`));assert.ok(sw.includes('./alerts.js'));
  assert.equal(parseNumber('20,0001'),20.0001);
});

test('alertas concisos: osmolaridade e macronutrientes não repetem peso/idade nem teto lipídico quando não ultrapassado',()=>{
 const r=run({weight:1.4,day:14,fluid:100,aa:2,lip:2,vig:8,access:'central'});
 for(const a of r.alerts.filter(x=>['osmolarity','aa','lip'].includes(x.nutrient)))assert.doesNotMatch(a.message,/Peso atual:|dia de vida:\s*\d+\s*[.;]/);
 const lip=alertFor(r,'lip');assert.doesNotMatch(lip.message,/Teto: 4,0|não é uma meta/);
});
