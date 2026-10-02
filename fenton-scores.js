// Parse the Fenton service's CSV. Preserve its scores; never derive scores from the chart.
const clean=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const metric=name=>/weight|\bwt\b|peso/i.test(name)?'weight':/head|\bhc\b|\bpc\b|ceph/i.test(name)?'head':/length|\blen\b|comprimento|height/i.test(name)?'length':null;
const isZ=name=>/(?:^|[^a-z])z(?:$|[^a-z])|zscore|scorez/i.test(name)&&!/[Δδ]|delta|change|differ|vari|shift|\bdz\b/i.test(name);
const isPercentile=name=>/percent|centile|pctile|pct\b|pctl|%ile|%tile|%/i.test(name);
const decimal=value=>{
 const s=String(value??'').trim().replace(/\s*%$/,'').replace(',','.');
 return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)?Number(s):NaN;
};
const ageDays=value=>{
 const s=String(value??'').trim();
 const withDays=/^(\d+)\s*w\s*([0-6])\s*d?$/i.exec(s);
 if(withDays)return Number(withDays[1])*7+Number(withDays[2]);
 const fraction=/^(\d+)\s+(\d)\s*\/\s*7$/.exec(s)||/^(\d+)\s*\+\s*(\d)$/.exec(s);
 if(fraction)return Number(fraction[1])*7+Number(fraction[2]);
 const weeks=decimal(s);return Number.isFinite(weeks)?Math.round(weeks*7):NaN;
};
function csvRows(input){
 const value=String(input).replace(/^\uFEFF/,'');
 if(value.length>1_000_000)throw new Error('CSV Fenton excede o tamanho esperado.');
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<value.length;i++){
  const c=value[i];
  if(c==='"'){
   if(quoted&&value[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
  }else if(c===','&&!quoted){row.push(cell);cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&value[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quoted)throw new Error('CSV Fenton com aspas incompletas.');
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
function columns(row){
 const found={age:-1,weight:{},length:{},head:{}};let current=null;
 for(const [index,cell]of row.entries()){
  const label=clean(cell),key=metric(label);
  if(/^(?:gage|ga|ipm|pma)(?:\b|\s*\()|gestational\s*age|postmenstrual\s*age/.test(label)&&!/birth|nascimento/.test(label)){found.age=index;continue;}
  if(key)current=key;
  const type=key||current;
  if(!type)continue;
  if(isZ(label))found[type].z=index;
  else if(isPercentile(label))found[type].percentile=index;
  else if(key)found[type].value=index;
 }
 return found;
}
export function parseFentonScores(csv,request){
 const expected=request?.measurements;
 if(!Array.isArray(expected)||expected.length<1||expected.length>20)throw new Error('Medidas Fenton ausentes.');
 const rows=csvRows(csv);
 const headerIndex=rows.findIndex(row=>{
  const c=columns(row);
  return c.age>=0&&Object.values(c).some(v=>typeof v==='object'&&v.z!==undefined&&v.percentile!==undefined);
 });
 if(headerIndex<0)throw new Error('Formato da tabela Fenton não reconhecido. Baixe o CSV original e confira os dados.');
 const map=columns(rows[headerIndex]);
 const measured=rows.slice(headerIndex+1).filter(row=>Number.isFinite(ageDays(row[map.age])));
 if(measured.length!==expected.length)throw new Error('A tabela Fenton não contém as mesmas medidas do gráfico. Gere ambos novamente.');
 return measured.map((cells,i)=>{
  const source=expected[i],age=ageDays(cells[map.age]);
  if(!Number.isInteger(source.weeks)||!Number.isInteger(source.days)||Math.abs(age-(source.weeks*7+source.days))>0.5)
   throw new Error('As idades da tabela Fenton e do gráfico não correspondem. Recalcule.');
  const result={weeks:source.weeks,days:source.days};
  for(const [name,field,tolerance]of [['weight','weightGrams',.5],['length','lengthCm',.05],['head','headCm',.05]]){
   if(source[field]==null)continue;
   const column=map[name];
   if([column.value,column.z,column.percentile].some(x=>x===undefined))throw new Error(`Faltam os escores de ${name} no CSV Fenton.`);
   const value=decimal(cells[column.value]),z=decimal(cells[column.z]);
   const raw=String(cells[column.percentile]??'').trim(),bound=/^([<>])\s*(\d+(?:[.,]\d+)?)\s*%?$/.exec(raw);
   if(bound&&!(decimal(bound[2])>=0&&decimal(bound[2])<=100))throw new Error(`Percentil de ${name} fora da faixa de 0 a 100 no CSV Fenton.`);
   const percentile=bound?`${bound[1]}${bound[2].replace('.',',')}`:decimal(raw);
   if(!Number.isFinite(value)||Math.abs(value-source[field])>tolerance||!Number.isFinite(z)||!(typeof percentile==='string'||Number.isFinite(percentile)&&percentile>=0&&percentile<=100))
    throw new Error(`Medida ou escore de ${name} divergente na tabela Fenton. Recalcule.`);
   result[name]={value,z,percentile};
  }
  return result;
 });
}
