// Independent implementation of the mathematical equations in Appendix 8 of
// Villar et al., Lancet Glob Health 2015;3:e681–91.
// DOI: 10.1016/S2214-109X(15)00163-1. See docs/INTERGROWTH_INTEGRATION.md.
// These are POSTNATAL preterm standards, not size-at-birth or fetal standards.
export const INTERGROWTH_MIN_DAYS=189;
export const INTERGROWTH_MAX_DAYS=448;
export const INTERGROWTH_METRICS=Object.freeze(['weight','length','head']);

function parameters(sex,metric,pmaDays){
 if(!['male','female'].includes(sex))throw new Error('Selecione o sexo para a referência.');
 if(!INTERGROWTH_METRICS.includes(metric))throw new Error('Indicador antropométrico inválido.');
 if(!Number.isInteger(pmaDays)||pmaDays<INTERGROWTH_MIN_DAYS||pmaDays>INTERGROWTH_MAX_DAYS)throw new Error('A IPM deve estar entre 27 semanas + 0 dias e 64 semanas + 0 dias.');
 const age=pmaDays/7,boy=sex==='male'?1:0,inv=1/age,inv2=inv*inv;
 if(metric==='weight')return {
  location:2.591277-0.01155*Math.sqrt(age)-2201.705*inv2+0.0911639*boy,
  scale:0.1470258+505.92394*inv2-140.0576*inv2*Math.log(age),
  log:true,unit:1000
 };
 if(metric==='length')return {
  location:4.136244-547.0018*inv2+0.0026066*age+0.0314961*boy,
  scale:0.050489+310.44761*inv2-90.0742*inv2*Math.log(age),
  log:true,unit:1
 };
 return {location:55.53617-852.0059*inv+0.7957903*boy,
  scale:3.0582292+3910.05*inv2-180.5625*inv,log:false,unit:1};
}

// Public measurement units: grams for weight; centimetres for length and head.
// Published weight equations use kilograms internally. All logarithms are ln.
export function referenceValue(sex,metric,pmaDays,z){
 const p=parameters(sex,metric,pmaDays);
 if(!Number.isFinite(z))throw new Error('Escore Z inválido.');
 const transformed=p.location+z*p.scale;
 return (p.log?Math.exp(transformed):transformed)*p.unit;
}

export function zScore(sex,metric,pmaDays,value){
 const p=parameters(sex,metric,pmaDays);
 if(!Number.isFinite(value)||value<=0)throw new Error('Informe uma medida positiva e válida.');
 const measurement=value/p.unit;
 return ((p.log?Math.log(measurement):measurement)-p.location)/p.scale;
}

// Standard normal CDF from its convergent series. No clinical cutoffs or
// truncation of z scores; tails below machine/display precision return 0/100.
export function percentileFromZ(z){
 if(!Number.isFinite(z))throw new Error('Escore Z inválido.');
 if(z===0)return 50;
 if(z<=-8)return 0;
 if(z>=8)return 100;
 const magnitude=Math.abs(z),square=magnitude*magnitude;
 let term=magnitude,sum=term;
 for(let n=1;n<200;n++){
  term*=square/(2*n+1);
  const next=sum+term;
  if(next===sum)break;
  sum=next;
 }
 const integral=Math.exp(-square/2)*sum/Math.sqrt(2*Math.PI);
 return Math.max(0,Math.min(100,100*(z<0?0.5-integral:0.5+integral)));
}

const limits=Object.freeze({weight:[100,20000,'peso em gramas (100–20.000 g)'],length:[15,90,'comprimento em centímetros (15–90 cm)'],head:[10,60,'perímetro cefálico em centímetros (10–60 cm)']});

export function calculateIntergrowth(input){
 if(!input||!['male','female'].includes(input.sex))throw new Error('Selecione o sexo para a referência.');
 if(!Array.isArray(input.measurements)||input.measurements.length<1||input.measurements.length>20)throw new Error('Informe de 1 a 20 avaliações.');
 let previous=INTERGROWTH_MIN_DAYS-1;
 const measurements=input.measurements.map((row,index)=>{
  if(!row||!Number.isInteger(row.weeks)||!Number.isInteger(row.days)||row.days<0||row.days>6)throw new Error(`Avaliação ${index+1}: informe semanas inteiras e dias de 0 a 6.`);
  const pmaDays=row.weeks*7+row.days;
  if(pmaDays<INTERGROWTH_MIN_DAYS||pmaDays>INTERGROWTH_MAX_DAYS)throw new Error(`Avaliação ${index+1}: a IPM deve estar entre 27 semanas + 0 dias e 64 semanas + 0 dias. Não há extrapolação após essa faixa.`);
  if(pmaDays<=previous)throw new Error('Informe as avaliações em ordem crescente de IPM, sem repetir a idade.');
  previous=pmaDays;
  const result={weeks:row.weeks,days:row.days,pmaDays,scores:{}};
  for(const metric of INTERGROWTH_METRICS){
   if(row[metric]==null)continue;
   const [min,max,label]=limits[metric],value=row[metric];
   if(!Number.isFinite(value)||value<min||value>max)throw new Error(`Avaliação ${index+1}: confira ${label}.`);
   const z=zScore(input.sex,metric,pmaDays,value);
   result[metric]=value;result.scores[metric]={z,percentile:percentileFromZ(z)};
  }
  if(!Object.keys(result.scores).length)throw new Error(`Informe pelo menos uma medida antropométrica na avaliação ${index+1}.`);
  return result;
 });
 return {sex:input.sex,measurements};
}
