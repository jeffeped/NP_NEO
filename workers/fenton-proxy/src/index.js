// Fenton 2025 API adapter. The API credential belongs in a Worker secret, never in Pages.
const FENTON_ORIGIN='https://fentongrowth.ca';
const APP_ORIGIN='https://jeffeped.github.io';
const MAX_BODY=16000;
const MAX_CHART=10_000_000;
const MAX_CSV=1_000_000;
const FIELDS=['sex','birthGaWeeks','birthGaDays','measurements'];
const MEASURES=['weeks','days','weightGrams','headCm','lengthCm'];
const exactKeys=(value,allowed)=>Object.keys(value).every(k=>allowed.includes(k));
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const measurement=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const ga=(w,d)=>w+d/7;
const error=(message,status,headers={})=>new Response(JSON.stringify({error:message}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const originHeaders={'Access-Control-Allow-Origin':APP_ORIGIN,'Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};

export function validatePayload(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||!exactKeys(data,FIELDS))return false;
 if(!['F','M'].includes(data.sex)||!integer(data.birthGaWeeks,22,42)||!integer(data.birthGaDays,0,6))return false;
 if(!Array.isArray(data.measurements)||data.measurements.length<1||data.measurements.length>20)return false;
 let last=-1;
 for(const row of data.measurements){
  if(!row||typeof row!=='object'||Array.isArray(row)||!exactKeys(row,MEASURES))return false;
  if(!integer(row.weeks,22,50)||!integer(row.days,0,6))return false;
  const age=ga(row.weeks,row.days);
  if(age>50||age<ga(data.birthGaWeeks,data.birthGaDays)||age<=last)return false;
  last=age;
  if(!MEASURES.slice(2).some(k=>row[k]!=null))return false;
  if(row.weightGrams!=null&&!measurement(row.weightGrams,100,20000))return false;
  if(row.headCm!=null&&!measurement(row.headCm,10,60))return false;
  if(row.lengthCm!=null&&!measurement(row.lengthCm,15,90))return false;
 }
 return true;
}

export function toFentonCsv(data){
 if(!validatePayload(data))throw new TypeError('Invalid Fenton measurements');
 const rows=[
  `GA at birth:,${data.birthGaWeeks} ${data.birthGaDays}/7,,`,
  `Sex:,${data.sex},,`,
  'Language,English,,',
  'Data Type ,Growth,,',
  'GA (weeks),Weight (g),Head (cm),Length (cm)',
  ...data.measurements.map(row=>`${row.weeks} ${row.days}/7,${row.weightGrams??''},${row.headCm??''},${row.lengthCm??''}`)
 ];
 return rows.join('\r\n')+'\r\n';
}

function contentUrl(value){
 if(typeof value!=='string')return null;
 try{
  const url=new URL(value,FENTON_ORIGIN);
  if(url.origin!==FENTON_ORIGIN||!/^\/temp\/[\w.-]+\.(pdf|jpe?g)$/i.test(url.pathname)||url.search||url.hash)return null;
  return url.href;
 }catch{return null;}
}

async function bounded(response,max){
 const length=Number(response.headers.get('content-length'));
 if(length>max)throw new Error('Oversized upstream response');
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.length>max)throw new Error('Oversized upstream response');
 return bytes;
}

async function fromFenton(data,action,key,fetcher){
 const form=new FormData();
 form.append('file',new Blob([toFentonCsv(data)],{type:'text/csv'}),'measurements.csv');
 const format=action==='chart-pdf'?'pdf':'jpg';
 if(action!=='zscores')form.append('runMode',format);
 const endpoint=action!=='zscores'?'ClientPlotPoints':'ClientDownloadCsv';
 let response;
 try{
  response=await fetcher(`${FENTON_ORIGIN}/api/Fenton/${endpoint}`,{
   method:'POST',headers:{'X-API-Key':key},body:form,redirect:'manual',signal:AbortSignal.timeout(20000)
  });
 }catch(err){throw new Error(`fenton-fetch-${['TypeError','TimeoutError','AbortError'].includes(err?.name)?err.name:'other'}`);}
 if(!response.ok)throw new Error(`fenton-http-${response.status}`);
 if(action==='zscores'){
  const bytes=await bounded(response,MAX_CSV);
  return new Response(bytes,{headers:{...originHeaders,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="Fenton-2025-escores-z.csv"'}});
 }
 const result=await response.json();
 if(result?.ok!==true)throw new Error('Upstream chart error');
 const url=contentUrl(result.contentUrl);
 if(!url||(format==='jpg'?!/\.jpe?g$/i.test(url):!url.toLowerCase().endsWith('.pdf')))throw new Error('Unexpected chart URL');
 const chart=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!chart.ok)throw new Error('Chart unavailable');
 const bytes=await bounded(chart,MAX_CHART);
 const jpg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
 const pdf=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70;
 if(format==='jpg'?!jpg:!pdf)throw new Error('Unexpected chart format');
 return new Response(bytes,{headers:{...originHeaders,'Content-Type':format==='pdf'?'application/pdf':'image/jpeg','Content-Disposition':`attachment; filename="Fenton-2025.${format}"`}});
}

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.headers.get('Origin')!==APP_ORIGIN)return error('Origem não autorizada.',403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...originHeaders,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  if(request.method!=='POST'||!['/chart','/chart-pdf','/zscores'].includes(url.pathname)||url.search)return error('Rota indisponível.',404,originHeaders);
  if(!env.FENTON_API_KEY||!env.RATE_LIMITER)return error('Integração indisponível.',503,originHeaders);
  const ip=request.headers.get('CF-Connecting-IP');
  if(!ip)return error('Requisição não autorizada.',403,originHeaders);
  const {success}=await env.RATE_LIMITER.limit({key:ip});
  if(!success)return error('Limite temporário de consultas atingido.',429,originHeaders);
  if(!/^application\/json\b/i.test(request.headers.get('Content-Type')||''))return error('Formato de entrada inválido.',415,originHeaders);
  if(Number(request.headers.get('Content-Length'))>MAX_BODY)return error('Entrada muito grande.',413,originHeaders);
  try{
   const raw=await request.text();
   if(raw.length>MAX_BODY)return error('Entrada muito grande.',413,originHeaders);
   const data=JSON.parse(raw);
   if(!validatePayload(data))return error('Confira idades e medidas informadas.',400,originHeaders);
   return await fromFenton(data,url.pathname.slice(1),env.FENTON_API_KEY,fetch);
  }catch(err){
   // Temporary status-only diagnostic: never reveal upstream body, inputs, key, or URL.
   const diagnostic=/^fenton-(http-[0-9]{3}|fetch-(TypeError|TimeoutError|AbortError|other))$/.test(err?.message||'')?err.message:'worker-processing';
   return error('Não foi possível consultar a Fenton. Tente novamente.',502,{...originHeaders,'X-Fenton-Diagnostic':diagnostic});
  }
 }
};
