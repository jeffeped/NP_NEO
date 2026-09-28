import test from 'node:test';
import assert from 'node:assert/strict';
import proxy,{toFentonCsv,validatePayload} from '../workers/fenton-proxy/src/index.js';

const data={sex:'F',birthGaWeeks:24,birthGaDays:3,measurements:[
 {weeks:24,days:3,weightGrams:613,headCm:21,lengthCm:31},
 {weeks:25,days:3,weightGrams:650,headCm:22,lengthCm:32}
]};
const env={FENTON_API_KEY:'private-test-value',RATE_LIMITER:{limit:async()=>({success:true})}};
const req=(path='/chart',body=data,headers={})=>new Request('https://example.workers.dev'+path,{method:'POST',headers:{Origin:'https://jeffeped.github.io','CF-Connecting-IP':'127.0.0.1','Content-Type':'application/json',...headers},body:JSON.stringify(body)});

test('envio de medidas Fenton omite nome, número e data de nascimento',()=>{
 const csv=toFentonCsv(data);
 assert.match(csv,/Sex:,F/);
 assert.match(csv,/24 3\/7,613,21,31/);
 assert.doesNotMatch(csv,/Number|Date of birth|Patient|Title|private-test-value/i);
 assert.equal(validatePayload({...data,patientName:'A'}),false);
 assert.equal(validatePayload({...data,measurements:[{...data.measurements[0],number:'123'}]}),false);
});

test('bloqueia dados sem sexo, IPM incoerente, medida ausente e entradas extremas',()=>{
 assert.equal(validatePayload({...data,sex:'unknown'}),false);
 assert.equal(validatePayload({...data,measurements:[{weeks:23,days:0,weightGrams:613}]}),false);
 assert.equal(validatePayload({...data,measurements:[{weeks:24,days:3}]}),false);
 assert.equal(validatePayload({...data,measurements:[{weeks:24,days:3,weightGrams:0}]}),false);
 assert.equal(validatePayload({...data,measurements:[data.measurements[1],data.measurements[0]]}),false);
});

test('sem origem autorizada, segredo ou limite configurado não chega à Fenton',async()=>{
 const oldFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected');};
 try{
  assert.equal((await proxy.fetch(new Request('https://example.workers.dev/chart',{method:'POST',body:'{}'}),env)).status,403);
  assert.equal((await proxy.fetch(req(),{RATE_LIMITER:env.RATE_LIMITER})).status,503);
  assert.equal((await proxy.fetch(req(),{FENTON_API_KEY:env.FENTON_API_KEY})).status,503);
  assert.equal((await proxy.fetch(req(),{...env,RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
  assert.equal(calls,0);
 }finally{globalThis.fetch=oldFetch;}
});

test('o Worker transmite a chave apenas ao serviço Fenton e devolve imagem sem cabeçalhos sensíveis',async()=>{
 const oldFetch=globalThis.fetch;const calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('ClientPlotPoints')){
   assert.equal(options.headers['X-API-Key'],env.FENTON_API_KEY);
   const csv=await options.body.get('file').text();
   assert.match(csv,/GA \(weeks\),Weight \(g\),Head \(cm\),Length \(cm\)/);
   assert.doesNotMatch(csv,/Date of birth|Number/);
   assert.equal(options.body.get('runMode'),'jpg');
   return Response.json({ok:true,filename:'example.jpg',contentUrl:'/temp/Fenton_Test_20260927.jpg'});
  }
  return new Response(Uint8Array.from([255,216,255,0,1]),{headers:{'Content-Type':'image/jpeg'}});
 };
 try{
  const result=await proxy.fetch(req(),env);
  assert.equal(result.status,200);
  assert.equal(result.headers.get('content-type'),'image/jpeg');
  assert.equal(result.headers.get('access-control-allow-origin'),'https://jeffeped.github.io');
  assert.equal(result.headers.get('X-API-Key'),null);
  assert.equal((await result.arrayBuffer()).byteLength,5);
  assert.equal(calls.length,2);
  assert.equal(calls[1].url,'https://fentongrowth.ca/temp/Fenton_Test_20260927.jpg');
 }finally{globalThis.fetch=oldFetch;}
});

test('bloqueia URL gerada fora do domínio Fenton e não repassa erros do serviço',async()=>{
 const oldFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({ok:true,contentUrl:'https://example.org/temp/file.jpg'});};
 try{
  const result=await proxy.fetch(req(),env);
  assert.equal(result.status,502);
  assert.doesNotMatch(await result.text(),/example\.org|private-test-value/);
  assert.equal(calls,1);
 }finally{globalThis.fetch=oldFetch;}
});

test('baixa CSV de escores Z com chave só no servidor',async()=>{
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://fentongrowth.ca/api/Fenton/ClientDownloadCsv');
  assert.equal(options.headers['X-API-Key'],env.FENTON_API_KEY);
  return new Response('GA,WeightZ\n24.4,-1.2\n',{headers:{'Content-Type':'text/csv'}});
 };
 try{
  const result=await proxy.fetch(req('/zscores'),env);
  assert.equal(result.status,200);assert.match(await result.text(),/WeightZ/);
  assert.match(result.headers.get('content-disposition'),/escores-z\.csv/);
 }finally{globalThis.fetch=oldFetch;}
});

test('aceita PDF apenas após verificar formato e endereço do arquivo Fenton',async()=>{
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  if(url.endsWith('ClientPlotPoints')){
   assert.equal(options.body.get('runMode'),'pdf');
   return Response.json({ok:true,contentUrl:'/temp/Fenton_Chart.pdf'});
  }
  return new Response(new TextEncoder().encode('%PDF-1.7\n'),{headers:{'Content-Type':'application/pdf'}});
 };
 try{
  const result=await proxy.fetch(req('/chart-pdf'),env);
  assert.equal(result.status,200);
  assert.equal(result.headers.get('content-type'),'application/pdf');
  assert.match(result.headers.get('content-disposition'),/Fenton-2025\.pdf/);
 }finally{globalThis.fetch=oldFetch;}
});
