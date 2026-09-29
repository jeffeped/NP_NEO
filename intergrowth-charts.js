import {referenceValue,INTERGROWTH_MIN_DAYS as MIN_DAYS,INTERGROWTH_MAX_DAYS as MAX_DAYS} from './intergrowth.js';
const NS='http://www.w3.org/2000/svg';
export const INTERGROWTH_METRICS=Object.freeze({
 weight:Object.freeze({label:'Peso',unit:'kg',inputUnit:'g',divisor:1000}),
 length:Object.freeze({label:'Comprimento',unit:'cm',inputUnit:'cm',divisor:1}),
 head:Object.freeze({label:'Perímetro cefálico',unit:'cm',inputUnit:'cm',divisor:1})
});
let chartSequence=0;
const fmt=value=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(value);
const rounded=value=>Number(value.toFixed(3));
function niceStep(span){
 const raw=span/6,power=10**Math.floor(Math.log10(raw)),fraction=raw/power;
 return (fraction<=1?1:fraction<=2?2:fraction<=2.5?2.5:fraction<=5?5:10)*power;
}
export function referenceStyle(z){
 if(z===0)return {color:'#256447',width:2,dash:[]};
 return {color:Math.abs(z)===3?'#66746c':'#91a098',width:1.2,dash:Math.abs(z)===1?[2,3]:Math.abs(z)===2?[7,4]:[11,4,2,4]};
}

/** Plot geometry uses kg for weight and cm for length/head; input values remain g/cm. */
export function buildIntergrowthChartModel({sex,metric,measurements=[]}){
 const descriptor=INTERGROWTH_METRICS[metric];
 if(!descriptor||!['male','female'].includes(sex))throw new Error('Indicador ou sexo inválido para a curva INTERGROWTH.');
 const width=800,height=400,plot={left:68,right:746,top:28,bottom:322};
 const rawCurves=Array.from({length:7},(_,i)=>{
  const z=i-3;
  return {z,values:Array.from({length:MAX_DAYS-MIN_DAYS+1},(_,day)=>{
   const pmaDays=MIN_DAYS+day,value=referenceValue(sex,metric,pmaDays,z)/descriptor.divisor;
   if(!Number.isFinite(value))throw new Error('Referência INTERGROWTH inválida.');
   return {pmaDays,value};
  })};
 });
 const rawPoints=measurements.flatMap((measurement,index)=>{
  const value=measurement[metric],pmaDays=measurement.pmaDays;
  if(!Number.isFinite(value)||value<=0||!Number.isFinite(pmaDays)||pmaDays<MIN_DAYS||pmaDays>MAX_DAYS)return [];
  return [{index:index+1,pmaDays,value:value/descriptor.divisor,inputValue:value}];
 });
 const values=[...rawCurves.flatMap(curve=>curve.values.map(point=>point.value)),...rawPoints.map(point=>point.value)];
 const low=Math.min(...values),high=Math.max(...values),padding=(high-low)*.025;
 const step=niceStep(high-low+padding*2);
 const yMin=Math.max(0,Math.floor((low-padding)/step)*step),yMax=Math.ceil((high+padding)/step)*step;
 const xAt=day=>plot.left+(day-MIN_DAYS)/(MAX_DAYS-MIN_DAYS)*(plot.right-plot.left);
 const yAt=value=>plot.bottom-(value-yMin)/(yMax-yMin)*(plot.bottom-plot.top);
 const project=point=>({...point,x:rounded(xAt(point.pmaDays)),y:rounded(yAt(point.value))});
 const curves=rawCurves.map(curve=>({z:curve.z,style:referenceStyle(curve.z),points:curve.values.map(project)}));
 // Keep reference labels distinct when an outlier expands the vertical scale.
 const labels=[...curves].reverse();
 labels.forEach((curve,index)=>{curve.labelY=Math.max(curve.points.at(-1).y,plot.top+4,index?labels[index-1].labelY+13:0);});
 for(let index=labels.length-1;index>=0;index--)labels[index].labelY=Math.min(labels[index].labelY,index<labels.length-1?labels[index+1].labelY-13:plot.bottom-4);
 const points=rawPoints.map(project);
 const xTicks=[27,30,35,40,45,50,55,60,64].map(weeks=>({value:weeks,x:xAt(weeks*7),label:String(weeks)}));
 const yTicks=[];
 for(let value=yMin;value<=yMax+step/10;value+=step)yTicks.push({value,y:yAt(value),label:fmt(rounded(value))});
 return {sex,metric,...descriptor,width,height,plot,curves,points,xTicks,yTicks,yMin,yMax};
}

