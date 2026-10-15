import {calculateIntergrowth,referenceValue} from './intergrowth.js';
import {formatIssueDate} from './pdf-date.js';

const NS='http://www.w3.org/2000/svg';
const METRICS=[['weight','Peso','kg',1000,'#163e6b','circle'],['length','Comprimento','cm',1,'#9f480a','square'],['head','PC','cm',1,'#6b3090','triangle']];
const WIDTH=595.28,HEIGHT=841.89,PLOT=Object.freeze({left:76,right:481,top:129.89,bottom:763.89});
const LIMITS={weight:[0,12],length:[24,76],head:[18,47]};
const fmt=(n,d=1)=>n.toFixed(d).replace('.',',');
let sequence=0;

export function intergrowthIdentification(value=''){
 const code=String(value).trim();
 if(code&&!/^[A-Za-z0-9_.-]{1,32}$/.test(code))throw new Error('Use um código de até 32 letras sem acentos, números, ponto, hífen ou sublinhado; não informe nomes.');
 return code;
}

/** Fixed, linear scales on ONE continuous plotting rectangle. No patient-driven scaling. */
export function buildIntegratedIntergrowthModel(input){
 const result=calculateIntergrowth(input),offScale=[];
 const xAt=day=>PLOT.left+(day-189)/259*(PLOT.right-PLOT.left);
 const yAt=(metric,value)=>HEIGHT-(metric==='weight'?450+value*20.5:metric==='length'?255+(value-28)*6.5:78+(value-18)*13);
 const series=METRICS.map(([metric,label,unit,divisor,color,shape])=>{
  const curves=Array.from({length:7},(_,i)=>({z:i-3,points:Array.from({length:260},(_,day)=>{
   const pmaDays=189+day,value=referenceValue(result.sex,metric,pmaDays,i-3)/divisor;
   return {pmaDays,value,x:xAt(pmaDays),y:yAt(metric,value)};
  })}));
  const points=[],segments=[];let segment=null;
  result.measurements.forEach((row,i)=>{
   if(row[metric]==null){segment=null;return;}
   const value=row[metric]/divisor,point={index:i+1,pmaDays:row.pmaDays,value,x:xAt(row.pmaDays),y:yAt(metric,value)};
   if(value<LIMITS[metric][0]||value>LIMITS[metric][1]||point.y<PLOT.top||point.y>PLOT.bottom){offScale.push({metric,label,unit,...point});segment=null;return;}
   points.push(point);if(!segment){segment=[];segments.push(segment);}segment.push(point);
  });
  return {metric,label,unit,divisor,color,shape,curves,points,segments};
 });
 const yAxes=[];
 const ticks=(metric,values,side)=>{for(const value of values)yAxes.push({metric,value,y:yAt(metric,value),side,label:metric==='weight'?fmt(value):String(value)});};
 ticks('weight',Array.from({length:25},(_,i)=>i*.5),'left');ticks('weight',Array.from({length:10},(_,i)=>7.5+i*.5),'right');
 ticks('length',Array.from({length:13},(_,i)=>24+i*2),'left');ticks('length',Array.from({length:9},(_,i)=>60+i*2),'right');
 ticks('head',Array.from({length:12},(_,i)=>18+i),'left');ticks('head',Array.from({length:30},(_,i)=>18+i),'right');
 // Only labels may move or be omitted in a dense series; clinical points never move.
 const pointLabels=[],allPoints=series.flatMap(s=>s.points),overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 for(const s of series){
  const ordered=s.points.length>1?[s.points[0],s.points.at(-1),...s.points.slice(1,-1)]:s.points;
  for(const point of ordered){
   const span=String(point.index).length*3.92;
   for(const [dx,dy] of [[5,-4],[-5,-4],[5,12],[-5,12]]){
    const x=point.x+dx,y=point.y+dy,left=dx>0?x:x-span,box={left:left-1,right:left+span+1,top:y-8,bottom:y+2};
    if(box.left<PLOT.left||box.right>PLOT.right||box.top<PLOT.top||box.bottom>PLOT.bottom)continue;
    if(pointLabels.some(p=>overlaps(box,p.box))||allPoints.some(p=>overlaps(box,{left:p.x-3.3,right:p.x+3.3,top:p.y-3.3,bottom:p.y+3.3})))continue;
    pointLabels.push({metric:s.metric,index:point.index,x,y,align:dx>0?'left':'right',box});break;
   }
  }
 }
 return {sex:result.sex,result,width:WIDTH,height:HEIGHT,plot:PLOT,series,offScale,yAxes,pointLabels,omittedLabels:allPoints.length-pointLabels.length,xTicks:Array.from({length:38},(_,i)=>({weeks:27+i,x:xAt((27+i)*7)}))};
}

