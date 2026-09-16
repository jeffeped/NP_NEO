import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateHydration,formatHydrationNumber,formatHydrationVolume,HYDRATION_COMPONENTS} from '../hydration.js';
import {CONCENTRATIONS} from '../engine.js';

const base={weight:2,fluid:100,vig:5,doseUnit:'perKgDay',na:1.7,k:1.34,ca:0.5,mg:0.8,concentrations:{na:1.7,k:1.34,ca:0.5,mg:0.8}};
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);

test('HV: exemplo independente das fórmulas confirmadas, incluindo os seis componentes',()=>{
  const r=calculateHydration(base);
  assert.equal(r.ok,true);assert.equal(r.canPrepare,true);
  // 2 kg × 100 = 200 mL. Quatro sais de 2 mL: VR = 192 mL.
  // gG = 5 × 2 × 60 × 24 / 1000 = 14,4 g.
  // SG50 = (14,4 − 192 × 0,05) / 0,45 = 10⅔ mL; SG5 = 181⅓ mL.
  assert.equal(r.totals.totalVolume,200);assert.equal(r.totals.electrolytesVolume,8);
  assert.equal(r.totals.glucoseSolutionsVolume,192);assert.equal(r.totals.glucoseGrams,14.4);
  assert.deepEqual(r.rows.map(row=>row.volume),[2,2,2,2]);
  close(r.mixture.sg50,32/3);close(r.mixture.sg5,544/3);
  assert.equal(r.mixture.vig,5);assert.equal(r.mixture.glucosePercent,7.2);
  close(r.totals.infusion,25/3);
});

test('HV: mEq totais são divididos pelo peso só para informar mEq/kg/dia',()=>{
  const r=calculateHydration({...base,doseUnit:'totalDay',na:3.4,k:2.68,ca:1,mg:1.6});
  assert.deepEqual(r.rows.map(x=>[x.volume,x.perKgDay]),calculateHydration(base).rows.map(x=>[x.volume,x.perKgDay]));
  assert.deepEqual(r.mixture,calculateHydration(base).mixture);
});

test('HV: peso maior não multiplica novamente doses já informadas em mEq totais',()=>{
  const r=calculateHydration({...base,doseUnit:'totalDay',weight:4});
  assert.deepEqual(r.rows.map(x=>x.volume),[1,1,1,1]);assert.equal(r.totals.totalVolume,400);
  assert.equal(r.totals.glucoseGrams,28.8);
});

test('HV: exemplos de conservação de volume, glicose e dose, sem recomendações automáticas',()=>{
  for(const weight of [0.55,0.999,1,1.2,3.71]){
    const r=calculateHydration({...base,weight});
    assert.equal(r.canPrepare,true);
    close(r.rows.reduce((sum,x)=>sum+x.volume,0)+r.mixture.sg5+r.mixture.sg50,r.totals.totalVolume);
    close(r.mixture.sg5*0.05+r.mixture.sg50*0.5,5*weight*60*24/1000);
    close((r.mixture.sg5*50+r.mixture.sg50*500)/(weight*1440),5);
    for(const row of r.rows)close(row.volume*row.concentration/weight,base[row.id]);
  }
});

test('HV: VT não sofre arredondamento de preparo',()=>{
  const r=calculateHydration({...base,weight:'0,999',fluid:'100,1'});
  assert.equal(r.totals.totalVolume,99.9999);assert.equal(r.input.weight,0.999);
});

test('HV: fronteiras exatas de SG5 e SG50 são possíveis; ultrapassagem mínima é rejeitada',()=>{
  const noSalts={...base,weight:1,fluid:144,na:0,k:0,ca:0,mg:0};
  const low=calculateHydration({...noSalts,vig:5});
  assert.equal(low.canPrepare,true);assert.equal(low.mixture.sg50,0);assert.equal(low.mixture.sg5,144);
  const high=calculateHydration({...noSalts,vig:50});
  assert.equal(high.canPrepare,true);assert.equal(high.mixture.sg50,144);assert.equal(high.mixture.sg5,0);
  for(const vig of [4.999999999999999,50.00000000000001]){
    const r=calculateHydration({...noSalts,vig});
    assert.equal(r.canPrepare,false);assert.equal(r.mixture,null);assert.match(r.blocks.join(' '),/faixa matematicamente possível/);
  }
});

