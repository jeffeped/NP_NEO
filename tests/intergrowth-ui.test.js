import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {initIntergrowth,readIntergrowthForm} from '../intergrowth-ui.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function setup(options={}){
 const {document,window}=parseHTML(html),el=id=>document.getElementById(id),revoked=[];
 const ui=initIntergrowth(document,{urls:{createObjectURL:()=> 'blob:intergrowth-test',revokeObjectURL:value=>revoked.push(value)},...options});
 const event=(element,type)=>element.dispatchEvent(new window.Event(type,{bubbles:true,cancelable:true}));
 const setSex=value=>{for(const option of el('ig-sex').options)option.removeAttribute('selected');[...el('ig-sex').options].find(option=>option.value===value).selected=true;event(el('ig-sex'),'change');};
 const fill=(values,index=0)=>{const row=document.querySelectorAll('.ig-measure')[index];for(const [field,value] of Object.entries(values)){const input=row.querySelector(`[data-field="${field}"]`);input.value=String(value);event(input,'input');}};
 setSex('female');
 return {document,window,ui,el,revoked,setSex,fill,click:id=>event(el(id),'click'),submit:()=>event(el('ig-form'),'submit'),event};
}

test('Ambulatório: formulário independente lê gramas, decimal com vírgula e medidas opcionais',()=>{
 const app=setup();app.fill({weeks:40,weight:'3.000',head:'34,5'});
 assert.deepEqual(readIntergrowthForm(app.el('ig-form')),{sex:'female',measurements:[{weeks:40,days:0,weight:3000,head:34.5}]});
 assert.match(app.el('intergrowth').textContent,/Não use a idade corrigida/);
 assert.match(app.el('intergrowth').textContent,/27\+0 a 64\+0/);
 assert.equal(app.el('ig-form').querySelectorAll('[type="date"]').length,0);
});

test('Ambulatório: gera curvas SVG locais e resultados apenas dos indicadores informados',()=>{
 const app=setup();app.fill({weeks:40,weight:3000,head:34.5});app.submit();
 assert.equal(app.el('ig-errors').hidden,true,app.el('ig-errors').textContent);
 assert.equal(app.el('ig-result').hidden,false);
 assert.deepEqual([...app.el('ig-charts').querySelectorAll('svg')].map(node=>node.getAttribute('data-metric')),['weight','head']);
 assert.equal(app.el('ig-result-rows').children.length,2);
 assert.match(app.el('ig-result-rows').textContent,/40 sem \+ 0 dMedida 1Peso3\.000 g/);
 assert.equal(app.el('ig-export').disabled,false);
 assert.equal(app.el('ig-export-summary').disabled,false);
});

test('Ambulatório: IPM fora da referência ou linha vazia impede curva, escore e exportação',()=>{
 const app=setup();app.fill({weeks:64,days:1,weight:6500});app.submit();
 assert.equal(app.el('ig-result').hidden,true);
 assert.equal(app.el('ig-export').disabled,true);
 assert.equal(app.el('ig-export-summary').disabled,true);
 assert.match(app.el('ig-errors').textContent,/64 semanas \+ 0 dias/);
 app.fill({weeks:40,days:0,weight:''});app.submit();
 assert.match(app.el('ig-errors').textContent,/pelo menos uma medida/);
 app.fill({weight:'3,0'});app.submit();
 assert.match(app.el('ig-errors').textContent,/gramas/);
});

test('Ambulatório: adicionar e remover preserva sequência e invalida o resultado anterior',()=>{
 const app=setup();app.fill({weeks:40,weight:3000});app.submit();app.click('ig-add');
 assert.equal(app.el('ig-result').hidden,true);
 app.fill({weeks:39,weight:2900},1);app.submit();
 assert.match(app.el('ig-errors').textContent,/ordem crescente/);
 app.fill({weeks:44,weight:4000},1);app.submit();
 assert.equal(app.ui.getResult().measurements.length,2);
 app.event(app.document.querySelector('.ig-measure [data-remove]'),'click');
 assert.equal(app.ui.getResult(),null);
 assert.equal(app.el('ig-result').hidden,true);
 assert.equal(app.el('ig-measures').children.length,1);
 assert.equal(app.document.querySelector('.ig-measure legend').textContent,'Medida 1');
 assert.equal(app.document.querySelector('[data-remove]').disabled,true);
 assert.equal(readIntergrowthForm(app.el('ig-form')).measurements[0].weeks,44);
});

test('Ambulatório: percentis extremos não são apresentados como zero ou cem',()=>{
 const app=setup();app.fill({weeks:40,weight:100});app.click('ig-add');app.fill({weeks:41,weight:20000},1);app.submit();
 const cells=[...app.el('ig-result-rows').children].map(row=>row.lastElementChild.textContent);
 assert.deepEqual(cells,['<0,1','>99,9']);
});

