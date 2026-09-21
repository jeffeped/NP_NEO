import {VERSION} from './engine.js';
import {formatHydrationNumber as f,formatHydrationVolume as fv} from './hydration.js';

export async function createHydrationReport(result){
  if(!result?.ok||!result.canPrepare||!result.mixture||!Number.isFinite(result.mixture.osmolarity))throw new Error('HV is not exportable');
  const {PDFDocument,StandardFonts,rgb}=globalThis.PDFLib;
  const doc=await PDFDocument.create();
  doc.setTitle('Hidratação venosa neonatal');doc.setAuthor('Jefferson P Guilherme');doc.setCreator('GROW_NEO by Prof. Jefferson');doc.setSubject('Relatório de cálculo de HV em 24 horas');
  const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const response=await fetch(new URL('./assets/uea-logo.png',import.meta.url));if(!response.ok)throw new Error('Logo unavailable');
  const logo=await doc.embedPng(await response.arrayBuffer());
  const ink=rgb(.1,.17,.13),muted=rgb(.32,.39,.35),shade=rgb(.91,.95,.92);
  let page,y;
  function text(s,x,yy,size=10,font=regular,color=ink){page.drawText(String(s),{x,y:yy,size,font,color});}
  function right(s,yy,size=10,font=bold){text(s,546-font.widthOfTextAtSize(String(s),size),yy,size,font);}
  function newPage(){page=doc.addPage([595,842]);page.drawImage(logo,{x:42,y:779,width:170,height:170*logo.height/logo.width});text('GROW_NEO by Prof. Jefferson',300,789,10,bold);text('Hidratação venosa neonatal',42,749,16,bold);text('Relatório de cálculo - infusão em 24 horas',42,726,10);y=698;}
  function room(h){if(y-h<65)newPage();}
  function row(label,value){room(25);text(label,49,y,10);right(value,y);y-=25;}
  function paragraph(s){let line='';for(const word of String(s).split(/\s+/)){const next=line?line+' '+word:word;if(regular.widthOfTextAtSize(next,8)>511&&line){room(12);text(line,42,y,8,regular,muted);y-=12;line=word;}else line=next;}if(line){room(12);text(line,42,y,8,regular,muted);y-=12;}y-=7;}
  newPage();
  paragraph(`Peso: ${f(result.input.weight)} kg | Taxa hídrica: ${f(result.input.fluid)} mL/kg/dia | Sem identificação do paciente`);
  paragraph(`Doses informadas em ${result.input.doseUnit==='perKgDay'?'mEq/kg/dia':'mEq totais em 24 horas'}.`);
  page.drawRectangle({x:42,y:y-8,width:511,height:24,color:shade});text('Componente / quantidade',49,y,10,bold);right('Volume (mL)',y);y-=30;
  for(const item of result.rows){room(43);row(item.solution,fv(item.volume));text(`${f(item.amountMeq)} mEq/24 h | ${f(item.perKgDay)} mEq/kg/dia | ${f(item.concentration)} mEq/mL`,49,y+10,8,regular,muted);y-=16;}
  row('SG 5% - completar até o VT',fv(result.mixture.sg5));row('SG 50%',fv(result.mixture.sg50));y-=8;
  row('Glicose total',f(result.mixture.glucoseGrams)+' g/24 h');
  row('VIG informada / calculada',`${f(result.input.vig)} / ${f(result.mixture.vig)} mg/kg/min`);
  row('Concentração final de glicose',f(result.mixture.glucosePercent)+'%');
  row('Osmolaridade calculada',Math.round(result.mixture.osmolarity)+' mOsm/L');
  y-=5;
  paragraph(`Osmolaridade estimada por soma das contribuições, com dissociação ideal dos sais. SG 5%: ${f(result.input.glucoseOsmolarity.sg5)} mOsm/L; SG 50%: ${f(result.input.glucoseOsmolarity.sg50)} mOsm/L. Não é medição laboratorial nem confirmação de compatibilidade ou adequação do acesso. Fórmula e referências na aba Notas.`);
  paragraph('VT, vazão e volumes com uma casa decimal, arredondados para cima apenas na apresentação. O cálculo e a osmolaridade usam precisão completa; confira a oferta após o arredondamento do preparo. A vazão exibida x 24 pode diferir do VT.');
  paragraph('Versão de avaliação. Conferir os resultados e as apresentações antes do uso assistencial.');
  room(32);page.drawRectangle({x:42,y:y-9,width:511,height:28,color:shade});row('VT · Vazão em 24 horas',`${fv(result.totals.totalVolume)} mL | ${fv(result.totals.infusion)} mL/h`);
  const pages=doc.getPages();pages.forEach((p,i)=>{page=p;text('GROW_NEO - versão '+VERSION+' | Jefferson P Guilherme',42,34,8);right(`${i+1}/${pages.length}`,34,8,regular);});
  return doc.save();
}
