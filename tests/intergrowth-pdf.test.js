import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {exportIntergrowthPdf,exportIntergrowthSummaryPdf} from '../intergrowth-pdf.js';
import {calculateIntergrowth} from '../intergrowth.js';

vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
const resultFor=count=>({sex:'female',measurements:Array.from({length:count},(_,index)=>({weeks:Math.floor((280+index*7)/7),days:0,pmaDays:280+index*7,weight:3000+index*100,length:46+index*.5,head:32+index*.25,scores:{weight:{z:-.25,percentile:40.1},length:{z:.33,percentile:62.9},head:{z:-.8,percentile:21.2}}}))});

test('PDF ambulatorial local gera três páginas vetoriais com versão, referências e vinte avaliações',async()=>{
 const original=PDFLib.PDFPage.prototype.drawText,originalPath=PDFLib.PDFPage.prototype.drawSvgPath,lines=[],paths=[];
 PDFLib.PDFPage.prototype.drawText=function(value,options){
  lines.push(value);
  assert.ok(options.x>=0&&options.y>=0,`Fora da página: ${value}`);
  assert.ok(options.x+options.font.widthOfTextAtSize(value,options.size)<=this.getWidth(),`Texto excede página: ${value}`);
  return original.call(this,value,options);
 };
 PDFLib.PDFPage.prototype.drawSvgPath=function(path,options){paths.push({path,options});return originalPath.call(this,path,options);};
 try{
  const bytes=await exportIntergrowthPdf(resultFor(20)),doc=await PDFLib.PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(),3);assert.equal(doc.getAuthor(),'Jefferson P Guilherme');
  assert.match(doc.getTitle(),/Seguimento ambulatorial INTERGROWTH-21st/);assert.match(doc.getSubject(),/27\+0 a 64\+0/);
  assert.ok(lines.includes('20'));assert.ok(lines.includes('59 + 0'));assert.ok(lines.includes('4900'));
  assert.ok(lines.includes('-0,25'));assert.ok(lines.includes('40,1'));
  assert.ok(lines.some(value=>value.includes('10.1016/S2214-109X(15)00163-1')));
  assert.ok(lines.some(value=>value.includes('não é idade corrigida')));
  assert.ok(lines.some(value=>value.includes('Peso (kg)')));assert.ok(lines.some(value=>value.includes('Peso (g)')));
  assert.equal(paths.length,21);assert.ok(paths.some(path=>path.options.borderDashArray.length>0));
  for(const path of paths)assert.equal(path.path.split(' L ').length,260);
 }finally{PDFLib.PDFPage.prototype.drawText=original;PDFLib.PDFPage.prototype.drawSvgPath=originalPath;}
});
test('PDF pagina a tabela se o relatório contiver mais de vinte avaliações',async()=>{
 const doc=await PDFLib.PDFDocument.load(await exportIntergrowthPdf(resultFor(21)));
 assert.equal(doc.getPageCount(),6);
});
test('PDF permite medidas opcionais ausentes e informa indicador sem medidas',async()=>{
 const result=resultFor(1);delete result.measurements[0].head;delete result.measurements[0].scores.head;
 const original=PDFLib.PDFPage.prototype.drawText,lines=[];
 PDFLib.PDFPage.prototype.drawText=function(value,options){lines.push(value);return original.call(this,value,options);};
 try{await exportIntergrowthPdf(result);}finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(lines.includes('Nenhuma medida deste indicador foi informada.'));
 assert.ok(lines.includes('—'));assert.ok(!lines.some(value=>/NaN|undefined/.test(value)));
});
test('PDF recusa resultado ausente',async()=>{
 await assert.rejects(exportIntergrowthPdf(null),/Calcule/);
 await assert.rejects(exportIntergrowthPdf({sex:'female',measurements:[]}),/Calcule/);
});

