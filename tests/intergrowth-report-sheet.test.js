import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {reportCases,capturePageOne} from './fixtures/intergrowth-report-cases.js';
import {createIntergrowthNutritionReport} from '../intergrowth-nutrition-pdf.js';
import {exportIntegratedIntergrowthPdf} from '../intergrowth-integrated-pdf.js';
import {initIntergrowth} from '../intergrowth-ui.js';
import {initIntergrowthNutritionReport} from '../intergrowth-nutrition-ui.js';
vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
const baseline=JSON.parse(readFileSync(new URL('fixtures/intergrowth-report-page-one.json',import.meta.url),'utf8'));

test('primeira página preserva todas as operações da 0.8.7: textos, posições, estilos, cálculos e relato',async()=>{
 for(const input of reportCases()){
  const before=JSON.stringify(input),captured=await capturePageOne(createIntergrowthNutritionReport,input),expected=baseline.cases[input.name];
  assert.equal(captured.operations.length,expected.operations,input.name);
  assert.equal(captured.hash,expected.hash,input.name);
  assert.equal(JSON.stringify(input),before,'A geração não deve alterar os cálculos fornecidos.');
  const doc=await PDFLib.PDFDocument.load(captured.bytes);assert.equal(doc.getPageCount(),2);assert.equal(doc.getAuthor(),'Jefferson Guilherme');
 }
});
test('segunda página usa as 21 curvas em coordenadas de grade única para ambos os sexos',async()=>{
 const original=PDFLib.PDFPage.prototype.drawSvgPath;
 try{
  for(const input of reportCases().slice(0,2)){
   const curves=[];PDFLib.PDFPage.prototype.drawSvgPath=function(path,options){if(path.split(' L ').length===260)curves.push(path);return original.call(this,path,options);};
   await createIntergrowthNutritionReport(input);assert.equal(curves.length,21);
   for(const path of curves){assert.match(path,/^M 76 /);assert.match(path,/ L 481 [\d.]+$/);}
  }
 }finally{PDFLib.PDFPage.prototype.drawSvgPath=original;}
});
test('prancha para página 2 reserva rodapé e delega emissão ao relatório, sem alterar PDF avulso',async()=>{
 const original=PDFLib.PDFPage.prototype.drawText,report=[],single=[];let target=report;
 PDFLib.PDFPage.prototype.drawText=function(value,options){target.push({value,...options});return original.call(this,value,options);};
 try{
  await exportIntegratedIntergrowthPdf(reportCases()[0].result,{reportPage:true});
  target=single;await exportIntegratedIntergrowthPdf(reportCases()[0].result);
 }finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(report.some(t=>t.value==='2/2'&&t.y===14));assert.ok(!report.some(t=>t.value.startsWith('Emissão:')));
 assert.ok(single.some(t=>t.value.startsWith('Emissão:')));assert.ok(!single.some(t=>t.value==='2/2'));
});
test('código opcional vai para a página gráfica do relatório e invalida exportação ao editar',async()=>{
 const {document,window}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 const el=id=>document.getElementById(id),event=(id,type)=>el(id).dispatchEvent(new window.Event(type,{bubbles:true,cancelable:true}));
 const ui=initIntergrowth(document),input=reportCases()[4],urls={createObjectURL:()=> 'blob:test',revokeObjectURL(){}};
 ui.restore({input:{sex:input.result.sex,measurements:input.result.measurements},birthPmaDays:null,assessment:''});
 el('ig-code').value='DEMO-001';let resolve,received;
 initIntergrowthNutritionReport(document,{intergrowth:ui,getNutrition:()=>input.nutrition,urls,createReport:s=>{received=s;return new Promise(r=>resolve=r);}});
 event('ig-total-export','click');assert.equal(received.identification,'DEMO-001');
 el('ig-code').value='DEMO-002';event('ig-code','input');resolve(new Uint8Array([1]));await new Promise(r=>setImmediate(r));
 assert.equal(el('ig-total-download').hidden,true);
});
