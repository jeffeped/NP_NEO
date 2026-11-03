import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {DASHBOARD_HTML,DASHBOARD_SCRIPT} from '../workers/usage/src/dashboard.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const rows=[{day:'2026-10-31',visitors:4,active:2,opens:6,actions:3,features:{hv:2,enteral:1}},{day:'2026-11-01',visitors:1,active:1,opens:1,actions:1,features:{hv:1}}];
function dashboard(fetcher){
 const {document,window}=parseHTML(DASHBOARD_HTML),requests=[],blobs=[];
 const fetch=async(url,init)=>{requests.push({url,init});return fetcher?fetcher():Response.json({days:rows});};
 vm.runInNewContext(DASHBOARD_SCRIPT,{document,fetch,AbortSignal,Blob,setTimeout,URL:{createObjectURL(blob){blobs.push(blob);return 'blob:test';},revokeObjectURL(){}}});
 const login=()=>{document.getElementById('token').value='private-test-key-'.repeat(3);document.getElementById('login').dispatchEvent(new window.Event('submit',{cancelable:true}));};
 return {document,requests,blobs,login};
}
test('painel usa chave somente no header, exibe agregados e exporta CSV',async()=>{
 const f=dashboard();f.login();await tick();
 assert.equal(f.document.getElementById('token').value,'');
 assert.equal(f.requests[0].url,'/stats?days=30');assert.match(f.requests[0].init.headers.Authorization,/^Bearer private-test-key-/);
 assert.equal(f.document.getElementById('report').hidden,false);
 assert.equal(f.document.getElementById('today-active').textContent,'1');assert.equal(f.document.getElementById('average').textContent,'1,5');
 assert.equal(f.document.getElementById('total-opens').textContent,'7');
 assert.match(f.document.getElementById('features').textContent,/Hidratação venosa3/);
 f.document.getElementById('csv').click();const csv=await f.blobs[0].text();assert.match(csv,/2026-10-31;4;2;6;3;0;0;2;1;0;0/);assert.doesNotMatch(csv,/private-test/);
 f.document.getElementById('logout').click();assert.equal(f.document.getElementById('report').hidden,true);assert.equal(f.document.getElementById('daily').children.length,0);
});
test('logout invalida consulta em andamento e resposta tardia não reabre painel',async()=>{
 let resolve;const f=dashboard(()=>new Promise(r=>resolve=r));f.login();f.document.getElementById('logout').click();resolve(Response.json({days:rows}));await tick();
 assert.equal(f.document.getElementById('report').hidden,true);assert.equal(f.document.getElementById('daily').children.length,0);
});
