import {nutritionAlerts} from './alerts.js';
export const VERSION = '0.3.4';
export const CONCENTRATIONS = Object.freeze({aa:0.1,lip:0.2,glucose:0.5,nacl:1.7,acetate:2,kcl:1.34,calcium:0.5,magnesium:0.8,kphosP:1.1,kphosK:2,glyceroP:1,glyceroNa:2,oligoZn:500,zinc:200,selenium:60});
export const ENERGY = Object.freeze({aa:4,lip:9,glucose:4});
export const round1 = n => Math.round((n + Number.EPSILON * Math.max(1, Math.abs(n))) * 10) / 10;
export const round2 = n => Math.round((n + Number.EPSILON * Math.max(1, Math.abs(n))) * 100) / 100;
export function formatVolume(value,id){if(!Number.isFinite(value))return '—';const digits=['zinc','selenium'].includes(id)||(id==='water'&&Math.abs(round1(value)-value)>1e-9)?2:1;return value.toFixed(digits).replace('.',',');}
export function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string' || !/^\d+(?:[.,]\d+)?$/.test(value.trim())) return NaN;
  return Number(value.trim().replace(',', '.'));
}
const doseFields = ['aa','lip','vig','na','k','ca','mg','p'];
export function calculate(input) {
  const errors=[];
  const n={};
  const labels={weight:'Peso atual',day:'Dia de vida',gaWeeks:'Idade gestacional',gaDays:'Dias adicionais de gestação',fluid:'Taxa hídrica',aa:'Aminoácidos',lip:'Lipídeos',vig:'VIG',na:'Sódio',k:'Potássio',ca:'Cálcio',mg:'Magnésio',p:'Fósforo',seDose:'Selênio'};
  const omit={...input.omit};
  for (const field of ['weight','day','gaWeeks','gaDays','fluid',...doseFields]) {
    n[field]=(doseFields.includes(field)&&omit[field])?0:parseNumber(input[field]);
    if (!Number.isFinite(n[field]) || n[field]<0 || n[field]>1e12) errors.push({field,message:`${labels[field]}: informe um número válido, maior ou igual a zero, dentro da capacidade numérica do cálculo.`});
  }
  for(const field of ['weight','day','gaWeeks','fluid']) if(n[field]===0) errors.push({field,message:`${labels[field]} deve ser maior que zero.`});
  for(const field of ['day','gaWeeks','gaDays']) if(Number.isFinite(n[field])&&!Number.isInteger(n[field])) errors.push({field,message:`${labels[field]} deve ser um número inteiro.`});
  if(n.gaDays>6) errors.push({field:'gaDays',message:'Dias adicionais de gestação: use de 0 a 6.'});
  if(!['central','peripheral'].includes(input.access)) errors.push({field:'access',message:'Selecione o acesso venoso.'});
  if(!['nacl','acetate'].includes(input.naSalt)) errors.push({field:'naSalt',message:'Selecione o sal de sódio.'});
  if(!['kphos','glycero'].includes(input.pSalt)) errors.push({field:'pSalt',message:'Selecione o sal de fósforo.'});
  n.seDose=omit.se?0:(n.weight>=1.5?2:parseNumber(input.seDose));
  if(!omit.se&&n.weight<1.5&&(!Number.isFinite(n.seDose)||n.seDose<5||n.seDose>7)) errors.push({field:'seDose',message:'Para peso menor que 1.500 g, informe selênio entre 5 e 7 mcg/kg/dia.'});
  if(errors.length) return {ok:false,errors};
  const w=n.weight,c=CONCENTRATIONS;
  const blocks=[],notices=[],adjustments=[],rounding=[];
  const volumes={};
  function volume(id,raw,label) {
    if(!Number.isFinite(raw)||raw<0) {blocks.push(`Não foi possível calcular ${label}. Revise os parâmetros.`);volumes[id]=0;return 0;}
    const trace=['zinc','selenium'].includes(id);
    const v=trace?round2(raw):round1(raw);volumes[id]=v;
    if(raw>0&&v===0) blocks.push(`${label}: o volume calculado é menor que ${trace?'0,005':'0,05'} mL e arredonda para zero. Revise a dose ou a apresentação antes de exportar.`);
    if(Math.abs(v-raw)>1e-9) rounding.push(id);
    return v;
  }
  volume('aa',n.aa*w/c.aa,'Aminoped 10%');
  volume('lip',n.lip*w/c.lip,'Lipídeos 20%');
  volume('glucose',n.vig*w*1440/500,'Glicose 50%');
  const pConc=input.pSalt==='kphos'?c.kphosP:c.glyceroP;
  const pVolume=volume('phosphate',n.p*w/pConc,'Sal de fósforo');
  const donorNa=input.pSalt==='glycero'?pVolume*c.glyceroNa:0;
  const donorK=input.pSalt==='kphos'?pVolume*c.kphosK:0;
  const naRemaining=Math.max(0,n.na*w-donorNa);
  const kRemaining=Math.max(0,n.k*w-donorK);
  volume('sodium',omit.na?0:naRemaining/(input.naSalt==='nacl'?c.nacl:c.acetate),'Sal de sódio');
  volume('potassium',omit.k?0:kRemaining/c.kcl,'Cloreto de potássio 10%');
  volume('calcium',n.ca*w/c.calcium,'Gluconato de cálcio 10%');
  volume('magnesium',n.mg*w/c.magnesium,'Sulfato de magnésio 10%');
  const eligibleVitamins=n.day>=3;
  volume('va',!omit.va&&eligibleVitamins?Math.min(2*w,5):0,'Polivit A Ped');
  volume('vb',!omit.vb&&eligibleVitamins?Math.min(2*w,5):0,'Polivit B Ped');
  const eligibleOligo=n.day>=8;
  volume('oligo',!omit.oligo&&eligibleOligo?.2*w:0,'Solução de oligoelementos');
  const zincTarget=omit.zn?0:(w<1.5?400:200);
  const donorZn=volumes.oligo*c.oligoZn;
  volume('zinc',omit.zn?0:Math.max(0,zincTarget*w-donorZn)/c.zinc,'Sulfato de zinco');
  volume('selenium',n.seDose*w/c.selenium,'Selênio');
  const effective={
    aa:volumes.aa*c.aa/w,lip:volumes.lip*c.lip/w,vig:volumes.glucose*500/(w*1440),
    na:(volumes.sodium*(input.naSalt==='nacl'?c.nacl:c.acetate)+donorNa)/w,
    k:(volumes.potassium*c.kcl+donorK)/w,ca:volumes.calcium*c.calcium/w,mg:volumes.magnesium*c.magnesium/w,
    p:pVolume*pConc/w,zn:(volumes.zinc*c.zinc+donorZn)/w,se:volumes.selenium*c.selenium/w
  };
  for(const [id,donor,requested,actual,name,unit,source] of [
    ['na',donorNa,n.na,effective.na,'Sódio','mEq/kg/dia','glicerofosfato de sódio'],
    ['k',donorK,n.k,effective.k,'Potássio','mEq/kg/dia','fosfato de potássio'],
    ['zn',donorZn,zincTarget,effective.zn,'Zinco','mcg/kg/dia','solução de oligoelementos']
  ]) {
    if(donor>requested*w+1e-9) adjustments.push({id,name,requested,actual,unit,source});
  }
  if(!eligibleVitamins&&(!omit.va||!omit.vb)) notices.push('Vitaminas não incluídas: início no 3º dia de vida.');
  if(!eligibleOligo&&!omit.oligo) notices.push('Solução de oligoelementos não incluída: início no 8º dia de vida.');
  const totalCents=Math.round(round1(n.fluid*w)*100);
  const componentsCents=Object.values(volumes).reduce((s,v)=>s+Math.round(v*100),0);
  if(!Number.isSafeInteger(totalCents)||!Number.isSafeInteger(componentsCents))return {ok:false,errors:[{field:'weight',message:'Os valores ultrapassam a capacidade numérica do cálculo. Revise os parâmetros.'}]};
  const waterCents=totalCents-componentsCents;
  if(totalCents<=0) blocks.push('O volume total arredondou para zero. Revise o peso e a taxa hídrica.');
  if(waterCents<0) blocks.push(`Os componentes somam ${(componentsCents/100).toFixed(2).replace('.',',')} mL e ultrapassam o volume total de ${(totalCents/100).toFixed(1).replace('.',',')} mL. Revise os parâmetros; não há volume disponível para água q.s.p.`);
  volumes.water=waterCents>=0?waterCents/100:null;
  const grams={aa:volumes.aa*c.aa,lip:volumes.lip*c.lip,glucose:volumes.glucose*c.glucose};
  const nonProtein=grams.glucose*ENERGY.glucose+grams.lip*ENERGY.lip;
  const calories=nonProtein+grams.aa*ENERGY.aa;
  const totalVolume=totalCents/100;
  const glucosePercent=totalVolume>0?grams.glucose/totalVolume*100:0;
  // Pereira-da-Silva et al. (JPEN, 2004; PMID 14763792).
  // A equação usa concentrações na solução final: AA e glicose em g/L,
  // sódio total em mEq/L e fósforo elementar em mg/L.
  const phosphorusAtomicMass=30.973761998;
  const osmolarity=totalVolume>0?Math.max(0,
    (grams.aa*1000/totalVolume)*8+
    (grams.glucose*1000/totalVolume)*7+
    (effective.na*w*1000/totalVolume)*2+
    (effective.p*w*phosphorusAtomicMass*1000/totalVolume)*0.2-50
  ):null;
  const requiresCentral=Math.round(volumes.glucose*100)*4>totalCents;
  const accessBlocked=requiresCentral&&input.access==='peripheral';
  if(accessBlocked) blocks.push('Concentração de glicose acima de 12,5%. É obrigatório acesso central. Revise o acesso ou os parâmetros.');
  const rows=[];
  function row(id,name,v,quantity,unit,perKg,perUnit,group,status='') {rows.push({id,name,volume:v,quantity,unit,perKg,perUnit,group,status});}
  row('aa','Aminoped 10%',volumes.aa,grams.aa,'g',effective.aa,'g/kg/dia',0,omit.aa?'Não ofertado':'');
  row('lip','Lipídeos 20%',volumes.lip,grams.lip,'g',effective.lip,'g/kg/dia',0,omit.lip?'Não ofertado':'');
  row('glucose','Glicose 50%',volumes.glucose,grams.glucose,'g',effective.vig,'mg/kg/min',0,omit.vig?'Não ofertado':'');
  for(const salt of ['nacl','acetate']) {const v=input.naSalt===salt?volumes.sodium:0;row(salt,salt==='nacl'?'Cloreto de sódio 10%':'Acetato de sódio',v,v*c[salt],'mEq',v*c[salt]/w,'mEq/kg/dia',1,v===0?'Não acrescentado':'');}
  row('kcl','Cloreto de potássio 10%',volumes.potassium,volumes.potassium*c.kcl,'mEq',volumes.potassium*c.kcl/w,'mEq/kg/dia',1,volumes.potassium===0?'Não acrescentado':'');
  row('calcium','Gluconato de cálcio 10%',volumes.calcium,volumes.calcium*c.calcium,'mEq',effective.ca,'mEq/kg/dia',1,omit.ca?'Não ofertado':'');
  row('magnesium','Sulfato de magnésio 10%',volumes.magnesium,volumes.magnesium*c.magnesium,'mEq',effective.mg,'mEq/kg/dia',1,omit.mg?'Não ofertado':'');
  for(const salt of ['kphos','glycero']) {const v=input.pSalt===salt?pVolume:0;const conc=salt==='kphos'?c.kphosP:c.glyceroP;row(salt,salt==='kphos'?'Fosfato de potássio':'Glicerofosfato de sódio',v,v*conc,'mmol',v*conc/w,'mmol/kg/dia',1,v===0?'Não ofertado':'');}
  for(const [id,name] of [['va','Polivit A Ped'],['vb','Polivit B Ped'],['oligo','Solução de oligoelementos']]) row(id,name,volumes[id],volumes[id],'mL',volumes[id]/w,'mL/kg/dia',2,omit[id]?'Não ofertado':((id==='oligo'&&!eligibleOligo)?'Início no 8º dia':(!eligibleVitamins&&id!=='oligo'?'Início no 3º dia':'')));
  row('zinc','Sulfato de zinco',volumes.zinc,volumes.zinc*c.zinc,'mcg',volumes.zinc*c.zinc/w,'mcg/kg/dia',2,omit.zn?'Não acrescentado':'');
  row('selenium','Selênio',volumes.selenium,volumes.selenium*c.selenium,'mcg',effective.se,'mcg/kg/dia',2,omit.se?'Não ofertado':'');
  row('water','Água para injeção',volumes.water,volumes.water,'mL',null,'q.s.p.',3);
  const offers=[
    ['aa','Aminoácidos',n.aa,effective.aa,'g/kg/dia'],['lip','Lipídeos',n.lip,effective.lip,'g/kg/dia'],['vig','VIG',n.vig,effective.vig,'mg/kg/min'],
    ['na','Sódio total',n.na,effective.na,'mEq/kg/dia'],['k','Potássio total',n.k,effective.k,'mEq/kg/dia'],['ca','Cálcio',n.ca,effective.ca,'mEq/kg/dia'],['mg','Magnésio',n.mg,effective.mg,'mEq/kg/dia'],['p','Fósforo',n.p,effective.p,'mmol/kg/dia'],['zn','Zinco total',zincTarget,effective.zn,'mcg/kg/dia'],['se','Selênio',n.seDose,effective.se,'mcg/kg/dia']
  ].map(([id,name,requested,actual,unit])=>({id,name,requested,actual,unit}));
  const alerts=nutritionAlerts({...n,access:input.access},{volumes,effective,totalVolume,glucosePercent,osmolarity});
  return {ok:true,input:{...n,access:input.access,naSalt:input.naSalt,pSalt:input.pSalt,omit},rows,volumes,grams,effective,offers,rounding,adjustments,notices,alerts,blocks,requiresCentral,accessBlocked,canExport:blocks.length===0,
    totals:{totalVolume,componentsVolume:componentsCents/100,water:volumes.water,infusion:round1(totalVolume/24),infusionExact:totalVolume/24,fluid:totalVolume/w,calories:calories/w,glucosePercent,osmolarity,nonProtein:nonProtein/w,proteinRatio:grams.aa>0?nonProtein/grams.aa:null},version:VERSION};
}
