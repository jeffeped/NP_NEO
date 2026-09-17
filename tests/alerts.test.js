import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculate,parseNumber,VERSION} from '../engine.js';
import {nutritionAlerts} from '../alerts.js';

const base={weight:0.8,day:1,gaWeeks:27,gaDays:0,fluid:200,aa:2,lip:2,vig:5,na:0,k:0,ca:0,mg:0,p:0,seDose:6,naSalt:'nacl',pSalt:'glycero',access:'central',omit:{va:true,vb:true,oligo:true,zn:true,se:true}};
const run=changes=>{const r=calculate({...base,...changes});assert.equal(r.ok,true);return r;};
const alertFor=(r,id)=>r.alerts.find(a=>a.nutrient===id);
const above20=r=>!!alertFor(r,'glucose');

for(const access of ['peripheral','central']) {
  for(const [fluid,expected,name] of [[90.1,false,'abaixo'],[90,false,'exatamente'],[89.9,true,'imediatamente acima na precisão do preparo']]) {
    test(`glicose ${name} de 20% · ${access}`,()=>{
      const r=run({weight:1,fluid,vig:12.5,access});
      assert.equal(above20(r),expected);
      assert.equal(r.accessBlocked,access==='peripheral'); // Regra antiga de 12,5%.
      assert.equal(r.canExport,access==='central');
      if(expected){assert.equal(alertFor(r,'glucose').level,'caution');assert.equal(alertFor(r,'glucose').blocking,false);assert.match(alertFor(r,'glucose').message,/mesmo em acesso venoso central/);}
      if(fluid===90)assert.equal(r.totals.glucosePercent,20);
      if(fluid===89.9)assert.equal(r.totals.glucosePercent.toFixed(1),'20.0');
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
    const high=weight<1&&(aa>3.5 || (weight===0.999&&aa===3.5)); // 35,0 mL a 999 g aumenta a oferta efetiva.
    assert.equal(a.level,high?'high':aa===(day===1?2:3)?'info':'caution');
    assert.equal(a.blocking,false);assert.equal(r.canExport,true);
    assert.equal(a.weightKg,weight);assert.equal(a.day,day);
    assert.match(a.message,/dose solicitada/);assert.match(a.message,/dose efetiva calculada/);
    assert.match(a.message,day===1?/Referência inicial.*2,0/:/Referência de progressão.*3,0/);
    if(weight>=1){assert.doesNotMatch(a.message,/teto de 3,5|Teto: 3,5/);assert.match(a.message,/não foi definido um teto máximo/);}
  });
}
for(const day of [1,2,8])for(const lip of [0,2,2.1,3,4,4.1]) {
  test(`lipídios · dia ${day} · ${lip} g/kg/dia`,()=>{
    const r=run({day,lip});const a=alertFor(r,'lip');
    assert.equal(a.level,lip>4?'high':lip===(day===1?2:3)?'info':'caution');
    assert.equal(r.canExport,true);assert.equal(a.blocking,false);
    assert.match(a.message,day===1?/Referência inicial.*2,0/:/Referência de progressão.*3,0/);
    if(lip===4)assert.doesNotMatch(a.message,/ultrapassa/);
    if(lip>4)assert.match(a.message,/ultrapassa o teto de 4,0/);
  });
}
for(const [field,value] of [['aa',3.5000000000000004],['lip',4.000000000000001]]) {
  test(`${field}: valor solicitado imediatamente acima do teto`,()=>{
    const a=alertFor(run({[field]:value}),field);
    assert.equal(a.level,'high');assert.equal(a.value,value);
    assert.match(a.message,/dose solicitada.*ultrapassa/);
  });
}
test('arredondamento do volume pode ultrapassar teto lipídico mesmo com solicitação no teto',()=>{
  const r=run({weight:0.999,lip:4});const a=alertFor(r,'lip');
  assert.ok(r.effective.lip>4);assert.equal(a.level,'high');
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
  const r=run({weight:1,day,ca,p});
  const a=r.alerts.find(item=>item.nutrient==='ca-p');
  assert.equal(a?.id??null,id);assert.equal(a?.level??null,level);
  if(a){assert.equal(a.blocking,false);assert.equal(r.canExport,true);assert.match(a.message,/relação molar Ca:P/);}
});
test('relação Ca:P não é criada quando cálcio ou fósforo não é ofertado',()=>{
  assert.equal(run({ca:0,p:1}).alerts.some(a=>a.nutrient==='ca-p'),false);
  assert.equal(run({ca:2,p:0}).alerts.some(a=>a.nutrient==='ca-p'),false);
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
for(const changes of [{weight:0},{weight:-1},{weight:'NaN'},{day:0},{day:1.5},{aa:-2},{aa:Infinity},{lip:'3x'},{vig:'1e309'},{access:'unknown'}]) {
  test(`entrada inválida mantém bloqueio: ${JSON.stringify(changes)}`,()=>assert.equal(calculate({...base,...changes}).ok,false));
}
test('limite periférico antigo: 12,5% exatos liberados; acima bloqueia',()=>{
  const at=run({weight:1,fluid:100,vig:125/14.4,access:'peripheral'});
  const above=run({weight:1,fluid:100,vig:125.5/14.4,access:'peripheral'});
  assert.equal(at.totals.glucosePercent,12.5);assert.equal(at.canExport,true);
  assert.equal(above.canExport,false);assert.equal(above20(above),false);
});
test('alertas não removem bloqueio por volume inviável',()=>{
  const r=run({fluid:20,aa:4,lip:5});assert.equal(r.canExport,false);
  assert.ok(r.blocks.some(b=>b.includes('ultrapassam o volume total')));
});

const baseline=JSON.parse(readFileSync(new URL('./fixtures/baseline-0.1.2.json',import.meta.url)));
for(const {name,input,expected} of baseline.records)test(`regressão 0.1.2: ${name}`,()=>{
  const actual=calculate(input);delete actual.alerts;delete actual.version;
  assert.deepEqual(actual,expected); // Todas as saídas antigas, não só um total.
});
test('aplicativo e PDF usam VIG e o cache inclui o novo módulo',()=>{
  for(const file of ['engine.js','alerts.js','app.js','index.html','pdf.js'])assert.doesNotMatch(readFileSync(new URL('../'+file,import.meta.url),'utf8'),/\bGIR\b/i);
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.ok(sw.includes(`npp-neo-static-${VERSION}`));assert.ok(sw.includes('./alerts.js'));
  assert.equal(parseNumber('20,0001'),20.0001);
});
