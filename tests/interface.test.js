import {intravenousFromResult} from '../enteral.js';
import {initAppUpdate} from '../app-update.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import * as engine from '../engine.js';
import {macroReference,formatAlertNumber} from '../alerts.js';
import {initStandard} from '../standard-ui.js';
import {initHydration} from '../hydration-ui.js';
import {initEnteral} from '../enteral-ui.js';
import {initGrowth} from '../growth-ui.js';

// Executa o app real em um DOM simulado; não substitui a revisão visual em navegador.
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
test('ícone instalado usa logo GROW_NEO em todos os tamanhos e no iPhone',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
  for(const icon of manifest.icons){
    assert.match(icon.src,/grow-neo-(icon|maskable)-/);
    const bytes=readFileSync(new URL('../'+icon.src.replace(/^\.\//,''),import.meta.url));
    assert.equal(bytes.readUInt32BE(16),Number(icon.sizes.split('x')[0]));
    assert.equal(bytes.readUInt32BE(20),Number(icon.sizes.split('x')[1]));
  }
  const apple='./assets/grow-neo-apple-touch-icon.png';
  assert.ok(html.includes(`rel="apple-touch-icon" sizes="180x180" href="${apple}"`));
  assert.equal(readFileSync(new URL('../'+apple.replace(/^\.\//,''),import.meta.url)).readUInt32BE(16),180);
  assert.doesNotMatch(html+JSON.stringify(manifest),/assets\/icon-(192|512|maskable)/);
});
test('Crescimento abre plotador Fenton 2025 em outra aba sem enviar parâmetros',()=>{
 const {document}=parseHTML(html),link=document.querySelector('#growth a.growth-plotter');
 assert.equal(link.getAttribute('href'),'https://fentongrowth.ca/');
 assert.equal(link.getAttribute('target'),'_blank');
 assert.match(link.getAttribute('rel'),/noopener noreferrer/);
 assert.match(document.querySelector('#growth .growth-plotter-help').textContent,/não são enviados automaticamente/);
});
function openApp() {
  const {document,window}=parseHTML(html);
  window.HTMLElement.prototype.scrollIntoView=function(){};
  const context={document,window:{addEventListener(){},scrollTo(){}},navigator:{},
    console,URL,Blob,MessageChannel,initAppUpdate,intravenousFromResult,...engine,macroReference,formatAlertNumber,initHydration,initStandard,initEnteral,initGrowth,
    createReport:async()=>new Uint8Array()};
  vm.runInNewContext(source,context);
  // O DOM simulado não seleciona implicitamente a primeira opção como o navegador.
  for(const select of document.querySelectorAll('select'))select.firstElementChild.selected=true;
  const set=(id,value)=>{const input=document.getElementById(id);if(input.tagName==='SELECT'){for(const option of input.options)option.removeAttribute('selected');Array.from(input.options).find(option=>option.value===String(value)).selected=true;}else input.value=String(value);input.dispatchEvent(new window.Event('input',{bubbles:true}));};
  const access=value=>{for(const el of document.querySelectorAll('[name="access"]')){el.checked=el.value===value;if(el.checked)el.setAttribute('checked','');else el.removeAttribute('checked');}document.getElementById('npp-form').dispatchEvent(new window.Event('change',{bubbles:true}));};
  for(const [id,value] of Object.entries({weight:'800','birth-weight':'800','fluid-phase':'stable',day:1,ga:27,'ga-days':0,fluid:100,aa:2,lip:2,vig:5,na:0,k:0,ca:0,mg:0,p:0,seDose:6}))set(id,value);
  access('central');
  for(const id of ['va','vb','oligo','zn','se'])document.getElementById('omit-'+id).checked=true;
  const calculate=()=>{document.getElementById('npp-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(document.getElementById('form-errors').hidden,true,document.getElementById('form-errors').textContent);};
  return {document,window,set,access,calculate,dispatch:(id,type)=>document.getElementById(id).dispatchEvent(new window.Event(type,{bubbles:true,cancelable:true})),el:id=>document.getElementById(id),alerts:()=>Array.from(document.querySelectorAll('.clinical-alert')).map(e=>({id:e.dataset.alertId,level:e.dataset.level,text:e.textContent}))};
}
test('interface: dia 1 na referência, orientação e exportação disponível',()=>{
  const app=openApp();app.calculate();
  assert.equal(app.el('calculated-result').hidden,false);assert.equal(app.el('export-pdf').disabled,false);
  assert.match(app.el('result-context').textContent,/Peso: 800 gPeso ao nascer: 800 g/);
  assert.deepEqual(app.alerts().map(a=>a.level),['info','info']);
  assert.match(app.el('reference-aa').textContent,/2,0 g\/kg\/dia/);
  assert.match(app.el('reference-vig').textContent,/velocidade de infusão de glicose/);
  assert.match(app.el('result-summary').textContent,/Osmolaridade estimada\d+ mOsm\/L/);
  assert.doesNotMatch(app.el('result-alerts').textContent,/não corresponde à osmolalidade laboratorial medida/);
  app.dispatch('tab-notes','click');
  assert.match(app.el('notes').textContent,/não corresponde à osmolalidade laboratorial medida/);
  assert.match(app.el('notes').textContent,/Pereira-da-Silva/);
});
test('pesos de NP individualizada, Numeta e HV são informados em gramas e convertidos para os cálculos',()=>{
  const app=openApp();
  for(const id of ['weight','birth-weight','hv-weight','std-weight'])assert.match(app.el(id).getAttribute('aria-label')||app.el(id).closest('label').textContent,/gramas|\bg\b/i);
  app.set('weight','0,8');app.dispatch('npp-form','submit');
  assert.match(app.el('form-errors').textContent,/Peso atual fora da faixa de conferência \(100 a 20\.000 g\)/);
  app.set('weight',800);app.calculate();assert.match(app.el('result-summary').textContent,/Volume total80,0 mL/);
  app.set('weight','1.000');app.set('birth-weight','1.000');app.calculate();
  assert.match(app.el('result-context').textContent,/Peso: 1\.000 gPeso ao nascer: 1\.000 g/);
  assert.match(app.el('result-summary').textContent,/Volume total100,0 mL/);
  app.set('std-weight',800);app.set('std-day',2);app.set('std-value',100);app.set('std-access','central');app.dispatch('std-form','submit');
  assert.match(app.el('std-context').textContent,/Peso: 800 g/);
  assert.match(app.el('std-prescription').textContent,/80,0 mL/);
  app.set('std-weight','1.000');app.dispatch('std-form','submit');
  assert.match(app.el('std-prescription').textContent,/100,0 mL/);
  const hv=openHydration();hv.calculateHydration();
  assert.match(hv.el('hv-summary').textContent,/2000 g ÷ 1000/);
  assert.match(hv.el('hv-final-summary').textContent,/200,0 mL/);
  hv.set('hv-weight','2.000');hv.calculateHydration();
  assert.match(hv.el('hv-final-summary').textContent,/200,0 mL/);
  app.set('std-weight','0,8');app.dispatch('std-form','submit');
  assert.match(app.el('std-errors').textContent,/100 e 20\.000 g/);
  hv.set('hv-weight','0,8');hv.calculateHydration();
  assert.match(hv.el('hv-errors').textContent,/100 a 20\.000 g/);
});
test('Numeta troca entre 3:1 e 2:1, apresenta composição por 100 mL e invalida PDF anterior',()=>{
 const app=openApp();app.set('std-weight',1000);app.set('std-day',2);app.set('std-value',80);app.set('std-access','central');app.dispatch('std-form','submit');
 assert.match(app.el('std-prescription').textContent,/3:1.*80,0 mL/);
 assert.match(app.el('std-rows').textContent,/Lipídios2,5 g/);
 app.set('std-formulation','2in1');
 assert.equal(app.el('std-result').hidden,true);assert.equal(app.el('std-export').disabled,true);
 app.dispatch('std-form','submit');
 assert.match(app.el('std-prescription').textContent,/2:1.*80,0 mL/);
 assert.match(app.el('std-rows').textContent,/Proteína \(aminoácidos\)3,92 g/);
 assert.match(app.el('std-rows').textContent,/Lipídios0,0 g/);
 assert.match(app.el('std-summary').textContent,/Concentração de glicose16,7%/);
 assert.match(app.el('std-alerts').textContent,/Lipídios infundidos à parte/);
 assert.equal(app.el('std-export').disabled,false);
});
test('interface: contribuição do glicerofosfato exige aceite do sódio total para PDF',()=>{
  const app=openApp();app.set('weight',1000);app.set('na',1);app.set('p','0,4');app.set('salt-p','glycero');app.calculate();
  const check=app.document.querySelector('[data-ack="na"]');
  assert.ok(check);
  assert.match(app.el('acknowledgements').textContent,/solicitado 1,00.*efetivo 0,97.*Glicerofosfato de sódio: 0,80.*cloreto de sódio 10%: 0,17/);
  assert.match(app.el('acknowledgements').textContent,/Conferi e aceito a dose total de sódio de 0,97/);
  assert.equal(app.el('export-pdf').disabled,true);
  check.checked=true;check.dispatchEvent(new app.window.Event('change',{bubbles:true}));
  assert.equal(app.el('export-pdf').disabled,false);
  app.set('p','0,5');assert.equal(app.el('calculated-result').hidden,true);app.calculate();
  assert.ok(!app.document.querySelector('[data-ack="na"]').checked);
  assert.equal(app.el('export-pdf').disabled,true);
  app.set('p',0);app.calculate();
  assert.equal(app.document.querySelector('[data-ack="na"]'),null);
  assert.equal(app.el('export-pdf').disabled,false);
});
test('interface: excesso de sódio pelo glicerofosfato pede apenas um aceite',()=>{
  const app=openApp();app.set('weight',1000);app.set('na',0);app.set('p','0,4');app.set('salt-p','glycero');app.calculate();
  assert.equal(app.document.querySelectorAll('[data-ack="na"]').length,1);
  assert.match(app.el('acknowledgements').textContent,/efetivo 0,80.*glicerofosfato de sódio: 0,80/i);
  assert.equal(app.el('export-pdf').disabled,true);
});
test('interface: zinco e selênio seguem prematuridade, não peso de 1.500 g',()=>{
  const app=openApp();
  app.el('omit-zn').checked=false;app.el('omit-se').checked=false;
  app.dispatch('omit-zn','change');app.dispatch('omit-se','change');
  app.set('weight','1800');app.set('ga',36);app.set('ga-days',6);app.set('znDose',500);
  assert.match(app.el('rule-zn').textContent,/400 a 500/);
  assert.match(app.el('rule-se').textContent,/7 mcg/);
  assert.equal(app.el('znDose').disabled,false);assert.equal(app.el('seDose').disabled,false);
  assert.match(app.el('seDose').placeholder,/Referência: 7/);
  app.calculate();
  assert.match(app.el('result-alerts').textContent,/Zinco total/);
  app.set('ga',37);app.set('ga-days',0);
  assert.match(app.el('rule-zn').textContent,/250 mcg/);
  assert.match(app.el('rule-se').textContent,/2 a 3/);
  assert.equal(app.el('znDose').disabled,true);assert.equal(app.el('seDose').disabled,false);
});
test('interface: acima da referência inicial gera cautela sem bloquear',()=>{
  const app=openApp();app.set('aa',3);app.set('lip',3);app.calculate();
  assert.deepEqual(app.alerts().map(a=>a.level),['caution','caution']);
  assert.equal(app.el('export-pdf').disabled,false);
});
test('interface: alertas clínicos coexistem com bloqueios para AA e lipídios',()=>{
  const app=openApp();for(const [id,value] of Object.entries({day:2,fluid:140,aa:3.6,lip:4.1,vig:20}))app.set(id,value);
  app.calculate();
  assert.deepEqual(app.alerts().map(a=>[a.id,a.level]),[['glucose-concentration-high','caution'],['osmolarity-high','caution'],['aa-ceiling','high'],['lip-ceiling','high']]);
  assert.match(app.alerts()[1].text,/Mantenha o acesso venoso central selecionado/);
  assert.equal(app.el('export-pdf').disabled,true);
  assert.match(app.el('prescription-status').textContent,/Prescrição e PDF bloqueados/);
  assert.match(app.el('result-alerts').textContent,/Aminoácidos acima de 3,5.*Taxa de infusão de lipídios/);
  assert.match(app.alerts()[0].text,/mesmo em acesso venoso central/);
});
test('interface: peso ≥1000 g também apresenta teto 3,5 de aminoácidos',()=>{
  const app=openApp();app.set('weight',1000);app.set('day',2);app.set('aa',3.5);app.set('lip',3);app.calculate();
  assert.match(app.el('reference-aa').textContent,/Teto: 3,5/);
  assert.equal(app.alerts().find(a=>a.id==='aa-reference').level,'caution');
  app.set('aa',3.6);app.calculate();assert.equal(app.el('export-pdf').disabled,true);
});
test('interface: exatamente 20%, acima de 20% e troca de acesso',()=>{
  const app=openApp();app.set('weight',625);app.set('birth-weight',625);app.set('fluid',86.4);app.set('vig',12);app.calculate();
  assert.equal(app.alerts().some(a=>a.id==='glucose-concentration-high'),false);
  app.set('fluid',86.3);assert.equal(app.el('calculated-result').hidden,true);app.calculate();
  assert.ok(app.alerts().some(a=>a.id==='glucose-concentration-high'));
  assert.equal(app.el('export-pdf').disabled,false);
  app.access('peripheral');app.calculate();
  assert.equal(app.el('export-pdf').disabled,true);assert.ok(app.alerts().some(a=>a.id==='glucose-concentration-high'));
  assert.match(app.el('access-alert').textContent,/12,5%/);
});
test('interface: VIG acima de 12 ou arredondada acima do teto impede PDF até correção',()=>{
  const app=openApp();app.set('weight',625);app.set('birth-weight',625);app.set('vig','12,01');app.calculate();
  assert.equal(app.el('export-pdf').disabled,true);
  assert.match(app.el('result-alerts').textContent,/VIG acima de 12 mg\/kg\/min/);
  app.set('vig',12);app.calculate();assert.equal(app.el('export-pdf').disabled,false);
  app.set('weight',1000);app.set('birth-weight',1000);app.calculate();
  assert.equal(app.el('export-pdf').disabled,true);
  assert.match(app.el('result-summary').textContent,/VIG efetiva12,01 mg\/kg\/min/);
});
test('interface: peso com erro de unidade fica vermelho, invalida resultado e exige correção',()=>{
  const app=openApp();app.calculate();assert.equal(app.el('export-pdf').disabled,false);
  app.set('weight',800000);app.dispatch('npp-form','submit');
  assert.equal(app.el('calculated-result').hidden,true);
  assert.equal(app.el('export-pdf').disabled,true);
  assert.equal(app.el('form-errors').hidden,false);
  assert.match(app.el('form-errors').textContent,/Peso atual fora da faixa de conferência/);
  assert.ok(app.el('form-errors').classList.contains('danger'));
  app.set('weight','800');app.calculate();assert.equal(app.el('export-pdf').disabled,false);
});
test('interface: taxa abaixo de 80 exibe bandeira amarela e permite PDF',()=>{
  const app=openApp();app.set('fluid','79,9');app.set('salt-p','kphos');app.calculate();
  assert.equal(app.el('export-pdf').disabled,false);
  assert.match(app.el('result-alerts').textContent,/Taxa hídrica da NPP abaixo de 80.*Considere selecionar glicerofosfato de sódio/);
});
test('interface: bloqueios vermelhos exigem novos parâmetros; VT ajustado é amarelo',()=>{
  const app=openApp();app.set('weight',1000);app.set('aa','3,2');app.set('fluid','79,9');app.calculate();
  assert.equal(app.el('export-pdf').disabled,true);
  assert.match(app.el('result-alerts').textContent,/Concentração final de aminoácidos acima de 4%/);
  app.set('fluid',80);assert.equal(app.el('calculated-result').hidden,true);
  app.calculate();assert.equal(app.el('export-pdf').disabled,false);
  app.set('weight','800');app.set('fluid',50);app.set('aa',2);app.set('lip',3);app.set('vig',6);app.calculate();
  assert.equal(app.el('prescription-status').hidden,true);
  assert.equal(app.el('export-pdf').disabled,false);
  assert.match(app.el('result-alerts').textContent,/Volume total solicitado.*Água q\.s\.p\.: 0 mL/);
  assert.match(app.el('result-summary').textContent,/Volume solicitado40,0 mLVolume efetivo41,8 mL/);
});
test('interface: máximo hídrico usa peso ao nascer e fase selecionada, sem teto após D30',()=>{
  const app=openApp();app.set('fluid','100,1');app.calculate();
  assert.equal(app.el('export-pdf').disabled,true);
  assert.match(app.el('result-alerts').textContent,/Taxa hídrica da NPP acima de 100/);
  app.set('day',6);assert.equal(app.el('fluid-phase-field').hidden,false);
  app.set('fluid-phase','');app.dispatch('npp-form','submit');
  assert.match(app.el('form-errors').textContent,/selecione fase intermediária/);
  app.set('fluid-phase','intermediate');app.set('fluid',160);app.calculate();
  assert.equal(app.el('export-pdf').disabled,false);
  app.set('day',31);assert.equal(app.el('fluid-phase-field').hidden,true);
  app.calculate();assert.match(app.el('result-alerts').textContent,/Após o 30º dia/);
});

function openHydration(){
  const app=openApp();
  const unit=value=>{app.el('hv-doseUnit').querySelector(`option[value="${value}"]`).selected=true;app.dispatch('hv-doseUnit','change');};
  unit('perKgDay');
  for(const [id,value] of Object.entries({weight:2000,fluid:100,vig:5,na:1.7,k:1.34,ca:0.5,mg:0.8}))app.set('hv-'+id,value);
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
  app.dispatch('tab-hydration','click');app.calculateHydration();app.set('hv-weight',3000);
  app.dispatch('tab-results','click');
  assert.equal(app.el('calculated-result').hidden,false);assert.equal(app.el('export-pdf').disabled,false);
  assert.equal(app.el('result-summary').textContent,npResult);
  assert.equal(app.el('hv-result').hidden,true);assert.equal(app.el('hydration').hidden,true);
});

test('interface: teclado percorre as cinco abas, incluindo início, fim e retorno',()=>{
  const app=openApp();
  const key=(id,value)=>{const e=new app.window.Event('keydown',{bubbles:true,cancelable:true});Object.defineProperty(e,'key',{value});app.el(id).dispatchEvent(e);};
  key('tab-parameters','End');assert.equal(app.el('notes').hidden,false);
  key('tab-notes','ArrowRight');assert.equal(app.el('parameters').hidden,false);
  key('tab-parameters','ArrowLeft');assert.equal(app.el('notes').hidden,false);
  key('tab-notes','Home');assert.equal(app.el('parameters').hidden,false);
});

test('interface crescimento: calcula peso médio e mostra cautela antes de recuperar peso de nascimento',()=>{
 const app=openApp();app.dispatch('tab-growth','click');
 for(const [id,value] of Object.entries({'gr-sex':'female','gr-birth-weight':1400,'gr-ga-weeks':28,'gr-ga-days':0,'gr-initial-day':10,'gr-initial-weight':1100,'gr-final-day':20,'gr-final-weight':1300}))app.set(id,value);
 app.dispatch('growth-form','submit');
 assert.equal(app.el('gr-errors').hidden,true);assert.equal(app.el('gr-result').hidden,false);
 assert.match(app.el('gr-summary').textContent,/16,7 g\/kg\/dia/);assert.match(app.el('gr-notices').textContent,/ainda não está na fase de crescimento propriamente dita/);
 assert.doesNotMatch(app.el('gr-notices').textContent,/corresponde a .*%/);
});

test('interface: NP padrão calcula por taxa, troca para proteína e invalida saída',()=>{
 const app=openApp();app.dispatch('tab-standard','click');
 for(const [id,value] of Object.entries({'std-weight':'800','std-day':2,'std-value':100,'std-access':'central'}))app.set(id,value);
 app.dispatch('std-form','submit');assert.equal(app.el('std-errors').hidden,true);assert.equal(app.el('std-result').hidden,false);
 assert.match(app.el('std-prescription').textContent,/80,0 mL/);assert.equal(app.el('std-export').disabled,false);assert.match(app.el('std-summary').textContent,/Concentração de glicose13,3%/);
 app.set('std-mode','protein');app.dispatch('std-mode','change');assert.equal(app.el('std-result').hidden,true);assert.equal(app.el('std-value').value,'');assert.equal(app.el('std-export').disabled,true);assert.equal(app.el('std-pdf-download').hidden,true);
 app.set('std-value',3);app.dispatch('std-form','submit');assert.match(app.el('std-prescription').textContent,/76,6 mL/);
 app.set('std-access','peripheral');app.dispatch('std-form','submit');assert.match(app.el('std-status').textContent,/bloqueada/);assert.equal(app.el('std-export').disabled,true);
 app.set('std-weight','');app.dispatch('std-form','submit');assert.equal(app.el('std-result').hidden,true);assert.equal(app.el('std-errors').hidden,false);
});

test('prescrição: Ca/P molar após P/cal usa ofertas efetivas, incluindo arredondamento e ausência de P',()=>{
  const app=openApp();
  app.set('ca',2);app.set('p',1);
  for(const salt of ['glycero','kphos']){
    app.set('salt-p',salt);app.calculate();
    const rows=Array.from(app.el('result-summary').children);
    const index=rows.findIndex(x=>x.firstChild.textContent==='Proteína / calorias não proteicas');
    assert.equal(rows[index+1].firstChild.textContent,'Relação Ca/P (mmol/mmol)');
    assert.equal(rows[index+1].lastChild.textContent,'1,0 : 1');
  }
  app.set('ca',1);app.set('p',0.14);app.calculate();
  // Peso informado: 800 g (0,8 kg): Ca = 0,4 mmol; fosfato de potássio = 0,11 mmol após arredondar o volume.
  assert.equal(app.el('result-summary').lastChild.lastChild.textContent,'3,6 : 1');
  app.set('ca',0);app.calculate();
  assert.equal(app.el('result-summary').lastChild.lastChild.textContent,'0,0 : 1');
  app.set('p',0);app.calculate();
  assert.equal(app.el('result-summary').lastChild.lastChild.textContent,'Não calculável (P = 0)');
});

test('interface: mostra concentrações finais de cálcio e fósforo',()=>{
  const app=openApp();app.set('weight',1000);app.set('fluid',100);app.set('ca',5);app.set('p',2.5);app.set('salt-p','glycero');app.calculate();
  assert.match(app.el('result-summary').textContent,/Concentração final de cálcio50,0 mEq\/L/);
  assert.match(app.el('result-summary').textContent,/Concentração final de fósforo25,0 mmol\/L/);
  assert.doesNotMatch(app.el('result-alerts').textContent,/composição estudada/);
  app.set('ca',5.05);app.calculate();
  assert.match(app.el('result-alerts').textContent,/concentração mineral elevada/);
});

test('interface Enteral: LMO maduro calcula oferta e integra com NP da sessão',()=>{
  const app=openApp();app.calculate();app.dispatch('tab-enteral','click');
  app.set('en-source','individual');app.set('en-type','lmo');app.dispatch('en-type','change');app.set('en-lactation',14);app.set('en-rate',80);
  app.dispatch('enteral-form','submit');
  assert.equal(app.el('en-result').hidden,false);
  assert.match(app.el('en-summary').textContent,/55,0/);assert.match(app.el('en-summary').textContent,/1,17/);
  assert.match(app.el('en-total-rows').textContent,/mL\/kg\/dia/);assert.equal(app.el('en-estimated-note').hidden,false);
});
test('interface Enteral: FM85 alternado usa média diária e limpa dose ao mudar para fórmula',()=>{
 const app=openApp();app.dispatch('tab-enteral','click');app.set('en-source','none');app.set('en-type','lhop');app.dispatch('en-type','change');
 app.set('en-rate',165);app.set('en-fm85','0.5');app.dispatch('enteral-form','submit');
 assert.match(app.el('en-context').textContent,/73,6 kcal\/100 mL.*1,92 g proteína\/100 mL/);
 assert.match(app.el('en-summary').textContent,/121,4 kcal\/kg\/dia.*3,17 g\/kg\/dia/);
 app.set('en-fm85','custom');app.set('en-fm85-custom','0,5');app.dispatch('enteral-form','submit');
 assert.match(app.el('en-summary').textContent,/121,4 kcal\/kg\/dia.*3,17 g\/kg\/dia/);
 app.set('en-fm85-custom','');app.dispatch('enteral-form','submit');
 assert.match(app.el('en-errors').textContent,/Informe a concentração média de FM85 em g\/25 mL/);
 app.set('en-fm85-custom','0,5');app.dispatch('enteral-form','submit');
 app.set('en-type','fpt_prenan');app.dispatch('en-type','change');
 assert.equal(app.el('en-fm85').value,'0');app.dispatch('enteral-form','submit');
 assert.match(app.el('en-summary').textContent,/133,7 kcal\/kg\/dia.*4,46 g\/kg\/dia/);
});
test('interface Enteral: composição analisada substitui estimativa',()=>{
  const app=openApp();app.dispatch('tab-enteral','click');app.set('en-source','none');app.set('en-type','lhop');app.dispatch('en-type','change');
  app.set('en-rate',100);app.set('en-energy',70);app.set('en-protein',1.5);app.dispatch('enteral-form','submit');
  assert.match(app.el('en-summary').textContent,/70,0/);assert.match(app.el('en-summary').textContent,/1,5/);
  assert.equal(app.el('en-estimated-note').hidden,true);
});

test('interface Enteral: edição da NP exige recálculo, sem recuperar valores antigos',()=>{
 const app=openApp();app.calculate();app.set('en-source','individual');app.set('en-type','lhop');app.set('en-rate',80);app.dispatch('enteral-form','submit');
 assert.equal(app.el('en-result').hidden,false);
 app.set('fluid',90);assert.equal(app.el('en-result').hidden,true);
 app.dispatch('enteral-form','submit');assert.match(app.el('en-errors').textContent,/Calcule novamente/);assert.equal(app.el('en-result').hidden,true);
 app.calculate();app.dispatch('enteral-form','submit');assert.equal(app.el('en-result').hidden,false);
});
test('interface Enteral: tabela total usa classe responsiva dedicada',()=>{
 const app=openApp();assert.ok(app.document.querySelector('.enteral-total-table'));
});

function enteralSetup(app,source){app.set('en-source',source);app.set('en-type','lhop');app.set('en-rate',80);app.dispatch('enteral-form','submit');}
function standardSetup(app,mode='fluid',value=60,access='central'){
 for(const [id,v] of Object.entries({'std-weight':1000,'std-day':2,'std-mode':mode,'std-value':value,'std-access':access}))app.set(id,v);
 app.dispatch('std-form','submit');
}
function hydrationSetup(app,vig=5){
 for(const [id,v] of Object.entries({'hv-weight':1000,'hv-fluid':60,'hv-vig':vig,'hv-doseUnit':'perKgDay','hv-na':0,'hv-k':0,'hv-ca':0,'hv-mg':0}))app.set(id,v);
 app.dispatch('hv-form','submit');
}
function totalCells(app){return Array.from(app.el('en-total-rows').children).map(row=>Array.from(row.children).slice(1).map(cell=>cell.textContent));}
test('integração real: Numeta + enteral, seleção exclusiva mesmo com outras abas calculadas',()=>{
 const app=openApp();app.calculate();hydrationSetup(app);standardSetup(app);
 enteralSetup(app,'standard');assert.equal(app.el('en-errors').hidden,true);
 assert.deepEqual(totalCells(app),[['60,0','80,0','140,0'],['54,6','52,0','106,6'],['1,88','0,96','2,84']]);
 assert.match(app.el('en-pn-note').textContent,/NP padrão \(Numeta\)/);assert.match(app.el('en-transition').textContent,/Metas de transição avaliadas/);
 assert.match(app.el('en-transition').textContent,/Energia total: abaixo da meta/);assert.match(app.el('en-transition').textContent,/Proteína total: meta atingida/);
});
test('integração real: Numeta pelo modo proteína produz os mesmos totais',()=>{
 const app=openApp();standardSetup(app,'protein',1.88);enteralSetup(app,'standard');
 assert.deepEqual(totalCells(app),[['60,0','80,0','140,0'],['54,6','52,0','106,6'],['1,88','0,96','2,84']]);
});
test('integração real: HV + enteral soma energia da glicose sem proteína IV e mantém régua inativa',()=>{
 const app=openApp();app.calculate();standardSetup(app);hydrationSetup(app);enteralSetup(app,'hydration');
 assert.deepEqual(totalCells(app),[['60,0','80,0','140,0'],['28,8','52,0','80,8'],['0,00','0,96','0,96']]);
 assert.equal(app.el('en-iv-heading').textContent,'HV');assert.match(app.el('en-pn-note').textContent,/Fonte: HV/);assert.match(app.el('en-transition').textContent,/sem PN/);
});
test('integração real: sem IV ignora todos os resultados calculados',()=>{
 const app=openApp();app.calculate();standardSetup(app);hydrationSetup(app);enteralSetup(app,'none');
 assert.deepEqual(totalCells(app),[['0,0','80,0','80,0'],['0,0','52,0','52,0'],['0,00','0,96','0,96']]);assert.match(app.el('en-transition').textContent,/sem PN/);
});
for(const source of ['individual','standard','hydration'])test(`integração real: fonte ${source} não calculada não vira zero silenciosamente`,()=>{
 const app=openApp();enteralSetup(app,source);assert.equal(app.el('en-result').hidden,true);assert.match(app.el('en-errors').textContent,/Calcule novamente/);
});
for(const [source,setup,field] of [['standard',standardSetup,'std-value'],['hydration',hydrationSetup,'hv-vig']])test(`integração real: edição ${source} invalida soma e exportação`,()=>{
 const app=openApp();setup(app);enteralSetup(app,source);assert.equal(app.el('en-result').hidden,false);
 app.set(field,1);assert.equal(app.el('en-result').hidden,true);assert.equal(app.el('en-pdf-download').hidden,true);
 app.dispatch('enteral-form','submit');assert.match(app.el('en-errors').textContent,/Calcule novamente/);
});
test('integração real: impedimento da Numeta não permite exportação indireta',()=>{
 const app=openApp();standardSetup(app,'fluid',60,'peripheral');enteralSetup(app,'standard');assert.match(app.el('en-errors').textContent,/impedimentos/);assert.equal(app.el('en-result').hidden,true);
});
test('integração real: HV impossível não entra na soma',()=>{
 const app=openApp();hydrationSetup(app,0);enteralSetup(app,'hydration');assert.match(app.el('en-errors').textContent,/impedimentos/);assert.equal(app.el('en-result').hidden,true);
});
test('integração real: selecionar fonte é obrigatório e trocar fonte invalida resultado',()=>{
 const app=openApp();enteralSetup(app,'');assert.match(app.el('en-errors').textContent,/Selecione o aporte/);
 enteralSetup(app,'none');assert.equal(app.el('en-result').hidden,false);app.set('en-source','standard');assert.equal(app.el('en-result').hidden,true);
});
