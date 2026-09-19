import test from 'node:test';import assert from 'node:assert/strict';
import {initAppUpdate} from '../app-update.js';
function setup({waiting=false,accept=true,error=false}={}){
 const button={dataset:{},addEventListener(){},disabled:false},status={textContent:''};let confirms=0,reloads=0,messages=0,updates=0,listener;
 const worker={postMessage(){messages++}};
 const sw={controller:{},addEventListener(type,fn){listener=fn}};
 const reg={waiting:waiting?worker:null,addEventListener(){},async update(){updates++;if(error)throw Error('offline');}};
 const ui=initAppUpdate({button,status,serviceWorker:sw,confirmRestart:()=>{confirms++;return accept},reload:()=>reloads++});ui.setRegistration(reg);
 return {ui,button,status,reg,worker,counts:()=>({confirms,reloads,messages,updates}),changed:()=>listener?.()};
}
test('atualizar: versão atual não reinicia nem descarta parâmetros',async()=>{const s=setup();await s.ui.check();assert.match(s.status.textContent,/versão mais recente/);assert.deepEqual(s.counts(),{confirms:0,reloads:0,messages:0,updates:1});});
test('atualizar: cancela reinício com atualização pronta',async()=>{const s=setup({waiting:true,accept:false});await s.ui.check();assert.equal(s.counts().messages,0);assert.equal(s.counts().confirms,1);});
test('atualizar: confirma antes de ativar e recarrega somente após ativação',async()=>{const s=setup({waiting:true});await s.ui.check();assert.equal(s.counts().messages,1);assert.equal(s.counts().reloads,0);s.changed();assert.equal(s.counts().reloads,1);});
test('atualizar: falha de rede recupera botão sem reiniciar',async()=>{const s=setup({error:true});await s.ui.check();assert.match(s.status.textContent,/Confira a conexão/);assert.equal(s.button.disabled,false);assert.equal(s.counts().reloads,0);});
test('atualizar: detecta nova versão após consulta',async()=>{const s=setup();s.reg.update=async()=>{s.reg.waiting=s.worker};await s.ui.check();assert.equal(s.counts().messages,1);assert.equal(s.counts().confirms,1);});
