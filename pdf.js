import {round1,formatVolume} from './engine.js';
const fmt=n=>Number.isFinite(n)?round1(n).toFixed(1).replace('.',','):'—';
const compact=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(n);
export async function createReport(result){
  if(!result?.ok||!result.canExport)throw new Error('Result is not exportable');
  const {PDFDocument,StandardFonts,rgb}=globalThis.PDFLib;
  const doc=await PDFDocument.create();
  doc.setTitle('Cálculo de nutrição parenteral neonatal');doc.setAuthor('Jefferson Guilherme');doc.setCreator('Jefferson Guilherme');doc.setSubject('NP_NEO by Prof. Jeffe — relatório de cálculo');doc.setKeywords(['NPP','neonatal','cálculo']);
  doc.setCreationDate(new Date());doc.setModificationDate(new Date());
  const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const logoBytes=await fetch(new URL('./assets/uea-logo.png',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Logo unavailable');return r.arrayBuffer();});
  const logo=await doc.embedPng(logoBytes);
  const ink=rgb(.1,.17,.13),muted=rgb(.32,.39,.35),line=rgb(.82,.88,.84),shade=rgb(.91,.95,.92),green=rgb(.03,.40,.25);
  const W=612,H=792,L=43,R=569;
  let page,y;
  const width=(text,size,font=regular)=>font.widthOfTextAtSize(String(text),size);
  function text(value,x,yy,size=9,font=regular,color=ink){page.drawText(String(value),{x,y:yy,size,font,color});}
  function right(value,x,yy,size=9,font=regular,color=ink){text(value,x-width(value,size,font),yy,size,font,color);}
  function center(value,yy,size=10,font=regular){text(value,(W-width(value,size,font))/2,yy,size,font);}
  function wrap(value,maxWidth,size=9,font=regular){const words=String(value).split(/\s+/),out=[];let row='';for(const word of words){const next=row?row+' '+word:word;if(width(next,size,font)>maxWidth&&row){out.push(row);row=word;}else row=next;}if(row)out.push(row);return out;}
  function paragraph(value,size=9,color=muted){for(const row of wrap(value,R-L,size)){if(y<80)newPage('Conferência dos parâmetros');text(row,L,y,size,regular,color);y-=size+4;}y-=5;}
  function newPage(title){
    page=doc.addPage([W,H]);page.drawImage(logo,{x:L,y:746,width:156,height:156*logo.height/logo.width});
    text('ESCOLA SUPERIOR DE CIÊNCIAS DA SAÚDE - ESA',218,751,9,bold);
    center(title,710,14,bold);center('Relatório de cálculo · NP_NEO by Prof. Jeffe · versão '+result.version,694,8,regular);y=672;
  }
  function horizontal(yy){page.drawLine({start:{x:L,y:yy},end:{x:R,y:yy},thickness:.5,color:line});}
  const ctx=result.input,t=result.totals;
  newPage('Cálculo de nutrição parenteral neonatal');
  text(`Peso atual: ${compact(ctx.weight)} kg`,L,y,9,bold);text(`Dia de vida: ${ctx.day}`,225,y,9);text(`IG ao nascer: ${ctx.gaWeeks} sem + ${ctx.gaDays} d`,373,y,9);y-=17;
  text(`Acesso: ${ctx.access==='central'?'central':'periférico'}`,L,y,9);text('Infusão: 24 horas',225,y,9);text('Sem identificação do paciente',373,y,9);y-=24;
  function compositionHead(){page.drawRectangle({x:L,y:y-9,width:R-L,height:24,color:shade});text('Componente',L+6,y,9,bold);right('Total / dia',354,y,9,bold);right('Dose / taxa efetiva',488,y,9,bold);right('mL',R-6,y,9,bold);y-=27;}
  compositionHead();let group=0;
  for(const row of result.rows){
    if(row.group!==group&&row.group<3)y-=8;group=row.group;
    if(y<176){newPage('Composição da NPP — continuação');compositionHead();}
    text(row.name,L+6,y,8.8);right(row.id==='water'?'q.s.p.':`${fmt(row.quantity)} ${row.unit}`,354,y,8.1);right(row.perKg===null?'':`${fmt(row.perKg)} ${row.perUnit}`,488,y,7.8);right(formatVolume(row.volume,row.id),R-6,y,9,bold);horizontal(y-7);y-=21;
  }
  y-=8;
  const summaries=[['Volume total',fmt(t.totalVolume)+' mL'],['Vazão em 24 horas',fmt(t.infusion)+' mL/h'],['Taxa hídrica',fmt(t.fluid)+' mL/kg/dia'],['Taxa calórica',fmt(t.calories)+' kcal/kg/dia'],['Concentração final de glicose',fmt(t.glucosePercent)+'%'],['Proteína / calorias não proteicas',t.proteinRatio===null?'Não calculável (AA = 0)':'1 : '+fmt(t.proteinRatio)]];
  for(const [name,value] of summaries){if(y<95)newPage('Indicadores da NPP');text(name,L+6,y,9,bold);right(value,R-6,y,9,bold);y-=17;}
  if(result.requiresCentral){if(y<91)newPage('Conferência do acesso');text('ACESSO CENTRAL OBRIGATÓRIO: glicose acima de 12,5%.',L+6,y,9,bold,green);y-=15;}
  newPage('Conferência dos parâmetros');
  paragraph('Volumes: zinco e selênio com duas casas decimais; demais componentes com uma casa. Água q.s.p. conserva os centésimos necessários. As ofertas efetivas de sódio, potássio e zinco incluem as contribuições dos demais componentes.');
  page.drawRectangle({x:L,y:y-9,width:R-L,height:24,color:shade});text('Parâmetro',L+6,y,9,bold);right('Solicitado',360,y,9,bold);right('Efetivo',R-6,y,9,bold);y-=30;
  for(const o of result.offers){text(o.name,L+6,y,9,bold);text(o.unit,L+6,y-12,8,regular,muted);right(fmt(o.requested),360,y,9);right(fmt(o.actual),R-6,y,9,bold);horizontal(y-18);y-=34;}
  y-=6;
  paragraph('Fatores energéticos definidos para esta calculadora: aminoácidos 4 kcal/g, lipídeos 9 kcal/g e glicose 4 kcal/g. A relação proteína/caloria considera somente as calorias de glicose e lipídeos.');
  if(result.rounding.length)paragraph('O arredondamento pode modificar as doses efetivas, especialmente de zinco e selênio. Confira a oferta efetiva antes do uso.');
  if(Math.abs(t.infusion-t.infusionExact)>1e-9)paragraph(`Vazão matemática: ${t.infusionExact.toFixed(4).replace('.',',')} mL/h; exibida: ${fmt(t.infusion)} mL/h. Confira a diferença entre vazão arredondada por 24 horas e volume total.`);
  for(const a of result.adjustments)paragraph(`Ajuste conferido pelo usuário: ${a.name}, solicitado ${fmt(a.requested)} ${a.unit}, resultante ${fmt(a.actual)} ${a.unit}, por contribuição de ${a.source}. Complemento não acrescentado.`,9,ink);
  for(const notice of result.notices)paragraph(notice);
  paragraph('Versão de avaliação. Este relatório apresenta cálculos e não substitui a revisão clínica da composição.',8);
  const pages=doc.getPages();for(let i=0;i<pages.length;i++){page=pages[i];center('ESA – Escola Superior de Ciências da Saúde',42,8);center('Av. Carvalho Leal, 1777 - Cachoeirinha, Manaus - AM, 69065-001',30,8);right(`${i+1}/${pages.length}`,R,30,8,regular,muted);}
  return doc.save();
}
