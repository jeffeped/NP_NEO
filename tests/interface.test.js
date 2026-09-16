import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import * as engine from '../engine.js';
import {macroReference,formatAlertNumber} from '../alerts.js';
import {initStandard} from '../standard-ui.js';
import {initHydration} from '../hydration-ui.js';

// Executa o app real em um DOM simulado; não substitui a revisão visual em navegador.
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function openApp() {
  const {document,window}=parseHTML(html);
  window.HTMLElement.prototype.scrollIntoView=function(){};
  const context={document,window:{addEventListener(){},scrollTo(){}},navigator:{},
    console,URL,Blob,MessageChannel,...engine,macroReference,formatAlertNumber,initHydration,initStandard,
    createReport:async()=>new Uint8Array()};
  vm.runInNewContext(source,context);
  // O DOM simulado não seleciona implicitamente a primeira opção como o navegador.
  for(const select of document.querySelectorAll('select'))select.firstElementChild.selected=true;
  const set=(id,value)=>{const input=document.getElementById(id);if(input.tagName==='SELECT'){for(const option of input.options)option.removeAttribute('selected');Array.from(input.options).find(option=>option.value===String(value)).selected=true;}else input.value=String(value);input.dispatchEvent(new window.Event('input',{bubbles:true}));};
  const access=value=>{for(const el of document.querySelectorAll('[name="access"]')){el.checked=el.value===value;if(el.checked)el.setAttribute('checked','');else el.removeAttribute('checked');}document.getElementById('npp-form').dispatchEvent(new window.Event('change',{bubbles:true}));};
  for(const [id,value] of Object.entries({weight:'0,8',day:1,ga:27,'ga-days':0,fluid:200,aa:2,lip:2,vig:5,na:0,k:0,ca:0,mg:0,p:0,seDose:6}))set(id,value);
  access('central');
  for(const id of ['va','vb','oligo','zn','se'])document.getElementById('omit-'+id).checked=true;
  const calculate=()=>{document.getElementById('npp-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(document.getElementById('form-errors').hidden,true,document.getElementById('form-errors').textContent);};
  return {document,window,set,access,calculate,dispatch:(id,type)=>document.getElementById(id).dispatchEvent(new window.Event(type,{bubbles:true,cancelable:true})),el:id=>document.getElementById(id),alerts:()=>Array.from(document.querySelectorAll('.clinical-alert')).map(e=>({id:e.dataset.alertId,level:e.dataset.level,text:e.textContent}))};
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

function openHydration(){
  const app=openApp();
  const unit=value=>{app.el('hv-doseUnit').querySelector(`option[value="${value}"]`).selected=true;app.dispatch('hv-doseUnit','change');};
  unit('perKgDay');
  for(const [id,value] of Object.entries({weight:2,fluid:100,vig:5,na:1.7,k:1.34,ca:0.5,mg:0.8}))app.set('hv-'+id,value);
  app.dispatch('tab-hydration','click');
  return {...app,unit,calculateHydration:()=>app.dispatch('hv-form','submit')};
}

test('interface HV: terceira aba calcula com as fórmulas confirmadas e mostra seis componentes',()=>{
  const app=openHydration();app.calculateHydration();
  assert.equal(app.el('hydration').hidden,false);assert.equal(app.el('parameters').hidden,true);assert.equal(app.el('results').hidden,true);
  assert.equal(app.el('tab-hydration').getAttribute('aria-selected'),'true');
  assert.equal(app.el('hv-errors').hidden,true,app.el('hv-errors').textContent);assert.equal(app.el('hv-result').hidden,false);
  assert.equal(app.el('hv-composition').hidden,false);
  assert.equal(app.el('hv-rows').children.length,6);
  const summary=app.el('hv-summary').textContent;
  assert.match(summary,/200,0 mL\/24 h/);assert.match(summary,/14,4 g\/24 h/);assert.match(summary,/192,0 mL/);
  assert.match(summary,/10,7 mL/);assert.match(summary,/181,4 mL/);assert.match(summary,/8,4 mL\/h/);assert.match(summary,/5 \/ 5 mg\/kg\/min/);
  assert.deepEqual([...app.el('hv-rows').children].map(row=>row.children[1].textContent),['2,0','2,0','2,0','2,0','181,4','10,7']);
});

test('interface HV: campos de dose, VIG e peso começam sem sugestão',()=>{
  const app=openApp();
  for(const id of ['weight','fluid','vig','na','k','ca','mg'])assert.equal(app.el('hv-'+id).value,'');
  assert.equal(app.el('hv-doseUnit').value,'');
});

test('interface HV: alteração de unidade limpa doses e invalida composição anterior',()=>{
  const app=openHydration();app.calculateHydration();app.unit('totalDay');
  assert.equal(app.el('hv-result').hidden,true);
  for(const id of ['na','k','ca','mg'])assert.equal(app.el('hv-'+id).value,'');
  assert.match(app.el('hv-unit-note').textContent,/informe novamente/);
  app.calculateHydration();assert.equal(app.el('hv-errors').hidden,false);
  for(const [id,value] of Object.entries({na:3.4,k:2.68,ca:1,mg:1.6}))app.set('hv-'+id,value);
  app.calculateHydration();assert.equal(app.el('hv-errors').hidden,true);
  assert.match(app.el('hv-summary').textContent,/14,4 g\/24 h/);
  assert.match(app.el('hv-rows').textContent,/3,4 mEq\/24 h · 1,7 mEq\/kg\/dia/);
});

test('interface HV: mistura inviável mostra gG e motivo, sem apresentar composição aproveitável',()=>{
  const app=openHydration();app.calculateHydration();app.set('hv-vig',1);
  assert.equal(app.el('hv-result').hidden,true);app.calculateHydration();
  assert.equal(app.el('hv-composition').hidden,true);assert.equal(app.el('hv-rows').children.length,0);
  assert.match(app.el('hv-summary').textContent,/2,88 g\/24 h/);
  assert.match(app.el('hv-blocks').textContent,/abaixo da faixa matematicamente possível/);
});

test('interface HV: mudar equivalência do rótulo exige recálculo',()=>{
  const app=openHydration();app.calculateHydration();app.set('hv-concentration-ca','0,465');
  assert.equal(app.el('hv-result').hidden,true);app.calculateHydration();
  const ca=app.document.querySelector('[data-hv-component="ca"]');
  assert.match(ca.textContent,/0,465 mEq\/mL/);assert.match(ca.textContent,/2,2/);
});

test('interface HV: formulário independente preserva resultado e exportação da NP',()=>{
  const app=openHydration();app.calculate();
  const npResult=app.el('result-summary').textContent;
  app.dispatch('tab-hydration','click');app.calculateHydration();app.set('hv-weight',3);
  app.dispatch('tab-results','click');
  assert.equal(app.el('calculated-result').hidden,false);assert.equal(app.el('export-pdf').disabled,false);
  assert.equal(app.el('result-summary').textContent,npResult);
  assert.equal(app.el('hv-result').hidden,true);assert.equal(app.el('hydration').hidden,true);
});

test('interface: teclado percorre as quatro abas, incluindo início, fim e retorno',()=>{
  const app=openApp();
  const key=(id,value)=>{const e=new app.window.Event('keydown',{bubbles:true,cancelable:true});Object.defineProperty(e,'key',{value});app.el(id).dispatchEvent(e);};
  key('tab-parameters','End');assert.equal(app.el('standard').hidden,false);
  key('tab-standard','ArrowRight');assert.equal(app.el('parameters').hidden,false);
  key('tab-parameters','ArrowLeft');assert.equal(app.el('standard').hidden,false);
  key('tab-standard','Home');assert.equal(app.el('parameters').hidden,false);
});

test('interface: NP padrão calcula por taxa, troca para proteína e invalida saída',()=>{
 const app=openApp();app.dispatch('tab-standard','click');
 for(const [id,value] of Object.entries({'std-weight':'0,8','std-day':2,'std-value':100,'std-access':'central'}))app.set(id,value);
 app.dispatch('std-form','submit');assert.equal(app.el('std-errors').hidden,true);assert.equal(app.el('std-result').hidden,false);
 assert.match(app.el('std-prescription').textContent,/80,00 mL/);assert.equal(app.el('std-export').disabled,false);assert.match(app.el('std-summary').textContent,/Concentração de glicose13,33%/);
 app.set('std-mode','protein');app.dispatch('std-mode','change');assert.equal(app.el('std-result').hidden,true);assert.equal(app.el('std-value').value,'');assert.equal(app.el('std-export').disabled,true);assert.equal(app.el('std-pdf-download').hidden,true);
 app.set('std-value',3);app.dispatch('std-form','submit');assert.match(app.el('std-prescription').textContent,/76,60 mL/);
 app.set('std-access','peripheral');app.dispatch('std-form','submit');assert.match(app.el('std-status').textContent,/bloqueada/);assert.equal(app.el('std-export').disabled,true);
 app.set('std-weight','');app.dispatch('std-form','submit');assert.equal(app.el('std-result').hidden,true);assert.equal(app.el('std-errors').hidden,false);
});
