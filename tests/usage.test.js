import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readFileSync} from 'node:fs';
import {createUsageClient} from '../usage.js';
import {initUsageUI} from '../usage-ui.js';

const endpoint='https://metrics.example.com';
function storage(){const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
function fixture(options={}){
 let time=new Date('2026-11-01T15:00:00Z'),online=false;
 const requests=[],store=options.storage??storage();
 const client=createUsageClient({endpoint,storage:store,navigator:{},now:()=>time,isOnline:()=>online,
  send:async(url,init)=>{requests.push({url,init});return {ok:true};},...options});
 return {client,requests,storage:store,time:value=>time=new Date(value),online:value=>online=value};
}
test('off-line e retry preservam IDs; payload contém somente eventos enumerados',async()=>{
 const f=fixture();f.client.record('open');f.client.record('action','np_ind');
 assert.equal(f.requests.length,0);f.online(true);await f.client.flush();
 const payload=JSON.parse(f.requests[0].init.body);
 assert.equal(payload.events.length,2);
 assert.deepEqual(Object.keys(payload.events[1]).sort(),['day','feature','id','type','visitor']);
 assert.equal(payload.events[1].day,'2026-11-01');assert.equal(payload.events[1].feature,'np_ind');
 assert.equal(payload.events[0].visitor,payload.events[1].visitor);
 assert.equal(f.requests[0].init.credentials,'omit');assert.equal(f.requests[0].init.referrerPolicy,'no-referrer');
 await f.client.flush();assert.equal(f.requests.length,1);
});
test('fila permanece quando servidor falha e retry usa os mesmos IDs',async()=>{
 const attempts=[];let ok=false;
 const f=fixture({send:async(url,init)=>{attempts.push(JSON.parse(init.body));return {ok};}});
 f.client.record('open');f.online(true);await f.client.flush();ok=true;await f.client.flush();
 assert.deepEqual(attempts[0],attempts[1]);await f.client.flush();assert.equal(attempts.length,2);
});
test('dia muda à meia-noite de Manaus; visitante não é ligado entre dias',async()=>{
 const f=fixture();f.time('2026-11-02T03:59:59Z');f.client.record('action','hv');f.time('2026-11-02T04:00:00Z');f.client.record('action','hv');
 f.online(true);await f.client.flush();const {events}=JSON.parse(f.requests[0].init.body);
 assert.equal(events[0].day,'2026-11-01');assert.equal(events[1].day,'2026-11-02');assert.notEqual(events[0].visitor,events[1].visitor);
});
test('DNT, GPC, endpoint vazio e armazenamento indisponível não coletam',async()=>{
 for(const options of [{navigator:{doNotTrack:'1'}},{navigator:{globalPrivacyControl:true}},{endpoint:''},{storage:{getItem(){throw Error();}}}]){
  const f=fixture(options);f.online(true);f.client.record('action','enteral');await f.client.flush();assert.equal(f.requests.length,0);
 }
});
test('desativar elimina fila; reativação não reenvia eventos antigos',async()=>{
 const f=fixture();f.client.record('open');f.client.setEnabled(false);f.online(true);await f.client.flush();assert.equal(f.requests.length,0);
 f.client.setEnabled(true);await f.client.flush();assert.equal(f.requests.length,0);
 f.client.record('action','hv');await f.client.flush();assert.equal(JSON.parse(f.requests[0].init.body).events.length,1);
});
test('desativação em uma aba impede coleta por outra aba já aberta',async()=>{
 const shared=storage(),a=fixture({storage:shared}),b=fixture({storage:shared});
 a.client.setEnabled(false);b.client.record('action','hv');b.online(true);await b.client.flush();
 assert.equal(b.requests.length,0);assert.equal(a.client.enabled(),false);
 const reopened=fixture({storage:shared});assert.equal(reopened.client.enabled(),false);
});
test('abas abertas compartilham visitante e preservam eventos offline umas das outras',async()=>{
 const shared=storage(),a=fixture({storage:shared}),b=fixture({storage:shared});
 a.client.record('open');b.client.record('action','hv');a.online(true);await a.client.flush();
 const {events}=JSON.parse(a.requests[0].init.body);assert.equal(events.length,2);assert.equal(events[0].visitor,events[1].visitor);
});
test('fila limita volume e descarta eventos com mais de sete dias',async()=>{
 const f=fixture();for(let i=0;i<205;i++)f.client.record('action','hv');
 f.online(true);await f.client.flush();const events=f.requests.flatMap(r=>JSON.parse(r.init.body).events);assert.equal(events.length,200);
 const old=fixture();old.client.record('open');old.time('2026-11-09T15:00:00Z');old.online(true);await old.client.flush();assert.equal(old.requests.length,0);
});
test('IDs clínicos e ações não previstas são ignorados',async()=>{
 const f=fixture();f.client.record('action','RN de Maria');f.client.record('other','hv');f.client.record('open','hv');
 f.online(true);await f.client.flush();assert.equal(f.requests.length,0);
});
test('UI observa somente ações previstas e não serializa dados clínicos',async()=>{
 const {window,document}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 const actions=[];const client={record:(...args)=>actions.push(args),flush:async()=>{},enabled:()=>true,setEnabled(){}};
 initUsageUI(window,document,endpoint,client);
 document.getElementById('weight').value='820';document.getElementById('ig-code').value='Paciente confidencial';
 document.getElementById('npp-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 document.getElementById('weight').dispatchEvent(new window.Event('input',{bubbles:true}));
 document.getElementById('std-export').disabled=true;document.getElementById('std-export').click();
 document.getElementById('ig-projection-run').disabled=false;document.getElementById('ig-projection-run').click();
 assert.deepEqual(actions,[['open'],['action','np_ind'],['action','intergrowth']]);
});
