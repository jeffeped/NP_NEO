import {parseNumber,parseWeightGrams} from './engine.js';
import {FENTON_PROXY_URL} from './fenton-config.js';
import {parseFentonScores} from './fenton-scores.js';

const whole=value=>/^\d+$/.test(value.trim())?Number(value.trim()):NaN;
const cleanUrl=url=>{
 try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.search&&!parsed.hash?parsed.href.replace(/\/$/,''):'';}
 catch{return '';}
};
const fields=['weeks','days','weightGrams','headCm','lengthCm'];
const rowHtml=`<label>IPM (semanas)<input data-field="weeks" inputmode="numeric" aria-label="IPM em semanas"></label>
 <label>Dias<input data-field="days" inputmode="numeric" value="0" aria-label="Dias adicionais da IPM"></label>
 <label>Peso (g)<input data-field="weightGrams" inputmode="decimal" aria-label="Peso em gramas"></label>
 <label>PC (cm)<input data-field="headCm" inputmode="decimal" aria-label="Perímetro cefálico em centímetros"></label>
 <label>Comprimento (cm)<input data-field="lengthCm" inputmode="decimal" aria-label="Comprimento em centímetros"></label>`;

export function readFentonForm(form){
 const value=id=>form.querySelector('#'+id)?.value??'';
 const sex=value('fenton-sex'),birthGaWeeks=whole(value('fenton-ga-weeks')),birthGaDays=whole(value('fenton-ga-days'));
 if(!['F','M'].includes(sex)||!Number.isInteger(birthGaWeeks)||birthGaWeeks<22||birthGaWeeks>42||!Number.isInteger(birthGaDays)||birthGaDays<0||birthGaDays>6)throw new Error('Informe sexo e idade gestacional ao nascer (22–42 semanas).');
 const measurements=Array.from(form.querySelectorAll('.fenton-measure')).map(el=>{
  const get=k=>el.querySelector(`[data-field="${k}"]`).value.trim();
  const row={weeks:whole(get('weeks')),days:whole(get('days'))};
  for(const key of fields.slice(2)){
   const raw=get(key);
   if(raw)row[key]=key==='weightGrams'?parseWeightGrams(raw):parseNumber(raw);
  }
  return row;
 });
 if(!measurements.length||measurements.length>20)throw new Error('Informe de 1 a 20 medições.');
 let previous=-1;
 for(const [idx,row] of measurements.entries()){
  const age=row.weeks+row.days/7;
  if(!Number.isInteger(row.weeks)||!Number.isInteger(row.days)||row.days<0||row.days>6||age<22||age>50||age<birthGaWeeks+birthGaDays/7||age<=previous)throw new Error(`Confira a IPM da medida ${idx+1}; as idades precisam estar em ordem crescente, entre 22 e 50 semanas.`);
  previous=age;
  if(!fields.slice(2).some(k=>row[k]!=null))throw new Error(`Informe pelo menos uma medida antropométrica na linha ${idx+1}.`);
  if(row.weightGrams!=null&&!(row.weightGrams>=100&&row.weightGrams<=20000)||row.headCm!=null&&!(row.headCm>=10&&row.headCm<=60)||row.lengthCm!=null&&!(row.lengthCm>=15&&row.lengthCm<=90))throw new Error(`Confira as unidades e os valores da medida ${idx+1}.`);
 }
 return {sex,birthGaWeeks,birthGaDays,measurements};
}

