import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calculateEnteral,integrateNutrition} from '../enteral.js';
import {intravenousFromResult} from '../enteral.js';
import {calculateStandard} from '../standard.js';
import {createEnteralReport} from '../enteral-pdf.js';
import {calculateGrowth} from '../growth.js';

vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));

test('PDF Enteral: gera aporte nutricional total com autoria e versão',async()=>{
  const en=calculateEnteral({type:'lmo',lactationDays:14,rate:80});
  const integrated=integrateNutrition({parenteral:{fluid:70,calories:48,protein:2},enteral:en});
  const bytes=await createEnteralReport({enteral:en,integrated});
  assert.ok(bytes.length>500);
  const doc=await PDFLib.PDFDocument.load(bytes);
  assert.equal(doc.getAuthor(),'Jefferson P Guilherme');
  assert.match(doc.getTitle(),/Avaliação nutricional integrada neonatal/);
  assert.match(doc.getSubject(),/aporte nutricional total/);
  assert.equal(doc.getPageCount(),1);
});

test('PDF Enteral: inclui o cálculo válido de crescimento',async()=>{
 const enteral=calculateEnteral({type:'lhop',rate:120});
 const integrated=integrateNutrition({source:'none',parenteral:{},enteral});
 const growth=calculateGrowth({sex:'female',birthWeight:1000,initialWeight:1100,finalWeight:1300,gaWeeks:28,gaDays:0,initialDay:10,finalDay:20});
 const original=PDFLib.PDFPage.prototype.drawText,lines=[];
 PDFLib.PDFPage.prototype.drawText=function(value,opts){lines.push(value);assert.ok(opts.y>=0);return original.call(this,value,opts);};
 try{await createEnteralReport({enteral,integrated,growth});}finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(lines.includes('Crescimento ponderal'));
 assert.ok(lines.some(line=>line.includes('Velocidade pelo peso médio: 16,7 g/kg/dia')));
 assert.ok(lines.some(line=>line.includes('Fenton 2025 · 28–31 sem · P50 16,6 g/kg/dia · 100% da referência')));
});
test('PDF integrado 2:1 identifica ausência de lipídios na bolsa e no total',async()=>{
 const standard=calculateStandard({birthWeight:1,weight:1,day:2,formulation:'2in1',mode:'protein',value:3,access:'central'});
 const enteral=calculateEnteral({type:'lhop',rate:60});
 const integrated=integrateNutrition({source:'standard',parenteral:intravenousFromResult('standard',standard),enteral});
 const original=PDFLib.PDFPage.prototype.drawText,lines=[];
 PDFLib.PDFPage.prototype.drawText=function(value,opts){lines.push(value);assert.ok(opts.y>=0);return original.call(this,value,opts);};
 try{await createEnteralReport({enteral,integrated});}finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(lines.some(x=>x.includes('Numeta 2:1, sem lipídios')));
 assert.ok(lines.some(x=>x.includes('Lipídios infundidos à parte não integram estes totais')));
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
 assert.ok(lines.includes('Metas de transição PN / EN'));
 assert.ok(!lines.some(s=>s.includes('Régua de transição')));
 assert.ok(lines.some(s=>s.includes(active?'Metas de transição avaliadas':'Metas de transição não avaliadas')));
 if(active){assert.ok(lines.some(s=>s.startsWith(`Energia total: ${energyText}`)));assert.ok(lines.some(s=>s.startsWith(`Proteína total: ${proteinText}`)));}
 assert.ok(lines.includes(protein.toFixed(2).replace('.',',')));
});

