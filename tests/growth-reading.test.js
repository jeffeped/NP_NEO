import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {initFentonOutlook} from '../fenton-outlook-ui.js';
import {initIntergrowth} from '../intergrowth-ui.js';
const html=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');
async function reading(){assert.ok(existsSync(new URL('../growth-reading.js',import.meta.url)),'clinical reading helper is missing');return import('../growth-reading.js');}
const row=(pmaDays=217,extra={})=>({pmaDays,weight:1500,length:40,head:28,scores:{weight:{z:0},length:{z:0},head:{z:0}},...extra});

test('extremos são avisos de posição, apenas além de ±2, sem diagnosticar doença',async()=>{
 const {growthReadingNotices}=await reading();
 for(const z of [-2,0,2])assert.equal(growthReadingNotices([row(217,{scores:{weight:{z}}})]).some(n=>n.id==='POSITION'),false);
 for(const z of [-2.0001,2.0001]){const text=growthReadingNotices([row(217,{scores:{weight:{z}}})]).find(n=>n.id==='POSITION')?.message;assert.match(text,/mediana/);assert.match(text,/não estabelece diagnóstico/);}
});
test('ausências não viram zero nem tranquilização; avisos se renovam sem mutar medidas',async()=>{
 const {growthReadingNotices}=await reading();const rows=[row(217,{length:null,head:null})],before=JSON.stringify(rows);
 assert.match(growthReadingNotices(rows).find(n=>n.id==='INCOMPLETE')?.message,/comprimento.*PC/);
 assert.equal(JSON.stringify(rows),before);assert.equal(growthReadingNotices([row()]).some(n=>n.id==='INCOMPLETE'),false);assert.deepEqual(growthReadingNotices([]),[]);
});
test('nota hídrica usa dias desde nascimento conhecido; não inventa fase pelo nadir',async()=>{
 const {growthReadingNotices}=await reading();
 for(const days of [0,7,13])assert.ok(growthReadingNotices([row(210+days)],210).some(n=>n.id==='EARLY'));
 for(const birth of [null,undefined,211])assert.equal(growthReadingNotices([row(210)],birth).some(n=>n.id==='EARLY'),false);
 assert.equal(growthReadingNotices([row(224)],210).some(n=>n.id==='EARLY'),false);
});
test('redução de comprimento ou PC pede conferir aferição; peso em queda não recebe esse rótulo',async()=>{
 const {growthReadingNotices}=await reading();
 const notes=growthReadingNotices([row(210),row(217,{weight:1400,length:39,head:27})]);
 const check=notes.find(n=>n.id==='MEASUREMENT');assert.match(check.message,/comprimento.*PC/);assert.match(check.message,/aferição/);assert.doesNotMatch(check.message,/Peso/);
 assert.equal(growthReadingNotices([row(210),row(217)]).some(n=>n.id==='MEASUREMENT'),false);
});
test('escores Fenton arredondados dentro da tolerância oficial preservam avisos; divergentes são rejeitados',async()=>{
 const {fentonReadingRows,growthReadingNotices}=await reading();
 const chart={data:{measurements:[{weeks:30,days:0,weightGrams:1000.4,lengthCm:40.02,headCm:28.02}]},scores:[{weeks:30,days:0,weight:{value:1000,z:2.1},length:{value:40,z:2.2},head:{value:28,z:2.3}}]};
 const notice=growthReadingNotices(fentonReadingRows(chart)).find(n=>n.id==='POSITION');assert.ok(notice);assert.match(notice.message,/peso.*comprimento.*PC/);
 chart.scores[0].weight.value=1001;chart.scores[0].length.value=40.1;chart.scores[0].head.value=28.1;assert.deepEqual(fentonReadingRows(chart)[0].scores,{});
 chart.scores[0].weeks=31;assert.deepEqual(fentonReadingRows(chart)[0].scores,{});
});
test('Fenton substitui rótulo de RCEU, mantém gatilho e projeções e limpa avisos ao editar',()=>{
 const {document}=parseHTML(html());let state={data:{sex:'F',birthGaWeeks:25,birthGaDays:0,measurements:[{weeks:25,days:0,weightGrams:1000},{weeks:26,days:0,weightGrams:1100}]},scores:[{weeks:25,days:0,weight:{value:1000,z:.2}},{weeks:26,days:0,weight:{value:1100,z:-1.9}}]},notify;
 initFentonOutlook(document,{fenton:{getChart:()=>state,subscribe:fn=>notify=fn}});
 const $=id=>document.getElementById(id);
 assert.match($('fenton-risk').textContent,/Mudança do padrão de crescimento/);assert.doesNotMatch($('fenton-risk').textContent,/RCEU/);
 assert.match($('fenton-risk-context').textContent,/operacional.*universal/);assert.match($('fenton-risk-context').textContent,/25\+0.*26\+0/);
 assert.match($('fenton-reading-notices').textContent,/adaptação hídrica/);assert.match($('fenton-reading-notices').textContent,/incompleta/);assert.equal($('fenton-projection-run').disabled,false);
 state=null;notify();assert.equal($('fenton-reading-notices').textContent,'');
});
test('INTERGROWTH mostra avisos contextuais com medidas reais e mantém duas projeções',()=>{
 const {document,window}=parseHTML(html());const ui=initIntergrowth(document,{urls:{createObjectURL:()=>'',revokeObjectURL(){}}});
 for(const option of document.querySelectorAll('#ig-sex option'))option.removeAttribute('selected');document.querySelector('#ig-sex option[value="male"]').selected=true;
 const inputs=document.querySelector('.ig-measure');for(const [field,value]of Object.entries({weeks:30,days:0,weight:1200})){inputs.querySelector(`[data-field="${field}"]`).value=String(value);}
 document.getElementById('ig-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 assert.ok(ui.getResult());assert.match(document.getElementById('ig-reading-notices').textContent,/incompleta/);
 inputs.querySelector('[data-field="weight"]').dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(document.getElementById('ig-reading-notices').textContent,'');
});