test('Ambulatório: editar durante a geração do PDF impede download do resultado antigo',async()=>{
 let complete;const app=setup({pdf:()=>new Promise(resolve=>{complete=resolve;})});
 app.fill({weeks:40,weight:3000});app.submit();app.click('ig-export');
 app.fill({weight:3100});complete(new Uint8Array([1,2,3]));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(app.el('ig-result').hidden,true);
 assert.equal(app.el('ig-pdf-download').hidden,true);
 assert.equal(app.el('ig-pdf-download').getAttribute('href'),null);
 assert.equal(app.el('ig-export').disabled,true);
 assert.match(app.el('ig-status').textContent,/Medidas alteradas/);
});

test('Ambulatório: limpar descarta dados, resultados e arquivo PDF criado',async()=>{
 let received;const app=setup({pdf:async result=>{received=result;return new Uint8Array([1,2,3]);}});
 app.fill({weeks:40,weight:3000});app.submit();app.click('ig-export');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(received,app.ui.getResult());
 assert.equal(app.el('ig-pdf-download').hidden,false);
 assert.equal(app.el('ig-pdf-download').download,'GROW_NEO-INTERGROWTH-21st.pdf');
 app.click('ig-clear');
 assert.deepEqual(app.revoked,['blob:intergrowth-test']);
 assert.equal(app.el('ig-sex').value,'');
 assert.equal(app.el('ig-measures').children.length,1);
 assert.equal(app.document.querySelector('[data-field="weeks"]').value,'');
 assert.equal(app.document.querySelector('#ig-measures [data-field="days"]').value,'0');
 assert.equal(app.el('ig-result').hidden,true);
 assert.equal(app.ui.getResult(),null);
 assert.equal(app.el('ig-pdf-download').getAttribute('href'),null);
});

test('Ambulatório: reset usado ao restaurar a página impede reutilizar dados da sessão anterior',()=>{
 const app=setup();app.fill({weeks:40,weight:3000});app.submit();app.ui.reset();
 assert.equal(app.ui.getResult(),null);
 assert.equal(app.el('ig-result').hidden,true);
 assert.equal(app.el('ig-sex').value,'');
 assert.equal(app.el('ig-charts').children.length,0);
});

test('Ambulatório: escolhe PDF de uma página ou detalhado e substitui o download anterior',async()=>{
 const calls=[],app=setup({
  pdf:async result=>{calls.push(['detailed',result]);return new Uint8Array([1]);},
  summaryPdf:async result=>{calls.push(['summary',result]);return new Uint8Array([2]);}
 });
 app.fill({weeks:40,weight:3000});app.submit();app.click('ig-export-summary');
 assert.equal(app.el('ig-export').disabled,true);
 assert.equal(app.el('ig-export-summary').disabled,true);
 app.click('ig-export'); // Ignore competing requests while an export is pending.
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,[['summary',app.ui.getResult()]]);
 assert.equal(app.el('ig-pdf-download').download,'GROW_NEO-INTERGROWTH-21st-1-pagina.pdf');
 assert.match(app.el('ig-pdf-download').textContent,/1 página/);
 assert.equal(app.el('ig-export').disabled,false);
 app.click('ig-export');assert.equal(app.el('ig-pdf-download').hidden,true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,[['summary',app.ui.getResult()],['detailed',app.ui.getResult()]]);
 assert.equal(app.el('ig-pdf-download').download,'GROW_NEO-INTERGROWTH-21st.pdf');
 assert.match(app.el('ig-pdf-download').textContent,/detalhado/);
 assert.deepEqual(app.revoked,['blob:intergrowth-test']);
 app.fill({weight:3100});
 assert.equal(app.el('ig-pdf-download').hidden,true);
 assert.equal(app.el('ig-export-summary').disabled,true);
});

test('Ambulatório: PDF de uma página pendente é descartado ao editar e recalcular',async()=>{
 let complete;const app=setup({summaryPdf:()=>new Promise(resolve=>{complete=resolve;})});
 app.fill({weeks:40,weight:3000});app.submit();app.click('ig-export-summary');
 app.fill({weight:3100});app.submit();
 complete(new Uint8Array([1,2,3]));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(app.el('ig-pdf-download').hidden,true);
 assert.equal(app.el('ig-pdf-download').getAttribute('href'),null);
 assert.equal(app.el('ig-export').disabled,false);
 assert.equal(app.el('ig-export-summary').disabled,false);
 assert.equal(app.ui.getResult().measurements[0].weight,3100);
 assert.match(app.el('ig-status').textContent,/Curvas e escores calculados/);
});

