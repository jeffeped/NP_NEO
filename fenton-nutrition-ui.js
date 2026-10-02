import {createFentonNutritionReport} from './fenton-nutrition-pdf.js';

export function initFentonNutritionReport(doc,{getNutrition,getGrowth,getChart,getScores=()=>null,validateNutrition=()=>{},createReport=createFentonNutritionReport,urls=globalThis.URL}){
 const button=doc.getElementById('fenton-total-export'),link=doc.getElementById('fenton-total-download'),status=doc.getElementById('fenton-total-status');
 let revision=0,url=null,busy=false,download=null;
 const invalidate=()=>{
  revision++;download=null;
  if(url)urls.revokeObjectURL(url);
  url=null;link.hidden=true;link.removeAttribute('href');
  status.textContent='';
 };
 // A report is valid only for the current inputs and calculated results.
 for(const id of ['npp-form','std-form','hv-form','enteral-form','growth-form','fenton-form']){
  const form=doc.getElementById(id);
  for(const event of ['input','change','submit'])form.addEventListener(event,invalidate);
 }
 for(const id of ['fenton-add','fenton-chart-button'])doc.getElementById(id).addEventListener('click',invalidate);
 doc.getElementById('fenton-measures').addEventListener('click',event=>{if(event.target.closest('button'))invalidate();});
 doc.getElementById('acknowledgements').addEventListener('change',invalidate);
 const current=s=>s&&s.nutrition===getNutrition()&&s.growth===getGrowth()&&s.chart===getChart()&&s.scores===getScores();
 link.addEventListener('click',event=>{
  try{if(!current(download))throw new Error('Dados alterados. Gere novamente o relatório.');validateNutrition(download.nutrition);}
  catch(error){event.preventDefault();invalidate();status.textContent=error.message;}
 });
 button.addEventListener('click',async()=>{
  if(busy)return;
  invalidate();
  const snapshot={nutrition:getNutrition(),growth:getGrowth(),chart:getChart(),scores:getScores()},version=revision;
  if(!snapshot.nutrition){status.textContent='Calcule o aporte total na aba Enteral antes de exportar.';return;}
  if(!snapshot.chart){status.textContent='Clique em Ver gráfico Fenton para gerar o gráfico das medidas atuais.';return;}
  if(!snapshot.scores){status.textContent='Gere a tabela de escores Z Fenton antes de exportar o PDF combinado.';return;}
  try{validateNutrition(snapshot.nutrition);}catch(error){status.textContent=error.message;return;}
  busy=true;button.disabled=true;status.textContent='Preparando relatório de duas páginas…';
  try{
   const bytes=await createReport(snapshot);
   if(version!==revision||!current(snapshot)){status.textContent='Dados alterados. Gere novamente o relatório.';return;}
   validateNutrition(snapshot.nutrition);
   url=urls.createObjectURL(new Blob([bytes],{type:'application/pdf'}));download=snapshot;
   link.href=url;link.download='GROW_NEO-aporte-total-Fenton.pdf';link.hidden=false;
   status.textContent='PDF pronto: página 1 com aportes e tabela Fenton; página 2 com o gráfico.';
   link.click();
  }catch(error){if(version===revision)status.textContent=error.message||'Não foi possível gerar o relatório.';}
  finally{busy=false;button.disabled=false;}
 });
 return {invalidate};
}
