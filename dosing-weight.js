// Institutional protocol: birth weight for D1-D7; measured current weight from D8.
// Inputs are kilograms and an integer day of life, already parsed by each engine.
export function resolveDosingWeight({weight,birthWeight,day}){
 const errors=[];
 if(!Number.isFinite(weight)||weight<.1||weight>20)errors.push({field:'weight',message:'Informe peso atual entre 100 e 20.000 g.'});
 if(!Number.isInteger(day)||day<1||day>365)errors.push({field:'day',message:'Informe dia de vida inteiro entre 1 e 365.'});
 const needsBirth=Number.isInteger(day)&&day>=1&&day<=7;
 if(needsBirth&&birthWeight==null)errors.push({field:'birthWeight',message:'Informe o peso ao nascer: obrigatório para os cálculos do 1º ao 7º dia de vida.'});
 if(birthWeight!=null&&(!Number.isFinite(birthWeight)||birthWeight<.1||birthWeight>10))errors.push({field:'birthWeight',message:'Informe peso ao nascer entre 100 e 10.000 g.'});
 if(errors.length)return {ok:false,errors};
 return {ok:true,currentWeight:weight,birthWeight:birthWeight??null,day,calculationWeight:needsBirth?birthWeight:weight,basis:needsBirth?'birth':'current',changePercent:birthWeight?100*(weight-birthWeight)/birthWeight:null};
}
const grams=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(n*1000);
export function dosingWeightLabel(context){
 return `Peso de cálculo: ${grams(context.calculationWeight)} g (${context.basis==='birth'?'peso ao nascer, D1-D7':'peso atual, a partir de D8'})`;
}
export function measuredWeightLabel(context){
 return `Peso atual: ${grams(context.currentWeight)} g${context.birthWeight?` | PN: ${grams(context.birthWeight)} g | Variação desde PN: ${context.changePercent.toFixed(1).replace('.',',')}%`:''}`;
}