test('Ambulatório: falha em exportação permite tentar novamente sem link antigo',async()=>{
 const app=setup({pdf:async()=>new Uint8Array([1]),summaryPdf:async()=>{throw new Error('PDF indisponível');}});
 app.fill({weeks:40,weight:3000});app.submit();app.click('ig-export');
 await new Promise(resolve=>setImmediate(resolve));app.click('ig-export-summary');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(app.el('ig-pdf-download').hidden,true);
 assert.equal(app.el('ig-pdf-download').getAttribute('href'),null);
 assert.equal(app.el('ig-export').disabled,false);
 assert.equal(app.el('ig-export-summary').disabled,false);
 assert.match(app.el('ig-status').textContent,/Não foi possível gerar/);
});

function velocityExample(options={}){
 const app=setup(options);
 app.fill({weeks:40,days:0,weight:3000});
 app.click('ig-add');app.fill({weeks:41,days:3,weight:3300},1);
 app.submit();return app;
}

function chooseVelocity(app,id,value){
 const select=app.el(id);
 for(const option of select.options)option.removeAttribute('selected');
 [...select.options].find(option=>option.value===String(value)).selected=true;
 app.event(select,'change');
}

test('INTERGROWTH: velocidade mostra 30 g/dia e 9,5 g/kg/dia para 3000 a 3300 g em 10 dias',()=>{
 const app=velocityExample();
 assert.equal(app.el('ig-velocity-start').value,'0');
 assert.equal(app.el('ig-velocity-end').value,'1');
 assert.equal(app.el('ig-velocity-calculate').disabled,false);
 assert.equal(app.el('ig-velocity-result').hidden,true);
 app.click('ig-velocity-calculate');
 assert.equal(app.el('ig-velocity-error').hidden,true);
 assert.equal(app.el('ig-velocity-result').hidden,false);
 assert.match(app.el('ig-velocity-result').textContent,/Medidas 1 a 2 · 10 dias · 3\.000 g → 3\.300 g/);
 assert.match(app.el('ig-velocity-result').textContent,/Variação de peso: 300 g · Peso médio: 3\.150 g/);
 assert.match(app.el('ig-velocity-result').textContent,/30,0 g\/dia · 9,5 g\/kg\/dia/);
 assert.equal(app.ui.getResult().velocity.intervalDays,10);
 assert.equal(app.ui.getResult().velocity.gramsPerDay,30);
 assert.match(app.el('ig-status').textContent,/incluída nos próximos PDFs/);
});

test('INTERGROWTH: seletores de velocidade excluem avaliações sem peso e preservam os números originais',()=>{
 const app=setup();
 app.fill({weeks:40,weight:3000});
 app.click('ig-add');app.fill({weeks:40,days:5,length:50},1);
 app.click('ig-add');app.fill({weeks:41,days:3,weight:3300},2);
 app.submit();
 for(const id of ['ig-velocity-start','ig-velocity-end']){
  const select=app.el(id);
  assert.deepEqual([...select.options].map(option=>option.value),['0','2']);
  assert.match(select.options[0].textContent,/Medida 1/);
  assert.match(select.options[1].textContent,/Medida 3/);
  assert.equal(select.disabled,false);
 }
 app.click('ig-velocity-calculate');
 assert.equal(app.ui.getResult().velocity.finalEvaluation,3);
 assert.equal(app.ui.getResult().velocity.gramsPerDay,30);
});

test('INTERGROWTH: menos de dois pesos mantém a velocidade desabilitada e permite gerar as curvas',()=>{
 for(const first of [{weeks:40,length:49},{weeks:40,weight:3000}]){
  const app=setup();app.fill(first);
  app.click('ig-add');app.fill({weeks:41,head:35},1);app.submit();
  assert.equal(app.el('ig-velocity-start').disabled,true);
  assert.equal(app.el('ig-velocity-end').disabled,true);
  assert.equal(app.el('ig-velocity-calculate').disabled,true);
  assert.match(app.el('ig-velocity-help').textContent,/pelo menos duas avaliações/);
  app.click('ig-velocity-calculate');
  assert.equal(app.ui.getResult().velocity,undefined);
  assert.equal(app.el('ig-velocity-result').hidden,true);
  assert.equal(app.el('ig-result').hidden,false);
  assert.ok(app.el('ig-charts').querySelector('svg'));
  assert.equal(app.el('ig-export').disabled,false);
 }
});

