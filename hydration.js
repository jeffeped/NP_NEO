import {CONCENTRATIONS,parseNumber} from './engine.js';

export const HYDRATION_COMPONENTS = Object.freeze([
  Object.freeze({id:'na',name:'Sódio',solution:'NaCl 10%',concentration:CONCENTRATIONS.nacl}),
  Object.freeze({id:'k',name:'Potássio',solution:'KCl 10%',concentration:CONCENTRATIONS.kcl}),
  Object.freeze({id:'ca',name:'Cálcio',solution:'Gluconato de cálcio 10%',concentration:CONCENTRATIONS.calcium}),
  Object.freeze({id:'mg',name:'Magnésio',solution:'Sulfato de magnésio 10%',concentration:CONCENTRATIONS.magnesium})
]);

// Aritmética racional decimal para conferir a viabilidade antes da exibição.
// Não arredonda o VT, nem transforma uma mistura inviável em viável.
const gcd=(a,b)=>{a=a<0n?-a:a;while(b){[a,b]=[b,a%b];}return a||1n;};
const ratio=(a,b=1n)=>{if(b<0n){a=-a;b=-b;}const g=gcd(a,b);return {a:a/g,b:b/g};};
const add=(x,y)=>ratio(x.a*y.b+y.a*x.b,x.b*y.b);
const sub=(x,y)=>ratio(x.a*y.b-y.a*x.b,x.b*y.b);
const mul=(x,y)=>ratio(x.a*y.a,x.b*y.b);
const div=(x,y)=>ratio(x.a*y.b,x.b*y.a);
const num=x=>{
  const direct=Number(x.a)/Number(x.b);
  if(Number.isFinite(direct)&&(direct!==0||x.a===0n))return direct;
  const a=(x.a<0n?-x.a:x.a).toString(),b=x.b.toString();
  const leadingA=a.slice(0,17),leadingB=b.slice(0,17);
  return (x.a<0n?-1:1)*Number(`${Number(leadingA)/Number(leadingB)}e${a.length-leadingA.length-b.length+leadingB.length}`);
};
function decimal(value){
  const [mantissa,exponent='0']=String(value).toLowerCase().split('e');
  const [whole,fraction='']=mantissa.split('.');
  const power=Number(exponent)-fraction.length;
  return power>=0?ratio(BigInt(whole+fraction)*10n**BigInt(power)):ratio(BigInt(whole+fraction),10n**BigInt(-power));
}

export function formatHydrationNumber(value){
  if(!Number.isFinite(value))return '—';
  const displayed=Number(value.toFixed(4));
  return (value!==0&&displayed===0?String(value):String(displayed)).replace('.',',');
}

export function formatHydrationVolume(value){
  if(!Number.isFinite(value))return '—';
  const scaled=value*10;
  // Remove somente o ruído binário junto a um décimo exato antes do teto.
  const tolerance=Number.EPSILON*Math.max(1,Math.abs(scaled))*4;
  const displayed=Math.ceil(scaled-tolerance)/10;
  return displayed.toFixed(1).replace('.',',');
}

