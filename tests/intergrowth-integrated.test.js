import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {calculateIntergrowth} from '../intergrowth.js';
import {initIntergrowth} from '../intergrowth-ui.js';
const module=await import('../intergrowth-integrated.js').catch(()=>({}));
const pdfModule=await import('../intergrowth-integrated-pdf.js').catch(()=>({}));
const fixtures=JSON.parse(readFileSync(new URL('fixtures/intergrowth-official.json',import.meta.url)));
const example=(sex='male')=>calculateIntergrowth({sex,measurements:[{weeks:40,days:0,weight:3000,length:50,head:35},{weeks:41,days:3,weight:3300,head:35.5}]});
vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));

test('apresentação anterior é substituída por uma única prancha e um único botão PDF',()=>{
 const {document}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 const ui=initIntergrowth(document);ui.restore({input:{sex:'male',measurements:[{weeks:40,days:0,weight:3000,length:50,head:35}]},birthPmaDays:null,assessment:''});ui.ensureResult();
 assert.equal(document.querySelectorAll('#ig-charts svg').length,1);
 assert.equal(document.querySelectorAll('#ig-export-summary').length,0);
 assert.match(document.getElementById('ig-export').textContent,/prancha integrada/i);
 assert.ok(document.getElementById('ig-code'));
});
test('grade única: os três indicadores usam o mesmo X exato, sem idade corrigida nem arredondamento semanal',()=>{
 assert.equal(typeof module.buildIntegratedIntergrowthModel,'function');
 const m=module.buildIntegratedIntergrowthModel(example());
 assert.equal(m.series.length,3);assert.equal(m.xTicks.length,38);
 const xs=m.series.map(s=>s.points[0].x);assert.ok(xs.every(x=>x===xs[0]));
 assert.ok(Math.abs(xs[0]-(76+(280-189)/259*405))<1e-6);
 const [w,l,h]=m.series.map(s=>s.points[0]);
 assert.ok(Math.abs(w.y-(841.89-(450+3*20.5)))<1e-6);
 assert.ok(Math.abs(l.y-(841.89-(255+22*6.5)))<1e-6);
 assert.ok(Math.abs(h.y-(841.89-(78+17*13)))<1e-6);
 assert.ok(m.series[0].points[1].x>m.xTicks.find(t=>t.weeks===41).x);
});
test('210 referências publicadas: ambos os sexos e três medidas conservam valores e posições, incluindo extremos',()=>{
 for(const sex of ['male','female']){
  const m=module.buildIntegratedIntergrowthModel(example(sex));
  for(const table of fixtures.tables.filter(t=>t.sex===(sex==='male'?'M':'F'))){
   const s=m.series.find(s=>s.metric===table.metric);
   for(const row of table.rows)for(const [index,value] of row.values.entries()){
    const c=s.curves.find(c=>c.z===index-3),p=c.points.find(p=>p.pmaDays===row.pmaWeeks*7);
    assert.ok(Math.abs(p.value-value)<=.5*10**(-table.precision)+.001,`${sex} ${s.metric} ${row.pmaWeeks} Z${c.z}`);
    assert.ok(p.x>=m.plot.left&&p.x<=m.plot.right&&p.y>=m.plot.top&&p.y<=m.plot.bottom);
   }
  }
 }
});
test('medidas ausentes preservam numeração, interrompem traço e nunca são substituídas por zero',()=>{
 const r=calculateIntergrowth({sex:'female',measurements:[{weeks:30,days:0,weight:1000},{weeks:31,days:0,head:28},{weeks:32,days:0,weight:1400}]});
 const m=module.buildIntegratedIntergrowthModel(r),w=m.series[0];
 assert.deepEqual(w.points.map(p=>p.index),[1,3]);assert.equal(w.segments.length,2);
 assert.equal(m.series[1].points.length,0);assert.equal(m.series[2].points.length,1);
});
test('idade inválida é recusada; medidas fora da área fixa são declaradas, sem comprimir nem mover escalas',()=>{
 const normal=module.buildIntegratedIntergrowthModel(example());
 const extreme=module.buildIntegratedIntergrowthModel(calculateIntergrowth({sex:'male',measurements:[{weeks:40,days:0,weight:20000,length:90,head:60}]}));
 assert.deepEqual(extreme.series.map(s=>s.curves),normal.series.map(s=>s.curves));
 assert.equal(extreme.offScale.length,3);assert.equal(extreme.series.flatMap(s=>s.points).length,0);
 for(const [weeks,days] of [[26,6],[64,1]])assert.throws(()=>module.buildIntegratedIntergrowthModel({sex:'male',measurements:[{weeks,days,weight:3000}]}),/27 semanas|64 semanas/);
 const edges=module.buildIntegratedIntergrowthModel(calculateIntergrowth({sex:'male',measurements:[{weeks:27,days:0,weight:650},{weeks:64,days:0,weight:7800}]}));
 assert.equal(edges.series[0].points[0].x,edges.plot.left);assert.equal(edges.series[0].points[1].x,edges.plot.right);
});
test('SVG integrado é acessível, local e contém uma grade, 21 referências e os símbolos das três medidas',()=>{
 const {document}=parseHTML('<html></html>'),svg=module.createIntegratedIntergrowthChart(document,example());
 assert.equal(svg.querySelectorAll('[data-grid="shared"]').length,1);
 assert.equal(svg.querySelectorAll('[data-z]').length,21);
 assert.equal(svg.querySelectorAll('[data-measurement]').length,5);
 assert.match(svg.querySelector('desc').textContent,/pós-menstrual/);
 assert.equal(svg.querySelectorAll('image,script,foreignObject').length,0);
 assert.doesNotMatch(svg.outerHTML,/NaN|Infinity|undefined/);
});
test('PDF integrado substituto: uma página, 20 consultas, autoria, código, data e fonte; sem desenhar fora da grade',async()=>{
 assert.equal(typeof pdfModule.exportIntegratedIntergrowthPdf,'function');
 const drawText=PDFLib.PDFPage.prototype.drawText,drawLine=PDFLib.PDFPage.prototype.drawLine,lines=[];
 PDFLib.PDFPage.prototype.drawText=function(text,o){lines.push(text);const span=o.font.widthOfTextAtSize(text,o.size);assert.ok(o.x>=0&&o.y>=0,text);if(o.rotate)assert.ok(o.x-o.size>=0&&o.y+span<=this.getHeight(),text);else assert.ok(o.x+span<=this.getWidth()+.01,text);return drawText.call(this,text,o);};
 try{
  for(const sex of ['male','female']){
   const result=calculateIntergrowth({sex,measurements:Array.from({length:20},(_,i)=>({weeks:34+i,days:0,weight:2000+i*200,...(i%2?{}:{length:44+i,head:31+i*.4})}))});
   const bytes=await pdfModule.exportIntegratedIntergrowthPdf(result,{identification:'DEMO-001',date:new Date('2026-10-15T16:00:00Z')}),doc=await PDFLib.PDFDocument.load(bytes);
   assert.equal(doc.getPageCount(),1);assert.equal(doc.getAuthor(),'Jefferson Guilherme');assert.match(doc.getTitle(),/integrada/i);
  }
  assert.ok(lines.some(t=>t.includes('DEMO-001')));assert.ok(lines.some(t=>t.includes('15/10/2026')));assert.ok(lines.some(t=>t.includes('University of Oxford')));
 }finally{PDFLib.PDFPage.prototype.drawText=drawText;PDFLib.PDFPage.prototype.drawLine=drawLine;}
 await assert.rejects(pdfModule.exportIntegratedIntergrowthPdf(example(),{identification:'Nome do bebê'}),/código/i);
});

