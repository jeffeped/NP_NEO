import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {formatHydrationVolume,formatHydrationNumber,calculateHydration} from '../hydration.js';
import {initFenton} from '../fenton-ui.js';
import {initFentonNutritionReport} from '../fenton-nutrition-ui.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const data={sex:'F',birthGaWeeks:28,birthGaDays:0,measurements:[{weeks:28,days:0,weightGrams:1000},{weeks:30,days:2,headCm:27.5,lengthCm:38}]};
const growth={sex:'female',birthWeight:'1.000',gaWeeks:'28',gaDays:'0',initialDay:'1',initialWeight:'1.000',finalDay:'17',finalWeight:'1.200'};
const assessment='História dirigida: tolerância enteral preservada.\nConduta: manter acompanhamento.\nProgramação: reavaliar as medidas.';
const setup=()=>{const {document,window}=parseHTML(html);return {document,window};};
test('HV apresenta uma casa decimal, com arredondamento convencional',()=>{
 for(const [n,s] of [[1.21,'1,2'],[1.26,'1,3'],[4.888888888889,'4,9'],[95.1111111111,'95,1'],[200,'200,0'],[0,'0,0']])assert.equal(formatHydrationVolume(n),s);
 assert.equal(formatHydrationNumber(.465),'0,465');
});
test('HV não aumenta um volume muito pequeno para 0,1 nem o oculta como zero',()=>{
 for(const n of [.049,.005,.000001]){const shown=formatHydrationVolume(n);assert.ok(Number(shown.replace(',','.'))>0);assert.ok(Number(shown.replace(',','.'))<.1);}
});
test('apresentação da HV não altera o fechamento interno dos volumes',()=>{
 const r=calculateHydration({access:'central',day:8,weight:1,fluid:100,vig:5,doseUnit:'perKgDay',na:0,k:0,ca:0,mg:0,concentrations:{na:1.7,k:1.34,ca:.5,mg:.8}});
 assert.equal(r.mixture.sg50,44/9);assert.equal(r.mixture.sg5,856/9);assert.equal(r.totals.totalVolume,100);
});
test('arquivo de acompanhamento conserva medidas incompletas, campos de velocidade e relato',async()=>{
 const {encodeFollowup,decodeFollowup}=await import('../followup.js');
 const text=encodeFollowup({fenton:data,growth,assessment});const restored=decodeFollowup(text);
 assert.deepEqual(restored,{fenton:data,growth,assessment});assert.ok(!text.includes('blob:'));
});
test('arquivo inválido, versão desconhecida e medidas fora de ordem são recusados',async()=>{
 const {encodeFollowup,decodeFollowup}=await import('../followup.js');
 const text=encodeFollowup({fenton:data,growth,assessment});const file=JSON.parse(text);
 assert.throws(()=>decodeFollowup('arquivo quebrado'),/arquivo/i);
 assert.throws(()=>decodeFollowup(JSON.stringify({...file,formatVersion:99})),/versão/i);
 assert.throws(()=>decodeFollowup(JSON.stringify({...file,fenton:{...data,measurements:[data.measurements[1],data.measurements[0]]}})),/IPM/i);
 assert.throws(()=>decodeFollowup(JSON.stringify({...file,assessment:{text:'errado'}})),/relato/i);
});
test('restaurar acompanhamento valida antes de substituir e permite acrescentar medida',()=>{
 const {document}=setup();const ui=initFenton(document);assert.equal(typeof ui.restore,'function');
 ui.restore(data);assert.deepEqual(ui.read(),data);
 assert.throws(()=>ui.restore({...data,measurements:[{weeks:20,days:0,weightGrams:1000}]}),/IPM/i);assert.deepEqual(ui.read(),data);
 document.getElementById('fenton-add').click();assert.equal(document.querySelectorAll('.fenton-measure').length,3);
});
test('editar o relato invalida o PDF e o texto é entregue à geração',async()=>{
 const {document,window}=setup();let report;const nutrition={},chart={data:{measurements:[{}]},scores:[{}]};
 document.getElementById('fenton-total-download').click=()=>{};
 initFentonNutritionReport(document,{getNutrition:()=>nutrition,getGrowth:()=>null,getChart:()=>chart,createReport:async s=>{report=s;return new Uint8Array([1]);},urls:{createObjectURL:()=> 'blob:pdf',revokeObjectURL:()=>{}}});
 const note=document.getElementById('fenton-assessment');assert.ok(note);note.value=assessment;
 document.getElementById('fenton-total-export').click();await new Promise(r=>setImmediate(r));assert.equal(report.assessment,assessment);
 note.value='Nova conduta';note.dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(document.getElementById('fenton-total-download').hidden,true);
});
test('editar o relato durante a geração descarta o PDF em andamento',async()=>{
 const {document,window}=setup();let complete;const nutrition={},chart={data:{measurements:[{}]},scores:[{}]};let downloads=0;
 initFentonNutritionReport(document,{getNutrition:()=>nutrition,getGrowth:()=>null,getChart:()=>chart,createReport:()=>new Promise(r=>complete=r),urls:{createObjectURL:()=>{downloads++;return 'blob:pdf';},revokeObjectURL:()=>{}}});
 document.getElementById('fenton-total-export').click();const note=document.getElementById('fenton-assessment');assert.ok(note);note.value='Alterado';note.dispatchEvent(new window.Event('input',{bubbles:true}));complete(new Uint8Array([1]));await new Promise(r=>setImmediate(r));assert.equal(downloads,0);
});
