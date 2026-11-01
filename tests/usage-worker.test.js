import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createUsageWorker} from '../workers/usage/src/index.js';

// Real SQLite executes the same prepared SQL sent to D1; no database behavior is mocked.
function database(t){
 const folder=mkdtempSync(join(tmpdir(),'grow-usage-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const file=join(folder,'test.sqlite');
 const run=statements=>JSON.parse(execFileSync('python3',['-c',
  'import sqlite3,json,sys\nc=sqlite3.connect(sys.argv[1]);c.row_factory=sqlite3.Row\ns=json.load(sys.stdin);r=[]\nwith c:\n for q in s:\n  cur=c.execute(q["sql"],q["params"]);r.append({"results":[dict(x) for x in cur.fetchall()],"success":True})\nprint(json.dumps(r))',file],{input:JSON.stringify(statements),encoding:'utf8'}));
 execFileSync('python3',['-c','import sqlite3,sys\nc=sqlite3.connect(sys.argv[1]);c.executescript(sys.stdin.read())',file],{input:readFileSync(new URL('../workers/usage/schema.sql',import.meta.url))});
 const statement=(sql,params=[])=>({sql,params,bind(...values){return statement(sql,values);},async all(){return run([this])[0];},async run(){return run([this])[0];}});
 return {prepare:sql=>statement(sql),batch:async list=>run(list)};
}
const now=()=>new Date('2026-11-01T15:00:00Z');
const worker=createUsageWorker({now});
const token='a'.repeat(48),origin='https://jeffeped.github.io';
const event=(overrides={})=>({id:crypto.randomUUID(),day:'2026-11-01',visitor:'658116d8-2c86-4a0a-a87e-3fa2f6a06b01',type:'action',feature:'hv',...overrides});
const request=(events,headers={})=>new Request('https://metrics.example.com/events',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:JSON.stringify({events})});
function env(t){return {USAGE_DB:database(t),DASHBOARD_TOKEN:token,RATE_LIMITER:{limit:async()=>({success:true})}};}
const stats=(days=1,key=token)=>new Request('https://metrics.example.com/stats?days='+days,{headers:{Authorization:'Bearer '+key}});

test('persistência deduplica retries e painel conta ativos distintos e aberturas',async t=>{
 const e=env(t),a=event(),b=event({type:'open',feature:''}),c=event({feature:'enteral'});
 for(let i=0;i<2;i++)assert.equal((await worker.fetch(request([a,b,c]),e)).status,204);
 assert.equal((await worker.fetch(request([event({type:'open',feature:'',visitor:crypto.randomUUID()})]),e)).status,204);
 const response=await worker.fetch(stats(),e),report=await response.json();
 assert.equal(response.status,200);assert.equal(report.timezone,'America/Manaus');
 assert.deepEqual(report.days,[{day:'2026-11-01',visitors:2,active:1,opens:2,actions:2,features:{hv:1,enteral:1}}]);
 assert.doesNotMatch(JSON.stringify(report),/658116d8|visitor_hash|192\.0\.2/);
 const rows=await e.USAGE_DB.prepare('SELECT * FROM usage_events').all();
 assert.equal(rows.results.length,4);assert.match(rows.results[0].visitor_hash,/^[0-9a-f]{64}$/);assert.equal(rows.results[0].visitor,undefined);
});
test('recusa campos clínicos, eventos desconhecidos, datas inválidas/antigas/futuras e lotes grandes',async t=>{
 const e=env(t);
 for(const item of [event({name:'RN confidencial'}),event({feature:'peso 820g'}),event({day:'2026-02-30'}),event({day:'2026-11-02'}),event({day:'2026-10-24'}),event({type:'clinical'}),event({visitor:'email@example.com'})]){
  assert.equal((await worker.fetch(request([item]),e)).status,400);
 }
 assert.equal((await worker.fetch(request(Array.from({length:26},()=>event())),e)).status,400);
 const rows=await e.USAGE_DB.prepare('SELECT COUNT(*) AS n FROM usage_events').all();assert.equal(rows.results[0].n,0);
});
test('estatísticas exigem token forte no header e nunca aceitam token na URL',async t=>{
 const e=env(t);
 assert.equal((await worker.fetch(stats(1,'incorreto'),e)).status,401);
 assert.equal((await worker.fetch(new Request('https://metrics.example.com/stats?token='+token),e)).status,401);
 assert.equal((await worker.fetch(stats(),{...e,DASHBOARD_TOKEN:'short'})).status,503);
 const response=await worker.fetch(stats(),e);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
});
test('origem, formato e limite protegem ingestão; ausência de configuração falha fechada',async t=>{
 const e=env(t);
 assert.equal((await worker.fetch(request([event()],{Origin:'https://outro.example'}),e)).status,403);
 assert.equal((await worker.fetch(request([event()],{'Content-Type':'text/plain'}),e)).status,415);
 assert.equal((await worker.fetch(request([event()]),{...e,RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
 assert.equal((await worker.fetch(request([event()]),{})).status,503);
 const options=await worker.fetch(new Request('https://metrics.example.com/events',{method:'OPTIONS',headers:{Origin:origin}}),e);
 assert.equal(options.status,204);assert.equal(options.headers.get('Access-Control-Allow-Origin'),origin);
 const large=new Request('https://metrics.example.com/events',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:' '.repeat(9000)});
 assert.equal((await worker.fetch(large,e)).status,413);
});
test('dias vazios aparecem no relatório e virada de Manaus respeita dia original offline',async t=>{
 const e=env(t);await worker.fetch(request([event({day:'2026-10-31'})]),e);
 const report=await (await worker.fetch(stats(2),e)).json();
 assert.equal(report.days[0].day,'2026-10-31');assert.equal(report.days[0].active,1);
 assert.deepEqual(report.days[1],{day:'2026-11-01',visitors:0,active:0,opens:0,actions:0,features:{}});
 assert.equal((await worker.fetch(stats('bad'),e)).status,400);
});
test('limpeza apaga registros fora de 90 dias sem apagar a janela atual',async t=>{
 const e=env(t);for(const day of ['2026-08-03','2026-08-04'])await e.USAGE_DB.prepare('INSERT INTO usage_events (id,day,visitor_hash,type,feature) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),day,'hash','open','').run();
 await worker.scheduled({},e);
 const rows=await e.USAGE_DB.prepare('SELECT day FROM usage_events').all();assert.deepEqual(rows.results,[{day:'2026-08-04'}]);
});
