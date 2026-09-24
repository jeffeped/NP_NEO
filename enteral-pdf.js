import {VERSION} from './engine.js';
import {transitionLines,clinicalReferenceLines} from './enteral.js';
const fmt=(n,digits=1)=>Number.isFinite(n)?n.toFixed(digits).replace('.',','):'—';
const fmtDose=n=>Number.isFinite(n)?new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(n):'—';
const pma=n=>{const days=Math.round(n*7);return `${Math.floor(days/7)} sem + ${days%7} d`;};
export async function createEnteralReport({enteral,integrated,clinical,growth}){
 if(!enteral||!integrated)throw new Error('Enteral result is not exportable');
 const {PDFDocument,StandardFonts,rgb}=globalThis.PDFLib;const doc=await PDFDocument.create();
 doc.setTitle('Avaliação nutricional integrada neonatal');doc.setAuthor('Jefferson P Guilherme');doc.setCreator('Jefferson P Guilherme');doc.setSubject('GROW_NEO — aporte nutricional total');
 const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const page=doc.addPage([612,792]),ink=rgb(.1,.17,.13),muted=rgb(.32,.39,.35),shade=rgb(.91,.95,.92),L=43,R=569;
 const text=(v,x,y,s=9,f=regular,c=ink)=>page.drawText(String(v),{x,y,size:s,font:f,color:c});
 const right=(v,x,y,s=9,f=regular)=>text(v,x-f.widthOfTextAtSize(String(v),s),y,s,f);
 text('GROW_NEO',L,744,16,bold);text('Avaliação nutricional integrada',L,722,13,bold);text('Versão '+VERSION,L,705,8,regular,muted);
 text(enteral.composition.label,L,674,10,bold);text(`${fmt(enteral.composition.energy)} kcal/100 mL · ${fmt(enteral.composition.protein,2)} g proteína/100 mL`,L,657,9);
 if(enteral.composition.fm85GramsPer100mL>0)text(`FM85: ${fmtDose(enteral.composition.fm85GramsPer100mL/4)} g/25 mL (média no volume total)`,L,640,9);
 text(enteral.composition.estimated?'Composição estimada.':'Composição informada/analisada.',L,623,8,regular,muted);
 text('Fonte: '+integrated.sourceLabel,L,602,9,bold);
 let y=570;page.drawRectangle({x:L,y:y-8,width:R-L,height:25,color:shade});
 text('Indicador',L+6,y,9,bold);right(integrated.source==='hydration'?'HV':integrated.source==='none'?'IV (zero)':'PN',300,y,9,bold);right('Enteral',430,y,9,bold);right('Total',R-6,y,9,bold);y-=30;
 const rows=[['Taxa hídrica','mL/kg/dia','fluid'],['Energia','kcal/kg/dia','calories'],['Proteína','g/kg/dia','protein']];
 for(const [name,unit,key] of rows){text(name,L+6,y,9,bold);text(unit,L+6,y-12,7.5,regular,muted);right(fmt(integrated.parenteral[key],key==='protein'?2:1),300,y,9);right(fmt(integrated.enteral[key],key==='protein'?2:1),430,y,9);right(fmt(integrated.total[key],key==='protein'?2:1),R-6,y,9,bold);y-=34;}
 y-=14;text('Régua de transição PN / EN',L,y,11,bold);y-=22;
 for(const line of transitionLines(integrated)){text(line,L,y,9);y-=18;}
 y-=8;text('Metas avaliadas sobre os totais PN + EN, antes do arredondamento.',L,y,8,regular,muted);
 y-=16;text('A régua não determina redução ou suspensão automática da PN.',L,y,8,regular,muted);
 y-=16;text(integrated.source==='none'?'Totais somente da dieta enteral.':`Fonte calculada nesta sessão: ${integrated.sourceLabel}${Number.isFinite(integrated.weight)?' · peso '+String(integrated.weight).replace('.',',')+' kg':''}.`,L,y,8,regular,muted);
 if(growth){
  y-=30;text('Crescimento ponderal',L,y,11,bold);y-=20;
  text(`${growth.input.sex==='female'?'Feminino':'Masculino'} · intervalo ${growth.intervalDays} dias · IPM média ${pma(growth.midpointPmaWeeks)}`,L,y,9);y-=17;
  text(`Ganho: ${fmt(growth.totalGain,0)} g · ${fmt(growth.gramsPerDay)} g/dia · peso médio ${fmt(growth.averageWeight,0)} g`,L,y,9);y-=17;
  text(`Velocidade pelo peso médio: ${fmt(growth.gramsPerKgDay)} g/kg/dia`,L,y,9,bold);y-=17;
  if(!growth.birthWeightRecovered){text('Ainda não recuperou o peso de nascimento; percentual da referência não calculado.',L,y,8,regular,muted);y-=16;}
  if(growth.reference){text(`Fenton 2025 · ${growth.reference.startWeek}–${growth.reference.endWeek} sem · P50 ${fmt(growth.reference.gramsPerKgDay)} g/kg/dia${growth.percentOfReference===null?'':` · ${fmt(growth.percentOfReference,0)}% da referência`}`,L,y,8,regular,muted);y-=16;}
  if(growth.shortInterval)text('Intervalo inferior a 5 dias: maior sensibilidade a variações hídricas e de pesagem.',L,y,8,regular,muted);
 }
 text('Sem identificação do paciente. Conferir os resultados antes do uso assistencial.',L,82,8,regular,muted);
 text('GROW_NEO by Prof. Jefferson · processamento local',L,50,8,regular,muted);
 if(clinical){
  const refPage=doc.addPage([612,792]);let ry=742;
  refPage.drawText('Referências por fase clínica',{x:L,y:ry,size:14,font:bold,color:ink});ry-=30;
  for(const line of clinicalReferenceLines(integrated,clinical)){
   let row='';for(const word of line.split(' ')){
    const next=row?row+' '+word:word;
    if(regular.widthOfTextAtSize(next,9)>R-L){refPage.drawText(row,{x:L,y:ry,size:9,font:regular,color:ink});ry-=14;row=word;}else row=next;
   }
   refPage.drawText(row,{x:L,y:ry,size:9,font:regular,color:ink});ry-=23;
  }
  refPage.drawText('Referências bibliográficas completas na aba Notas do aplicativo.',{x:L,y:82,size:8,font:regular,color:muted});
 }
 return doc.save();
}
