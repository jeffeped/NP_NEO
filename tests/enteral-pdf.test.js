import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calculateEnteral,integrateNutrition} from '../enteral.js';
import {createEnteralReport} from '../enteral-pdf.js';

vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));

test('PDF Enteral: gera aporte nutricional total com autoria e versão',async()=>{
  const en=calculateEnteral({type:'lmo',lactationDays:14,rate:80});
  const integrated=integrateNutrition({parenteral:{fluid:70,calories:48,protein:2},enteral:en});
  const bytes=await createEnteralReport({enteral:en,integrated});
  assert.ok(bytes.length>500);
  const doc=await PDFLib.PDFDocument.load(bytes);
  assert.equal(doc.getAuthor(),'Jefferson Guilherme');
  assert.match(doc.getTitle(),/Avaliação nutricional integrada neonatal/);
  assert.match(doc.getSubject(),/aporte nutricional total/);
  assert.equal(doc.getPageCount(),1);
});

for(const [rate,energy,protein,active,energyText,proteinText] of [
 [50,109.9,2.49,false,'',''],
 [50.1,109.9,2.49,true,'abaixo da meta','abaixo da meta'],
 [50.1,110,2.5,true,'meta atingida','meta atingida'],
 [50.1,110,2.49,true,'meta atingida','abaixo da meta'],
 [50.1,109.9,2.5,true,'abaixo da meta','meta atingida']
])test(`PDF transição ${rate}/${energy}/${protein}: texto e limites da página`,async()=>{
 const en=calculateEnteral({type:'lhop',rate});
 const integrated=integrateNutrition({parenteral:{fluid:60,calories:energy-en.calories,protein:protein-en.protein},enteral:en});
 const original=PDFLib.PDFPage.prototype.drawText,lines=[];
 PDFLib.PDFPage.prototype.drawText=function(value,opts){
  lines.push(value);assert.ok(opts.x>=0&&opts.y>=0);
  assert.ok(opts.x+opts.font.widthOfTextAtSize(value,opts.size)<=this.getWidth(),value);
  return original.call(this,value,opts);
 };
 try{
  const doc=await PDFLib.PDFDocument.load(await createEnteralReport({enteral:en,integrated}));assert.equal(doc.getPageCount(),1);
 }finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(lines.some(s=>s.includes(active?'Régua ativa':'Régua inativa')));
 if(active){assert.ok(lines.some(s=>s.startsWith(`Energia total: ${energyText}`)));assert.ok(lines.some(s=>s.startsWith(`Proteína total: ${proteinText}`)));}
 assert.ok(lines.includes(protein.toFixed(2).replace('.',',')));
});
