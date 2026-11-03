// Usage metadata only. This module must never receive clinical objects or DOM fields.
const PREFIX='grow-neo-usage-v1:',PREFERENCE=PREFIX+'enabled',IDENTITY=PREFIX+'identity',EVENT=PREFIX+'event:',DAY=86400000,LIMIT=200;
const FEATURES=new Set(['np_ind','np_padrao','hv','enteral','fenton','intergrowth']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus',year:'numeric',month:'2-digit',day:'2-digit'});
const dateKey=date=>formatter.format(date),dayNumber=value=>Date.parse(value+'T00:00:00Z')/DAY;
function validEvent(e,today){
 if(!e||typeof e!=='object'||Object.keys(e).length!==5||!UUID.test(e.id)||!UUID.test(e.visitor)||!/^\d{4}-\d{2}-\d{2}$/.test(e.day))return false;
 const day=dayNumber(e.day);
 return Number.isInteger(day)&&new Date(day*DAY).toISOString().slice(0,10)===e.day&&day<=dayNumber(today)&&day>=dayNumber(today)-7&&
  (e.type==='open'&&e.feature===''||e.type==='action'&&FEATURES.has(e.feature));
}

export function createUsageClient({endpoint='',storage,navigator:nav=globalThis.navigator??{},now=()=>new Date(),
 isOnline=()=>nav.onLine!==false,send=(...args)=>fetch(...args)}={}){
 let available=false,pending=null,base='';
 try{const u=new URL(endpoint);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/')base=u.origin;}catch{}
 const privateMode=()=>nav.doNotTrack==='1'||nav.globalPrivacyControl===true;
 // Each event has its own key. Concurrent tabs cannot replace another tab's queue.
 const eventKeys=()=>Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>k?.startsWith(EVENT));
 const clear=()=>{try{for(const k of eventKeys())storage.removeItem(k);storage.removeItem(IDENTITY);}catch{available=false;}};
 const enabled=()=>{try{return Boolean(base&&available&&!privateMode()&&storage.getItem(PREFERENCE)!=='false');}catch{available=false;return false;}};
 if(base)try{
  storage??=globalThis.localStorage;
  const probe=PREFIX+globalThis.crypto.randomUUID();storage.setItem(probe,'1');storage.removeItem(probe);available=true;
 }catch{available=false;}
 if(available&&!enabled())clear();
 function queue(){
  const today=dateKey(now()),events=[];
  for(const key of eventKeys()){
   let e;try{e=JSON.parse(storage.getItem(key));}catch{}
   if(validEvent(e,today)&&key===EVENT+e.id)events.push(e);else storage.removeItem(key);
  }
  events.sort((a,b)=>a.day.localeCompare(b.day));
  while(events.length>LIMIT)storage.removeItem(EVENT+events.shift().id);
  return events;
 }
 async function drain(){
  if(!enabled()){if(available)clear();return;}
  if(!isOnline())return;
  try{
   let events=queue();
   while(events.length&&enabled()){
    const batch=events.slice(0,25);
    const response=await send(base+'/events',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({events:batch}),credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok)break;
    for(const e of batch)storage.removeItem(EVENT+e.id);
    events=queue();
   }
  }catch{}
 }
 function flush(){if(!pending)pending=drain().finally(()=>{pending=null;});return pending;}
 function append(type,feature){
  try{
   if(!enabled()){if(available)clear();return;}
   if(!(type==='open'&&feature===''||type==='action'&&FEATURES.has(feature)))return;
   const day=dateKey(now());let identity;
   try{identity=JSON.parse(storage.getItem(IDENTITY));}catch{}
   if(identity?.day!==day||!UUID.test(identity?.id)){identity={day,id:globalThis.crypto.randomUUID()};storage.setItem(IDENTITY,JSON.stringify(identity));}
   const e={id:globalThis.crypto.randomUUID(),day,visitor:identity.id,type,feature};
   storage.setItem(EVENT+e.id,JSON.stringify(e));queue();
   if(!enabled()){clear();return;}
   if(isOnline())void Promise.resolve().then(flush);
  }catch{available=false;}
 }
 function record(type,feature=''){
  // Shared lock also serializes first daily identity creation where supported.
  // Every error is contained: statistics never interfere with clinical functionality.
  try{if(nav.locks?.request)void nav.locks.request(PREFIX+'record',()=>append(type,feature)).catch(()=>{});else append(type,feature);}catch{}
 }
 return {record,flush,enabled,setEnabled(value){try{if(!available)return;storage.setItem(PREFERENCE,String(Boolean(value)));if(!value)clear();}catch{available=false;}}};
}
