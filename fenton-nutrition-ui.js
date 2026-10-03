import {createFentonNutritionReport} from './fenton-nutrition-pdf.js';

export function initFentonNutritionReport(doc,{getNutrition,getGrowth,getChart,prepareNutrition=getNutrition,prepareGrowth=getGrowth,ensureChart,validateNutrition=()=>{},createReport=createFentonNutritionReport,urls=globalThis.URL}){
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
 for(const id of ['fenton-add','fenton-chart-button','fenton-z-button','fenton-pdf-button'])doc.getElementById(id).addEventListener('click',invalidate);
 doc.getElementById('fenton-measures').addEventListener('click',event=>{if(event.target.closest('button'))invalidate();});
 doc.getElementById('acknowledgements').addEventListener('change',invalidate);
 doc.getElementById('hv-form').addEventListener('hv-review-change',invalidate);
 const current=s=>s&&s.nutrition===getNutrition()&&s.growth===getGrowth()&&s.chart===getChart();
 link.addEventListener('click',event=>{
  try{if(!current(download))throw new Error('Dados alterados. Gere novamente o relatório.');validateNutrition(download.nutrition);}
  catch(error){event.preventDefault();invalidate();status.textContent=error.message;}
 });
 button.addEventListener('click',async()=>{
  if(busy)return;
  invalidate();
  const version=revision;
  busy=true;button.disabled=true;status.textContent='Conferindo os dados do relatório…';
  try{
   const snapshot={nutrition:prepareNutrition(),growth:prepareGrowth(),chart:getChart()};
   if(!snapshot.nutrition)throw new Error('Calcule o aporte total na aba Enteral antes de exportar.');
   validateNutrition(snapshot.nutrition);
   if(ensureChart){
    status.textContent='Preparando gráfico e escores Fenton…';
    snapshot.chart=await ensureChart();
   }
   if(version!==revision||!current(snapshot))throw new Error('Dados alterados. Gere novamente o relatório.');
   if(!snapshot.chart)throw new Error('Clique em Ver gráfico Fenton para gerar o gráfico das medidas atuais.');
   if(!Array.isArray(snapshot.chart.scores)||snapshot.chart.scores.length!==snapshot.chart.data?.measurements?.length)throw new Error('A tabela de escores Fenton não está disponível para este gráfico. Gere novamente antes do PDF integrado.');
   validateNutrition(snapshot.nutrition);
   status.textContent='Preparando relatório de duas páginas…';
   const bytes=await createReport(snapshot);
   if(version!==revision||!current(snapshot)){status.textContent='Dados alterados. Gere novamente o relatório.';return;}
   validateNutrition(snapshot.nutrition);
   url=urls.createObjectURL(new Blob([bytes],{type:'application/pdf'}));download=snapshot;
   link.href=url;link.download='GROW_NEO-aporte-total-Fenton.pdf';link.hidden=false;
   status.textContent='Relatório pronto: 2 páginas. Se o download não iniciar, use Outras opções de exportação abaixo.';
   link.click();
  }catch(error){status.textContent=version!==revision?'Dados alterados. Gere novamente o relatório.':error.message||'Não foi possível gerar o relatório.';}
  finally{busy=false;button.disabled=false;}
 });
 return {invalidate};
}
