import {validateFentonData} from './fenton-ui.js';
import {calculateSerialWeightVelocity} from './growth.js';

export function analyzeWeightTrend(chart){
 const unavailable=reason=>({risk:false,dropZ:null,reason});
 if(!chart?.data||!Array.isArray(chart.scores))return unavailable('Gere o gráfico e os escores das medidas atuais para avaliar a trajetória.');
 let data;try{data=validateFentonData(chart.data);}catch{return unavailable('Confira as medidas e gere novamente os escores.');}
 if(chart.scores.length!==data.measurements.length)return unavailable('Os escores não correspondem às medidas atuais.');
 const birthAge=data.birthGaWeeks*7+data.birthGaDays;
 const birthIndex=data.measurements.findIndex(m=>m.weeks*7+m.days===birthAge&&m.weightGrams!=null);
 if(birthIndex<0)return unavailable('Inclua o peso na IPM do nascimento para comparar o Z atual com o Z ao nascimento.');
 const currentIndex=data.measurements.findLastIndex(m=>m.weightGrams!=null);
 const score=i=>{
  const m=data.measurements[i],s=chart.scores[i];
  return s?.weeks===m.weeks&&s?.days===m.days&&Number.isFinite(s.weight?.z)&&Number.isFinite(s.weight?.value)&&Math.abs(s.weight.value-m.weightGrams)<=.5?s.weight.z:null;
 };
 const birthZ=score(birthIndex),currentZ=score(currentIndex);
 if(birthZ===null||currentZ===null)return unavailable('Escores do peso ao nascimento e do peso atual indisponíveis; gere novamente o gráfico.');
 // Remove floating-point subtraction noise without clinical rounding to displayed Z.
 const dropZ=Number((birthZ-currentZ).toPrecision(15));
 if(!Number.isFinite(dropZ))return unavailable('Escores inválidos para comparar a trajetória do peso.');
 return {birthIndex,currentIndex,birthZ,currentZ,dropZ,risk:dropZ>2,reason:null};
}

export function makeWeightProjections(measurements){
 const velocities=calculateSerialWeightVelocity(measurements);
 const indices=measurements.flatMap((m,i)=>m.weightGrams==null?[]:[i]);
 if(indices.length<2)throw new Error('Informe pelo menos duas pesagens válidas para simular 14 e 28 dias.');
 const index=indices.at(-1),current=measurements[index],previous=measurements[indices.at(-2)],velocity=velocities[index];
 const startAge=current.weeks*7+current.days,intervalDays=startAge-(previous.weeks*7+previous.days);
 const points=[14,28].map(daysAhead=>{
  const age=startAge+daysAhead,weightGrams=current.weightGrams*Math.exp(velocity*daysAhead/1000),finite=Number.isFinite(weightGrams)&&weightGrams>0;
  return {daysAhead,weeks:Math.floor(age/7),days:age%7,weightGrams:finite?weightGrams:null,inRange:finite&&age>=22*7&&age<=50*7&&Math.round(weightGrams)>=100&&Math.round(weightGrams)<=20000};
 });
 return {velocity,intervalDays,currentWeight:current.weightGrams,currentWeeks:current.weeks,currentDays:current.days,points};
}
