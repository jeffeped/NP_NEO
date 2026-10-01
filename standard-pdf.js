import {dosingWeightLabel,measuredWeightLabel} from './dosing-weight.js';
import {stampPdfIssueDate} from './pdf-date.js';
import {VERSION} from './engine.js';
import {standardSummary,formatStandard,formatStandardPer100,formatStandardVolume,NUMETA_SOURCE,STANDARD_FORMULATIONS} from './standard.js';
export async function createStandardReport(result){
  if(!result?.ok||!Array.isArray(result.blocks)||result.blocks.length||!Object.hasOwn(STANDARD_FORMULATIONS,result.formulation??'3in1'))throw new Error('Result is not exportable');
  const bag=STANDARD_FORMULATIONS[result.formulation??'3in1'];
  const {PDFDocument,StandardFonts,rgb}=globalThis.PDFLib;
  const doc=await PDFDocument.create();
  doc.setTitle(`NP padrão - Numeta G13%E ${bag.label}`);doc.setAuthor('Jefferson Guilherme');doc.setCreator('GROW_NEO by Prof. Jefferson');
  const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const response=await fetch(new URL('./assets/uea-logo.png',import.meta.url));if(!response.ok)throw new Error('Logo unavailable');
  const logo=await doc.embedPng(await response.arrayBuffer());
  const ink=rgb(.1,.17,.13),green=rgb(.03,.4,.25),shade=rgb(.91,.95,.92);
  let page,y;
  const clean=s=>String(s).replaceAll('≥','>=').replaceAll('µ','u');
  function text(s,x,yy,size=10,font=regular){page.drawText(clean(s),{x,y:yy,size,font,color:ink});}
  function right(s,x,yy,size=10,font=regular){text(s,x-font.widthOfTextAtSize(clean(s),size),yy,size,font);}
  function newPage(title){page=doc.addPage([595,842]);page.drawImage(logo,{x:42,y:779,width:170,height:170*logo.height/logo.width});text('GROW_NEO by Prof. Jefferson',300,789,10,bold);text(`NP padrão - Numeta G13%E ${bag.label}`,42,749,16,bold);text(title,42,726,10);y=702;}
  function room(height){if(y-height<65)newPage('Continuação');}
  function paragraph(s,size=9){let line='';for(const word of clean(s).split(/\s+/)){const next=line?line+' '+word:word;if(regular.widthOfTextAtSize(next,size)>511&&line){room(14);text(line,42,y,size);y-=14;line=word;}else line=next;}if(line){room(14);text(line,42,y,size);y-=14;}y-=7;}
  function row(label,value){room(24);text(label,49,y,10);right(value,546,y,10,bold);y-=24;}
  const f=formatStandard;
  newPage('Prescrição calculada - infusão em 24 horas');
  paragraph(dosingWeightLabel(result.weightContext));
  paragraph(measuredWeightLabel(result.weightContext));
  paragraph(`Dia de vida: ${result.day} | Acesso central | Cálculo por ${result.mode==='protein'?'proteína':'taxa hídrica'}`);
  paragraph(`${bag.chambers}, solução de ${bag.bagVolume} mL, sem diluição.`);
  page.drawRectangle({x:42,y:y-8,width:511,height:24,color:shade});text('Componente',49,y,10,bold);right('Volume (mL)',546,y,10,bold);y-=29;
  row(`Numeta G13%E ${bag.label}`,formatStandardVolume(result.volume));y-=8;
  for(const [name,value] of standardSummary(result))row(name,value);
  paragraph(`Relação proteína/caloria: 1 g de aminoácidos para ${f(result.rows.find(x=>x.label==='Energia não proteica').perKg/result.protein)} kcal não proteicas. Valores calculados com precisão completa; apresentação com uma casa decimal; volume e vazão arredondados para cima.`);
  paragraph('Vazão média arredondada x 24 h pode diferir do volume. Conferir a programação e a progressão/redução da infusão.');
  paragraph('Complementação pendente: vitaminas e oligoelementos não incluídos. Outros aportes e diluições não fazem parte deste cálculo.');
  if(result.formulation==='2in1')paragraph('Câmara lipídica fechada: lipídios infundidos à parte não integram as ofertas desta bolsa nem o total PN + enteral.');
  newPage('Ofertas de nutrientes e conferência');
  page.drawRectangle({x:42,y:y-8,width:511,height:24,color:shade});text('Nutriente',49,y,10,bold);right('Por 100 mL',316,y,9,bold);right('Por kg/dia',428,y,9,bold);right('Total diário',546,y,9,bold);y-=29;
  for(const item of result.rows){room(23);text(item.label,49,y,9);right(`${formatStandardPer100(item.per100)} ${item.unit}`,316,y,8);right(`${f(item.perKg)} ${item.unit}`,428,y,8);right(`${f(item.total)} ${item.unit}`,546,y,8);y-=23;}
  y-=10;
  for(const alert of result.alerts)paragraph('ATENÇÃO: '+alert);
  paragraph('Fotoproteção da bolsa e equipo; filtro de 1,2 micrometros recomendado. Conferir condições clínicas, exames, compatibilidade e suplementação.');
  paragraph('Fonte: Baxter, SmPC Numeta G13%E, atualização 19/05/2026, seções 2 e 4.2.');paragraph(NUMETA_SOURCE,8);
  paragraph('Versão de avaliação. Relatório de cálculo sujeito à revisão clínica antes do uso assistencial.',8);
  const pages=doc.getPages();pages.forEach((p,i)=>{page=p;text('GROW_NEO - versão '+VERSION+' | Jefferson Guilherme',42,34,8);right(`${i+1}/${pages.length}`,553,34,8);});
  await stampPdfIssueDate(doc);
 return doc.save();
}
