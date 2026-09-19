import {calculateEnteral,integrateNutrition,transitionLines} from './enteral.js';
import {createEnteralReport} from './enteral-pdf.js';
const num=v=>{const s=String(v??'').trim();if(s==='')return null;const n=Number(s.replace(',','.'));return Number.isFinite(n)?n:null};
const fmt=(n,digits=1)=>Number.isFinite(n)?n.toFixed(digits).replace('.',','):'—';
export function initEnteral(doc,getParenteral){
 let last=null,pdfUrl=null;
 const $=id=>doc.getElementById(id);
 const invalidate=()=>{last=null;$('en-result').hidden=true;$('en-pdf-download').hidden=true;$('en-pdf-status').textContent='';if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;}};
 $('npp-form').addEventListener('submit',invalidate);
 for(const event of ['input','change'])$('enteral-form').addEventListener(event,invalidate);
 const type=$('en-type'),lact=$('en-lactation-field'),fmField=$('en-fm85-field'),fm=$('en-fm85'),fmCustom=$('en-fm85-custom-field');
 const sync=()=>{const milk=type.value==='lmo'||type.value==='lhop';lact.hidden=type.value!=='lmo';fmField.hidden=!milk;if(!milk){fmCustom.hidden=true}};
 type.addEventListener('change',sync);fm.addEventListener('change',()=>fmCustom.hidden=fm.value!=='custom');sync();
 $('enteral-form').addEventListener('submit',e=>{e.preventDefault();const errors=[];
   if(!type.value)errors.push('Selecione o tipo de dieta.');
   const rate=num($('en-rate').value);if(rate===null||rate<0)errors.push('Informe uma taxa enteral válida.');
   const ld=num($('en-lactation').value);if(type.value==='lmo'&&(ld===null||ld<0))errors.push('Informe os dias de lactação.');
   const ae=num($('en-energy').value),ap=num($('en-protein').value);if((ae===null)!==(ap===null))errors.push('Para composição analisada, informe energia e proteína.');
   let fort=fm.value==='custom'?num($('en-fm85-custom').value):num(fm.value);if(fort===null)fort=0;if(fort<0)errors.push('Informe uma concentração válida de FM85.');
   invalidate();$('en-errors').hidden=!errors.length;$('en-errors').textContent=errors.join(' ');if(errors.length)return;
   const opts={type:type.value,rate,lactationDays:ld,fm85GramsPer100mL:fort};if(ae!==null&&ap!==null){opts.analyzedEnergy=ae;opts.analyzedProtein=ap}
   try{const en=calculateEnteral(opts),pn=getParenteral?.()||{},all=integrateNutrition({parenteral:pn,enteral:en});last={enteral:en,integrated:all};
     $('en-context').innerHTML=`<span>${en.composition.label}</span><span>${fmt(en.composition.energy)} kcal/100 mL</span><span>${fmt(en.composition.protein)} g proteína/100 mL</span>`;
     $('en-summary').innerHTML=`<div class="summary-row"><span>Taxa enteral</span><strong>${fmt(en.rate)} mL/kg/dia</strong></div><div class="summary-row"><span>Energia enteral</span><strong>${fmt(en.calories)} kcal/kg/dia</strong></div><div class="summary-row"><span>Proteína enteral</span><strong>${fmt(en.protein)} g/kg/dia</strong></div>`;
     $('en-estimated-note').hidden=!en.composition.estimated;
     const rows=[['Taxa hídrica',all.parenteral.fluid,all.enteral.fluid,all.total.fluid,'mL/kg/dia'],['Energia',all.parenteral.calories,all.enteral.calories,all.total.calories,'kcal/kg/dia'],['Proteína',all.parenteral.protein,all.enteral.protein,all.total.protein,'g/kg/dia']];
     $('en-total-rows').innerHTML=rows.map(r=>`<tr><td>${r[0]}<span>${r[4]}</span></td><td>${fmt(r[1],r[0]==='Proteína'?2:1)}</td><td>${fmt(r[2],r[0]==='Proteína'?2:1)}</td><td><strong>${fmt(r[3],r[0]==='Proteína'?2:1)}</strong></td></tr>`).join('');
     $('en-pn-note').textContent=(pn.fluid||pn.calories||pn.protein)?'Totais calculados com a última NP individualizada disponível nesta sessão.':'Sem NP individualizada calculada nesta sessão; a coluna PN está zerada.';
     $('en-transition').replaceChildren(...transitionLines(all).map(line=>{const p=doc.createElement('p');p.textContent=line;return p;}));
     $('en-result').hidden=false;
   }catch(err){$('en-errors').hidden=false;$('en-errors').textContent=err.message}
 });
$('en-export').addEventListener('click',async()=>{if(!last)return;const snapshot=last;$('en-export').disabled=true;$('en-pdf-status').textContent='Preparando PDF no aparelho…';try{const bytes=await createEnteralReport(snapshot);if(last!==snapshot)return;const blob=new Blob([bytes],{type:'application/pdf'});if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(blob);const link=$('en-pdf-download');link.href=pdfUrl;link.download='GROW_NEO-aporte-nutricional-total.pdf';link.hidden=false;link.click();$('en-pdf-status').textContent='PDF gerado.';}catch(e){$('en-pdf-status').textContent='Não foi possível gerar o PDF.';}finally{$('en-export').disabled=false;}});
 return {invalidate};
}
