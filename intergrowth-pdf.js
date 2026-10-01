import {stampPdfIssueDate} from './pdf-date.js';
import {VERSION} from './engine.js';
import {buildIntergrowthChartModel,INTERGROWTH_METRICS} from './intergrowth-charts.js';
import {INTERGROWTH_MIN_DAYS,INTERGROWTH_MAX_DAYS} from './intergrowth.js';
import {calculateIntergrowthVelocity} from './intergrowth-velocity.js';

const fmt=(value,digits=1)=>Number.isFinite(value)?value.toFixed(digits).replace('.',','):'—';
const percentile=value=>!Number.isFinite(value)?'—':value<.1?'<0,1':value>99.9?'>99,9':fmt(value);
const METRICS=['weight','length','head'];
const velocityFor=result=>result.velocity==null?null:calculateIntergrowthVelocity(result,result.velocity.initialIndex,result.velocity.finalIndex);
const shortPma=days=>`${Math.floor(days/7)}+${days%7}`;
const velocityInterval=velocity=>`Avaliações ${velocity.initialEvaluation}-${velocity.finalEvaluation} · IPM ${shortPma(velocity.startPmaDays)} a ${shortPma(velocity.endPmaDays)} · ${velocity.intervalDays} dias`;
const velocityValues=velocity=>`${fmt(velocity.gramsPerDay)} g/dia · ${fmt(velocity.gramsPerKgDay)} g/kg/dia · ganho ${fmt(velocity.totalGain,0)} g · peso médio ${fmt(velocity.averageWeight,0)} g`;
const velocityReference='Velocidade: Fenton et al. Pediatr Res. 2019;85:650-654. DOI: 10.1038/s41390-019-0313-z.';