/** Both renderers consume this same scene; positions are in PDF points, with Y downward. */
export function paintIntegratedIntergrowth(p,model,{identification='',date=new Date(),velocity=null}={}){
 const code=intergrowthIdentification(identification),{width,height,plot}=model;
 const text=(value,x,y,size=8,options={})=>p.text(value,x,y,{size,color:'#2c3a39',...options});
 text('GROW_NEO | INTERGROWTH-21st',25,28,15,{bold:true,color:'#153e32'});
 text('Prancha integrada de crescimento pós-natal do prematuro',25,46,10.5);
 text(`Identificação: ${code||'não informada'} (código)`,25,64,9);
 text(`Sexo: ${model.sex==='female'?'feminino':'masculino'} · ${model.result.measurements.length} consultas`,365,64,9);
 text(formatIssueDate(date),25,80,8);
 text('Idade pós-menstrual exata · Curvas Z -3, -2, -1, 0, +1, +2, +3 · Escalas lineares fixas',25,96,8);
 if(velocity)text(`VC ${velocity.initialEvaluation}-${velocity.finalEvaluation}: ${fmt(velocity.gramsPerDay)} g/dia · ${fmt(velocity.gramsPerKgDay)} g/kg/dia · ${velocity.intervalDays} dias`,570,80,7.5,{align:'right'});
 const missing=model.series.filter(s=>!model.result.measurements.some(row=>row[s.metric]!=null)).map(s=>s.label),warnings=[];
 if(model.offScale.length)warnings.push(`${model.offScale.length} medida(s) fora da grade; veja tabela/CSV.`);
 if(missing.length)warnings.push(`* Não informado: ${missing.join(', ')}.`);
 text(warnings.length?warnings.join(' '):'Traçado próprio com as equações INTERGROWTH-21st; sem endosso institucional.',25,110,8,{color:model.offScale.length?'#9b3d11':'#2c3a39'});
 p.beginGrid();
 for(let day=189;day<=448;day++){
  const x=plot.left+(day-189)/259*(plot.right-plot.left),major=day%7===0;
  p.line(x,plot.top,x,plot.bottom,{color:major?'#b7c5bf':'#e8edeb',width:major?.45:.22});
 }
 for(let y=plot.bottom;y>=plot.top;y-=3.25)p.line(plot.left,y,plot.right,y,{color:'#e8edeb',width:.22});
 for(let y=plot.bottom;y>=plot.top;y-=13)p.line(plot.left,y,plot.right,y,{color:'#b7c5bf',width:.45});
 p.endGrid();
 p.polyline([{x:plot.left,y:plot.top},{x:plot.right,y:plot.top},{x:plot.right,y:plot.bottom},{x:plot.left,y:plot.bottom},{x:plot.left,y:plot.top}],{color:'#60736a',width:.6});
 for(const tick of model.xTicks){text(String(tick.weeks),tick.x,plot.top-7,6.5,{align:'center'});text(String(tick.weeks),tick.x,plot.bottom+11,6.5,{align:'center'});}
 for(const tick of model.yAxes){
  text(tick.label,tick.side==='left'?plot.left-6:525,tick.y+2.4,7,{align:'right'});
  if(tick.side==='left')p.line(plot.left-3,tick.y,plot.left,tick.y,{color:'#60736a',width:.5});
 }
 for(const [x,y,title] of [[37,height-560,'Peso (kg)'],[37,height-270,'Comprimento (cm)'],[37,height-106,'PC (cm)'],[553,height-605,'Peso (kg)'],[553,height-458,'Comprimento (cm)'],[553,height-245,'Perímetro cefálico (cm)']])text(title,x,y,9,{rotate:-90});
 const labels=[];
 for(const s of model.series){
  for(const curve of s.curves){
   const color=curve.z===0?'#16804a':Math.abs(curve.z)===3?'#df174a':Math.abs(curve.z)===2?'#e06b17':'#263b35';
   p.polyline(curve.points,{color,width:curve.z===0?1:.7,z:curve.z,metric:s.metric,kind:'reference'});
   labels.push({z:curve.z,target:curve.points.at(-1).y,color});
  }
  for(const segment of s.segments)if(segment.length>1){
   p.polyline(segment,{color:'#ffffff',width:2.8});p.polyline(segment,{color:s.color,width:1.25,metric:s.metric,kind:'measurements'});
  }
  for(const point of s.points){
   p.marker(point.x,point.y,{shape:s.shape,color:s.color,size:2.8,index:point.index,metric:s.metric,title:`Consulta ${point.index}: IPM ${Math.floor(point.pmaDays/7)}+${point.pmaDays%7}; ${fmt(point.value,s.metric==='weight'?3:1)} ${s.unit}`});
   const label=model.pointLabels.find(p=>p.metric===s.metric&&p.index===point.index);
   if(label){
    text(String(point.index),label.x,label.y,7,{align:label.align,color:s.color});
   }
  }
 }
 labels.sort((a,b)=>a.target-b.target);
 labels.forEach((label,i)=>{label.y=Math.max(label.target,i?labels[i-1].y+9:plot.top+3);});
 for(let i=labels.length-1;i>=0;i--)labels[i].y=Math.min(labels[i].y,i<labels.length-1?labels[i+1].y-9:plot.bottom-3);
 for(const label of labels){
  if(Math.abs(label.y-label.target)>.1)p.line(plot.right,label.target,plot.right+5,label.y,{color:label.color,width:.4});
  text(`${label.z>0?'+':''}${label.z}`,plot.right+6,label.y+2,6.5,{color:label.color});
 }
 text('Idade pós-menstrual (semanas)',(plot.left+plot.right)/2,height-54,9,{align:'center'});
 for(const [i,s] of model.series.entries()){
  const x=[28,107,242][i];p.marker(x,height-39,{shape:s.shape,color:s.color,size:2.5});
  const missing=!model.result.measurements.some(row=>row[s.metric]!=null);
  text(`${s.label} (${s.unit})${missing?' *':''}`,x+8,height-36,8);
 }
 text(model.omittedLabels?'Rótulos parciais; detalhes na tabela/CSV':'Números: consultas · Traços: medidas reais',325,height-36,7);
 text('IPM = IG ao nascer + dias de vida; não é idade corrigida. Faixa: 27+0 a 64+0 semanas.',25,height-23,7.4);
 text('Fonte: INTERGROWTH-21st / University of Oxford. Villar et al. Lancet Glob Health. 2015;3:e681-e691.',25,height-12,7);
}

