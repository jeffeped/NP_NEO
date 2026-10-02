import {dosingWeightLabel,measuredWeightLabel} from './dosing-weight.js';
import {stampPdfIssueDate} from './pdf-date.js';
import {VERSION} from './engine.js';
import {calculateHydration,HYDRATION_WFI_REVIEW_WARNING,HYDRATION_VOLUME_NOTE,formatHydrationNumber as f,formatHydrationVolume as fv} from './hydration.js';

export async function createHydrationReport(result){
  if(!result?.ok||!result.canPrepare||!result.mixture||!Number.isFinite(result.mixture.osmolarity))throw new Error('HV is not exportable');
  const verified=calculateHydration({...result.input,weight:result.input.currentWeight??result.input.weight});
  if(!verified.ok||!verified.canPrepare||(verified.reviewRequired&&!verified.clinicalReviewAcknowledged))throw new Error('HV is not exportable');
  return renderHydrationReport(verified,false);
}

export async function createHydrationReviewReport(result,{acknowledged=false}={}){
  if(acknowledged!==true||!result?.ok||!result.canReview)throw new Error('HV review is not exportable');
  const verified=calculateHydration({...result.input,weight:result.input.currentWeight??result.input.weight});
  if(!verified.ok||!verified.canReview||!verified.reviewRequired)throw new Error('HV review is not exportable');
  return renderHydrationReport(verified,true);
}

async function renderHydrationReport(result,review){
  const hasWfi=result.reviewRequired;
  const volume=fv;
  const {PDFDocument,StandardFonts,rgb}=globalThis.PDFLib;
  const doc=await PDFDocument.create();
  doc.setTitle(review?'HV - REVISÃO - NÃO ADMINISTRAR':'Hidratação venosa neonatal');doc.setAuthor('Jefferson P Guilherme');doc.setCreator('GROW_NEO by Prof. Jefferson');doc.setSubject(review?'Cálculo de revisão com água para injetáveis, não administrar':hasWfi?'HV com água para injetáveis e confirmação de revisão pelo prescritor':'Relatório de cálculo de HV em 24 horas');
  const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const response=await fetch(new URL('./assets/uea-logo.png',import.meta.url));if(!response.ok)throw new Error('Logo unavailable');
  const logo=await doc.embedPng(await response.arrayBuffer());
  const ink=rgb(.1,.17,.13),muted=rgb(.32,.39,.35),shade=rgb(.91,.95,.92);
  let page,y;
  function text(s,x,yy,size=10,font=regular,color=ink){page.drawText(String(s),{x,y:yy,size,font,color});}
  function right(s,yy,size=10,font=bold){text(s,546-font.widthOfTextAtSize(String(s),size),yy,size,font);}
  function newPage(){page=doc.addPage([595,842]);page.drawImage(logo,{x:42,y:779,width:170,height:170*logo.height/logo.width});text('GROW_NEO by Prof. Jefferson',300,789,10,bold);text(review?'REVISÃO - NÃO PREPARAR / ADMINISTRAR':'Hidratação venosa neonatal',42,749,review?13:16,bold);text(review?'Revisão com água para injetáveis - não administrar':hasWfi?'Relatório de cálculo - mistura com água para injetáveis':'Relatório de cálculo - infusão em 24 horas',42,726,10);y=698;}
  function room(h){if(y-h<65)newPage();}
  function row(label,value){const h=hasWfi?21:25;room(h);text(label,49,y,10);right(value,y);y-=h;}
  function paragraph(s){let line='';for(const word of String(s).split(/\s+/)){const next=line?line+' '+word:word;if(regular.widthOfTextAtSize(next,8)>511&&line){room(12);text(line,42,y,8,regular,muted);y-=12;line=word;}else line=next;}if(line){room(12);text(line,42,y,8,regular,muted);y-=12;}y-=7;}
  newPage();
  if(hasWfi)paragraph(HYDRATION_WFI_REVIEW_WARNING);
  if(hasWfi&&!review)paragraph('Confirmação registrada: o prescritor declarou ter revisado a composição, a tonicidade e a compatibilidade desta mistura. Esta declaração não representa validação automática pelo aplicativo.');
  paragraph(dosingWeightLabel(result.input.weightContext));
  paragraph(measuredWeightLabel(result.input.weightContext));
  paragraph(`Dia de vida: ${result.input.day} | Taxa hídrica: ${f(result.input.fluid)} mL/kg/dia | Acesso: ${result.input.access==='central'?'central':'periférico'} | Sem identificação do paciente`);
  paragraph(`Doses informadas em ${result.input.doseUnit==='perKgDay'?'mEq/kg/dia':'mEq totais em 24 horas'}.`);
  page.drawRectangle({x:42,y:y-8,width:511,height:24,color:shade});text('Componente / quantidade',49,y,10,bold);right('Volume (mL)',y);y-=30;
  for(const item of result.rows){room(hasWfi?35:43);row(item.solution,volume(item.volume));text(`${f(item.amountMeq)} mEq/24 h | ${f(item.perKgDay)} mEq/kg/dia | ${f(item.concentration)} mEq/mL`,49,y+10,8,regular,muted);y-=hasWfi?12:16;}
  row(hasWfi?'SG 5%':'SG 5% - completar até o VT',volume(result.mixture.sg5));row('SG 50%',volume(result.mixture.sg50));
  if(hasWfi)row('Água para injetáveis - diluente da mistura',volume(result.mixture.water));y-=hasWfi?4:8;
  row('Glicose total',f(result.mixture.glucoseGrams)+' g/24 h');
  row('VIG informada / calculada',`${f(result.input.vig)} / ${f(result.mixture.vig)} mg/kg/min`);
  row('Concentração final de glicose',f(result.mixture.glucosePercent)+'%');
  row('Osmolaridade estimada',Math.round(result.mixture.osmolarity)+' mOsm/L');
  row('Na final / K final',`${f(result.mixture.sodiumMmolL)} / ${f(result.mixture.potassiumMmolL)} mmol/L`);
  y-=5;
  paragraph(`Osmolaridade estimada por soma das contribuições, com dissociação ideal dos sais. SG 5%: ${f(result.input.glucoseOsmolarity.sg5)} mOsm/L; SG 50%: ${f(result.input.glucoseOsmolarity.sg50)} mOsm/L. Não é medição laboratorial nem confirmação de tonicidade, compatibilidade ou adequação do acesso. Fórmula e referências na aba Notas.`);
  if(hasWfi)paragraph('A glicose é metabolizada: uma osmolaridade próxima à plasmática não estabelece tonicidade segura. Na e K finais são informativos. Não é usado limite osmolar inferior numérico como autorização. Conferir apresentações, preparo e compatibilidade conforme o protocolo do serviço.');
  paragraph(HYDRATION_VOLUME_NOTE);
  paragraph(review?'Protótipo de avaliação exclusivamente matemática. Este documento não autoriza uso assistencial.':'Versão de avaliação. Conferir os resultados e as apresentações antes do uso assistencial.');
  room(32);page.drawRectangle({x:42,y:y-9,width:511,height:28,color:shade});row('VT · Vazão em 24 horas',`${volume(result.totals.totalVolume)} mL | ${volume(result.totals.infusion)} mL/h`);
  const pages=doc.getPages();pages.forEach((p,i)=>{page=p;text('GROW_NEO - versão '+VERSION+' | Jefferson P Guilherme'+(review?' | REVISÃO - NÃO ADMINISTRAR':hasWfi?' | Água para injetáveis':''),42,34,8);right(`${i+1}/${pages.length}`,34,8,regular);});
  await stampPdfIssueDate(doc);
 return doc.save();
}
