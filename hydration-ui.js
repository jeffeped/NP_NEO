import {dosingWeightLabel,measuredWeightLabel} from './dosing-weight.js';
import {calculateHydration,HYDRATION_COMPONENTS,HYDRATION_GLUCOSE_OSMOLARITY,HYDRATION_VOLUME_NOTE,formatHydrationNumber as f,formatHydrationVolume as fv} from './hydration.js';
import {createHydrationReport} from './hydration-pdf.js';
import {parseWeightGrams} from './engine.js';

export function initHydration(document){
  const $=id=>document.getElementById('hv-'+id);
  const form=$('form');
  $('electrolytes').innerHTML=HYDRATION_COMPONENTS.map(c=>`<div class="dose"><label class="field" for="hv-${c.id}">${c.name} · ${c.solution}<div class="input-box"><input id="hv-${c.id}" inputmode="decimal" type="text" placeholder="Informe a dose" required aria-label="HV: dose de ${c.name.toLowerCase()}"><span class="unit" data-hv-dose-unit>Selecione a unidade</span></div></label></div>`).join('');
  $('concentrations').innerHTML=HYDRATION_COMPONENTS.map(c=>`<label class="field">${c.solution}<div class="input-box"><input id="hv-concentration-${c.id}" inputmode="decimal" type="text" value="${String(c.concentration).replace('.',',')}" required aria-label="HV: equivalência de ${c.name.toLowerCase()}"><span class="unit">mEq/mL</span></div></label>`).join('');
  for(const id of ['sg5','sg50'])$('osm-'+id).value=String(HYDRATION_GLUCOSE_OSMOLARITY[id]).replace('.',',');
  let lastUnit=$('doseUnit').value,resultSnapshot=null,pdfUrl=null,downloadSnapshot=null,generationId=0;
  const invalidate=()=>{generationId++;$('review-ack').checked=false;$('review').hidden=true;resultSnapshot=null;downloadSnapshot=null;$('result').hidden=true;$('errors').hidden=true;$('empty').hidden=false;$('export').disabled=true;$('pdf-download').hidden=true;$('pdf-download').removeAttribute('href');$('pdf-status').textContent='';if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;}};
  form.addEventListener('input',invalidate);
  form.addEventListener('change',invalidate);
  $('doseUnit').addEventListener('change',()=>{
    const unit=$('doseUnit').value;
    if(lastUnit&&unit!==lastUnit){for(const c of HYDRATION_COMPONENTS)$(c.id).value='';$('unit-note').textContent='Unidade alterada: informe novamente as quatro doses. Os valores anteriores foram apagados para evitar conversão indevida.';}
    else $('unit-note').textContent='Informe zero quando não houver oferta do eletrólito. Não são sugeridas doses automaticamente.';
    lastUnit=unit;
    const label=unit==='perKgDay'?'mEq/kg/dia':unit==='totalDay'?'mEq/24 h':'Selecione a unidade';
    form.querySelectorAll('[data-hv-dose-unit]').forEach(el=>el.textContent=label);
  });
  const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;};
  function summary(label,value){const row=text('div','','summary-row');row.append(text('span',label),text('strong',value));return row;}
  function readInput(){
    const input={allowWfiReview:$('allow-wfi').checked===true,wfiClinicalReviewAcknowledged:$('review-ack').checked===true,access:form.querySelector('[name="hv-access"]:checked')?.value,doseUnit:$('doseUnit').value,concentrations:{},glucoseOsmolarity:{sg5:$('osm-sg5').value,sg50:$('osm-sg50').value}};
    for(const id of ['weight','fluid','vig','na','k','ca','mg'])input[id]=$(id).value;
    input.weight=parseWeightGrams($('weight').value)/1000;
    input.day=$('day').value;input.birthWeight=$('birth-weight').value.trim()===''?null:parseWeightGrams($('birth-weight').value)/1000;
    for(const c of HYDRATION_COMPONENTS)input.concentrations[c.id]=$('concentration-'+c.id).value;
    return input;
  }
  function renderResult(result,{scroll=true}={}){
    $('export').disabled=true;
    if(!result.ok){
      invalidate();
      const list=document.createElement('ul');
      for(const error of result.errors){list.append(text('li',error.message));const el=$(error.field==='birthWeight'?'birth-weight':error.field);el?.closest('.field')?.classList.add('invalid');const details=el?.closest('details');if(details)details.open=true;}
      $('errors').replaceChildren(list);$('errors').hidden=false;$('errors').scrollIntoView({block:'center'});return;
    }
    const resultVolume=fv;
    resultSnapshot=result;$('empty').hidden=true;$('result').hidden=false;
    $('summary').replaceChildren(text('p',measuredWeightLabel(result.input.weightContext),'help'),text('p',dosingWeightLabel(result.input.weightContext),'notice'),summary('VT = taxa hídrica × (peso em g ÷ 1000)',`${f(result.input.fluid)} × (${f(result.input.weight*1000)} g ÷ 1000) = ${resultVolume(result.totals.totalVolume)} mL/24 h`),summary('Glicose necessária = VIG × (peso em g ÷ 1000) × 60 × 24 ÷ 1000',`${f(result.input.vig)} × (${f(result.input.weight*1000)} g ÷ 1000) × 60 × 24 ÷ 1000 = ${f(result.totals.glucoseGrams)} g/24 h`),summary('Volume dos eletrólitos',`${resultVolume(result.totals.electrolytesVolume)} mL`),summary('VR = VT − volume dos eletrólitos',`${resultVolume(result.totals.totalVolume)} − ${resultVolume(result.totals.electrolytesVolume)} = ${resultVolume(result.totals.glucoseSolutionsVolume)} mL`),summary('Vazão em 24 horas',`${resultVolume(result.totals.infusion)} mL/h`));
    $('blocks').replaceChildren(...result.blocks.map(message=>text('div',message,'notice danger')));
    $('warnings').replaceChildren(...result.warnings.map(message=>text('div',message,'notice')));
    $('review-ack').disabled=!result.canReview;
    $('review-ack').checked=result.clinicalReviewAcknowledged;
    $('composition').hidden=!(result.canPrepare||result.canReview);$('review').hidden=!result.reviewRequired;
    $('rows').replaceChildren();
    if(result.canPrepare||result.canReview){
      const volume=fv;
      $('volume-note').textContent=HYDRATION_VOLUME_NOTE;
      for(const row of result.rows){
        const tr=document.createElement('tr');tr.dataset.hvComponent=row.id;
        const label=text('td',row.solution);label.append(text('span',`${f(row.amountMeq)} mEq/24 h · ${f(row.perKgDay)} mEq/kg/dia`),text('span',`Equivalência: ${f(row.concentration)} mEq/mL`));
        tr.append(label,text('td',volume(row.volume)));$('rows').append(tr);
      }
      for(const [id,name,volume] of [['sg5',result.reviewRequired?'SG 5%':'SG 5% · completar até o VT',result.mixture.sg5],['sg50','SG 50%',result.mixture.sg50],...(result.reviewRequired?[['water','Água para injetáveis · diluente da mistura',result.mixture.water]]:[])]){const tr=document.createElement('tr');tr.dataset.hvComponent=id;tr.append(text('td',name),text('td',(fv)(volume)));$('rows').append(tr);}
      if(result.reviewRequired)$('summary').append(summary('SG 5% = gG ÷ 0,05',`${fv(result.mixture.sg5)} mL`),summary('Água para injetáveis = VR − SG 5%',`${fv(result.mixture.water)} mL`));
      else $('summary').append(summary('SG 50% = [gG − (VR × 0,05)] ÷ 0,45',`${fv(result.mixture.sg50)} mL`),summary('SG 5% = VR − SG 50%',`${fv(result.mixture.sg5)} mL`));
      $('summary').append(summary('VIG informada / calculada',`${f(result.input.vig)} / ${f(result.mixture.vig)} mg/kg/min`),summary('Concentração final de glicose',`${f(result.mixture.glucosePercent)}%`),summary('Osmolaridade estimada',`${Math.round(result.mixture.osmolarity)} mOsm/L`),summary('Na final',`${f(result.mixture.sodiumMmolL)} mmol/L`),summary('K final',`${f(result.mixture.potassiumMmolL)} mmol/L`));
      $('final-summary').replaceChildren(summary('VT · Vazão em 24 horas',`${resultVolume(result.totals.totalVolume)} mL | ${resultVolume(result.totals.infusion)} mL/h`));
      $('export').disabled=!result.canPrepare;
    }
    if(scroll)$('result').scrollIntoView({block:'start'});
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();invalidate();form.querySelectorAll('.invalid').forEach(el=>el.classList.remove('invalid'));
    renderResult(calculateHydration(readInput()));
  });
  $('review-ack').addEventListener('change',()=>{
    if(!resultSnapshot?.reviewRequired){$('review-ack').checked=false;return;}
    generationId++;downloadSnapshot=null;$('pdf-download').hidden=true;$('pdf-download').removeAttribute('href');$('pdf-status').textContent='';
    if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;}
    renderResult(calculateHydration(readInput()),{scroll:false});
    // Enteral totals must not survive a withdrawn or changed clinical review.
    form.dispatchEvent(new document.defaultView.Event('hv-review-change',{bubbles:true}));
  });
  $('export').addEventListener('click',async()=>{
    const button=$('export');
    if(button.disabled||!resultSnapshot?.canPrepare)return;
    const snapshot=resultSnapshot,ticket=++generationId;button.disabled=true;$('pdf-status').textContent='Preparando PDF no aparelho…';
    try{
      const bytes=await createHydrationReport(snapshot);
      if(ticket!==generationId||resultSnapshot!==snapshot)return;
      if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));downloadSnapshot=snapshot;
      const link=$('pdf-download');link.href=pdfUrl;link.download='GROW_NEO-hidratacao-venosa.pdf';link.textContent='Baixar relatório em PDF';link.hidden=false;link.click();$('pdf-status').textContent='PDF gerado. Se o download não iniciar, use o link abaixo.';
    }catch(error){if(ticket===generationId&&resultSnapshot===snapshot)$('pdf-status').textContent='Não foi possível gerar o PDF. Aguarde o carregamento completo do app e tente novamente.';}
    finally{if(ticket===generationId&&resultSnapshot===snapshot)button.disabled=!snapshot.canPrepare;}
  });
  $('pdf-download').addEventListener('click',event=>{if(resultSnapshot!==downloadSnapshot||!resultSnapshot?.canPrepare)event.preventDefault();});
  const reset=()=>{form.reset();$('allow-wfi').checked=false;for(const id of ['sg5','sg50'])$('osm-'+id).value=String(HYDRATION_GLUCOSE_OSMOLARITY[id]).replace('.',',');lastUnit='';form.querySelectorAll('[data-hv-dose-unit]').forEach(el=>el.textContent='Selecione a unidade');$('unit-note').textContent='Informe zero quando não houver oferta do eletrólito. Não são sugeridas doses automaticamente.';form.querySelectorAll('.invalid').forEach(el=>el.classList.remove('invalid'));invalidate();};
  return {reset,getResult:()=>resultSnapshot};
}