export function createIntegratedIntergrowthChart(document,input,options={}){
 const model=buildIntegratedIntergrowthModel(input),id=`ig-integrated-${++sequence}`;
 const el=(name,attrs={},value)=>{const node=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(value!=null)node.textContent=value;return node;};
 const svg=el('svg',{xmlns:NS,viewBox:`0 0 ${model.width} ${model.height}`,role:'img','aria-labelledby':`${id}-title ${id}-desc`,'font-family':'Arial, sans-serif','data-presentation':'integrated'});
 svg.append(el('title',{id:`${id}-title`},`Prancha integrada INTERGROWTH-21st: ${model.sex==='male'?'masculino':'feminino'}`));
 svg.append(el('desc',{id:`${id}-desc`},`Peso em kg, comprimento e PC em cm numa única grade por idade pós-menstrual exata, de 27+0 a 64+0 semanas; escores Z -3 a +3. ${model.offScale.length} medidas fora das escalas. Ausências interrompem os traços. Consulte a tabela para os valores e escores.`));
 svg.append(el('rect',{width:model.width,height:model.height,fill:'#ffffff'}));let target=svg;
 const append=node=>target.append(node);
 paintIntegratedIntergrowth({
  beginGrid(){const group=el('g',{'data-grid':'shared'});svg.append(group);target=group;},endGrid(){target=svg;},
  text(value,x,y,o){append(el('text',{x,y,fill:o.color,'font-size':o.size,'font-weight':o.bold?'bold':'normal','text-anchor':o.align==='center'?'middle':o.align==='right'?'end':'start',...(o.rotate?{transform:`rotate(${o.rotate} ${x} ${y})`}:{})},value));},
  line(x1,y1,x2,y2,o){append(el('line',{x1,y1,x2,y2,stroke:o.color,'stroke-width':o.width}));},
  polyline(points,o){append(el('polyline',{points:points.map(p=>`${p.x},${p.y}`).join(' '),fill:'none',stroke:o.color,'stroke-width':o.width,...(o.z!=null?{'data-z':o.z}:{}),...(o.metric?{'data-metric':o.metric}:{}),...(o.kind?{'data-series':o.kind}:{})}));},
  marker(x,y,o){const attrs={fill:o.color,stroke:'#ffffff','stroke-width':.7,...(o.index?{'data-measurement':o.index,'data-metric':o.metric}:{})};
   const mark=o.shape==='circle'?el('circle',{...attrs,cx:x,cy:y,r:o.size}):o.shape==='square'?el('rect',{...attrs,x:x-o.size,y:y-o.size,width:o.size*2,height:o.size*2}):el('polygon',{...attrs,points:`${x},${y-o.size-1} ${x-o.size-1},${y+o.size} ${x+o.size+1},${y+o.size}`});
   if(o.title)mark.append(el('title',{},o.title));append(mark);
  }
 },model,options);
 return svg;
}