test('prancha A4 reúne vinte avaliações em uma página vetorial com texto legível e dentro dos limites',async()=>{
 const original=PDFLib.PDFPage.prototype.drawText,originalPath=PDFLib.PDFPage.prototype.drawSvgPath,originalCircle=PDFLib.PDFPage.prototype.drawCircle;
 const lines=[],paths=[],circles=[];
 PDFLib.PDFPage.prototype.drawText=function(value,options){
  lines.push({value,...options});
  assert.ok(options.size>=8,`Fonte pequena: ${value}`);
  assert.ok(options.x>=0&&options.y>=0&&options.y+options.size<=this.getHeight(),`Fora da página: ${value}`);
  assert.ok(options.x+options.font.widthOfTextAtSize(value,options.size)<=this.getWidth(),`Texto excede página: ${value}`);
  return original.call(this,value,options);
 };
 PDFLib.PDFPage.prototype.drawSvgPath=function(path,options){paths.push({path,options});return originalPath.call(this,path,options);};
 PDFLib.PDFPage.prototype.drawCircle=function(options){circles.push(options);return originalCircle.call(this,options);};
 try{
  const bytes=await exportIntergrowthSummaryPdf(resultFor(20)),doc=await PDFLib.PDFDocument.load(bytes),page=doc.getPage(0);
  assert.equal(doc.getPageCount(),1);assert.equal(doc.getAuthor(),'Jefferson P Guilherme');
  assert.ok(Math.abs(page.getWidth()-595.28)<.01&&Math.abs(page.getHeight()-841.89)<.01);
  assert.match(doc.getTitle(),/uma página/);
  assert.equal(paths.length,21);
  for(const path of paths){
   assert.equal(path.path.split(' L ').length,260);
   const points=path.path.match(/(?:M|L) ([\d.e+-]+) ([\d.e+-]+)/g).map(pair=>pair.split(' ').slice(1).map(Number));
   assert.equal(points[0][0],0);assert.equal(points.at(-1)[0],440);
   assert.ok(points.every(([x,y])=>x>=0&&x<=440&&y>=0&&y<=136));
  }
  assert.equal(circles.filter(circle=>circle.x>=74&&circle.x<=514).length,60,'Toda medida deve permanecer visível nos três painéis.');
  assert.ok(lines.some(line=>line.value.includes('Última avaliação · IPM 59 sem + 0 d')));
  assert.ok(lines.some(line=>line.value==='4900'));
  assert.ok(lines.some(line=>line.value.includes('Não é idade corrigida')));
  assert.ok(lines.some(line=>line.value.includes('10.1016/S2214-109X(15)00163-1')));
  assert.ok(lines.some(line=>line.value.includes('sem endosso dos autores')));
 }finally{PDFLib.PDFPage.prototype.drawText=original;PDFLib.PDFPage.prototype.drawSvgPath=originalPath;PDFLib.PDFPage.prototype.drawCircle=originalCircle;}
});

test('prancha mostra dados ausentes da última visita sem substituir por medidas anteriores',async()=>{
 const result=calculateIntergrowth({sex:'female',measurements:[{weeks:40,days:0,weight:3000,length:47.3,head:33.7},{weeks:44,days:0,weight:4000}]}),lines=[];
 const original=PDFLib.PDFPage.prototype.drawText;
 PDFLib.PDFPage.prototype.drawText=function(value,options){lines.push(value);return original.call(this,value,options);};
 try{
  const doc=await PDFLib.PDFDocument.load(await exportIntergrowthSummaryPdf(result));assert.equal(doc.getPageCount(),1);
 }finally{PDFLib.PDFPage.prototype.drawText=original;}
 const summary=lines.slice(lines.findIndex(value=>value.startsWith('Última avaliação')));
 assert.equal(summary.filter(value=>value==='Não informada').length,2);
 assert.ok(summary.includes('4000'));assert.ok(!summary.includes('47,3'));assert.ok(!summary.includes('33,7'));
 assert.equal(summary.filter(value=>value==='-').length,4);
});

test('prancha mantém pontos extremos no quadro e rótulos Z distintos em cada painel compacto',async()=>{
 const result=calculateIntergrowth({sex:'male',measurements:[{weeks:27,days:0,weight:100,length:15,head:10},{weeks:64,days:0,weight:20000,length:90,head:60}]}),labels=[],circles=[];
 const original=PDFLib.PDFPage.prototype.drawText,originalCircle=PDFLib.PDFPage.prototype.drawCircle;
 PDFLib.PDFPage.prototype.drawText=function(value,options){if(/^Z [+-]?\d$/.test(value))labels.push(options);return original.call(this,value,options);};
 PDFLib.PDFPage.prototype.drawCircle=function(options){circles.push(options);return originalCircle.call(this,options);};
 try{await exportIntergrowthSummaryPdf(result);}finally{PDFLib.PDFPage.prototype.drawText=original;PDFLib.PDFPage.prototype.drawCircle=originalCircle;}
 assert.equal(labels.length,21);
 for(let i=0;i<3;i++){
  const group=labels.slice(i*7,(i+1)*7),top=718-i*172,bottom=top-136;
  assert.ok(group.every(label=>label.y>=bottom&&label.y+label.size<=top+5));
  for(let j=1;j<group.length;j++)assert.ok(group[j-1].y-group[j].y>=10.99);
  const points=circles.filter(point=>point.x>=74&&point.x<=514&&point.y>=bottom&&point.y<=top);
  assert.equal(points.length,2);assert.deepEqual(points.map(point=>point.x),[74,514]);
 }
});

test('prancha informa indicador nunca medido e recusa ausência ou excesso de avaliações',async()=>{
 const result=calculateIntergrowth({sex:'female',measurements:[{weeks:40,days:0,weight:3000}]}),lines=[];
 const original=PDFLib.PDFPage.prototype.drawText;
 PDFLib.PDFPage.prototype.drawText=function(value,options){lines.push(value);return original.call(this,value,options);};
 try{await exportIntergrowthSummaryPdf(result);}finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.equal(lines.filter(line=>line==='Nenhuma medida informada').length,2);
 assert.ok(!lines.some(line=>/NaN|undefined/.test(line)));
 await assert.rejects(exportIntergrowthSummaryPdf(null),/Calcule/);
 await assert.rejects(exportIntergrowthSummaryPdf(resultFor(21)),/vinte/);
});
