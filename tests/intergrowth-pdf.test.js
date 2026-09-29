import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {exportIntergrowthPdf} from '../intergrowth-pdf.js';

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
