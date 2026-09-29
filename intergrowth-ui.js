import {parseNumber,parseWeightGrams} from './engine.js';
import {calculateIntergrowth} from './intergrowth.js';
import {createIntergrowthChart} from './intergrowth-charts.js';
import {exportIntergrowthPdf,exportIntergrowthSummaryPdf} from './intergrowth-pdf.js';

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
 const setExportDisabled=value=>{exportButton.disabled=value;summaryButton.disabled=value;};
 let last=null,pdfUrl=null,revision=0,busy=false;
 const text=(tag,value,cls)=>{const element=doc.createElement(tag);element.textContent=value;if(cls)element.className=cls;return element;};
 const clear=()=>{
  revision++;last=null;resultSection.hidden=true;charts.replaceChildren();table.replaceChildren();$('ig-context').replaceChildren();
  setExportDisabled(true);download.hidden=true;download.removeAttribute('href');
  if(pdfUrl)urls.revokeObjectURL(pdfUrl);pdfUrl=null;
  errors.hidden=true;errors.textContent='';status.textContent='';
 };
 const invalidate=()=>{const hadResult=last!==null||busy;clear();if(hadResult)status.textContent='Medidas alteradas; gere novamente as curvas e os resultados.';};
 const renumber=()=>{
  Array.from(rows.children).forEach((row,index)=>{
   row.querySelector('legend').textContent=`Medida ${index+1}`;
   row.querySelector('[data-remove]').disabled=rows.children.length===1;
  });
  add.disabled=rows.children.length>=20;
 };
 function addRow(){
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
  row.append(remove);rows.append(row);renumber();
 }
 add.addEventListener('click',()=>{addRow();invalidate();});
 form.addEventListener('input',invalidate);form.addEventListener('change',invalidate);
 form.addEventListener('submit',event=>{
  event.preventDefault();clear();
  try{
   const result=calculate(readIntergrowthForm(form));
   const present=metrics.filter(([metric])=>result.measurements.some(row=>row[metric]!=null));
   $('ig-context').append(text('span',result.sex==='female'?'Feminino':'Masculino'),text('span',`${result.measurements.length} ${result.measurements.length===1?'medida':'medidas'}`),text('span','Idade pós-menstrual (IPM)'));
   for(const [index,row] of result.measurements.entries())for(const [metric,label] of metrics){
    if(row[metric]==null)continue;
    const tr=doc.createElement('tr'),value=text('td',label),score=row.scores[metric],pmaCell=text('td',age(row));
    pmaCell.append(text('span',`Medida ${index+1}`));
    value.append(text('span',measurement(metric,row[metric])));
    tr.append(pmaCell,value,text('td',number(score.z)),text('td',percentile(score.percentile)));
    tr.dataset.measurement=String(index+1);table.append(tr);
   }
   for(const [metric,label] of present){
    const figure=doc.createElement('figure');figure.className='ig-chart';
    const viewport=text('div','','ig-chart-viewport');viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label',`Gráfico de ${label.toLowerCase()}, com rolagem horizontal`);
    viewport.append(chart(doc,{sex:result.sex,metric,measurements:result.measurements}));
    figure.append(text('figcaption',label),viewport);charts.append(figure);
   }
   last=result;resultSection.hidden=false;setExportDisabled(busy);
   status.textContent='Curvas e escores calculados neste aparelho.';
  }catch(error){clear();errors.textContent=error.message;errors.hidden=false;}
 });
 const generatePdf=async(summary=false)=>{
  if(!last||busy)return;
  const snapshot=last,currentRevision=revision;busy=true;setExportDisabled(true);
  download.hidden=true;download.removeAttribute('href');
  if(pdfUrl)urls.revokeObjectURL(pdfUrl);pdfUrl=null;
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
 };
 $('ig-clear').addEventListener('click',reset);addRow();
 return {reset,invalidate,getResult:()=>last};
}