test('INTERGROWTH: seleção invertida exibe erro e preserva curvas e resultados antropométricos',()=>{
 const app=velocityExample(),curves=[...app.el('ig-charts').children];
 app.click('ig-velocity-calculate');
 chooseVelocity(app,'ig-velocity-start',1);chooseVelocity(app,'ig-velocity-end',0);
 app.click('ig-velocity-calculate');
 assert.equal(app.el('ig-velocity-error').hidden,false);
 assert.match(app.el('ig-velocity-error').textContent,/final deve ser posterior/);
 assert.equal(app.ui.getResult().velocity,undefined);
 assert.equal(app.el('ig-velocity-result').hidden,true);
 assert.equal(app.el('ig-result').hidden,false);
 assert.deepEqual([...app.el('ig-charts').children],curves);
 assert.equal(app.el('ig-result-rows').children.length,2);
});

test('INTERGROWTH: ganho zero e perda de peso não são ocultados na velocidade',()=>{
 for(const [weight,expected] of [[3000,/0,0 g\/dia · 0,0 g\/kg\/dia/],[2700,/-30,0 g\/dia · -10,5 g\/kg\/dia/]]){
  const app=velocityExample();app.fill({weight},1);app.submit();app.click('ig-velocity-calculate');
  assert.equal(app.el('ig-velocity-result').hidden,false);
  assert.equal(app.el('ig-velocity-error').hidden,true);
  assert.match(app.el('ig-velocity-result').textContent,expected);
 }
});

test('INTERGROWTH: mudar o período descarta velocidade e download sem apagar as curvas',async()=>{
 const app=velocityExample({pdf:async()=>new Uint8Array([1])});
 app.click('ig-add');app.fill({weeks:42,weight:3450},2);app.submit();
 app.click('ig-velocity-calculate');app.click('ig-export');
 await new Promise(resolve=>setImmediate(resolve));
 const curves=[...app.el('ig-charts').children],measurements=app.ui.getResult().measurements;
 assert.equal(app.el('ig-pdf-download').hidden,false);
 chooseVelocity(app,'ig-velocity-start',1);
 assert.equal(app.ui.getResult().velocity,undefined);
 assert.equal(app.ui.getResult().measurements,measurements);
 assert.equal(app.el('ig-velocity-result').hidden,true);
 assert.equal(app.el('ig-pdf-download').hidden,true);
 assert.equal(app.el('ig-pdf-download').getAttribute('href'),null);
 assert.deepEqual(app.revoked,['blob:intergrowth-test']);
 assert.equal(app.el('ig-result').hidden,false);
 assert.deepEqual([...app.el('ig-charts').children],curves);
 assert.equal(app.el('ig-export').disabled,false);
 assert.equal(app.el('ig-export-summary').disabled,false);
 app.click('ig-velocity-calculate');
 assert.equal(app.ui.getResult().velocity.initialEvaluation,2);
 assert.equal(app.ui.getResult().velocity.intervalDays,4);
 assert.equal(app.ui.getResult().velocity.gramsPerDay,37.5);
});

test('INTERGROWTH: alterar a seleção ou calcular velocidade durante PDF pendente descarta o arquivo antigo',async()=>{
 for(const mode of ['selection','calculation']){
  let complete,received;
  const app=velocityExample({summaryPdf:result=>{received=result;return new Promise(resolve=>{complete=resolve;});}});
  app.click('ig-export-summary');
  assert.equal(received.velocity,undefined);
  if(mode==='selection')chooseVelocity(app,'ig-velocity-start',1);
  else app.click('ig-velocity-calculate');
  complete(new Uint8Array([1,2,3]));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(app.el('ig-pdf-download').hidden,true);
  assert.equal(app.el('ig-pdf-download').getAttribute('href'),null);
  assert.equal(app.el('ig-result').hidden,false);
  assert.equal(app.el('ig-export').disabled,false);
  assert.equal(app.el('ig-export-summary').disabled,false);
  if(mode==='calculation'){
   assert.equal(app.ui.getResult().velocity.gramsPerDay,30);
   assert.equal(app.el('ig-velocity-result').hidden,false);
  }
 }
});

test('INTERGROWTH: ambos os formatos de PDF recebem a velocidade do período calculado',async()=>{
 const calls=[],app=velocityExample({
  pdf:async result=>{calls.push(['detailed',result]);return new Uint8Array([1]);},
  summaryPdf:async result=>{calls.push(['summary',result]);return new Uint8Array([2]);}
 });
 app.click('ig-velocity-calculate');
 const current=app.ui.getResult();
 app.click('ig-export-summary');await new Promise(resolve=>setImmediate(resolve));
 app.click('ig-export');await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,[['summary',current],['detailed',current]]);
 for(const [,result] of calls){
  assert.equal(result.velocity.initialIndex,0);
  assert.equal(result.velocity.finalIndex,1);
  assert.equal(result.velocity.gramsPerDay,30);
 }
 assert.equal(app.el('ig-pdf-download').hidden,false);
});