export function calculateHydration(input){
  const errors=[],n={},concentrations={};
  const labels={weight:'Peso atual',fluid:'Taxa hídrica',vig:'VIG',na:'Sódio',k:'Potássio',ca:'Cálcio',mg:'Magnésio'};
  for(const field of Object.keys(labels)){
    n[field]=parseNumber(input[field]);
    if(!Number.isFinite(n[field])||n[field]<0||n[field]>1e12)errors.push({field,message:`${labels[field]}: informe um número válido, maior ou igual a zero, dentro da capacidade numérica do cálculo.`});
  }
  for(const field of ['weight','fluid'])if(n[field]===0)errors.push({field,message:`${labels[field]} deve ser maior que zero.`});
  if(!['perKgDay','totalDay'].includes(input.doseUnit))errors.push({field:'doseUnit',message:'Selecione a unidade dos eletrólitos: mEq/kg/dia ou mEq totais em 24 horas.'});
  for(const c of HYDRATION_COMPONENTS){
    concentrations[c.id]=parseNumber(input.concentrations?.[c.id]);
    if(!Number.isFinite(concentrations[c.id])||concentrations[c.id]<=0||concentrations[c.id]>1e12)errors.push({field:`concentration-${c.id}`,message:`${c.solution}: informe a equivalência do rótulo em mEq/mL, maior que zero.`});
  }
  if(errors.length)return {ok:false,errors};

  const zero=ratio(0n),weight=decimal(n.weight),total=mul(weight,decimal(n.fluid));
  const minutes=ratio(60n*24n),sg5Concentration=ratio(50n),sg50Concentration=ratio(500n);
  // Fórmula confirmada: glicose (g/24 h) = VIG × peso (kg) × 60 × 24 / 1000.
  const glucose=mul(mul(decimal(n.vig),weight),minutes);
  let electrolytesVolume=zero;
  const rows=HYDRATION_COMPONENTS.map(c=>{
    const amount=input.doseUnit==='perKgDay'?mul(decimal(n[c.id]),weight):decimal(n[c.id]);
    const volume=div(amount,decimal(concentrations[c.id]));
    electrolytesVolume=add(electrolytesVolume,volume);
    return {id:c.id,name:c.name,solution:c.solution,requested:n[c.id],amountMeq:num(amount),perKgDay:num(div(amount,weight)),concentration:concentrations[c.id],volume:num(volume)};
  });
  const available=sub(total,electrolytesVolume);
  // VR = VT − soma dos volumes dos eletrólitos.
  const blocks=[];
  if(available.a<=0n)blocks.push(`Os eletrólitos ocupam ${formatHydrationVolume(num(electrolytesVolume))} mL e o VT é ${formatHydrationVolume(num(total))} mL. Não há volume disponível para as soluções glicosadas; reveja os parâmetros.`);
  const minimum=mul(available,sg5Concentration),maximum=mul(available,sg50Concentration);
  const vigRange=available.a>0n?{min:num(div(minimum,mul(weight,minutes))),max:num(div(maximum,mul(weight,minutes)))}:null;
  if(available.a>0n&&(sub(glucose,minimum).a<0n||sub(glucose,maximum).a>0n)){
    const relation=sub(glucose,minimum).a<0n?'abaixo':'acima';
    blocks.push(`A VIG informada (${formatHydrationNumber(n.vig)} mg/kg/min) fica ${relation} da faixa matematicamente possível com SG 5% e SG 50% neste volume: ${formatHydrationNumber(vigRange.min)} a ${formatHydrationNumber(vigRange.max)} mg/kg/min. Reveja a VIG, a taxa hídrica ou os eletrólitos. Essa faixa não é uma recomendação clínica.`);
  }
  const totalVolume=num(total);
  if(!Number.isFinite(totalVolume)||totalVolume<=0||totalVolume>Number.MAX_SAFE_INTEGER||rows.some(r=>!Number.isFinite(r.volume)||!Number.isFinite(r.amountMeq)||!Number.isFinite(r.perKgDay))||!Number.isFinite(num(glucose)))return {ok:false,errors:[{field:'weight',message:'Os parâmetros ultrapassam a capacidade numérica do cálculo. Revise os valores.'}]};
  // SG 50% (mL) = [gG − (VR × 0,05)] / 0,45.
  // A expressão equivalente em mg abaixo usa 50 e 500 mg/mL.
  const sg50=blocks.length?null:div(sub(glucose,minimum),sub(sg50Concentration,sg5Concentration));
  const sg5=sg50===null?null:sub(available,sg50);
  const mixture=sg50===null?null:{sg5:num(sg5),sg50:num(sg50),glucoseGrams:num(div(glucose,ratio(1000n))),glucosePercent:num(div(glucose,mul(total,ratio(10n)))),vig:num(div(add(mul(sg5,sg5Concentration),mul(sg50,sg50Concentration)),mul(weight,minutes)))};
  return {ok:true,input:{...n,doseUnit:input.doseUnit,concentrations},rows,blocks,canPrepare:blocks.length===0,mixture,vigRange,
    totals:{totalVolume,infusion:totalVolume/24,glucoseGrams:num(div(glucose,ratio(1000n))),electrolytesVolume:num(electrolytesVolume),glucoseSolutionsVolume:num(available)}};
}