export function createIntergrowthChart(document,options){
 const model=buildIntergrowthChartModel(options),id=`ig-chart-${++chartSequence}`;
 const element=(name,attributes={},text)=>{
  const node=document.createElementNS(NS,name);
  for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const svg=element('svg',{viewBox:`0 0 ${model.width} ${model.height}`,role:'img','aria-labelledby':`${id}-title ${id}-description`,class:'intergrowth-chart','data-metric':model.metric,'font-family':'Arial, sans-serif'});
 svg.append(element('title',{id:`${id}-title`},`${model.label} por idade pós-menstrual — INTERGROWTH-21st — ${model.sex==='female'?'feminino':'masculino'}`));
 svg.append(element('desc',{id:`${id}-description`},`Padrão pós-natal para prematuros, de 27 a 64 semanas de idade pós-menstrual. Sete curvas de referência, dos escores Z -3 a +3. ${model.points.length} avaliações de ${model.label.toLowerCase()}, numeradas conforme a tabela. Valores em ${model.unit}.`));
 svg.append(element('rect',{x:0,y:0,width:model.width,height:model.height,fill:'#ffffff'}));
 svg.append(element('text',{x:model.plot.left,y:17,fill:'#263f31','font-size':13,'font-weight':'bold'},`${model.label} (${model.unit})`));
 for(const tick of model.yTicks){
  svg.append(element('line',{x1:model.plot.left,y1:tick.y,x2:model.plot.right,y2:tick.y,stroke:'#e3e9e5','stroke-width':1}));
  svg.append(element('text',{x:model.plot.left-10,y:tick.y+4,fill:'#48594f','font-size':12,'text-anchor':'end'},tick.label));
 }
 for(const tick of model.xTicks){
  svg.append(element('line',{x1:tick.x,y1:model.plot.top,x2:tick.x,y2:model.plot.bottom,stroke:'#eef1ef','stroke-width':1}));
  svg.append(element('text',{x:tick.x,y:model.plot.bottom+21,fill:'#48594f','font-size':12,'text-anchor':'middle'},tick.label));
 }
 svg.append(element('path',{d:`M ${model.plot.left} ${model.plot.top} V ${model.plot.bottom} H ${model.plot.right}`,fill:'none',stroke:'#819187','stroke-width':1}));
 for(const curve of model.curves){
  svg.append(element('polyline',{points:curve.points.map(point=>`${point.x},${point.y}`).join(' '),fill:'none',stroke:curve.style.color,'stroke-width':curve.style.width,'stroke-dasharray':curve.style.dash.join(' '),'data-z':curve.z}));
  const end=curve.points.at(-1);
  if(Math.abs(curve.labelY-end.y)>1)svg.append(element('line',{x1:model.plot.right+1,y1:end.y,x2:model.plot.right+7,y2:curve.labelY,stroke:curve.style.color,'stroke-width':.7}));
  svg.append(element('text',{x:model.plot.right+9,y:curve.labelY+4,fill:curve.style.color,'font-size':12,'font-weight':curve.z===0?'bold':'normal'},`Z ${curve.z>0?'+':''}${curve.z}`));
 }
 if(model.points.length>1)svg.append(element('polyline',{points:model.points.map(point=>`${point.x},${point.y}`).join(' '),fill:'none',stroke:'#a14b12','stroke-width':2,'data-series':'measurements'}));
 for(const point of model.points){
  const nearRight=point.x>model.plot.right-20,below=point.y<model.plot.top+17;
  const mark=element('circle',{cx:point.x,cy:point.y,r:4.5,fill:'#b75c19',stroke:'#ffffff','stroke-width':1.3,'data-measurement':point.index});
  mark.append(element('title',{},`Avaliação ${point.index}: ${Math.floor(point.pmaDays/7)} sem + ${point.pmaDays%7} d; ${fmt(point.value)} ${model.unit}`));
  svg.append(mark);
  svg.append(element('text',{x:point.x+(nearRight?-7:7),y:point.y+(below?17:-7),fill:'#8a390a','font-size':12,'font-weight':'bold','text-anchor':nearRight?'end':'start'},String(point.index)));
 }
 svg.append(element('text',{x:(model.plot.left+model.plot.right)/2,y:365,fill:'#48594f','font-size':13,'text-anchor':'middle'},'Idade pós-menstrual (semanas)'));
 svg.append(element('circle',{cx:model.plot.left+5,cy:387,r:4,fill:'#b75c19'}));
 svg.append(element('text',{x:model.plot.left+17,y:391,fill:'#48594f','font-size':12},'Avaliações numeradas · Curvas de referência identificadas pelo escore Z'));
 return svg;
}
