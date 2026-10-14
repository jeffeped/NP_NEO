import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {calculateIntergrowth,referenceValue} from '../intergrowth.js';
import {initIntergrowth} from '../intergrowth-ui.js';
import {serialIntergrowthVelocity,analyzeIntergrowthTrend,projectIntergrowth,encodeIntergrowthFollowup,decodeIntergrowthFollowup,intergrowthCsv} from '../intergrowth-followup.js';
import {createIntergrowthNutritionReport} from '../intergrowth-nutrition-pdf.js';
import {initIntergrowthNutritionReport} from '../intergrowth-nutrition-ui.js';
import {calculateEnteral,integrateNutrition} from '../enteral.js';
vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const example=()=>calculateIntergrowth({sex:'female',measurements:[{weeks:30,days:0,weight:1200},{weeks:31,days:0,head:29},{weeks:32,days:0,weight:1500}]});
const nutrition=()=>{const enteral=calculateEnteral({type:'lhop',rate:150});return {enteral,integrated:integrateNutrition({source:'none',enteral})};};
test('Intergrowth: tabela CSV usa medidas reais, escores locais e VC, preservando campos ausentes',()=>{
 const csv=intergrowthCsv(example());assert.equal(csv.charCodeAt(0),0xfeff);assert.match(csv,/VC g\/kg\/dia/);
 const rows=csv.slice(1).trim().split('\r\n');assert.equal(rows.length,4);assert.match(rows[1],/^30\+0;1200,0;/);assert.match(rows[3],/15,9/);
});
test('Intergrowth: VC serial pula avaliação sem peso; simulação usa últimas pesagens e não altera medidas',()=>{
 const result=example(),before=JSON.stringify(result),v=1000*300/(1350*14);
 assert.deepEqual(serialIntergrowthVelocity(result),[null,null,v]);
 const projection=projectIntergrowth(result);assert.equal(projection.velocity,v);assert.equal(projection.intervalDays,14);
 assert.deepEqual(projection.points.map(p=>p.daysAhead),[14,28]);
 assert.ok(Math.abs(projection.points[0].weight-1500*Math.exp(v*14/1000))<1e-8);
 assert.ok(Number.isFinite(projection.points[0].z));assert.equal(JSON.stringify(result),before);
});
test('Intergrowth: projeções não extrapolam 64+0 ou limites de peso',()=>{
 const r=calculateIntergrowth({sex:'male',measurements:[{weeks:61,days:0,weight:6000},{weeks:62,days:0,weight:6200}]});
 const p=projectIntergrowth(r);assert.equal(p.points[0].inRange,true);assert.equal(p.points[1].inRange,false);assert.equal(p.points[1].z,null);
 assert.throws(()=>projectIntergrowth(calculateIntergrowth({sex:'male',measurements:[{weeks:40,days:0,weight:3000}]})),/duas pesagens/);
});
test('Intergrowth: alerta compara nascimento explícito e não usa primeira consulta como nascimento',()=>{
 const make=z=>calculateIntergrowth({sex:'female',measurements:[{weeks:30,days:0,weight:referenceValue('female','weight',210,.2)},{weeks:34,days:0,weight:referenceValue('female','weight',238,z)}]});
 assert.equal(analyzeIntergrowthTrend(make(-2),210).risk,true);
 assert.equal(analyzeIntergrowthTrend(make(-1.8),210).risk,false);
 assert.equal(analyzeIntergrowthTrend(make(-2),null).dropZ,null);
 assert.equal(analyzeIntergrowthTrend(make(-2),175).dropZ,null);
 assert.equal(analyzeIntergrowthTrend(make(-2),203).dropZ,null);
});
test('Intergrowth: arquivo validado preserva entradas/relato e rejeita Fenton, versão, idade e tamanho inválidos',()=>{
 const value={input:{sex:'female',measurements:[{weeks:30,days:0,weight:1200}]},birthPmaDays:210,assessment:'História\nConduta'};
 const encoded=encodeIntergrowthFollowup(value);assert.deepEqual(decodeIntergrowthFollowup(encoded),value);
 assert.ok(!encoded.includes('scores'));assert.throws(()=>decodeIntergrowthFollowup('{"format":"GROW_NEO-followup"}'),/INTERGROWTH/);
 assert.throws(()=>decodeIntergrowthFollowup(encoded.replace('"formatVersion": 1','"formatVersion": 9')),/Versão/);
 assert.throws(()=>encodeIntergrowthFollowup({...value,birthPmaDays:240}),/nascimento/);
 assert.throws(()=>decodeIntergrowthFollowup(' '.repeat(1024*1024+1)),/grande/);
});
function setup(){
 const {document,window}=parseHTML(html),el=id=>document.getElementById(id),revoked=[];
 const urls={createObjectURL:()=> 'blob:test',revokeObjectURL:u=>revoked.push(u)};
 const ui=initIntergrowth(document,{urls}),event=(id,type)=>el(id).dispatchEvent(new window.Event(type,{bubbles:true,cancelable:true}));
 const restore=()=>ui.restore({input:{sex:'female',measurements:example().measurements.map(({weeks,days,weight,head})=>({weeks,days,...(weight==null?{}:{weight}),...(head==null?{}:{head})}))},birthPmaDays:210,assessment:'História dirigida.'});
 return {document,window,ui,el,event,urls,revoked,restore};
}
test('Intergrowth: restaurar invalida resultados, prepara relatório, mostra VC e projeta separado',()=>{
 const a=setup();a.restore();assert.equal(a.ui.getResult(),null);assert.equal(a.el('ig-assessment').value,'História dirigida.');
 const result=a.ui.ensureResult();assert.equal(result.measurements.length,3);assert.equal(a.el('ig-result-rows').querySelectorAll('tr').length,3);
 assert.match(a.el('ig-result-rows').textContent,/15,9/);a.event('ig-projection-run','click');assert.equal(a.el('ig-projection-result').hidden,false);
 assert.equal(a.el('ig-projection-rows').children.length,2);assert.equal(a.ui.getResult().measurements.length,3);
 a.event('ig-add','click');assert.equal(a.el('ig-projection-result').hidden,true);assert.equal(a.ui.getResult(),null);
});
test('Intergrowth: reabrir arquivo preserva peso fracionado com três casas decimais',()=>{
 const a=setup(),content={input:{sex:'female',measurements:[{weeks:30,days:0,weight:999.125}]},birthPmaDays:210,assessment:''};
 a.ui.restore(content);assert.deepEqual(a.ui.readFollowup(),content);assert.equal(a.ui.ensureResult().measurements[0].weight,999.125);
});
test('Intergrowth: gráfico vetorial avulso pode ser baixado e é revogado ao editar',()=>{
 const a=setup();a.restore();a.ui.ensureResult();const link=a.el('ig-charts').querySelector('a[download]');assert.ok(link);
 link.dispatchEvent(new a.window.Event('click',{cancelable:true}));assert.equal(link.getAttribute('href'),'blob:test');
 a.event('ig-add','click');assert.ok(a.revoked.includes('blob:test'));assert.equal(a.el('ig-charts').children.length,0);
});
test('Intergrowth: percentis extremos do PDF integrado conservam limites exibidos',async()=>{
 const result=calculateIntergrowth({sex:'female',measurements:[{weeks:30,days:0,weight:2500},{weeks:31,days:0,weight:100}]}),lines=[],original=PDFLib.PDFPage.prototype.drawText;
 PDFLib.PDFPage.prototype.drawText=function(value,options){lines.push({value,page:this,...options});return original.call(this,value,options);};
 try{await createIntergrowthNutritionReport({nutrition:nutrition(),result});}finally{PDFLib.PDFPage.prototype.drawText=original;}
 const first=lines[0].page,percentiles=lines.filter(l=>l.page===first&&l.x===177).map(l=>l.value);assert.deepEqual(percentiles,['P','>99,9','<0,1']);
});
test('Intergrowth: PDF integrado tem duas páginas A4, autor, aporte, 20 medidas, VC e relato na página 1',async()=>{
 const result=calculateIntergrowth({sex:'female',measurements:Array.from({length:20},(_,i)=>({weeks:30+Math.floor(i/7),days:i%7,weight:1200+i*25,length:35+i*.2,head:25+i*.1}))});
 const lines=[],original=PDFLib.PDFPage.prototype.drawText;
 PDFLib.PDFPage.prototype.drawText=function(value,options){lines.push({value,page:this,...options});return original.call(this,value,options);};
 let bytes;try{bytes=await createIntergrowthNutritionReport({nutrition:nutrition(),result,assessment:'História.\nAvaliação.\nConduta.\nProgramação.\nReavaliar.'});}finally{PDFLib.PDFPage.prototype.drawText=original;}
 const pdf=await PDFLib.PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);assert.equal(pdf.getAuthor(),'Jefferson Guilherme');assert.match(pdf.getTitle(),/INTERGROWTH/);
 for(const page of pdf.getPages()){assert.equal(page.getWidth(),595.28);assert.equal(page.getHeight(),841.89);}
 const first=lines[0].page;assert.ok(lines.some(l=>l.value==='VC g/kg/dia'&&l.page===first));assert.ok(lines.some(l=>l.value==='Reavaliar.'&&l.page===first&&l.y>=56));
 assert.ok(lines.some(l=>l.value.includes('Proteína')&&l.page===first));assert.ok(lines.some(l=>l.value==='32+5'&&l.page===first));
 assert.ok(!lines.some(l=>l.page===first&&l.value.includes('Fenton')));
 await assert.rejects(createIntergrowthNutritionReport({nutrition:nutrition(),result,assessment:'a\nb\nc\nd\ne\nf'}),/5 linhas/);
});
test('Intergrowth: relatório integrado prepara curvas, valida aporte e descarta exportação após edição',async()=>{
 const a=setup();a.restore();let complete,validations=0;
 const n=nutrition();const report=initIntergrowthNutritionReport(a.document,{intergrowth:a.ui,getNutrition:()=>n,prepareNutrition:()=>n,validateNutrition:()=>{validations++;},urls:a.urls,createReport:()=>new Promise(r=>complete=r)});
 a.event('ig-total-export','click');await new Promise(r=>setImmediate(r));assert.ok(a.ui.getResult());assert.ok(validations);
 a.el('ig-assessment').value='Alterado';a.event('ig-assessment','input');complete(new Uint8Array([1]));await new Promise(r=>setImmediate(r));
 assert.equal(a.el('ig-total-download').hidden,true);assert.match(a.el('ig-total-status').textContent,/alterados/);report.invalidate();
});
