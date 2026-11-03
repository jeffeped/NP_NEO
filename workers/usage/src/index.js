import {DASHBOARD_HTML,DASHBOARD_SCRIPT} from './dashboard.js';
const ORIGIN='https://jeffeped.github.io',DAY=86400000,MAX_BODY=8192;
const FEATURES=new Set(['np_ind','np_padrao','hv','enteral','fenton','intergrowth']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateKey=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const days=value=>Date.parse(value+'T00:00:00Z')/DAY;
const shift=(day,amount)=>new Date((days(day)+amount)*DAY).toISOString().slice(0,10);
const cors={'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin'};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8',...extra}});
const fail=(status,extra={})=>json({error:'Consulta indisponível. Confira a configuração, a conexão e as credenciais.'},status,extra);
const ready=env=>env.USAGE_DB&&env.RATE_LIMITER&&typeof env.DASHBOARD_TOKEN==='string'&&env.DASHBOARD_TOKEN.length>=32&&env.DASHBOARD_TOKEN.length<=256;
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
async function authorized(request,secret){
 const received=request.headers.get('Authorization')??'';
 if(!received.startsWith('Bearer ')||received.length>263)return false;
 const a=await hash(received.slice(7)),b=await hash(secret);let mismatch=0;
 for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);
 return mismatch===0;
}
function validEvent(e,today){
 if(!e||typeof e!=='object'||Array.isArray(e)||Object.keys(e).length!==5||!Object.keys(e).every(k=>['id','day','visitor','type','feature'].includes(k)))return false;
 if(typeof e.id!=='string'||typeof e.visitor!=='string'||!UUID.test(e.id)||!UUID.test(e.visitor)||typeof e.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.day))return false;
 const number=days(e.day);if(!Number.isFinite(number)||shift(e.day,0)!==e.day||number>days(today)||number<days(today)-7)return false;
 return e.type==='open'&&e.feature===''||e.type==='action'&&FEATURES.has(e.feature);
}
async function readBody(request){
 if(Number(request.headers.get('Content-Length'))>MAX_BODY)throw new RangeError();
 const reader=request.body?.getReader();if(!reader)return '';
 let size=0;const parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BODY){await reader.cancel();throw new RangeError();}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
async function ingest(request,env,today){
 if(request.headers.get('Origin')!==ORIGIN)return fail(403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,...cors,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
 if(request.method!=='POST')return fail(405,cors);
 if(!ready(env))return fail(503,cors);
 const ip=request.headers.get('CF-Connecting-IP');if(!ip)return fail(403,cors);
 if(!(await env.RATE_LIMITER.limit({key:ip})).success)return fail(429,cors);
 if(!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('Content-Type')??''))return fail(415,cors);
 let data;try{data=JSON.parse(await readBody(request));}catch(error){return fail(error instanceof RangeError?413:400,cors);}
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==1||!Array.isArray(data.events)||data.events.length<1||data.events.length>25||!data.events.every(e=>validEvent(e,today)))return fail(400,cors);
 const statements=await Promise.all(data.events.map(async e=>env.USAGE_DB.prepare(
  'INSERT OR IGNORE INTO usage_events (id,day,visitor_hash,type,feature) VALUES (?,?,?,?,?)'
 ).bind(e.id,e.day,await hash(e.day+':'+e.visitor),e.type,e.feature)));
 await env.USAGE_DB.batch(statements);
 return new Response(null,{status:204,headers:{...headers,...cors}});
}
async function report(request,env,url,today){
 if(!ready(env))return fail(503);
 if(!await authorized(request,env.DASHBOARD_TOKEN))return fail(401,{'WWW-Authenticate':'Bearer'});
 const count=Number(url.searchParams.get('days')??30);
 if(!Number.isInteger(count)||count<1||count>90||[...url.searchParams.keys()].some(k=>k!=='days'))return fail(400);
 const from=shift(today,1-count);
 const totals=await env.USAGE_DB.prepare(`SELECT day, COUNT(DISTINCT visitor_hash) AS visitors,
 COUNT(DISTINCT CASE WHEN type='action' THEN visitor_hash END) AS active,
 SUM(CASE WHEN type='open' THEN 1 ELSE 0 END) AS opens,
 SUM(CASE WHEN type='action' THEN 1 ELSE 0 END) AS actions
 FROM usage_events WHERE day>=? AND day<=? GROUP BY day`).bind(from,today).all();
 const features=await env.USAGE_DB.prepare("SELECT day,feature,COUNT(*) AS n FROM usage_events WHERE day>=? AND day<=? AND type='action' GROUP BY day,feature").bind(from,today).all();
 const result=Array.from({length:count},(_,i)=>({day:shift(from,i),visitors:0,active:0,opens:0,actions:0,features:{}}));
 const byDay=new Map(result.map(r=>[r.day,r]));
 for(const row of totals.results)Object.assign(byDay.get(row.day),row);
 for(const row of features.results)byDay.get(row.day).features[row.feature]=row.n;
 return json({timezone:'America/Manaus',retentionDays:90,days:result});
}
export function createUsageWorker({now=()=>new Date()}={}){
 return {
  async fetch(request,env){
   const url=new URL(request.url),today=dateKey(now());
   try{
    if(url.pathname==='/events'&&!url.search)return await ingest(request,env,today);
    if(url.pathname==='/stats'&&request.method==='GET')return await report(request,env,url,today);
    if(url.pathname==='/health'&&request.method==='GET'&&!url.search){
     if(!ready(env))return fail(503);
     await env.USAGE_DB.prepare('SELECT id FROM usage_events LIMIT 1').all();return json({ready:true});
    }
    if(request.method==='GET'&&!url.search&&(url.pathname==='/'||url.pathname==='/dashboard.js'))return new Response(url.pathname==='/'?DASHBOARD_HTML:DASHBOARD_SCRIPT,{headers:{...headers,
     'Content-Type':url.pathname==='/'?'text/html; charset=utf-8':'text/javascript; charset=utf-8',
     'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
    return fail(404);
   }catch{return fail(503,url.pathname==='/events'&&request.headers.get('Origin')===ORIGIN?cors:{});}
  },
  async scheduled(controller,env){await env.USAGE_DB.prepare('DELETE FROM usage_events WHERE day < ?').bind(shift(dateKey(now()),-89)).run();}
 };
}
export default createUsageWorker();
