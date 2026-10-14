import {parseNumber,parseWeightGrams} from './engine.js';
import {calculateIntergrowth} from './intergrowth.js';
import {calculateIntergrowthVelocity} from './intergrowth-velocity.js';
import {createIntergrowthChart} from './intergrowth-charts.js';
import {exportIntergrowthPdf,exportIntergrowthSummaryPdf} from './intergrowth-pdf.js';
import {serialIntergrowthVelocity,decodeIntergrowthFollowup,encodeIntergrowthFollowup} from './intergrowth-followup.js';
import {initIntergrowthTools} from './intergrowth-tools-ui.js';

const metrics=[['weight','Peso','g'],['length','Comprimento','cm'],['head','Perímetro cefálico','cm']];
const number=(value,digits=2)=>value.toFixed(digits).replace('.',',');
const percentile=value=>value<.1?'<0,1':value>99.9?'>99,9':number(value,1);
const age=row=>`${row.weeks} sem + ${row.days} d`;
const measurement=(metric,value)=>metric==='weight'?`${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(value)} g`:`${number(value,1)} cm`;

export function readIntergrowthForm(form){
 return {
  sex:form.querySelector('#ig-sex').value,
  measurements:Array.from(form.querySelectorAll('.ig-measure')).map(row=>{
   const get=field=>row.querySelector(`[data-field="${field}"]`).value.trim();
   const result={weeks:parseNumber(get('weeks')),days:parseNumber(get('days'))};
   for(const [field] of metrics)if(get(field)!=='')result[field]=field==='weight'?parseWeightGrams(get(field)):parseNumber(get(field));
   return result;
  })
 };
}

