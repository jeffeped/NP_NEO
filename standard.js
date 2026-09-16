import {formatHydrationVolume} from './hydration.js';
import {parseNumber} from './engine.js';
// Baxter SmPC, 19 May 2026, sections 2 and 4.2; accessed 2026-09-16.
export const NUMETA_SOURCE='https://www.medicines.org.uk/emc/product/7400/smpc';
// Use whole-bag values, not rounded per-100 mL concentrations.
export const NUTRIENTS=Object.freeze([
  ['Proteína (aminoácidos)',9.4,'g'],['Glicose',40,'g'],['Lipídios',7.5,'g'],
  ['Energia total',273,'kcal'],['Energia não proteica',235,'kcal'],
  ['Sódio',6.6,'mEq'],['Potássio',6.2,'mEq'],['Cálcio',7.6,'mEq'],
  ['Magnésio',0.94,'mEq'],['Fósforo',3.8,'mmol'],['Cloreto',9.3,'mEq'],
  ['Acetato',7.2,'mmol'],['Malato',3.2,'mmol'],['Nitrogênio',1.4,'g']
].map(Object.freeze));
export function calculateStandard(input){
  const weight=parseNumber(input.weight),value=parseNumber(input.value),day=parseNumber(input.day);
  const errors=[];
  if(!Number.isFinite(weight)||weight<=0||weight>20)errors.push('Informe peso maior que zero e até 20 kg.');
  if(!Number.isFinite(value)||value<=0||value>10000)errors.push('Informe uma taxa ou dose maior que zero e até 10.000.');
  if(!Number.isInteger(day)||day<1||day>365)errors.push('Informe dia de vida inteiro entre 1 e 365.');
  if(!['fluid','protein'].includes(input.mode))errors.push('Selecione taxa hídrica ou proteína.');
  if(!['central','peripheral'].includes(input.access))errors.push('Selecione o acesso venoso.');
  if(errors.length)return {ok:false,errors};
  const fluid=input.mode==='fluid'?value:value*300/9.4;
  const volume=fluid*weight,rate=volume/24,protein=fluid*9.4/300;
  const vig=fluid*40/300*1000/1440;
  const rows=NUTRIENTS.map(([label,amount,unit])=>({label,unit,perKg:amount*fluid/300,total:amount*volume/300}));
  const blocks=[],alerts=[];
  if(input.access==='peripheral')blocks.push('Numeta sem diluição exige acesso venoso central. Diluição não está contemplada neste cálculo.');
  if(fluid>127.9+1e-9)blocks.push('Volume acima do máximo de bula: 127,9 mL/kg/dia. Revise a taxa ou a proteína.');
  if(fluid/24>6.4+1e-9)blocks.push('Vazão acima do máximo de bula: 6,4 mL/kg/h.');
  if(protein>(day===1?2:3)+1e-9)alerts.push('Proteína acima da referência do projeto para este dia de vida: '+(day===1?'2,0':'3,0')+' g/kg/dia.');
  if(weight<1&&protein>3.5+1e-9)alerts.push('Proteína acima do teto do projeto de 3,5 g/kg/dia para peso <1000 g.');
  const lip=fluid*7.5/300;
  if(lip>(day===1?2:3)+1e-9)alerts.push('Lipídios acima da referência do projeto para este dia de vida: '+(day===1?'2,0':'3,0')+' g/kg/dia.');
  return {ok:true,weight,day,mode:input.mode,fluid,volume,rate,protein,vig,rows,blocks,alerts};
}

export const formatStandard=n=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}).format(n);
export const formatStandardVolume=formatHydrationVolume;
export function standardSummary(r){
  const f=formatStandard;
  return [['Volume total',formatStandardVolume(r.volume)+' mL'],['Vazão média em 24 horas',formatStandardVolume(r.rate)+' mL/h'],['Taxa hídrica',f(r.fluid)+' mL/kg/dia'],['Taxa calórica',f(r.fluid*273/300)+' kcal/kg/dia'],['Proteína (aminoácidos)',f(r.protein)+' g/kg/dia'],['VIG',f(r.vig)+' mg/kg/min'],['Concentração de glicose',f(40/3)+'%'],['Proteína / calorias não proteicas','1 : '+f(235/9.4)]];
}
