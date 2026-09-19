import {calculateHydration,HYDRATION_COMPONENTS,formatHydrationNumber as f,formatHydrationVolume as fv} from './hydration.js';

export function initHydration(document){
  const $=id=>document.getElementById('hv-'+id);
  const form=$('form');
  $('electrolytes').innerHTML=HYDRATION_COMPONENTS.map(c=>`<div class="dose"><label class="field" for="hv-${c.id}">${c.name} · ${c.solution}<div class="input-box"><input id="hv-${c.id}" inputmode="decimal" type="text" placeholder="Informe a dose" required aria-label="HV: dose de ${c.name.toLowerCase()}"><span class="unit" data-hv-dose-unit>Selecione a unidade</span></div></label></div>`).join('');
  $('concentrations').innerHTML=HYDRATION_COMPONENTS.map(c=>`<label class="field">${c.solution}<div class="input-box"><input id="hv-concentration-${c.id}" inputmode="decimal" type="text" value="${String(c.concentration).replace('.',',')}" required aria-label="HV: equivalência de ${c.name.toLowerCase()}"><span class="unit">mEq/mL</span></div></label>`).join('');
  let lastUnit=$('doseUnit').value,resultSnapshot=null;
  const invalidate=()=>{resultSnapshot=null;$('result').hidden=true;$('errors').hidden=true;$('empty').hidden=false;};
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
  form.addEventListener('submit',event=>{
    event.preventDefault();invalidate();form.querySelectorAll('.invalid').forEach(el=>el.classList.remove('invalid'));
    const input={doseUnit:$('doseUnit').value,concentrations:{}};
    for(const id of ['weight','fluid','vig','na','k','ca','mg'])input[id]=$(id).value;
    for(const c of HYDRATION_COMPONENTS)input.concentrations[c.id]=$('concentration-'+c.id).value;
    const result=calculateHydration(input);
    if(!result.ok){
      const list=document.createElement('ul');
      for(const error of result.errors){list.append(text('li',error.message));const el=$(error.field);el?.closest('.field')?.classList.add('invalid');const details=el?.closest('details');if(details)details.open=true;}
      $('errors').replaceChildren(list);$('errors').hidden=false;$('errors').scrollIntoView({block:'center'});return;
    }
    resultSnapshot=result;$('empty').hidden=true;$('result').hidden=false;
    $('summary').replaceChildren(summary('VT = taxa hídrica × peso',`${f(result.input.fluid)} × ${f(result.input.weight)} = ${fv(result.totals.totalVolume)} mL/24 h`),summary('Glicose necessária = VIG × peso × 60 × 24 ÷ 1000',`${f(result.input.vig)} × ${f(result.input.weight)} × 60 × 24 ÷ 1000 = ${f(result.totals.glucoseGrams)} g/24 h`),summary('Volume dos eletrólitos',`${fv(result.totals.electrolytesVolume)} mL`),summary('VR = VT − volume dos eletrólitos',`${fv(result.totals.totalVolume)} − ${fv(result.totals.electrolytesVolume)} = ${fv(result.totals.glucoseSolutionsVolume)} mL`),summary('Vazão em 24 horas',`${fv(result.totals.infusion)} mL/h`));
    $('blocks').replaceChildren(...result.blocks.map(message=>text('div',message,'notice danger')));
    $('composition').hidden=!result.canPrepare;
    $('rows').replaceChildren();
    if(result.canPrepare){
      for(const row of result.rows){
        const tr=document.createElement('tr');tr.dataset.hvComponent=row.id;
        const label=text('td',row.solution);label.append(text('span',`${f(row.amountMeq)} mEq/24 h · ${f(row.perKgDay)} mEq/kg/dia`),text('span',`Equivalência: ${f(row.concentration)} mEq/mL`));
        tr.append(label,text('td',fv(row.volume)));$('rows').append(tr);
      }
      for(const [id,name,volume] of [['sg5','SG 5% · completar até o VT',result.mixture.sg5],['sg50','SG 50%',result.mixture.sg50]]){const tr=document.createElement('tr');tr.dataset.hvComponent=id;tr.append(text('td',name),text('td',fv(volume)));$('rows').append(tr);}
      $('summary').append(summary('SG 50% = [gG − (VR × 0,05)] ÷ 0,45',`${fv(result.mixture.sg50)} mL`),summary('SG 5% = VR − SG 50%',`${fv(result.mixture.sg5)} mL`),summary('VIG informada / calculada',`${f(result.input.vig)} / ${f(result.mixture.vig)} mg/kg/min`),summary('Concentração final de glicose',`${f(result.mixture.glucosePercent)}%`));
    }
    $('result').scrollIntoView({block:'start'});
  });
  const reset=()=>{form.reset();lastUnit='';form.querySelectorAll('[data-hv-dose-unit]').forEach(el=>el.textContent='Selecione a unidade');$('unit-note').textContent='Informe zero quando não houver oferta do eletrólito. Não são sugeridas doses automaticamente.';form.querySelectorAll('.invalid').forEach(el=>el.classList.remove('invalid'));invalidate();};
  return {reset,getResult:()=>resultSnapshot};
}
