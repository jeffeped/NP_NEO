// Extract the table supplied by Fenton; never estimate scores from plotted points.
const clean=s=>String(s??'').trim().replace(/\s+/g,' ');
const number=s=>/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(clean(s))?Number(clean(s).replace(',','.')):NaN;
const ageDays=s=>{
 const fraction=/^(\d+)\s+([0-6])\s*\/\s*7$/.exec(clean(s));
 if(fraction)return Number(fraction[1])*7+Number(fraction[2]);
 const weeks=number(s);return Number.isFinite(weeks)?Math.round(weeks*7):NaN;
};
const percentile=s=>{
 const text=clean(s).replace(/\s*%$/,''),bound=/^([<>])\s*(\d+(?:[.,]\d+)?)$/.exec(text),value=number(bound?bound[2]:text);
 if(!Number.isFinite(value)||value<0||value>100)throw new Error('Percentil inválido na tabela do PDF Fenton.');
 return bound?bound[1]+bound[2].replace('.',','):value;
};
function textRows(items){
 const rows=[];
 for(const item of items.filter(i=>clean(i.str)&&Array.isArray(i.transform)).sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])){
  let row=rows.find(r=>Math.abs(r.y-item.transform[5])<2);
  if(!row){row={y:item.transform[5],items:[]};rows.push(row);}
  row.items.push(item);
 }
 for(const row of rows)row.items.sort((a,b)=>a.transform[4]-b.transform[4]);
 return rows;
}
export function parseFentonPdfTable(items,request){
 const expected=request?.measurements;
 if(!Array.isArray(expected)||!expected.length||expected.length>20)throw new Error('Medidas Fenton ausentes.');
 const rows=textRows(items),text=rows.map(r=>r.items.map(i=>clean(i.str)).join(' ')).join('\n');
 const sex=/Sex:\s*(Female|Male)\b/i.exec(text),birth=/GA at Birth:\s*(\d+(?:\s+[0-6]\s*\/\s*7|[.,]\d+)?)\s*weeks/i.exec(text);
 if(!sex||!birth||(sex[1].toLowerCase()==='female'?'F':'M')!==request.sex||ageDays(birth[1])!==request.birthGaWeeks*7+request.birthGaDays)
  throw new Error('Sexo ou IG ao nascer do PDF Fenton não correspondem ao gráfico.');
 const groups=rows.find(r=>r.items.some(i=>/^Weight\s*\(g\)$/i.test(clean(i.str)))&&r.items.some(i=>/^Head(?: Circ\.?)?\s*\(cm\)$/i.test(clean(i.str)))&&r.items.some(i=>/^Length\s*\(cm\)$/i.test(clean(i.str))));
 if(!groups||!groups.items.some(i=>/^GAge|^GA\b/i.test(clean(i.str))))throw new Error('Cabeçalho da tabela do PDF Fenton não reconhecido.');
 const names=groups.items.filter(i=>/^(Weight|Head|Length)\b/i.test(clean(i.str))).map(i=>/^Weight/i.test(i.str)?'weight':/^Head/i.test(i.str)?'head':'length');
 const header=rows.find(r=>r.y<groups.y&&r.items.filter(i=>clean(i.str)==='Value').length===3);
 const columns=header?.items.filter(i=>/^(Value|Z|dZ|%)$/.test(clean(i.str)));
 if(columns?.length!==12||columns.some((c,i)=>clean(c.str)!==['Value','Z','dZ','%'][i%4]))throw new Error('Colunas da tabela do PDF Fenton não reconhecidas.');
 const centres=columns.map(i=>i.transform[4]+(i.width??0)/2),firstBoundary=centres[0]-(centres[1]-centres[0])/2,parsed=[];
 for(const row of rows.filter(r=>r.y<header.y-2)){
  const ageItems=row.items.filter(i=>i.transform[4]+(i.width??0)/2<firstBoundary),age=ageDays(ageItems.map(i=>clean(i.str)).join(' '));
  if(!Number.isFinite(age))continue;
  const cells=Array.from({length:12},()=>[]);
  for(const item of row.items.filter(i=>!ageItems.includes(i))){
   const x=item.transform[4]+(item.width??0)/2,closest=centres.reduce((best,v,index)=>Math.abs(v-x)<Math.abs(centres[best]-x)?index:best,0);
   if(Math.abs(x-centres[closest])>18)throw new Error('Alinhamento da tabela do PDF Fenton não reconhecido.');
   cells[closest].push(clean(item.str));
  }
  parsed.push({age,cells:cells.map(c=>c.join(' '))});
 }
 if(parsed.length!==expected.length)throw new Error('A tabela do PDF Fenton não contém as mesmas medidas do gráfico.');
 return parsed.map((row,index)=>{
  const source=expected[index];
  if(row.age!==source.weeks*7+source.days)throw new Error('As idades do PDF Fenton não correspondem ao gráfico.');
  const result={weeks:source.weeks,days:source.days};
  for(const [metric,field,tolerance] of [['weight','weightGrams',.5],['head','headCm',.05],['length','lengthCm',.05]]){
   const values=row.cells.slice(names.indexOf(metric)*4,names.indexOf(metric)*4+4);
   if(source[field]==null){if(values.some(v=>v&&!/^[-–]$/.test(v)))throw new Error('O PDF Fenton contém uma medida que não foi enviada ao gráfico.');continue;}
   const value=number(values[0]),z=number(values[1]);
   if(!Number.isFinite(value)||Math.abs(value-source[field])>tolerance||!Number.isFinite(z))throw new Error('Medida ou escore divergente na tabela do PDF Fenton.');
   result[metric]={value,z,percentile:percentile(values[3])};
  }
  return result;
 });
}
export async function extractFentonPdfScores(blob,request,{loadPdfJs=()=>import('./vendor/pdfjs/pdf.min.mjs')}={}){
 if(blob.type!=='application/pdf'||blob.size>10_000_000)throw new Error('Formato de PDF Fenton inesperado.');
 const {getDocument,GlobalWorkerOptions}=await loadPdfJs();
 GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
 const task=getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,disableFontFace:true,useSystemFonts:false});
 try{
  const pdf=await task.promise;
  if(pdf.numPages<2||pdf.numPages>4)throw new Error('PDF Fenton sem a página da tabela esperada.');
  return parseFentonPdfTable((await (await pdf.getPage(2)).getTextContent()).items,request);
 }finally{await task.destroy();}
}