/** An independent local report: only the validated ambulatory result is supplied. */
export async function exportIntergrowthPdf(result){
 if(!result||!['male','female'].includes(result.sex)||!Array.isArray(result.measurements)||!result.measurements.length)throw new Error('Calcule as avaliações ambulatoriais antes de exportar.');
 const velocity=velocityFor(result);
 if(!globalThis.PDFLib)throw new Error('Biblioteca de PDF indisponível. Reabra o aplicativo e tente novamente.');
 const {PDFDocument,StandardFonts,rgb}=globalThis.PDFLib,doc=await PDFDocument.create();
 doc.setTitle('GROW_NEO — Seguimento ambulatorial INTERGROWTH-21st');
 doc.setAuthor('Jefferson P Guilherme');doc.setCreator(`GROW_NEO ${VERSION}`);
 doc.setSubject('Padrão pós-natal para prematuros · 27+0 a 64+0 semanas de idade pós-menstrual');
 const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const color=hex=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
 const ink=color('#263f31'),muted=color('#48594f'),left=43,right=569;
 const text=(page,value,x,y,size=9,font=regular,tone=ink)=>page.drawText(String(value),{x,y,size,font,color:tone});
 const alignRight=(page,value,x,y,size=9,font=regular,tone=ink)=>text(page,value,x-font.widthOfTextAtSize(String(value),size),y,size,font,tone);
 const centered=(page,value,x,y,size=8,font=regular,tone=ink)=>text(page,value,x-font.widthOfTextAtSize(String(value),size)/2,y,size,font,tone);
 const line=(page,start,end,tone,width=1,dashArray=[])=>page.drawLine({start,end,color:tone,thickness:width,dashArray});
 const chart=(page,model)=>{
  const scale=(right-left)/model.width,top=682;
  const pos=(x,y)=>({x:left+x*scale,y:top-y*scale});
  const write=(value,x,y,size=12,align='left',font=regular,tone=muted)=>{
   const p=pos(x,y);(align==='center'?centered:align==='right'?alignRight:text)(page,value,p.x,p.y,size*scale,font,tone);
  };
  write(`${model.label} (${model.unit})`,model.plot.left,17,13,'left',bold,ink);
  for(const tick of model.yTicks){
   line(page,pos(model.plot.left,tick.y),pos(model.plot.right,tick.y),color('#e3e9e5'),.6);
   write(tick.label,model.plot.left-10,tick.y+4,12,'right');
  }
  for(const tick of model.xTicks){
   line(page,pos(tick.x,model.plot.top),pos(tick.x,model.plot.bottom),color('#eef1ef'),.6);
   write(tick.label,tick.x,model.plot.bottom+21,12,'center');
  }
  line(page,pos(model.plot.left,model.plot.top),pos(model.plot.left,model.plot.bottom),color('#819187'),.7);
  line(page,pos(model.plot.left,model.plot.bottom),pos(model.plot.right,model.plot.bottom),color('#819187'),.7);
  for(const curve of model.curves){
   // One continuous path preserves the dash pattern through all daily samples.
   const path=curve.points.map((point,index)=>`${index?'L':'M'} ${point.x} ${point.y}`).join(' ');
   page.drawSvgPath(path,{x:left,y:top,scale,borderColor:color(curve.style.color),borderWidth:curve.style.width,borderDashArray:curve.style.dash});
   const end=curve.points.at(-1);
   if(Math.abs(curve.labelY-end.y)>1)line(page,pos(model.plot.right+1,end.y),pos(model.plot.right+7,curve.labelY),color(curve.style.color),.5);
   write(`Z ${curve.z>0?'+':''}${curve.z}`,model.plot.right+9,curve.labelY+4,12,'left',curve.z===0?bold:regular,color(curve.style.color));
  }
  for(let i=1;i<model.points.length;i++)line(page,pos(model.points[i-1].x,model.points[i-1].y),pos(model.points[i].x,model.points[i].y),color('#a14b12'),1.4);
  for(const point of model.points){
   const p=pos(point.x,point.y),nearRight=point.x>model.plot.right-20,below=point.y<model.plot.top+17;
   page.drawCircle({x:p.x,y:p.y,size:3,color:color('#b75c19'),borderColor:rgb(1,1,1),borderWidth:.7});
   write(String(point.index),point.x+(nearRight?-7:7),point.y+(below?17:-7),12,nearRight?'right':'left',bold,color('#8a390a'));
  }
  write('Idade pós-menstrual (semanas)',(model.plot.left+model.plot.right)/2,365,13,'center');
  write('Pontos numerados: avaliações · Linhas: escores Z de referência',model.plot.left,391,11);
 };
 const perPage=20,totalPages=METRICS.length*Math.ceil(result.measurements.length/perPage);
 let pageNumber=0;
 for(const metric of METRICS){
  const descriptor=INTERGROWTH_METRICS[metric],model=buildIntergrowthChartModel({sex:result.sex,metric,measurements:result.measurements});
  for(let offset=0;offset<result.measurements.length;offset+=perPage){
   const page=doc.addPage([612,792]);pageNumber++;
   text(page,'GROW_NEO · Seguimento ambulatorial',left,751,15,bold);
   text(page,`INTERGROWTH-21st · ${descriptor.label}`,left,730,12,bold);
   text(page,`${result.sex==='female'?'Feminino':'Masculino'} · IPM de 27+0 a 64+0 semanas · versão ${VERSION}`,left,713,9);
   if(velocity){
    text(page,`Velocidade ponderal observada · ${velocityInterval(velocity)}`,left,699,8.5,bold);
    text(page,velocityValues(velocity),left,687,8.5,regular,muted);
   }
   chart(page,model);
   const startY=403,rowHeight=12.4;
   page.drawRectangle({x:left,y:startY-6,width:right-left,height:19,color:color('#eaf0ec')});
   text(page,'Avaliação',left+5,startY,8,bold);text(page,'IPM (sem + d)',left+85,startY,8,bold);
   alignRight(page,`${descriptor.label} (${descriptor.inputUnit})`,right-155,startY,8,bold);
   alignRight(page,'Escore Z',right-80,startY,8,bold);alignRight(page,'Percentil',right-5,startY,8,bold);
   const rows=result.measurements.slice(offset,offset+perPage);
   rows.forEach((measurement,index)=>{
    const y=startY-20-index*rowHeight,score=measurement.scores?.[metric];
    const pmaDays=measurement.pmaDays;
    text(page,String(offset+index+1),left+5,y,8);
    text(page,`${Math.floor(pmaDays/7)} + ${pmaDays%7}`,left+85,y,8);
    alignRight(page,fmt(measurement[metric],metric==='weight'?0:1),right-155,y,8);
    alignRight(page,fmt(score?.z,2),right-80,y,8);
    alignRight(page,percentile(score?.percentile),right-5,y,8);
   });
   if(!model.points.length)text(page,'Nenhuma medida deste indicador foi informada.',left,130,8,regular,muted);
   text(page,'Coorte selecionada: poucos nascidos antes de 33 semanas; considerar o contexto clínico.',left,116,8,regular,muted);
   text(page,'IPM = idade gestacional ao nascer + idade pós-natal; não é idade corrigida.',left,102,8,regular,muted);
   text(page,'Referência de prematuros selecionados; interpretar no contexto clínico. Sem extrapolação.',left,88,8,regular,muted);
   text(page,'Fonte: Villar et al. Lancet Glob Health. 2015;3:e681–e691. Equações: Apêndice 8 (pp. 10–11).',left,74,8,regular,muted);
   text(page,'DOI: 10.1016/S2214-109X(15)00163-1 · Gráficos próprios; sem endosso dos autores.',left,60,8,regular,muted);
   if(velocity)text(page,velocityReference,left,47,8,regular,muted);
   text(page,'Sem identificação do paciente · processamento local · conferir antes do uso assistencial.',left,35,8,regular,muted);
   alignRight(page,`${pageNumber}/${totalPages}`,right,20,7,regular,muted);
  }
 }
 await stampPdfIssueDate(doc);
 return doc.save();
}