test('ausência e valores fora da grade são avisados juntos, sem sobrepor os números do eixo',()=>{
 const m=module.buildIntegratedIntergrowthModel(calculateIntergrowth({sex:'male',measurements:[{weeks:40,days:0,weight:20000}]})),texts=[];
 module.paintIntegratedIntergrowth({beginGrid(){},endGrid(){},line(){},polyline(){},marker(){},text(value,x,y,o){texts.push({value,x,y,...o});}},m);
 const off=texts.find(t=>/fora da grade/i.test(t.value)),missing=texts.find(t=>/\* Não informado/.test(t.value));
 assert.ok(off);assert.ok(missing);
 for(const t of [off,missing])assert.ok(t.y<m.plot.top-13||t.y>m.plot.bottom+25,'Aviso ocupa o eixo de idade');
});

test('vinte consultas em dias consecutivos preservam os pontos e evitam colisões entre seus rótulos',()=>{
 const result=calculateIntergrowth({sex:'female',measurements:Array.from({length:20},(_,i)=>({weeks:30+Math.floor(i/7),days:i%7,weight:1200+i*20,length:38+i*.1,head:27+i*.1}))});
 const m=module.buildIntegratedIntergrowthModel(result);
 assert.equal(m.series.flatMap(s=>s.points).length,60);assert.ok(m.pointLabels.length>0);assert.ok(m.omittedLabels>0);
 for(const [i,a] of m.pointLabels.entries())for(const b of m.pointLabels.slice(i+1))assert.ok(a.box.right<=b.box.left||a.box.left>=b.box.right||a.box.bottom<=b.box.top||a.box.top>=b.box.bottom);
 for(const metric of ['weight','length','head'])for(const index of [1,20])assert.ok(m.pointLabels.some(p=>p.metric===metric&&p.index===index));
});
