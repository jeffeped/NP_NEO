import {VERSION} from './engine.js';
import {buildIntergrowthChartModel,INTERGROWTH_METRICS} from './intergrowth-charts.js';

const fmt=(value,digits=1)=>Number.isFinite(value)?value.toFixed(digits).replace('.',','):'—';
const percentile=value=>!Number.isFinite(value)?'—':value<.1?'<0,1':value>99.9?'>99,9':fmt(value);
const METRICS=['weight','length','head'];

/** An independent local report: only the validated ambulatory result is supplied. */
export async function exportIntergrowthPdf(result){
 if(!result||!['male','female'].includes(result.sex)||!Array.isArray(result.measurements)||!result.measurements.length)throw new Error('Calcule as avaliações ambulatoriais antes de exportar.');
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
   text(page,'Sem identificação do paciente · processamento local · conferir antes do uso assistencial.',left,35,8,regular,muted);
   alignRight(page,`${pageNumber}/${totalPages}`,right,20,7,regular,muted);
  }
 }
 return doc.save();
}