/** Compact A4 chart sheet. It shares the reference models, not the detailed page layout. */
export async function exportIntergrowthSummaryPdf(result){
 if(!result||!['male','female'].includes(result.sex)||!Array.isArray(result.measurements)||!result.measurements.length)throw new Error('Calcule as avaliações ambulatoriais antes de exportar.');
 if(result.measurements.length>20)throw new Error('A prancha de uma página comporta até vinte avaliações.');
 const velocity=velocityFor(result),summaryOffset=velocity?42:0;
 if(!globalThis.PDFLib)throw new Error('Biblioteca de PDF indisponível. Reabra o aplicativo e tente novamente.');
 const {PDFDocument,StandardFonts,rgb}=globalThis.PDFLib,doc=await PDFDocument.create();
 doc.setTitle('GROW_NEO - Prancha INTERGROWTH-21st em uma página');
 doc.setAuthor('Jefferson P Guilherme');doc.setCreator(`GROW_NEO ${VERSION}`);
 doc.setSubject('Padrão pós-natal para prematuros; 27+0 a 64+0 semanas de IPM; resumo da última avaliação');
 const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const page=doc.addPage([595.28,841.89]),left=32,right=563.28;
 const color=hex=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
 const ink=color('#263f31'),muted=color('#48594f'),patient=color('#a14b12'),grid=color('#e2e9e4');
 const text=(value,x,y,size=9,font=regular,tone=ink)=>page.drawText(String(value),{x,y,size,font,color:tone});
 const rightText=(value,x,y,size=9,font=regular,tone=ink)=>text(value,x-font.widthOfTextAtSize(String(value),size),y,size,font,tone);
 const centerText=(value,x,y,size=9,font=regular,tone=ink)=>text(value,x-font.widthOfTextAtSize(String(value),size)/2,y,size,font,tone);
 const line=(x1,y1,x2,y2,tone,width=.6)=>page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},color:tone,thickness:width});
 const last=result.measurements.at(-1),age=days=>`${Math.floor(days/7)} sem + ${days%7} d`;
 text('GROW_NEO · Curvas em uma página',left,810,16,bold);
 text('INTERGROWTH-21st · Padrão pós-natal de prematuros',left,791,11,bold);
 text(`${result.sex==='female'?'Feminino':'Masculino'} · ${result.measurements.length} ${result.measurements.length===1?'avaliação':'avaliações'} · IPM de 27+0 a 64+0 semanas · versão ${VERSION}`,left,776,9);
 text('IPM = idade gestacional ao nascer + idade pós-natal. Não é idade corrigida.',left,762,8.5,regular,muted);
 page.drawCircle({x:left+3,y:750,size:2.6,color:patient});
 text('Pontos: medidas informadas · Traço laranja: sequência das medidas · Linhas verdes: referência Z',left+12,747,8.5,regular,muted);

 for(const [index,metric] of METRICS.entries()){
  const model=buildIntergrowthChartModel({sex:result.sex,metric,measurements:result.measurements});
  const titleY=730-index*(velocity?158:172),top=titleY-12,plot={left:74,right:514,top,bottom:top-(velocity?122:136)};
  const xAt=days=>plot.left+(days-INTERGROWTH_MIN_DAYS)/(INTERGROWTH_MAX_DAYS-INTERGROWTH_MIN_DAYS)*(plot.right-plot.left);
  const yAt=value=>plot.bottom+(value-model.yMin)/(model.yMax-model.yMin)*(plot.top-plot.bottom);
  text(`${model.label} (${model.unit})`,left,titleY,10,bold);
  rightText(model.points.length?`${model.points.length} ${model.points.length===1?'medida':'medidas'}`:'Nenhuma medida informada',right,titleY,8.5,regular,muted);
  for(const tick of model.yTicks){
   const y=yAt(tick.value);line(plot.left,y,plot.right,y,grid,.5);
   rightText(tick.label,plot.left-8,y-3,8.5,regular,muted);
  }
  for(const tick of model.xTicks){
   const x=xAt(tick.value*7);line(x,plot.top,x,plot.bottom,grid,.5);
   centerText(tick.label,x,plot.bottom-13,8.5,regular,muted);
  }
  line(plot.left,plot.top,plot.left,plot.bottom,color('#819187'));
  line(plot.left,plot.bottom,plot.right,plot.bottom,color('#819187'));
  // Positions are rebuilt for the compact panels; type remains 8.5 points.
  // Separate labels after projection, so extreme measurements cannot stack Z labels.
  const labels=[...model.curves].reverse().map(curve=>({curve,targetY:yAt(curve.points.at(-1).value)}));
  labels.forEach((label,i)=>{label.y=Math.min(label.targetY,plot.top-4,i?labels[i-1].y-11:Infinity);});
  for(let i=labels.length-1;i>=0;i--)labels[i].y=Math.max(labels[i].y,i<labels.length-1?labels[i+1].y+11:plot.bottom+4);
  for(const {curve,y} of labels){
   const path=curve.points.map((point,i)=>`${i?'L':'M'} ${xAt(point.pmaDays)-plot.left} ${plot.top-yAt(point.value)}`).join(' ');
   page.drawSvgPath(path,{x:plot.left,y:plot.top,borderColor:color(curve.style.color),borderWidth:curve.z===0?1.15:.7,borderDashArray:curve.style.dash.map(value=>value*.65)});
   const endY=yAt(curve.points.at(-1).value);
   if(Math.abs(y-endY)>1)line(plot.right+1,endY,plot.right+7,y,color('#66746c'),.5);
   text(`Z ${curve.z>0?'+':''}${curve.z}`,plot.right+10,y-3,8.5,curve.z===0?bold:regular,muted);
  }
  // No per-point numbers: all measurements stay visible without crowded labels.
  for(let i=1;i<model.points.length;i++)line(xAt(model.points[i-1].pmaDays),yAt(model.points[i-1].value),xAt(model.points[i].pmaDays),yAt(model.points[i].value),patient,1.2);
  for(const point of model.points)page.drawCircle({x:xAt(point.pmaDays),y:yAt(point.value),size:2.6,color:patient,borderColor:rgb(1,1,1),borderWidth:.55});
 }
 centerText('Idade pós-menstrual (semanas)',294,211+summaryOffset,9,bold);
 text('Todos os pontos informados são incluídos. Histórico com valores e escores: relatório detalhado.',left,197+summaryOffset,8.5,regular,muted);
 text(`Última avaliação · IPM ${age(last.pmaDays)}`,left,180+summaryOffset,10,bold);
 page.drawRectangle({x:left,y:156+summaryOffset,width:right-left,height:18,color:color('#eaf0ec')});
 text('Indicador',left+5,162+summaryOffset,8.5,bold);rightText('Medida',330,162+summaryOffset,8.5,bold);rightText('Escore Z',440,162+summaryOffset,8.5,bold);rightText('Percentil',right-5,162+summaryOffset,8.5,bold);
 for(const [index,metric] of METRICS.entries()){
  const descriptor=INTERGROWTH_METRICS[metric],y=144+summaryOffset-index*14,available=Number.isFinite(last[metric]),score=last.scores?.[metric];
  text(`${descriptor.label} (${descriptor.inputUnit})`,left+5,y,9);
  rightText(available?fmt(last[metric],metric==='weight'?0:1):'Não informada',330,y,9);
  rightText(available&&Number.isFinite(score?.z)?fmt(score.z,2):'-',440,y,9);
  rightText(available&&Number.isFinite(score?.percentile)?percentile(score.percentile):'-',right-5,y,9);
 }
 if(velocity){
  text('Velocidade ponderal observada · método do peso médio (Average2pt)',left,139,9,bold);
  text(velocityInterval(velocity),left,125,8.5,regular,muted);
  text(velocityValues(velocity),left,111,9);
 }
 text('Coorte selecionada; poucos nascidos antes de 33 semanas. Interpretar no contexto clínico.',left,96,8,regular,muted);
 text('Fonte: Villar et al. Lancet Glob Health. 2015;3:e681-e691. Equações: Apêndice 8.',left,84,8,regular,muted);
 text('DOI: 10.1016/S2214-109X(15)00163-1 · Sem extrapolação além de 27+0 a 64+0 semanas de IPM.',left,72,8,regular,muted);
 text('Gráficos próprios, sem endosso dos autores. Sem identificação do paciente; processamento local.',left,60,8,regular,muted);
 if(velocity)text(velocityReference,left,48,8,regular,muted);
 text('Conferir os resultados antes do uso assistencial.',left,velocity?30:42,8,regular,muted);
 rightText('1/1',right,velocity?30:42,8,regular,muted);
 await stampPdfIssueDate(doc);
 return doc.save();
}