export function initFenton(doc,{proxyUrl=FENTON_PROXY_URL,fetcher=globalThis.fetch,urls=globalThis.URL}={}){
 const section=doc.getElementById('fenton-integration');
 const base=cleanUrl(proxyUrl);
 if(!base)return;
 section.hidden=false;
 const form=doc.getElementById('fenton-form'),rows=doc.getElementById('fenton-measures');
 const status=doc.getElementById('fenton-status'),add=doc.getElementById('fenton-add');
 const figure=doc.getElementById('fenton-figure'),chart=doc.getElementById('fenton-chart');
 const chartLink=doc.getElementById('fenton-chart-download'),csvLink=doc.getElementById('fenton-csv-download'),pdfLink=doc.getElementById('fenton-pdf-download');
 const jobs=[doc.getElementById('fenton-chart-button'),doc.getElementById('fenton-pdf-button'),doc.getElementById('fenton-z-button')];
 let chartUrl=null,csvUrl=null,pdfUrl=null,busy=false,revision=0,chartResult=null,scoresResult=null;
 const clear=()=>{
  chartResult=scoresResult=null;
  if(chartUrl)urls.revokeObjectURL(chartUrl);
  if(csvUrl)urls.revokeObjectURL(csvUrl);
  if(pdfUrl)urls.revokeObjectURL(pdfUrl);
  chartUrl=csvUrl=pdfUrl=null;chart.removeAttribute('src');figure.hidden=true;
  chartLink.hidden=csvLink.hidden=pdfLink.hidden=true;chartLink.removeAttribute('href');csvLink.removeAttribute('href');pdfLink.removeAttribute('href');
 };
 const addRow=()=>{
  if(rows.children.length>=20){status.textContent='Máximo de 20 medições.';return;}
  const row=doc.createElement('div');row.className='fenton-measure';
  row.innerHTML=rowHtml;
  const remove=doc.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='Remover medida';
  remove.addEventListener('click',()=>{row.remove();revision++;clear();status.textContent='Medidas alteradas; gere novamente os resultados.';});
  row.append(remove);rows.append(row);
 };
 add.addEventListener('click',()=>{addRow();revision++;clear();status.textContent='';});
 addRow();
 const invalidate=()=>{revision++;clear();status.textContent='Medidas alteradas; gere novamente os resultados.';};
 form.addEventListener('input',invalidate);
 form.addEventListener('change',invalidate);
 async function request(kind){
  if(busy)return;
  let data;
  try{data=readFentonForm(form);}catch(err){status.textContent=err.message;return;}
  const currentRevision=revision;
  busy=true;jobs.forEach(button=>button.disabled=true);status.textContent='Consultando o serviço Fenton 2025…';
  try{
   const response=await fetcher(`${base}/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store'});
   if(!response.ok)throw new Error(response.status===429?'Muitas consultas em sequência. Aguarde e tente novamente.':'Não foi possível consultar a Fenton. Confira a conexão e tente novamente.');
   const file=await response.blob();
   if(currentRevision!==revision)return;
   if(kind==='chart'){
    if(file.type!=='image/jpeg')throw new Error('Formato de gráfico inesperado.');
    scoresResult=null;
    if(csvUrl)urls.revokeObjectURL(csvUrl);
    csvUrl=null;csvLink.hidden=true;csvLink.removeAttribute('href');
    if(chartUrl)urls.revokeObjectURL(chartUrl);
    chartUrl=urls.createObjectURL(file);chart.src=chartUrl;figure.hidden=false;
    chartResult={blob:file,data};
    chartLink.href=chartUrl;chartLink.hidden=false;status.textContent='Gráfico Fenton 2025 gerado. Consultando a tabela de escores…';
    try{
     const scoresResponse=await fetcher(`${base}/zscores`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store'});
     if(!scoresResponse.ok)throw new Error('Serviço de escores indisponível.');
     const scoresFile=await scoresResponse.blob();
     if(!scoresFile.type.startsWith('text/csv'))throw new Error('Formato de escores Z inesperado.');
     const scores=parseFentonScores(await scoresFile.text(),data);
     if(currentRevision!==revision)return;
     scoresResult={data,scores};
     if(csvUrl)urls.revokeObjectURL(csvUrl);
     csvUrl=urls.createObjectURL(scoresFile);csvLink.href=csvUrl;csvLink.hidden=false;
     status.textContent='Gráfico e tabela Fenton 2025 gerados.';
    }catch(error){if(currentRevision===revision)status.textContent=`Gráfico gerado; tabela indisponível: ${error.message} Tente novamente em Escores Z.`;}
   }else if(kind==='chart-pdf'){
    if(file.type!=='application/pdf')throw new Error('Formato de PDF inesperado.');
    if(pdfUrl)urls.revokeObjectURL(pdfUrl);
    pdfUrl=urls.createObjectURL(file);pdfLink.href=pdfUrl;pdfLink.hidden=false;
    status.textContent='Gráfico Fenton 2025 em PDF pronto para baixar.';
   }else{
    if(!file.type.startsWith('text/csv'))throw new Error('Formato de escores Z inesperado.');
    const scores=parseFentonScores(await file.text(),data);
    if(currentRevision!==revision)return;
    scoresResult={data,scores};
    if(csvUrl)urls.revokeObjectURL(csvUrl);
    csvUrl=urls.createObjectURL(file);csvLink.href=csvUrl;csvLink.hidden=false;
    status.textContent='Tabela de escores Z pronta para baixar.';
   }
  }catch(err){if(currentRevision===revision)status.textContent=err.message;}
  finally{busy=false;jobs.forEach(button=>button.disabled=false);}
 }
 form.addEventListener('submit',event=>{event.preventDefault();request('chart');});
 jobs[1].addEventListener('click',()=>request('chart-pdf'));
 jobs[2].addEventListener('click',()=>request('zscores'));
 return {read:()=>readFentonForm(form),getChart:()=>chartResult,getScores:()=>scoresResult,invalidate};
}
