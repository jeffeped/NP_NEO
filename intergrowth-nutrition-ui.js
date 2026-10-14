import {createIntergrowthNutritionReport} from './intergrowth-nutrition-pdf.js';

export function initIntergrowthNutritionReport(doc,{intergrowth,getNutrition,prepareNutrition=getNutrition,validateNutrition=()=>{},createReport=createIntergrowthNutritionReport,urls=globalThis.URL}){
 const $=id=>doc.getElementById(id),button=$('ig-total-export'),link=$('ig-total-download'),status=$('ig-total-status'),assessment=$('ig-assessment');
 let revision=0,url=null,busy=false,download=null;
 const invalidate=()=>{revision++;download=null;if(url)urls.revokeObjectURL(url);url=null;link.hidden=true;link.removeAttribute('href');status.textContent='';};
 for(const id of ['npp-form','std-form','hv-form','enteral-form','ig-form','ig-assessment','ig-velocity-start','ig-velocity-end'])for(const type of ['input','change','submit'])$(id).addEventListener(type,invalidate);
 intergrowth.subscribe(invalidate);
 $('acknowledgements').addEventListener('change',invalidate);$('hv-form').addEventListener('hv-review-change',invalidate);
 const current=s=>s&&s.nutrition===getNutrition()&&s.result===intergrowth.getResult()&&s.assessment===assessment.value;
 link.addEventListener('click',event=>{
  try{if(!current(download))throw new Error('Dados alterados. Gere novamente o relatório.');validateNutrition(download.nutrition);}
  catch(error){event.preventDefault();invalidate();status.textContent=error.message;}
 });
 button.addEventListener('click',async()=>{
  if(busy)return;invalidate();busy=true;button.disabled=true;
  let ticket;
  try{
   const nutrition=prepareNutrition();
   if(!nutrition)throw new Error('Calcule o aporte total na aba Enteral antes de exportar.');
   validateNutrition(nutrition);
   const result=intergrowth.ensureResult(),snapshot={nutrition,result,assessment:assessment.value};ticket=revision;
   if(!current(snapshot))throw new Error('Dados alterados. Gere novamente o relatório.');
   status.textContent='Preparando relatório integrado de duas páginas…';
   const bytes=await createReport(snapshot);
   if(ticket!==revision||!current(snapshot))throw new Error('Dados alterados. Gere novamente o relatório.');
   validateNutrition(nutrition);url=urls.createObjectURL(new Blob([bytes],{type:'application/pdf'}));download=snapshot;
   link.href=url;link.download='GROW_NEO-aporte-total-INTERGROWTH.pdf';link.hidden=false;link.click();
   status.textContent='Relatório pronto: 2 páginas. Use o link abaixo para baixar novamente.';
  }catch(error){status.textContent=ticket!==undefined&&ticket!==revision?'Dados alterados. Gere novamente o relatório.':error.message||'Não foi possível gerar o relatório.';}
  finally{busy=false;button.disabled=false;}
 });
 return {invalidate};
}
