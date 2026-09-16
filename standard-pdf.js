import {VERSION} from './engine.js';
import {standardSummary,formatStandard,NUMETA_SOURCE} from './standard.js';
export async function createStandardReport(result){
  if(!result?.ok||!Array.isArray(result.blocks)||result.blocks.length)throw new Error('Result is not exportable');
  const {PDFDocument,StandardFonts,rgb}=globalThis.PDFLib;
  const doc=await PDFDocument.create();
  doc.setTitle('NP padrão - Numeta G13%E');doc.setAuthor('Jefferson Guilherme');doc.setCreator('NP_NEO by Prof. Jeffe');
  const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const response=await fetch(new URL('./assets/uea-logo.png',import.meta.url));if(!response.ok)throw new Error('Logo unavailable');
  const logo=await doc.embedPng(await response.arrayBuffer());
  const ink=rgb(.1,.17,.13),green=rgb(.03,.4,.25),shade=rgb(.91,.95,.92);
  let page,y;
  const clean=s=>String(s).replaceAll('≥','>=').replaceAll('µ','u');
  function text(s,x,yy,size=10,font=regular){page.drawText(clean(s),{x,y:yy,size,font,color:ink});}
  function right(s,x,yy,size=10,font=regular){text(s,x-font.widthOfTextAtSize(clean(s),size),yy,size,font);}
  function newPage(title){page=doc.addPage([595,842]);page.drawImage(logo,{x:42,y:779,width:170,height:170*logo.height/logo.width});text('NP_NEO by Prof. Jeffe',310,789,12,bold);text('NP padrão - Numeta G13%E',42,749,16,bold);text(title,42,726,10);y=702;}
  function room(height){if(y-height<65)newPage('Continuação');}
  function paragraph(s,size=9){let line='';for(const word of clean(s).split(/\s+/)){const next=line?line+' '+word:word;if(regular.widthOfTextAtSize(next,size)>511&&line){room(14);text(line,42,y,size);y-=14;line=word;}else line=next;}if(line){room(14);text(line,42,y,size);y-=14;}y-=7;}
  function row(label,value){room(24);text(label,49,y,10);right(value,546,y,10,bold);y-=24;}
  const f=formatStandard;
  newPage('Prescrição calculada - infusão em 24 horas');
  paragraph(`Peso: ${f(result.weight)} kg | Dia de vida: ${result.day} | Acesso central | Cálculo por ${result.mode==='protein'?'proteína':'taxa hídrica'}`);
  paragraph('Três câmaras ativadas, bolsa de 300 mL, sem diluição.');
  page.drawRectangle({x:42,y:y-8,width:511,height:24,color:shade});text('Componente',49,y,10,bold);right('Volume (mL)',546,y,10,bold);y-=29;
  row('Numeta G13%E',f(result.volume));y-=8;
  for(const [name,value] of standardSummary(result))row(name,value);
  paragraph('Relação proteína/caloria: 1 g de aminoácidos para 25 kcal não proteicas. Valores calculados com precisão completa; apresentação com duas casas decimais.');
  paragraph('Vazão média arredondada x 24 h pode diferir do volume. Conferir a programação e a progressão/redução da infusão.');
  paragraph('Complementação pendente: vitaminas e oligoelementos não incluídos. Outros aportes e diluições não fazem parte deste cálculo.');
  newPage('Ofertas de nutrientes e conferência');
  page.drawRectangle({x:42,y:y-8,width:511,height:24,color:shade});text('Nutriente',49,y,10,bold);right('Por kg/dia',388,y,10,bold);right('Total diário',546,y,10,bold);y-=29;
  for(const item of result.rows){room(23);text(item.label,49,y,9);right(`${f(item.perKg)} ${item.unit}`,388,y,9);right(`${f(item.total)} ${item.unit}`,546,y,9);y-=23;}
  y-=10;
  for(const alert of result.alerts)paragraph('ATENÇÃO: '+alert);
  paragraph('Fotoproteção da bolsa e equipo; filtro de 1,2 micrometros recomendado. Conferir condições clínicas, exames, compatibilidade e suplementação.');
  paragraph('Fonte: Baxter, SmPC Numeta G13%E, atualização 19/05/2026, seções 2 e 4.2.');paragraph(NUMETA_SOURCE,8);
  paragraph('Versão de avaliação. Relatório de cálculo sujeito à revisão clínica antes do uso assistencial.',8);
  const pages=doc.getPages();pages.forEach((p,i)=>{page=p;text('NP_NEO - versão '+VERSION+' | Jefferson Guilherme',42,34,8);right(`${i+1}/${pages.length}`,553,34,8);});
  return doc.save();
}
