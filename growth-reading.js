// Descriptive prompts only. Reference calculations and the >2 Z trigger remain unchanged.
const metrics=[['weight','peso'],['length','comprimento'],['head','PC']];
const fmt=n=>n.toFixed(2).replace('.',',');
const age=n=>`${Math.floor(n/7)}+${n%7}`;
export function growthReadingNotices(rows=[],birthPmaDays=null){
 if(!rows.length)return [];
 const current=rows.at(-1),notices=[];
 const missing=metrics.filter(([key])=>!Number.isFinite(current[key])).map(([,label])=>label);
 if(missing.length)notices.push({id:'INCOMPLETE',message:`Avaliação incompleta na última consulta: ${missing.join(', ')} não informado(s). Peso isolado não descreve a evolução conjunta de peso, comprimento e PC.`});
 const extremes=metrics.filter(([key])=>Number.isFinite(current[key])&&Number.isFinite(current.scores?.[key]?.z)&&Math.abs(current.scores[key].z)>2).map(([key,label])=>`${label}: Z ${fmt(current.scores[key].z)}`);
 if(extremes.length)notices.push({id:'POSITION',message:`Posição afastada da mediana (${extremes.join('; ')}). Confirme as medidas e avalie o padrão de crescimento e o contexto clínico. O valor isolado não estabelece diagnóstico de doença, desnutrição ou composição corporal.`});
 const elapsed=current.pmaDays-birthPmaDays;
 if(Number.isInteger(birthPmaDays)&&Number.isFinite(current.pmaDays)&&elapsed>=0&&elapsed<14)notices.push({id:'EARLY',message:'Primeiras duas semanas: a mudança do peso e do Z inclui adaptação hídrica, que pode coexistir com déficit nutricional. Avalie hidratação, edema, diurese, intercorrências e nutrientes efetivamente recebidos; a idade isolada não define o fim da adaptação.'});
 const lower=metrics.filter(([key])=>key!=='weight'&&Number.isFinite(current[key])).filter(([key])=>{const previous=rows.slice(0,-1).findLast(r=>Number.isFinite(r[key]));return previous&&current[key]<previous[key];}).map(([,label])=>label);
 if(lower.length)notices.push({id:'MEASUREMENT',message:`${lower.join(', ')} inferior(es) à aferição anterior disponível. Confira técnica, equipamento e registro; repita a aferição antes de atribuir significado biológico. Considere moldagem e edema na interpretação do PC.`});
 return notices;
}
export function fentonReadingRows(chart){
 if(!chart?.data?.measurements||!Array.isArray(chart.scores)||chart.scores.length!==chart.data.measurements.length)return [];
 return chart.data.measurements.map((m,i)=>{
  const scores={},s=chart.scores[i];
  for(const [key,field]of [['weight','weightGrams'],['length','lengthCm'],['head','headCm']])if(s?.weeks===m.weeks&&s?.days===m.days&&Number.isFinite(s[key]?.value)&&Math.abs(s[key].value-m[field])<=(key==='weight'?.5:.05))scores[key]=s[key];
  return {pmaDays:m.weeks*7+m.days,weight:m.weightGrams,length:m.lengthCm,head:m.headCm,scores};
 });
}
export function weightReadingText(trend,{reference,birthPmaDays,lastWeightPmaDays}){
 const comparison=Number.isInteger(birthPmaDays)&&Number.isInteger(lastWeightPmaDays)?` IPM ${age(birthPmaDays)} → ${age(lastWeightPmaDays)} (${lastWeightPmaDays-birthPmaDays} dias).`:'';
 const context=trend.reason??`${reference}.${comparison} Z do peso: ${fmt(trend.birthZ)} → ${fmt(trend.currentZ)}; ΔZ (atual − nascimento): ${fmt(-trend.dropZ)}. Limiar operacional do app: queda superior a 2 pontos; não é um corte diagnóstico universal validado. A ausência deste alerta não garante crescimento adequado.`;
 return {message:trend.risk?`Mudança do padrão de crescimento: revisar medidas e contexto clínico. Queda do Z do peso desde o nascimento: ${fmt(trend.dropZ)} pontos. Conferir hidratação, intercorrências e aporte efetivamente recebido; discutir o caso com especialista conforme avaliação.`:'',context};
}
export function renderGrowthReading(doc,id,rows,birthPmaDays){
 const target=doc.getElementById(id);
 target.replaceChildren(...growthReadingNotices(rows,birthPmaDays).map(({id,message})=>{const p=doc.createElement('p');p.className='notice '+(['EARLY','INCOMPLETE'].includes(id)?'info':'caution');p.dataset.readingNotice=id;p.textContent=message;return p;}));
}
