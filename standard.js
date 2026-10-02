import {parseNumber} from './engine.js';
import {compareProducts} from './alerts.js';
import {resolveDosingWeight} from './dosing-weight.js';
// Baxter SmPC, 19 May 2026, sections 2 and 4.2; 2CB and 3CB compositions.
export const NUMETA_SOURCE='https://www.medicines.org.uk/emc/product/7400/smpc';
// Use whole-bag values, not rounded per-100 mL concentrations.
const nutrients=(lipids,calories,nonProtein,sodium,phosphorus)=>Object.freeze([
  ['Proteína (aminoácidos)',9.4,'g'],['Glicose',40,'g'],['Lipídios',lipids,'g'],
  ['Energia total',calories,'kcal'],['Energia não proteica',nonProtein,'kcal'],
  ['Sódio',sodium,'mEq'],['Potássio',6.2,'mEq'],['Cálcio',7.6,'mEq'],
  ['Magnésio',0.94,'mEq'],['Fósforo',phosphorus,'mmol'],['Cloreto',9.3,'mEq'],
  ['Acetato',7.2,'mmol'],['Malato',3.2,'mmol'],['Nitrogênio',1.4,'g']
].map(Object.freeze));
export const STANDARD_FORMULATIONS=Object.freeze({
  '3in1':Object.freeze({label:'3:1',chambers:'Três câmaras ativadas',bagVolume:300,maxDaily:127.9,maxHourly:6.4,osmolarity:1150,nutrients:nutrients(7.5,273,235,6.6,3.8)}),
  '2in1':Object.freeze({label:'2:1',chambers:'Duas câmaras ativadas · fração lipídica fechada',bagVolume:240,maxDaily:102.3,maxHourly:5.1,osmolarity:1400,nutrients:nutrients(0,198,160,6.4,3.2)})
});
export const NUTRIENTS=STANDARD_FORMULATIONS['3in1'].nutrients;
export function calculateStandard(input){
  const currentWeight=parseNumber(input.weight),value=parseNumber(input.value),day=parseNumber(input.day);
  const weightContext=resolveDosingWeight({weight:currentWeight,day,birthWeight:input.birthWeight==null||input.birthWeight===''?null:parseNumber(input.birthWeight)});
  const weight=weightContext.calculationWeight;
  const formulation=input.formulation??'3in1',bag=STANDARD_FORMULATIONS[formulation];
  const errors=[];
  if(!weightContext.ok)errors.push(...weightContext.errors.map(e=>e.message));
  if(!Number.isFinite(value)||value<=0||value>10000)errors.push('Informe uma taxa ou dose maior que zero e até 10.000.');
  if(!Number.isInteger(day)||day<1||day>365)errors.push('Informe dia de vida inteiro entre 1 e 365.');
  if(!['fluid','protein'].includes(input.mode))errors.push('Selecione taxa hídrica ou proteína.');
  if(!Object.hasOwn(STANDARD_FORMULATIONS,formulation))errors.push('Selecione a apresentação 3:1 ou 2:1 do Numeta.');
  if(!['central','peripheral'].includes(input.access))errors.push('Selecione o acesso venoso.');
  if(errors.length)return {ok:false,errors};
  const fluid=input.mode==='fluid'?value:value*bag.bagVolume/9.4;
  const volume=fluid*weight,rate=volume/24,protein=fluid*9.4/bag.bagVolume;
  const vig=fluid*40/bag.bagVolume*1000/1440;
  const rows=bag.nutrients.map(([label,amount,unit])=>({label,unit,per100:amount*100/bag.bagVolume,perKg:amount*fluid/bag.bagVolume,total:amount*volume/bag.bagVolume}));
  const blocks=[],alerts=[];
  if(input.access==='peripheral')blocks.push('Numeta sem diluição exige acesso venoso central. Diluição não está contemplada neste cálculo.');
  if(fluid>bag.maxDaily+1e-9)blocks.push(`Volume acima do máximo de bula para ${bag.label}: ${formatStandard(bag.maxDaily)} mL/kg/dia. Revise a taxa ou a proteína.`);
  if(fluid/24>bag.maxHourly+1e-9)blocks.push(`Vazão acima do máximo de bula para ${bag.label}: ${formatStandard(bag.maxHourly)} mL/kg/h.`);
  if(input.mode==='protein'?value>3.5:compareProducts([value,9.4],[bag.bagVolume,3.5])>0)blocks.push('Aminoácidos acima de 3,5 g/kg/dia. Revise a taxa ou a proteína e calcule novamente.');
  if(protein>(day===1?2:3)+1e-9)alerts.push('Proteína acima da referência do projeto para este dia de vida: '+(day===1?'2,0':'3,0')+' g/kg/dia.');
  const lip=fluid*(formulation==='3in1'?7.5:0)/bag.bagVolume;
  if(lip>(day===1?2:3)+1e-9)alerts.push('Lipídios acima da referência do projeto para este dia de vida: '+(day===1?'2,0':'3,0')+' g/kg/dia.');
  if(formulation==='2in1')alerts.push('Bolsa 2:1 sem lipídios. Lipídios infundidos à parte não estão incluídos nas ofertas nem na integração com a enteral.');
  return {ok:true,weight,currentWeight,weightContext,day,mode:input.mode,formulation,fluid,volume,rate,protein,vig,rows,blocks,alerts};
}

export const formatStandard=n=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}).format(n);
export const formatStandardPer100=n=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2}).format(n);
export function formatStandardVolume(value){
  if(!Number.isFinite(value))return '-';
  const scaled=value*10,tolerance=Number.EPSILON*Math.max(1,Math.abs(scaled))*4;
  return (Math.ceil(scaled-tolerance)/10).toFixed(1).replace('.',',');
}
export function standardSummary(r){
  const f=formatStandard,bag=STANDARD_FORMULATIONS[r.formulation??'3in1'];
  return [['Volume total',formatStandardVolume(r.volume)+' mL'],['Vazão média em 24 horas',formatStandardVolume(r.rate)+' mL/h'],['Taxa hídrica',f(r.fluid)+' mL/kg/dia'],['Taxa calórica',f(r.rows.find(x=>x.label==='Energia total').perKg)+' kcal/kg/dia'],['Proteína (aminoácidos)',f(r.protein)+' g/kg/dia'],['VIG',f(r.vig)+' mg/kg/min'],['Concentração de glicose',f(40/bag.bagVolume*100)+'%'],['Osmolaridade da bolsa (aproximada)',f(bag.osmolarity)+' mOsm/L'],['Proteína / calorias não proteicas','1 : '+f((r.rows.find(x=>x.label==='Energia não proteica').perKg)/r.protein)],['Relação Ca/P (mmol/mmol)',f((r.rows.find(x=>x.label==='Cálcio').total/2)/r.rows.find(x=>x.label==='Fósforo').total)+' : 1']];
}
