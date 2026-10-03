import {dosingWeightLabel} from './dosing-weight.js';
import {calculateEnteral,integrateNutrition,enteralNutrientWarnings,transitionLines,clinicalReferenceLines,IV_SOURCES,IV_MEMBERS} from './enteral.js';
import {createEnteralReport} from './enteral-pdf.js';
const num=v=>{const s=String(v??'').trim();if(s==='')return null;const n=Number(s.replace(',','.'));return Number.isFinite(n)?n:null};
const fmt=(n,digits=1)=>Number.isFinite(n)?n.toFixed(digits).replace('.',','):'—';
export function initEnteral(doc,getParenteral,getGrowth=()=>null){
 let last=null,pdfUrl=null,downloadSnapshot=null;
 const $=id=>doc.getElementById(id);
 const energyInput=$('en-energy'),energyWarning=$('en-energy-warning');
 const syncEnergyWarning=()=>{
   const value=num(energyInput.value),nonNumeric=energyInput.value.trim()!==''&&value===null,invalid=nonNumeric||(value!==null&&value<0);
   energyInput.setAttribute('aria-invalid',String(invalid));energyInput.closest('.field').classList.toggle('invalid',invalid);
   energyWarning.hidden=!invalid;
   energyWarning.textContent=nonNumeric?'Energia inválida: informe um número finito e recalcule.':invalid?'Energia negativa: informação inválida. Será usado 0 kcal/100 mL para a energia do leite no cálculo; o valor digitado será preservado. Revise o valor e recalcule. O FM85, se selecionado, é somado separadamente.':'';
 };
 for(const event of ['input','change'])energyInput.addEventListener(event,syncEnergyWarning);
 syncEnergyWarning();
 const proteinInput=$('en-protein'),proteinWarning=$('en-protein-warning');
 const syncProteinWarning=()=>{
   const value=num(proteinInput.value),nonNumeric=proteinInput.value.trim()!==''&&value===null,invalid=nonNumeric||(value!==null&&value<0);
   proteinInput.setAttribute('aria-invalid',String(invalid));proteinInput.closest('.field').classList.toggle('invalid',invalid);
   proteinWarning.hidden=!invalid;
   proteinWarning.textContent=nonNumeric?'Proteína inválida: informe um número finito e recalcule.':invalid?'Proteína negativa: informação inválida. Será usado 0 g/100 mL para a proteína do leite no cálculo; o valor digitado será preservado. Revise o valor e recalcule. A proteína do FM85, se selecionado, é somada separadamente.':'';
 };
 for(const event of ['input','change'])proteinInput.addEventListener(event,syncProteinWarning);
 syncProteinWarning();
 const invalidate=()=>{last=null;downloadSnapshot=null;$('en-result').hidden=true;$('en-pdf-download').hidden=true;$('en-pdf-download').removeAttribute('href');$('en-pdf-status').textContent='';if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;}};
 const uses=source=>IV_MEMBERS[$('en-source').value]?.includes(source);
 for(const [source,formId] of [['individual','npp-form'],['standard','std-form'],['hydration','hv-form']])for(const event of ['input','change','submit'])$(formId).addEventListener(event,()=>{if(uses(source))invalidate();});
 $('hv-form').addEventListener('hv-review-change',()=>{if(uses('hydration'))invalidate();});
 $('acknowledgements').addEventListener('change',()=>{if(uses('individual'))invalidate();});
 for(const event of ['input','change'])$('enteral-form').addEventListener(event,invalidate);
 const type=$('en-type'),lact=$('en-lactation-field'),fmField=$('en-fm85-field'),fm=$('en-fm85'),fmCustom=$('en-fm85-custom-field');
 const sync=()=>{const milk=type.value==='lmo'||type.value==='lhop';lact.hidden=type.value!=='lmo';fmField.hidden=!milk;if(!milk){for(const option of fm.options)option.removeAttribute('selected');fm.options[0].selected=true;fmCustom.hidden=true;$('en-fm85-custom').value=''}};
 type.addEventListener('change',sync);fm.addEventListener('change',()=>fmCustom.hidden=fm.value!=='custom');sync();
 const calculate=()=>{syncEnergyWarning();syncProteinWarning();const errors=[];
   const source=$('en-source').value;if(!Object.hasOwn(IV_SOURCES,source))errors.push('Selecione o aporte intravenoso em uso.');
   if(!type.value)errors.push('Selecione o tipo de dieta.');
   const rate=num($('en-rate').value);if(rate===null||rate<0)errors.push('Informe uma taxa enteral válida.');
   const ld=num($('en-lactation').value);if(type.value==='lmo'&&(ld===null||ld<0))errors.push('Informe os dias de lactação.');
   const ae=num($('en-energy').value),ap=num($('en-protein').value);if((ae===null)!==(ap===null))errors.push('Para composição analisada, informe energia e proteína.');
   if(energyInput.value.trim()!==''&&ae===null)errors.push('Energia inválida: informe um número finito e recalcule.');
   if(proteinInput.value.trim()!==''&&ap===null)errors.push('Proteína inválida: informe um número finito e recalcule.');
   const fortPer25=fm.value==='custom'?num($('en-fm85-custom').value):num(fm.value);
   if(fortPer25===null&&fm.value==='custom')errors.push('Informe a concentração média de FM85 em g/25 mL.');
   if(fortPer25!==null&&fortPer25<0)errors.push('Informe uma concentração válida de FM85.');
   const fort=(fortPer25??0)*4;
   const clinical={phase:$('en-phase').value,birthWeight:num($('en-birth-weight').value),gestationalAge:num($('en-gestational-age').value)};
   for(const [id,value,max,label] of [['en-birth-weight',clinical.birthWeight,10000,'peso ao nascer'],['en-gestational-age',clinical.gestationalAge,45,'idade gestacional']])if($(id).value.trim()&&(value===null||value<=0||value>max))errors.push(`Informe ${label} válido.`);
   invalidate();$('en-errors').hidden=!errors.length;$('en-errors').textContent=errors.join(' ');if(errors.length)return;
   const opts={type:type.value,rate,lactationDays:ld,fm85GramsPer100mL:fort};if(ae!==null&&ap!==null){opts.analyzedEnergy=ae;opts.analyzedProtein=ap}
   try{const en=calculateEnteral(opts),pn=source==='none'?{}:getParenteral(source),all=integrateNutrition({parenteral:pn,enteral:en,source});last={enteral:en,integrated:all,clinical};
     $('en-context').innerHTML=`<span>${en.composition.label}</span><span>${fmt(en.composition.energy)} kcal/100 mL</span><span>${fmt(en.composition.protein,2)} g proteína/100 mL</span>`;
     $('en-summary').innerHTML=`<div class="summary-row"><span>Taxa enteral</span><strong>${fmt(en.rate)} mL/kg/dia</strong></div><div class="summary-row"><span>Energia enteral</span><strong>${fmt(en.calories)} kcal/kg/dia</strong></div><div class="summary-row"><span>Proteína enteral</span><strong>${fmt(en.protein,2)} g/kg/dia</strong></div>`;
     $('en-estimated-note').hidden=!en.composition.estimated;
     const nutrientWarnings=enteralNutrientWarnings(en,all);
     $('en-nutrient-result-warning').hidden=!nutrientWarnings.length;
     $('en-nutrient-result-warning').replaceChildren(...nutrientWarnings.map(line=>{const p=doc.createElement('p');p.textContent=line;return p;}));
     const combined=!!all.intravenousComponents;
     const columns=combined?[all.intravenousComponents.np,all.intravenousComponents.hv,all.enteral,all.total]:[all.parenteral,all.enteral,all.total];
     const rows=[['Taxa hídrica','fluid','mL/kg/dia'],['Energia','calories','kcal/kg/dia'],['Proteína','protein','g/kg/dia']];
     $('en-total-rows').innerHTML=rows.map(([label,key,unit])=>`<tr><td>${label}<span>${unit}</span></td>${columns.map((c,index)=>`<td>${index===columns.length-1?'<strong>':''}${fmt(c[key],key==='protein'?2:1)}${index===columns.length-1?'</strong>':''}</td>`).join('')}</tr>`).join('');
     $('en-hv-heading').hidden=!combined;
     $('en-iv-heading').textContent=source==='hydration'?'HV':source==='none'?'IV (zero)':'NP';
     $('en-pn-note').textContent=`Fonte: ${all.sourceLabel}. ${source==='none'?'Totais somente da dieta enteral.':`Cálculo atual da aba correspondente${all.weightContext?' · '+dosingWeightLabel(all.weightContext):Number.isFinite(all.weight)?' · peso de cálculo '+new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(all.weight*1000)+' g':''}.`}${pn.formulation==='2in1'?' Lipídios infundidos à parte não estão incluídos neste total.':''}`;
     $('en-transition').replaceChildren(...transitionLines(all).map(line=>{const p=doc.createElement('p');p.textContent=line;return p;}));
     $('en-clinical-reference').replaceChildren(...clinicalReferenceLines(all,clinical).map(line=>{const p=doc.createElement('p');p.textContent=line;return p;}));
     $('en-result').hidden=false;
   }catch(err){$('en-errors').hidden=false;$('en-errors').textContent=err.message}
   return last;
 };
 $('enteral-form').addEventListener('submit',e=>{e.preventDefault();calculate();});
 const prepareReport=()=>{
   const result=calculate();
   if(!result)throw new Error('Na aba Enteral: '+$('en-errors').textContent);
   return result;
 };
 const validateSource=snapshot=>{if(snapshot.integrated.source!=='none')getParenteral(snapshot.integrated.source);};
 $('en-pdf-download').addEventListener('click',event=>{try{if(!last||downloadSnapshot!==last)throw new Error('Recalcule o aporte total.');validateSource(last);}catch(error){event.preventDefault();invalidate();$('en-pdf-status').textContent=error.message;}});
 $('en-export').addEventListener('click',async()=>{
   if(!last)return;const snapshot=last,growth=getGrowth();$('en-export').disabled=true;$('en-pdf-status').textContent='Preparando PDF no aparelho…';
   try{validateSource(snapshot);const bytes=await createEnteralReport({...snapshot,growth});if(last!==snapshot||getGrowth()!==growth)return;validateSource(snapshot);
     const blob=new Blob([bytes],{type:'application/pdf'});if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(blob);downloadSnapshot=snapshot;
     const link=$('en-pdf-download');link.href=pdfUrl;link.download='GROW_NEO-aporte-nutricional-total.pdf';link.hidden=false;link.click();$('en-pdf-status').textContent=growth?'PDF gerado com os dados de crescimento.':'PDF gerado. Calcule a aba GROW_Fenton para incluí-la no relatório.';
   }catch(error){if(last===snapshot){invalidate();$('en-pdf-status').textContent=error.message||'Não foi possível gerar o PDF.';}}finally{$('en-export').disabled=false;}
 });
 return {invalidate,getResult:()=>last,prepareReport};
}
