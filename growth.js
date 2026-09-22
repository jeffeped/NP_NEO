const REFERENCES=Object.freeze({
 female:Object.freeze([[22,28,21.2],[28,32,16.6],[32,37,13.3],[37,41,8.7],[41,45,6.5],[45,50,5.4]]),
 male:Object.freeze([[22,28,20.8],[28,32,15.9],[32,37,13.2],[37,41,9.1],[41,45,7.3],[45,50,6.0]])
});

const number=value=>{
 if(typeof value==='number')return Number.isFinite(value)?value:NaN;
 if(typeof value!=='string'||!/^[0-9]+(?:[.,][0-9]+)?$/.test(value.trim()))return NaN;
 return Number(value.trim().replace(',','.'));
};

export function fentonReference(sex,pmaWeeks){
 const band=REFERENCES[sex]?.find(([start,end])=>pmaWeeks>=start&&pmaWeeks<end);
 return band?{startWeek:band[0],endWeek:band[1]-1,gramsPerKgDay:band[2]}:null;
}

export function calculateGrowth(input){
 const errors=[];
 const n={};
 const labels={birthWeight:'Peso ao nascer',initialWeight:'Peso inicial',finalWeight:'Peso final',gaWeeks:'Idade gestacional',gaDays:'Dias adicionais de gestação',initialDay:'Dia de vida inicial',finalDay:'Dia de vida final'};
 for(const field of Object.keys(labels)){
  n[field]=number(input[field]);
  if(!Number.isFinite(n[field])||n[field]<0)errors.push({field,message:`${labels[field]}: informe um número válido.`});
 }
 for(const field of ['birthWeight','initialWeight','finalWeight','gaWeeks','initialDay','finalDay'])if(n[field]===0)errors.push({field,message:`${labels[field]} deve ser maior que zero.`});
 for(const field of ['gaWeeks','gaDays','initialDay','finalDay'])if(Number.isFinite(n[field])&&!Number.isInteger(n[field]))errors.push({field,message:`${labels[field]} deve ser um número inteiro.`});
 if(n.gaDays>6)errors.push({field:'gaDays',message:'Dias adicionais de gestação: use de 0 a 6.'});
 if(n.gaWeeks<20||n.gaWeeks>44)errors.push({field:'gaWeeks',message:'Idade gestacional: informe de 20 a 44 semanas.'});
 if(n.finalDay<=n.initialDay)errors.push({field:'finalDay',message:'O dia de vida final deve ser posterior ao inicial.'});
 if(!Object.hasOwn(REFERENCES,input.sex))errors.push({field:'sex',message:'Selecione o sexo para a referência de crescimento.'});
 if(errors.length)return {ok:false,errors};
 const intervalDays=n.finalDay-n.initialDay;
 const averageWeight=(n.initialWeight+n.finalWeight)/2;
 const totalGain=n.finalWeight-n.initialWeight;
 const gramsPerDay=totalGain/intervalDays;
 const gramsPerKgDay=1000*totalGain/(averageWeight*intervalDays);
 // D1 corresponde ao dia do nascimento; portanto, subtrai-se 1 ao converter DOL em idade pós-menstrual.
 const initialPmaDays=n.gaWeeks*7+n.gaDays+n.initialDay-1;
 const finalPmaDays=n.gaWeeks*7+n.gaDays+n.finalDay-1;
 const midpointPmaWeeks=(initialPmaDays+finalPmaDays)/14;
 const reference=fentonReference(input.sex,midpointPmaWeeks);
 const birthWeightRecovered=n.finalWeight>=n.birthWeight;
 return {ok:true,input:{...n,sex:input.sex},intervalDays,averageWeight,totalGain,gramsPerDay,gramsPerKgDay,
  initialPmaWeeks:initialPmaDays/7,finalPmaWeeks:finalPmaDays/7,midpointPmaWeeks,reference,birthWeightRecovered,
  percentOfReference:birthWeightRecovered&&reference?gramsPerKgDay/reference.gramsPerKgDay*100:null,
  shortInterval:intervalDays<5};
}
