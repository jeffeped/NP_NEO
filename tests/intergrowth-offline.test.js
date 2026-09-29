import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {VERSION} from '../engine.js';

test('offline install stores all ambulatory modules and serves them without network',async()=>{
 const scope='https://example.test/NP_NEO/',handlers={},stored=new Map();
 let requests=0;
 const cache={put:async(url,response)=>stored.set(String(url),response),match:async url=>stored.get(String(url))};
 const context={URL,Request,Set,Promise,self:{registration:{scope},location:{origin:'https://example.test'},addEventListener:(type,fn)=>handlers[type]=fn},
  caches:{open:async key=>{assert.equal(key,`npp-neo-static-${VERSION}`);return cache;}},
  fetch:async request=>{requests++;return {ok:true,redirected:false,headers:{get:()=>request.url.endsWith('.js')?'application/javascript':'text/html'},url:request.url};}
 };
 vm.runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),context);
 let installing;handlers.install({waitUntil:promise=>installing=promise});await installing;
 const requestsAfterInstall=requests;
 for(const path of ['intergrowth.js','intergrowth-ui.js','intergrowth-charts.js','intergrowth-pdf.js']){
  assert.ok(existsSync(new URL('../'+path,import.meta.url)));
  const url=new URL(path,scope).href;assert.ok(stored.has(url));
  let response;handlers.fetch({request:{method:'GET',url,mode:'cors'},respondWith:promise=>response=promise});
  assert.equal((await response).url,url);
 }
 assert.equal(requests,requestsAfterInstall);
});
