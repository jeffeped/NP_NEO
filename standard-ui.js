import {calculateStandard,standardSummary,formatStandard,formatStandardVolume} from './standard.js';
import {createStandardReport} from './standard-pdf.js';
export function initStandard(document){
  const $=id=>document.getElementById(id);
  const fmt=formatStandard;
  let result=null,pdfUrl=null;
  function invalidate(){ result=null;$('std-result').hidden=true;$('std-errors').hidden=true;$('std-export').disabled=true;$('std-pdf-download').hidden=true;$('std-pdf-download').removeAttribute('href');$('std-pdf-status').textContent='';if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;} }
  function mode(){const protein=$('std-mode').value==='protein';$('std-value-label').textContent=protein?'Proteína desejada':'Taxa hídrica destinada ao Numeta';$('std-unit').textContent=protein?'g/kg/dia':'mL/kg/dia';$('std-value').value='';invalidate();}
  $('std-mode').addEventListener('change',mode);
  $('std-form').addEventListener('input',invalidate);$('std-form').addEventListener('change',invalidate);
  $('std-form').addEventListener('submit',event=>{
    event.preventDefault();invalidate();
    const r=calculateStandard({weight:$('std-weight').value,day:$('std-day').value,mode:$('std-mode').value,value:$('std-value').value,access:$('std-access').value});
    if(!r.ok){$('std-errors').textContent=r.errors.join(' ');$('std-errors').hidden=false;return;}
    result=r;$('std-export').disabled=Boolean(r.blocks.length);
    $('std-result').hidden=false;
    $('std-status').textContent=r.blocks.length?'Cálculo para revisão — prescrição bloqueada':'Prescrição calculada de Numeta · 24 horas';
    $('std-prescription').textContent=r.blocks.length?'Revise os impedimentos abaixo.':`Numeta G13%E, três câmaras ativadas, sem diluição: ${formatStandardVolume(r.volume)} mL em 24 horas, por acesso central. Vazão média calculada: ${formatStandardVolume(r.rate)} mL/h.`;
    const element=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
    $('std-context').replaceChildren(...[`Peso: ${fmt(r.weight)} kg`,`Dia de vida: ${r.day}`,`Acesso: ${$('std-access').value==='central'?'central':'periférico'}`].map(x=>element('span',x)));
    const prescriptionRow=document.createElement('tr');
    const component=element('td','Numeta G13%E');component.append(element('span','Três câmaras ativadas · sem diluição'));
    prescriptionRow.append(component,element('td',formatStandardVolume(r.volume)));$('std-prescription-rows').replaceChildren(prescriptionRow);
    const summaries=standardSummary(r);
    $('std-summary').replaceChildren(...summaries.map(([name,value])=>{const row=document.createElement('div');row.className='summary-row';row.append(element('span',name),element('strong',value));return row;}));
    $('std-alerts').replaceChildren();
    for(const [text,danger] of [...r.blocks.map(x=>[x,true]),...r.alerts.map(x=>[x,false])]){const p=document.createElement('p');p.className='notice'+(danger?' danger':'');p.textContent=text;$('std-alerts').append(p);}
    $('std-rows').replaceChildren();
    for(const row of r.rows){const tr=document.createElement('tr');for(const text of [row.label,`${fmt(row.perKg)} ${row.unit}/kg/dia`,`${fmt(row.total)} ${row.unit}/dia`]){const td=document.createElement('td');td.textContent=text;tr.append(td);}$('std-rows').append(tr);}
  });
  $('std-export').addEventListener('click',async()=>{
    const snapshot=result;if(!snapshot||snapshot.blocks.length)return;
    $('std-export').disabled=true;$('std-pdf-status').textContent='Gerando PDF…';
    try{
      const bytes=await createStandardReport(snapshot);if(result!==snapshot)return;
      if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
      const link=$('std-pdf-download');link.href=pdfUrl;link.download='GROW_NEO-NP-padrao.pdf';link.hidden=false;
      $('std-pdf-status').textContent='PDF pronto. Toque em Baixar PDF se o download não começar automaticamente.';
      try{link.click();}catch(error){console.warn('Automatic PDF download unavailable',error);}link.scrollIntoView?.({block:'nearest'});
    }catch(error){console.error('Standard PDF generation failed',error);if(result===snapshot)$('std-pdf-status').textContent='Não foi possível gerar o PDF. Tente novamente.';}
    finally{if(result===snapshot)$('std-export').disabled=false;}
  });

  return {getResult:()=>result,reset:()=>{$('std-form').reset();invalidate();}};
}