for(const [source,label,column] of [['none','Sem aporte intravenoso','IV (zero)'],['individual','NP individualizada','PN'],['standard','NP padrão (Numeta)','PN'],['hydration','HV','HV']])test(`PDF integrado identifica ${label} e coluna ${column}`,async()=>{
 const en=calculateEnteral({type:'lhop',rate:80});
 const integrated=integrateNutrition({source,parenteral:{fluid:60,calories:28.8,protein:1.88,weight:1},enteral:en});
 const original=PDFLib.PDFPage.prototype.drawText,lines=[];
 PDFLib.PDFPage.prototype.drawText=function(value,opts){lines.push(value);assert.ok(opts.x+opts.font.widthOfTextAtSize(value,opts.size)<=this.getWidth(),value);return original.call(this,value,opts);};
 try{const pdf=await PDFLib.PDFDocument.load(await createEnteralReport({enteral:en,integrated}));assert.equal(pdf.getPageCount(),1);assert.equal(pdf.getAuthor(),'Jefferson P Guilherme');}finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(lines.includes('Fonte: '+label));assert.ok(lines.includes(column));
 if(source!=='none')assert.ok(lines.some(x=>x.includes('peso de cálculo 1.000 g')));
 if(source==='hydration'||source==='none'){assert.ok(lines.includes('0,00'));assert.ok(lines.some(x=>x.includes('Metas de transição não avaliadas: sem PN')));}
});

for(const fortifier of [0,2])test(`PDF negative energy: explicit fallback, export allowed, fortifier ${fortifier}`,async()=>{
 const enteral=calculateEnteral({type:'lhop',rate:150,analyzedEnergy:-0.125,analyzedProtein:1.2,fm85GramsPer100mL:fortifier});
 const integrated=integrateNutrition({source:'standard',enteral,parenteral:{fluid:60,calories:50,protein:2,formulation:'2in1'}});
 const growth=calculateGrowth({sex:'female',birthWeight:1400,initialWeight:1100,finalWeight:1300,gaWeeks:28,gaDays:0,initialDay:17,finalDay:20});
 const original=PDFLib.PDFPage.prototype.drawText,lines=[];
 PDFLib.PDFPage.prototype.drawText=function(value,opts){
  lines.push(value);assert.ok(opts.y>=14,value);assert.ok(opts.x+opts.font.widthOfTextAtSize(value,opts.size)<=this.getWidth()-25,value);
  return original.call(this,value,opts);
 };
 try{assert.equal((await PDFLib.PDFDocument.load(await createEnteralReport({enteral,integrated,growth,clinical:{phase:'growth',birthWeight:1400,gestationalAge:28}}))).getPageCount(),2);}
 finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(lines.includes('Energia analisada inválida: -0,125 kcal/100 mL.'));
 assert.ok(lines.includes('Usado 0 kcal/100 mL para a energia do leite; não é valor medido.'));
 assert.ok(!lines.includes('Composição informada/analisada.'));
 assert.equal(lines.includes('Energia do FM85 acrescentada separadamente.'),fortifier>0);
 assert.equal(integrated.total.calories,50+1.5*fortifier*4.3);
});

for(const analyzedEnergy of [70,-1])for(const fortifier of [0,4])test(`PDF protein invalid: energy ${analyzedEnergy}, fortifier ${fortifier}, explicit recalculation`,async()=>{
 const enteral=calculateEnteral({type:'lhop',rate:150,analyzedEnergy,analyzedProtein:-.125,fm85GramsPer100mL:fortifier});
 const integrated=integrateNutrition({source:'standard',enteral,parenteral:{fluid:60,calories:50,protein:2,formulation:'2in1'}});
 const growth=calculateGrowth({sex:'female',birthWeight:1400,initialWeight:1100,finalWeight:1300,gaWeeks:28,gaDays:0,initialDay:17,finalDay:20});
 const original=PDFLib.PDFPage.prototype.drawText,lines=[];
 PDFLib.PDFPage.prototype.drawText=function(value,opts){lines.push(value);assert.ok(opts.y>=14,value);assert.ok(opts.x+opts.font.widthOfTextAtSize(value,opts.size)<=this.getWidth()-25,value);return original.call(this,value,opts);};
 try{assert.equal((await PDFLib.PDFDocument.load(await createEnteralReport({enteral,integrated,growth}))).getPageCount(),1);}
 finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(lines.includes('Proteína analisada inválida: -0,125 g/100 mL; usado 0.'));
 assert.ok(lines.includes('Zero no cálculo não é valor medido. Revise os valores e recalcule.'));
 assert.equal(lines.some(s=>s.startsWith('Energia analisada inválida')),analyzedEnergy<0);
 assert.equal(lines.includes('FM85: energia e proteína acrescentadas separadamente.'),fortifier>0);
});
