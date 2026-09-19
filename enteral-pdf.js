import {VERSION} from './engine.js';
import {transitionLines} from './enteral.js';
const fmt=(n,digits=1)=>Number.isFinite(n)?n.toFixed(digits).replace('.',','):'—';
export async function createEnteralReport({enteral,integrated}){
 if(!enteral||!integrated)throw new Error('Enteral result is not exportable');
 const {PDFDocument,StandardFonts,rgb}=globalThis.PDFLib;const doc=await PDFDocument.create();
 doc.setTitle('Avaliação nutricional integrada neonatal');doc.setAuthor('Jefferson Guilherme');doc.setCreator('Jefferson Guilherme');doc.setSubject('GROW_NEO — aporte nutricional total');
 const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const page=doc.addPage([612,792]),ink=rgb(.1,.17,.13),muted=rgb(.32,.39,.35),shade=rgb(.91,.95,.92),L=43,R=569;
 const text=(v,x,y,s=9,f=regular,c=ink)=>page.drawText(String(v),{x,y,size:s,font:f,color:c});
 const right=(v,x,y,s=9,f=regular)=>text(v,x-f.widthOfTextAtSize(String(v),s),y,s,f);
 text('GROW_NEO',L,744,16,bold);text('Avaliação nutricional integrada',L,722,13,bold);text('Versão '+VERSION,L,705,8,regular,muted);
 text(enteral.composition.label,L,674,10,bold);text(`${fmt(enteral.composition.energy)} kcal/100 mL · ${fmt(enteral.composition.protein)} g proteína/100 mL`,L,657,9);
 if(enteral.composition.fm85GramsPer100mL>0)text(`FM85: ${fmt(enteral.composition.fm85GramsPer100mL)} g/100 mL`,L,640,9);
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
 text('Sem identificação do paciente. Conferir os resultados antes do uso assistencial.',L,82,8,regular,muted);
 text('GROW_NEO by Prof. Jefferson · processamento local',L,50,8,regular,muted);
 return doc.save();
}
