import {calculateIntergrowth,INTERGROWTH_MIN_DAYS,INTERGROWTH_MAX_DAYS,zScore,percentileFromZ} from './intergrowth.js';
import {calculateSerialWeightVelocity} from './growth.js';

export const serialIntergrowthVelocity=result=>calculateSerialWeightVelocity(result.measurements.map(m=>({weeks:m.weeks,days:m.days,weightGrams:m.weight})));
export function intergrowthCsv(result){
 const validated=calculateIntergrowth(result),velocities=serialIntergrowthVelocity(validated),fmt=(v,d=1)=>v==null?'':v.toFixed(d).replace('.',',');
 const rows=[['IPM','Peso g','Z peso','P peso','VC g/kg/dia','Comprimento cm','Z comprimento','P comprimento','PC cm','Z PC','P PC']];
 for(const [i,m] of validated.measurements.entries()){
  const cells=[`${m.weeks}+${m.days}`];
  for(const metric of ['weight','length','head']){const score=m.scores[metric];cells.push(fmt(m[metric]),fmt(score?.z,2),score?score.percentile<.1?'<0,1':score.percentile>99.9?'>99,9':fmt(score.percentile):'');if(metric==='weight')cells.push(fmt(velocities[i]));}rows.push(cells);
 }
 return '\ufeff'+rows.map(row=>row.join(';')).join('\r\n')+'\r\n';
}
export function analyzeIntergrowthTrend(result,birthPmaDays){
 const unavailable=reason=>({risk:false,dropZ:null,reason});
 if(!result)return unavailable('Gere as curvas e os escores das medidas atuais para avaliar a trajetória.');
 if(!Number.isInteger(birthPmaDays))return unavailable('Informe a IG ao nascer e inclua o peso nessa IPM para comparar com o nascimento.');
 if(birthPmaDays<INTERGROWTH_MIN_DAYS||birthPmaDays>INTERGROWTH_MAX_DAYS)return unavailable('IPM do nascimento fora de 27+0 a 64+0: comparação indisponível, sem extrapolação ou combinação com Fenton.');
 const birth=result.measurements.find(m=>m.pmaDays===birthPmaDays&&m.weight!=null),current=result.measurements.findLast(m=>m.weight!=null);
 if(!birth||!current)return unavailable('Inclua o peso na IPM do nascimento para comparar o Z atual com o Z ao nascimento.');
 const birthZ=zScore(result.sex,'weight',birth.pmaDays,birth.weight),currentZ=zScore(result.sex,'weight',current.pmaDays,current.weight),dropZ=Number((birthZ-currentZ).toPrecision(15));
 return {birthZ,currentZ,dropZ,risk:dropZ>2,reason:null};
}
export function projectIntergrowth(result){
 const validated=calculateIntergrowth(result),velocities=serialIntergrowthVelocity(validated),indices=validated.measurements.flatMap((m,i)=>m.weight==null?[]:[i]);
 if(indices.length<2)throw new Error('Informe pelo menos duas pesagens válidas para simular 14 e 28 dias.');
 const index=indices.at(-1),current=validated.measurements[index],previous=validated.measurements[indices.at(-2)],velocity=velocities[index];
 const points=[14,28].map(daysAhead=>{
  const pmaDays=current.pmaDays+daysAhead,value=current.weight*Math.exp(velocity*daysAhead/1000),weight=Number.isFinite(value)&&value>0?value:null;
  const inRange=pmaDays>=INTERGROWTH_MIN_DAYS&&pmaDays<=INTERGROWTH_MAX_DAYS&&weight>=100&&weight<=20000;
  const z=inRange?zScore(validated.sex,'weight',pmaDays,weight):null;
  return {daysAhead,pmaDays,weeks:Math.floor(pmaDays/7),days:pmaDays%7,weight,inRange,z,percentile:z===null?null:percentileFromZ(z)};
 });
 return {velocity,intervalDays:current.pmaDays-previous.pmaDays,currentWeight:current.weight,currentWeeks:current.weeks,currentDays:current.days,points};
}
function check(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Arquivo de acompanhamento INTERGROWTH inválido.');
 const validated=calculateIntergrowth(value.input),input={sex:validated.sex,measurements:validated.measurements.map(m=>Object.fromEntries(['weeks','days','weight','length','head'].filter(k=>m[k]!=null).map(k=>[k,m[k]])))};
 const birthPmaDays=value.birthPmaDays;
 if(birthPmaDays!==null&&(!Number.isInteger(birthPmaDays)||birthPmaDays<154||birthPmaDays>293||birthPmaDays>validated.measurements[0].pmaDays))throw new Error('Confira a IG do nascimento: deve ser de 22+0 a 41+6 e não posterior às medidas.');
 if(typeof value.assessment!=='string'||value.assessment.length>2000)throw new Error('Relato inválido no arquivo de acompanhamento.');
 return {input,birthPmaDays,assessment:value.assessment};
}
export function encodeIntergrowthFollowup(value){return JSON.stringify({format:'GROW_NEO-intergrowth-followup',formatVersion:1,...check(value)},null,2);}
export function decodeIntergrowthFollowup(text){
 if(typeof text!=='string'||text.length>1024*1024)throw new Error('Arquivo inválido ou muito grande.');
 let value;try{value=JSON.parse(text);}catch{throw new Error('Arquivo de acompanhamento INTERGROWTH inválido.');}
 if(value?.format!=='GROW_NEO-intergrowth-followup')throw new Error('Este arquivo não é um acompanhamento INTERGROWTH do GROW_NEO.');
 if(value.formatVersion!==1)throw new Error('Versão de arquivo de acompanhamento não suportada.');
 return check(value);
}
