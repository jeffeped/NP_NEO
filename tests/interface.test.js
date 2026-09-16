import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import * as engine from '../engine.js';
import {macroReference,formatAlertNumber} from '../alerts.js';

// Executa o app real em um DOM simulado; não substitui a revisão visual em navegador.
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function openApp() {
  const {document,window}=parseHTML(html);
  window.HTMLElement.prototype.scrollIntoView=function(){};
  const context={document,window:{addEventListener(){},scrollTo(){}},navigator:{},
    console,URL,Blob,MessageChannel,...engine,macroReference,formatAlertNumber,
    createReport:async()=>new Uint8Array()};
  vm.runInNewContext(source,context);
  // O DOM simulado não seleciona implicitamente a primeira opção como o navegador.
  for(const select of document.querySelectorAll('select'))select.firstElementChild.selected=true;
  const set=(id,value)=>{const input=document.getElementById(id);input.value=String(value);input.dispatchEvent(new window.Event('input',{bubbles:true}));};
  const access=value=>{for(const el of document.querySelectorAll('[name="access"]')){el.checked=el.value===value;if(el.checked)el.setAttribute('checked','');else el.removeAttribute('checked');}document.getElementById('npp-form').dispatchEvent(new window.Event('change',{bubbles:true}));};
  for(const [id,value] of Object.entries({weight:'0,8',day:1,ga:27,'ga-days':0,fluid:200,aa:2,lip:2,vig:5,na:0,k:0,ca:0,mg:0,p:0,seDose:6}))set(id,value);
  access('central');
  for(const id of ['va','vb','oligo','zn','se'])document.getElementById('omit-'+id).checked=true;
  const calculate=()=>{document.getElementById('npp-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(document.getElementById('form-errors').hidden,true,document.getElementById('form-errors').textContent);};
  return {document,set,access,calculate,el:id=>document.getElementById(id),alerts:()=>Array.from(document.querySelectorAll('.clinical-alert')).map(e=>({id:e.dataset.alertId,level:e.dataset.level,text:e.textContent}))};
}
test('interface: dia 1 na referência, orientação e exportação disponível',()=>{
  const app=openApp();app.calculate();
  assert.equal(app.el('calculated-result').hidden,false);assert.equal(app.el('export-pdf').disabled,false);
  assert.deepEqual(app.alerts().map(a=>a.level),['info','info']);
  assert.match(app.el('reference-aa').textContent,/2,0 g\/kg\/dia/);
  assert.match(app.el('reference-vig').textContent,/velocidade de infusão de glicose/);
});
test('interface: acima da referência inicial gera cautela sem bloquear',()=>{
  const app=openApp();app.set('aa',3);app.set('lip',3);app.calculate();
  assert.deepEqual(app.alerts().map(a=>a.level),['caution','caution']);
  assert.equal(app.el('export-pdf').disabled,false);
});
test('interface: três grupos de alertas coexistem com acesso central',()=>{
  const app=openApp();for(const [id,value] of Object.entries({day:2,fluid:140,aa:3.6,lip:4.1,vig:20}))app.set(id,value);
  app.calculate();
  assert.deepEqual(app.alerts().map(a=>[a.id,a.level]),[['glucose-concentration-high','caution'],['aa-ceiling','high'],['lip-ceiling','high']]);
  assert.equal(app.el('export-pdf').disabled,false);
  assert.match(app.alerts()[0].text,/mesmo em acesso venoso central/);
});
test('interface: peso ≥1000 g não apresenta teto 3,5 nem na ajuda nem no alerta',()=>{
  const app=openApp();app.set('weight',1);app.set('day',2);app.set('aa',3.5);app.set('lip',3);app.calculate();
  assert.doesNotMatch(app.el('reference-aa').textContent,/3,5/);
  assert.equal(app.alerts().find(a=>a.id==='aa-reference').level,'caution');
  assert.doesNotMatch(app.alerts()[0].text,/teto de 3,5|Teto: 3,5/);
});
test('interface: exatamente 20%, acima de 20% e troca de acesso',()=>{
  const app=openApp();app.set('weight',1);app.set('fluid',90);app.set('vig',12.5);app.calculate();
  assert.equal(app.alerts().some(a=>a.id==='glucose-concentration-high'),false);
  app.set('fluid',89.9);assert.equal(app.el('calculated-result').hidden,true);app.calculate();
  assert.ok(app.alerts().some(a=>a.id==='glucose-concentration-high'));
  assert.equal(app.el('export-pdf').disabled,false);
  app.access('peripheral');app.calculate();
  assert.equal(app.el('export-pdf').disabled,true);assert.ok(app.alerts().some(a=>a.id==='glucose-concentration-high'));
  assert.match(app.el('access-alert').textContent,/12,5%/);
});