export function initIntergrowth(doc,{calculate=calculateIntergrowth,chart=createIntergrowthChart,pdf=exportIntergrowthPdf,summaryPdf=exportIntergrowthSummaryPdf,urls=globalThis.URL}={}){
 const $=id=>doc.getElementById(id),form=$('ig-form'),rows=$('ig-measures'),status=$('ig-status');
 const resultSection=$('ig-result'),charts=$('ig-charts'),table=$('ig-result-rows');
 const exportButton=$('ig-export'),summaryButton=$('ig-export-summary'),download=$('ig-pdf-download'),add=$('ig-add'),errors=$('ig-errors');
 const velocityStart=$('ig-velocity-start'),velocityEnd=$('ig-velocity-end'),velocityButton=$('ig-velocity-calculate'),velocityOutput=$('ig-velocity-result'),velocityError=$('ig-velocity-error');
 const setExportDisabled=value=>{exportButton.disabled=value;summaryButton.disabled=value;};
 let last=null,pdfUrl=null,revision=0,busy=false;const chartUrls=[];
 const listeners=new Set(),notify=()=>{for(const listener of listeners)listener();};
 const text=(tag,value,cls)=>{const element=doc.createElement(tag);element.textContent=value;if(cls)element.className=cls;return element;};
 const clearDownload=()=>{
  download.hidden=true;download.removeAttribute('href');
  if(pdfUrl)urls.revokeObjectURL(pdfUrl);pdfUrl=null;
 };
 const clearVelocityOutput=()=>{
  velocityOutput.replaceChildren();velocityOutput.hidden=true;velocityError.textContent='';velocityError.hidden=true;
 };
 const clear=()=>{
  revision++;last=null;resultSection.hidden=true;charts.replaceChildren();table.replaceChildren();$('ig-context').replaceChildren();
  for(const url of chartUrls)urls.revokeObjectURL(url);chartUrls.length=0;
  setExportDisabled(true);clearDownload();clearVelocityOutput();
  for(const select of [velocityStart,velocityEnd]){select.replaceChildren();select.disabled=true;}
  velocityButton.disabled=true;$('ig-velocity-help').textContent='';
  errors.hidden=true;errors.textContent='';status.textContent='';notify();
 };
 const prepareVelocity=()=>{
  const eligible=last.measurements.map((row,index)=>({row,index})).filter(({row})=>row.weight!=null);
  for(const select of [velocityStart,velocityEnd]){
   for(const {row,index} of eligible){const option=text('option',`Medida ${index+1} · ${age(row)} · ${measurement('weight',row.weight)}`);option.value=String(index);select.append(option);}
   select.disabled=eligible.length<2;
  }
  if(eligible.length){velocityStart.options[0].selected=true;velocityEnd.options[eligible.length-1].selected=true;}
  velocityButton.disabled=eligible.length<2;
  $('ig-velocity-help').textContent=eligible.length<2?'Informe peso em pelo menos duas avaliações para calcular a velocidade.':'As avaliações inicial e final podem ser alteradas para escolher o período de acompanhamento.';
 };
 const invalidateVelocity=()=>{
  if(!last)return;
  const {velocity,...result}=last;last=result;revision++;clearDownload();clearVelocityOutput();
  status.textContent='Intervalo alterado; calcule novamente a velocidade ponderal.';
  notify();
 };
 velocityStart.addEventListener('change',invalidateVelocity);velocityEnd.addEventListener('change',invalidateVelocity);
 velocityButton.addEventListener('click',()=>{
  if(!last||velocityButton.disabled)return;
  invalidateVelocity();
  try{
   const velocity=calculateIntergrowthVelocity(last,Number(velocityStart.value),Number(velocityEnd.value));
   last={...last,velocity};
   velocityOutput.append(text('p',`Medidas ${velocity.initialEvaluation} a ${velocity.finalEvaluation} · ${velocity.intervalDays} dias · ${measurement('weight',velocity.startWeight)} → ${measurement('weight',velocity.endWeight)}`),
    text('p',`Variação de peso: ${measurement('weight',velocity.totalGain)} · Peso médio: ${measurement('weight',velocity.averageWeight)}`),
    text('p',`${number(velocity.gramsPerDay,1)} g/dia · ${number(velocity.gramsPerKgDay,1)} g/kg/dia`));
   velocityOutput.hidden=false;status.textContent='Velocidade ponderal calculada e incluída nos próximos PDFs.';notify();
  }catch(error){velocityError.textContent=error.message;velocityError.hidden=false;status.textContent='Confira o intervalo selecionado para a velocidade ponderal.';}
 });
 const invalidate=()=>{const hadResult=last!==null||busy;clear();if(hadResult)status.textContent='Medidas alteradas; gere novamente as curvas e os resultados.';};
 const renumber=()=>{
  Array.from(rows.children).forEach((row,index)=>{
   row.querySelector('legend').textContent=`Medida ${index+1}`;
   row.querySelector('[data-remove]').disabled=rows.children.length===1;
  });
  add.disabled=rows.children.length>=20;
 };
 function addRow(values=null){
  if(rows.children.length>=20)return;
  const row=doc.createElement('fieldset');row.className='ig-measure';
  row.innerHTML='<legend></legend><div class="ig-measure-fields">'+
   '<label>IPM (semanas)<input data-field="weeks" inputmode="numeric" type="text" aria-label="IPM em semanas" required></label>'+
   '<label>Dias adicionais<input data-field="days" inputmode="numeric" type="text" value="0" aria-label="Dias adicionais da IPM" required></label>'+
   '<label>Peso (g)<input data-field="weight" inputmode="decimal" type="text" aria-label="Peso em gramas"></label>'+
   '<label>Comprimento (cm)<input data-field="length" inputmode="decimal" type="text" aria-label="Comprimento em centímetros"></label>'+
   '<label>PC (cm)<input data-field="head" inputmode="decimal" type="text" aria-label="Perímetro cefálico em centímetros"></label></div>';
  const remove=text('button','Remover medida','text-button');remove.type='button';remove.setAttribute('data-remove','');
  remove.addEventListener('click',()=>{if(rows.children.length===1)return;row.remove();renumber();invalidate();});
  row.append(remove);rows.append(row);if(values)for(const [key,value] of Object.entries(values)){const input=row.querySelector(`[data-field="${key}"]`);if(input)input.value=String(value).replace('.',',');}renumber();
 }
 add.addEventListener('click',()=>{addRow();invalidate();});
 form.addEventListener('input',invalidate);form.addEventListener('change',invalidate);
 const readBirth=()=>{
  const weeks=$('ig-birth-weeks').value.trim(),days=$('ig-birth-days').value.trim();
  if(weeks===''&&(days===''||days==='0'))return null;
  const w=parseNumber(weeks),d=parseNumber(days);
  if(!Number.isInteger(w)||!Number.isInteger(d)||w<22||w>41||d<0||d>6)throw new Error('Confira a IG ao nascer: 22+0 a 41+6 semanas.');
  return w*7+d;
 };
 const calculateResults=()=>{
  clear();
  try{
   const result=calculate(readIntergrowthForm(form));
   const birth=readBirth();if(birth!==null&&birth>result.measurements[0].pmaDays)throw new Error('A IG ao nascer não pode ser posterior às medidas.');
   const velocities=serialIntergrowthVelocity(result);
   const present=metrics.filter(([metric])=>result.measurements.some(row=>row[metric]!=null));
   $('ig-context').append(text('span',result.sex==='female'?'Feminino':'Masculino'),text('span',`${result.measurements.length} ${result.measurements.length===1?'medida':'medidas'}`),text('span','Idade pós-menstrual (IPM)'));
   for(const [index,row] of result.measurements.entries())for(const [metric,label] of metrics){
    if(row[metric]==null)continue;
    const tr=doc.createElement('tr'),value=text('td',label),score=row.scores[metric],pmaCell=text('td',age(row));
    pmaCell.append(text('span',`Medida ${index+1}`));
    value.append(text('span',measurement(metric,row[metric])));
    tr.append(pmaCell,value,text('td',number(score.z)),text('td',percentile(score.percentile)),text('td',metric==='weight'&&velocities[index]!=null?number(velocities[index],1):'—'));
    tr.dataset.measurement=String(index+1);table.append(tr);
   }
   for(const [metric,label] of present){
    const figure=doc.createElement('figure');figure.className='ig-chart';
    const viewport=text('div','','ig-chart-viewport');viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label',`Gráfico de ${label.toLowerCase()}, com rolagem horizontal`);
    const svg=chart(doc,{sex:result.sex,metric,measurements:result.measurements});viewport.append(svg);
    const imageDownload=text('a','Baixar gráfico SVG','download-link');imageDownload.download=`GROW_NEO-INTERGROWTH-${metric}.svg`;
    imageDownload.addEventListener('click',event=>{
     if(!last){event.preventDefault();return;}if(imageDownload.hasAttribute('href'))return;
     svg.setAttribute('xmlns','http://www.w3.org/2000/svg');const url=urls.createObjectURL(new Blob([svg.outerHTML],{type:'image/svg+xml'}));chartUrls.push(url);imageDownload.href=url;
    });
    figure.append(text('figcaption',label),viewport,imageDownload);charts.append(figure);
   }
   last=result;prepareVelocity();resultSection.hidden=false;setExportDisabled(busy);
   status.textContent='Curvas e escores calculados neste aparelho.';notify();
  }catch(error){clear();errors.textContent=error.message;errors.hidden=false;}
  return last;
 };
 form.addEventListener('submit',event=>{event.preventDefault();calculateResults();});
 const generatePdf=async(summary=false)=>{
  if(!last||busy)return;
  const snapshot=last,currentRevision=revision;busy=true;setExportDisabled(true);
  clearDownload();
  status.textContent='Preparando PDF no aparelho…';
  try{
   const bytes=await (summary?summaryPdf:pdf)(snapshot);
   if(last!==snapshot||revision!==currentRevision)return;
   if(pdfUrl)urls.revokeObjectURL(pdfUrl);
   pdfUrl=urls.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
   download.href=pdfUrl;download.download=summary?'GROW_NEO-INTERGROWTH-21st-1-pagina.pdf':'GROW_NEO-INTERGROWTH-21st.pdf';
   download.textContent=summary?'Baixar curvas em 1 página (PDF)':'Baixar relatório detalhado (PDF)';download.hidden=false;
   status.textContent=summary?'PDF de 1 página pronto. Use o link abaixo para baixar.':'Relatório detalhado pronto. Use o link abaixo para baixar.';
  }catch(error){if(last===snapshot&&revision===currentRevision)status.textContent='Não foi possível gerar o PDF. Tente novamente.';}
  finally{busy=false;setExportDisabled(last===null);}
 };
 exportButton.addEventListener('click',()=>generatePdf());
 summaryButton.addEventListener('click',()=>generatePdf(true));
 const reset=()=>{
  clear();for(const option of $('ig-sex').options)option.selected=false;$('ig-sex').options[0].selected=true;
  rows.replaceChildren();addRow();
  $('ig-birth-weeks').value='';$('ig-birth-days').value='0';$('ig-assessment').value='';notify();
 };
 $('ig-clear').addEventListener('click',reset);addRow();
 const api={reset,invalidate,getResult:()=>last,readBirth,subscribe:listener=>{listeners.add(listener);return ()=>listeners.delete(listener);},
  ensureResult:()=>{if(last)return last;const value=calculateResults();if(!value)throw new Error(errors.textContent||'Confira as medidas INTERGROWTH.');return value;},
  readFollowup:()=>({input:readIntergrowthForm(form),birthPmaDays:readBirth(),assessment:$('ig-assessment').value}),
  restore:content=>{
   const value=decodeIntergrowthFollowup(encodeIntergrowthFollowup(content));
   clear();for(const option of $('ig-sex').options)option.selected=false;
   Array.from($('ig-sex').options).find(option=>option.value===value.input.sex).selected=true;
   rows.replaceChildren();for(const measurement of value.input.measurements)addRow(measurement);
   $('ig-birth-weeks').value=value.birthPmaDays===null?'':String(Math.floor(value.birthPmaDays/7));$('ig-birth-days').value=String(value.birthPmaDays===null?0:value.birthPmaDays%7);$('ig-assessment').value=value.assessment;notify();
  }
 };
 initIntergrowthTools(doc,{intergrowth:api,urls});
 return api;
}