test('HV: SG5 residual é descontado antes de calcular glicose concentrada',()=>{
  const r=calculateHydration({...base,weight:1,fluid:100,na:0,k:0,ca:0,mg:0});
  assert.equal(r.totals.glucoseGrams,7.2);
  close(r.mixture.sg50,44/9); // não 7,2/0,5 = 14,4 mL
  close(r.mixture.sg5,856/9);
});

for(const na of [170,170.00000000000003,180])test(`HV: eletrólitos ocupando todo VT ou acima (${na} mEq) não geram composição`,()=>{
  const r=calculateHydration({...base,weight:1,doseUnit:'totalDay',na,k:0,ca:0,mg:0});
  assert.equal(r.canPrepare,false);assert.equal(r.mixture,null);assert.match(r.blocks.join(' '),/Não há volume disponível/);
  assert.equal(r.totals.glucoseGrams,7.2);
});

test('HV: VIG zero não pode ser obtida com SG5/SG50 e VR positivo',()=>{
  const r=calculateHydration({...base,vig:0});assert.equal(r.ok,true);assert.equal(r.canPrepare,false);assert.equal(r.totals.glucoseGrams,0);
});

test('HV: equivalência informada do rótulo muda volume, sem alterar dose prescrita nem o cadastro da NP',()=>{
  const original={...CONCENTRATIONS};
  const r=calculateHydration({...base,concentrations:{...base.concentrations,ca:0.465}});
  close(r.rows.find(x=>x.id==='ca').volume,1/0.465);
  assert.equal(r.rows.find(x=>x.id==='ca').amountMeq,1);
  close(r.rows.find(x=>x.id==='ca').perKgDay,0.5);
  assert.deepEqual(CONCENTRATIONS,original);
});

test('HV: cadastro inicial preserva as equivalências existentes',()=>{
  assert.deepEqual(HYDRATION_COMPONENTS.map(c=>c.concentration),[1.7,1.34,0.5,0.8]);
});

for(const [field,values] of Object.entries({weight:['',0,-1,NaN,Infinity,'abc','1e3',1e13],fluid:['',0,-1],vig:['',-1],na:['',-1],k:['',-1],ca:['',-1],mg:['',-1],doseUnit:['','mEq']})){
  for(const value of values)test(`HV: rejeita entrada inválida ${field}=${String(value)}`,()=>{
    const r=calculateHydration({...base,[field]:value});assert.equal(r.ok,false);assert.ok(r.errors.some(e=>e.field===field));
  });
}

for(const value of ['',0,-1,NaN,Infinity,1e13])test(`HV: rejeita equivalência inválida ${String(value)}`,()=>{
  const r=calculateHydration({...base,concentrations:{...base.concentrations,ca:value}});assert.equal(r.ok,false);assert.ok(r.errors.some(e=>e.field==='concentration-ca'));
});
test('HV: equivalência não pode ser omitida silenciosamente',()=>{
  const r=calculateHydration({...base,concentrations:{}});assert.equal(r.ok,false);assert.equal(r.errors.length,4);
});
test('HV: capacidade numérica impede volumes irrepresentáveis',()=>{
  assert.equal(calculateHydration({...base,weight:1e12,fluid:1e12}).ok,false);
  assert.equal(calculateHydration({...base,concentrations:{...base.concentrations,ca:Number.MIN_VALUE}}).ok,false);
});
test('HV: exibição nunca converte um volume pequeno positivo em zero',()=>{
  assert.notEqual(formatHydrationNumber(0.000001),'0');assert.equal(formatHydrationNumber(14.4),'14,4');
});
test('HV: volumes usam uma casa decimal com teto sem elevar décimos exatos',()=>{
  assert.equal(formatHydrationVolume(1.20),'1,2');
  assert.equal(formatHydrationVolume(1.21),'1,3');
  assert.equal(formatHydrationVolume(0.1+0.2),'0,3');
  assert.equal(formatHydrationVolume(200),'200,0');
  assert.equal(formatHydrationVolume(0.000001),'0,1');
});
test('HV: dois novos módulos integram o cache offline',()=>{
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');assert.match(sw,/\.\/hydration\.js/);assert.match(sw,/\.\/hydration-ui\.js/);
});
