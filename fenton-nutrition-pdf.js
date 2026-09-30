import {VERSION} from './engine.js';
import {transitionLines,clinicalReferenceLines} from './enteral.js';

const fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—';
const ipm=(w,d)=>`${w} sem + ${d} d`;

// Uses the existing calculation objects; no nutritional or growth recalculation.
export async function createFentonNutritionReport({nutrition,growth=null,chart}){
 if(!nutrition?.enteral||!nutrition.integrated)throw new Error('Calcule o aporte total na aba Enteral antes de exportar.');
 if(!chart?.blob||!chart.data)throw new Error('Gere o gráfico Fenton atualizado antes de exportar.');
 const {enteral,integrated,clinical}=nutrition,data=chart.data;
 if(growth&&(growth.input.sex!==(data.sex==='F'?'female':'male')||growth.input.gaWeeks!==data.birthGaWeeks||growth.input.gaDays!==data.birthGaDays)){
  throw new Error('Confira sexo e IG ao nascer: os dados de velocidade e do gráfico Fenton são diferentes.');
 }
 const {PDFDocument,StandardFonts,rgb}=globalThis.PDFLib;
 const doc=await PDFDocument.create();
 doc.setTitle('GROW_NEO - Aporte nutricional total e Fenton 2025');
 doc.setAuthor('Jefferson Guilherme');doc.setCreator(`GROW_NEO ${VERSION}`);
 doc.setSubject('Aportes e crescimento calculados na sessão atual');
 const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const W=595.28,H=841.89,L=38,R=W-38,ink=rgb(.1,.22,.16),muted=rgb(.32,.39,.35),shade=rgb(.91,.95,.92);
 const first=doc.addPage([W,H]);
 const text=(page,s,x,y,size=8.5,font=regular,color=ink)=>page.drawText(String(s),{x,y,size,font,color});
 const right=(s,x,y,size=9,font=regular)=>text(first,s,x-font.widthOfTextAtSize(s,size),y,size,font);
 const header=(page,title,number)=>{
  text(page,'GROW_NEO',L,H-40,16,bold);
  text(page,title,L,H-61,12,bold);
  text(page,`Versão ${VERSION} · ${data.sex==='F'?'Feminino':'Masculino'} · IG ao nascer: ${ipm(data.birthGaWeeks,data.birthGaDays)}`,L,H-79,8,regular,muted);
  text(page,'Sem identificação do paciente. Conferir antes do uso assistencial.',L,41,8,regular,muted);
  text(page,`GROW_NEO by Prof. Jefferson · ${number}/2`,L,26,8,regular,muted);
 };
 header(first,'Aporte nutricional total e crescimento',1);
 let y=H-102;
 const line=(value,{size=8.5,font=regular,color=ink,leading=12}={})=>{
  let row='';
  for(const word of String(value).split(/\s+/)){
   const next=row?row+' '+word:word;
   if(regular.widthOfTextAtSize(next,size)>R-L&&row){text(first,row,L,y,size,font,color);y-=leading;row=word;}else row=next;
  }
  text(first,row,L,y,size,font,color);y-=leading;
 };
 const section=title=>{y-=8;line(title,{size:10,font:bold,leading:17});};
 line('Fonte intravenosa: '+integrated.sourceLabel,{font:bold});
 line(Number.isFinite(integrated.weight)?`Peso usado no aporte: ${fmt(integrated.weight*1000,0)} g`:'Aporte somente enteral; valores por kg de peso.');
 line(`Dieta: ${enteral.composition.label}`);
 line(`Composição final: ${fmt(enteral.composition.energy)} kcal/100 mL · ${fmt(enteral.composition.protein,2)} g proteína/100 mL`);
 if(enteral.composition.fm85GramsPer100mL>0)line(`FM85: ${fmt(enteral.composition.fm85GramsPer100mL/4,2)} g/25 mL (média no volume total).`);
 line(enteral.composition.estimated?'Composição estimada.':'Composição informada/analisada.',{color:muted});
 if(integrated.sourceLabel.includes('2:1'))line('Lipídios infundidos à parte não integram estes totais.',{font:bold});
 y-=10;first.drawRectangle({x:L,y:y-7,width:R-L,height:22,color:shade});
 text(first,'Indicador / unidade',L+6,y,9,bold);
 right(integrated.source==='hydration'?'HV':integrated.source==='none'?'IV (zero)':'NP',323,y,9,bold);
 right('Enteral',438,y,9,bold);right('Total',R-6,y,9,bold);y-=29;
 for(const [name,unit,key,d] of [['Taxa hídrica','mL/kg/dia','fluid',1],['Energia','kcal/kg/dia','calories',1],['Proteína','g/kg/dia','protein',2]]){
  text(first,`${name} (${unit})`,L+6,y,9);
  right(fmt(integrated.parenteral[key],d),323,y);
  right(fmt(integrated.enteral[key],d),438,y);
  right(fmt(integrated.total[key],d),R-6,y,9,bold);y-=23;
 }
 section('Metas de transição NP / enteral');
 for(const item of transitionLines(integrated))line(item);
 line('Metas avaliadas antes do arredondamento; não determinam ajuste automático.',{color:muted});
 section('Crescimento ponderal');
 if(growth){
  line(`Intervalo: D${growth.input.initialDay} a D${growth.input.finalDay} · ${growth.intervalDays} dias · pesos ${fmt(growth.input.initialWeight,0)} a ${fmt(growth.input.finalWeight,0)} g`);
  line(`Ganho: ${fmt(growth.totalGain,0)} g · ${fmt(growth.gramsPerDay)} g/dia · peso médio ${fmt(growth.averageWeight,0)} g`);
  line(`Velocidade pelo peso médio: ${fmt(growth.gramsPerKgDay)} g/kg/dia`,{font:bold});
  if(!growth.birthWeightRecovered)line('Ainda não recuperou o peso de nascimento; percentual da referência não calculado.');
  if(growth.reference)line(`Fenton 2025 · ${growth.reference.startWeek}-${growth.reference.endWeek} sem · P50 ${fmt(growth.reference.gramsPerKgDay)} g/kg/dia${growth.percentOfReference===null?'':` · ${fmt(growth.percentOfReference,0)}% da referência`}`);
  else line('IPM média fora da faixa de 22 a 49 semanas da referência de velocidade.');
  if(growth.shortInterval)line('Intervalo inferior a 5 dias: maior sensibilidade a variações hídricas e de pesagem.');
  line('Comparação descritiva; interpretar com o estado clínico e a trajetória antropométrica.',{color:muted});
 }else line('Velocidade não calculada nesta sessão. Gráfico Fenton na página 2.');
 if(clinical?.phase){
  section('Referências por fase clínica');
  for(const item of clinicalReferenceLines(integrated,clinical))line(item,{size:8,leading:11});
 }
 if(y<60)throw new Error('O conteúdo excede uma página. Revise os dados antes de exportar.');
 const second=doc.addPage([W,H]);header(second,'Fenton 2025 - trajetória antropométrica',2);
 const measurements=data.measurements;
 text(second,`${measurements.length} medida(s) · IPM ${ipm(measurements[0].weeks,measurements[0].days)} a ${ipm(measurements.at(-1).weeks,measurements.at(-1).days)}`,L,H-98,8);
 const jpg=await doc.embedJpg(await chart.blob.arrayBuffer());
 // Preserve every edge of the official chart, including its attribution.
 const top=H-111,bottom=68,scale=Math.min((R-L)/jpg.width,(top-bottom)/jpg.height);
 const width=jpg.width*scale,height=jpg.height*scale;
 second.drawImage(jpg,{x:(W-width)/2,y:bottom+(top-bottom-height)/2,width,height});
 text(second,'Gráfico oficial recebido do serviço Fenton 2025 · fentongrowth.ca',L,55,8,regular,muted);
 return doc.save();
}
