import {calculate} from '../engine.js';
import {calculateStandard} from '../standard.js';
import {calculateHydration} from '../hydration.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calculateEnteral,integrateNutrition,intravenousFromResult} from '../enteral.js';
import {calculateGrowth} from '../growth.js';
import {createFentonNutritionReport} from '../fenton-nutrition-pdf.js';
vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));

// Tiny JPEG fixture checks embedding only; it is not a clinical Fenton reference.
const jpeg=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAaABQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigAooooAKKKKACiiigD//2Q==','base64');
const chart={blob:new Blob([jpeg],{type:'image/jpeg'}),data:{sex:'F',birthGaWeeks:28,birthGaDays:0,measurements:[{weeks:30,days:5,weightGrams:1300}]}};
chart.scores=[{weeks:30,days:5,weight:{value:1300,z:-.5,percentile:30.85}}];
const growth=calculateGrowth({sex:'female',birthWeight:1400,initialWeight:1100,finalWeight:1300,gaWeeks:28,gaDays:0,initialDay:17,finalDay:20});
for(const deficit of [false,true])test(`vinte medidas fictícias completas cabem na primeira página e gráfico fica na segunda; déficit: ${deficit}`,async()=>{
 const measurements=Array.from({length:20},(_,i)=>({weeks:30+Math.floor(i/7),days:i%7,weightGrams:1200+i*25,headCm:25+i*.1,lengthCm:35+i*.2}));
 const scores=measurements.map((m,i)=>({weeks:m.weeks,days:m.days,weight:{value:m.weightGrams,z:-1+i*.1,percentile:10+i},head:{value:m.headCm,z:-.5,percentile:30+i},length:{value:m.lengthCm,z:.25,percentile:55+i}}));
 const sample={blob:chart.blob,data:{...chart.data,measurements},scores};
 const rows=[],original=PDFLib.PDFPage.prototype.drawText;
 PDFLib.PDFPage.prototype.drawText=function(value,options){
  assert.ok(options.y>=14&&options.x>=0&&options.x+options.font.widthOfTextAtSize(value,options.size)<=this.getWidth()-25,value);
  rows.push({value,page:this,y:options.y});return original.call(this,value,options);
 };
 const input=nutrition('individual','growth');
 if(deficit){input.integrated.total.calories=109.9;input.integrated.total.protein=2.49;}
 let bytes;try{bytes=await createFentonNutritionReport({nutrition:input,growth,chart:sample});}
 finally{PDFLib.PDFPage.prototype.drawText=original;}
 const pdf=await PDFLib.PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);
 for(const m of measurements)assert.ok(rows.some(r=>r.value===`${m.weeks}+${m.days}`&&r.y>56),`${m.weeks}+${m.days}`);
 assert.ok(rows.some(r=>r.value==='Fenton 2025 - medidas, escores Z e percentis'));
 assert.ok(rows.some(r=>r.value.includes('7,1% abaixo do peso ao nascer')));
 assert.ok(rows.some(r=>r.value.includes('P = percentil')));
 assert.equal(pdf.getPage(0).node.Resources().lookup(PDFLib.PDFName.of('XObject'))?.keys().length||0,0);
 assert.ok((pdf.getPage(1).node.Resources().lookup(PDFLib.PDFName.of('XObject'))?.keys().length||0)>0);
});
test('PDF combinado rejeita tabela de escore ausente ou medida distinta',async()=>{
 await assert.rejects(createFentonNutritionReport({nutrition:nutrition(),chart:{...chart,scores:null}}),/tabela de escores/);
 await assert.rejects(createFentonNutritionReport({nutrition:nutrition(),chart:{...chart,scores:[{...chart.scores[0],weight:{value:1301,z:-.5,percentile:30}}]}}),/valores da tabela/);
});
function nutrition(source='none',phase='growth'){
 const enteral=calculateEnteral({type:'lhop',rate:165,fm85GramsPer100mL:2});
 return {enteral,integrated:integrateNutrition({source,enteral,parenteral:{fluid:60,calories:45,protein:2,weight:1.3,formulation:source==='standard'?'2in1':undefined}}),clinical:{phase,birthWeight:1400,gestationalAge:28}};
}
for(const source of ['none','individual','standard','hydration'])for(const phase of ['growth','transition','oligoanuria']){
 test(`two-page report / ${source} / ${phase}: complete content stays inside page`,async()=>{
  const input={nutrition:nutrition(source,phase),growth,chart},before=JSON.stringify(input.nutrition),texts=[];
  const original=PDFLib.PDFPage.prototype.drawText;
  PDFLib.PDFPage.prototype.drawText=function(value,opts){
   assert.ok(opts.y>=14,value);
   assert.ok(opts.x>=0&&opts.x+opts.font.widthOfTextAtSize(value,opts.size)<=this.getWidth()-25,value);
   texts.push({value,page:this});return original.call(this,value,opts);
  };
  let bytes;
  try{bytes=await createFentonNutritionReport(input);}finally{PDFLib.PDFPage.prototype.drawText=original;}
  const doc=await PDFLib.PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(),2);assert.equal(doc.getAuthor(),'Jefferson Guilherme');
  assert.equal(JSON.stringify(input.nutrition),before);
  assert.ok(texts.some(x=>x.value==='3,17'||x.value==='5,17'));
  assert.ok(texts.some(x=>x.value.includes('FM85: 0,50')));
  assert.ok(texts.some(x=>x.value.includes('Ainda não recuperou')));
  assert.ok(texts.some(x=>x.value.includes('inferior a 5 dias')));
  if(source==='standard')assert.ok(texts.some(x=>x.value.includes('Lipídios infundidos à parte')));
 });
}
test('requires current nutrition and chart',async()=>{
 await assert.rejects(createFentonNutritionReport({chart}),/Calcule o aporte/);
 await assert.rejects(createFentonNutritionReport({nutrition:nutrition()}),/Gere o gráfico/);
});
test('rejects mixed growth and chart context',async()=>{
 await assert.rejects(createFentonNutritionReport({nutrition:nutrition(),growth:{...growth,input:{...growth.input,sex:'male'}},chart}),/sexo e IG/);
});
test('optional growth is explicitly absent',async()=>{
 const bytes=await createFentonNutritionReport({nutrition:nutrition(),chart});
 assert.equal((await PDFLib.PDFDocument.load(bytes)).getPageCount(),2);
});

for(const source of ['none','individual','standard','hydration'])for(const phase of ['growth','transition','oligoanuria'])test(`negative energy combined PDF / ${source} / ${phase}: explicit and within page`,async()=>{
 const enteral=calculateEnteral({type:'lhop',rate:165,analyzedEnergy:-0.125,analyzedProtein:1.2,fm85GramsPer100mL:2});
 const input=nutrition(source,phase);input.enteral=enteral;input.integrated=integrateNutrition({source,enteral,parenteral:{fluid:60,calories:45,protein:2,weight:1.3,formulation:source==='standard'?'2in1':undefined}});
 const original=PDFLib.PDFPage.prototype.drawText,lines=[];
 PDFLib.PDFPage.prototype.drawText=function(value,opts){
  lines.push(value);assert.ok(opts.y>=14,value);assert.ok(opts.x+opts.font.widthOfTextAtSize(value,opts.size)<=this.getWidth()-25,value);
  return original.call(this,value,opts);
 };
 try{assert.equal((await PDFLib.PDFDocument.load(await createFentonNutritionReport({nutrition:input,growth,chart}))).getPageCount(),2);}
 finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(lines.includes('Energia analisada inválida: -0,125 kcal/100 mL.'));
 assert.ok(lines.includes('Usado 0 kcal/100 mL para a energia do leite; não é valor medido.'));
 assert.ok(lines.includes('Energia do FM85 acrescentada separadamente.'));
 assert.ok(!lines.includes('Composição informada/analisada.'));
});

for(const source of ['none','individual','standard','hydration'])for(const phase of ['growth','transition','oligoanuria'])test(`both nutrients invalid combined PDF / ${source} / ${phase}`,async()=>{
 const enteral=calculateEnteral({type:'lhop',rate:165,analyzedEnergy:-Number.MAX_VALUE,analyzedProtein:-Number.MAX_VALUE,fm85GramsPer100mL:4});
 const input=nutrition(source,phase);input.enteral=enteral;input.integrated=integrateNutrition({source,enteral,parenteral:{fluid:60,calories:45,protein:2,weight:1.3,formulation:source==='standard'?'2in1':undefined}});
 const original=PDFLib.PDFPage.prototype.drawText,lines=[];
 PDFLib.PDFPage.prototype.drawText=function(value,opts){lines.push(value);assert.ok(opts.y>=14,value);assert.ok(opts.x+opts.font.widthOfTextAtSize(value,opts.size)<=this.getWidth()-25,value);return original.call(this,value,opts);};
 try{assert.equal((await PDFLib.PDFDocument.load(await createFentonNutritionReport({nutrition:input,growth,chart}))).getPageCount(),2);}
 finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(lines.some(s=>s.startsWith('Energia analisada inválida')));assert.ok(lines.some(s=>s.startsWith('Proteína analisada inválida')));
 assert.ok(lines.includes('Zero no cálculo não é valor medido. Revise os valores e recalcule.'));
 assert.ok(lines.includes('FM85: energia e proteína acrescentadas separadamente.'));
});

for(const source of ['individual_hydration','standard_hydration'])test(`audit: Fenton report separates ${source} and enteral (fixture chart only)`,async()=>{
 const base={day:8,weight:1,birthWeight:1,access:'central'};
 const np=source==='standard_hydration'?calculateStandard({...base,mode:'fluid',value:60,formulation:'2in1'}):calculate({...base,gaWeeks:28,gaDays:0,fluidPhase:'stable',fluid:60,aa:2,lip:1,vig:3,na:0,k:0,ca:0,mg:0,p:0,naSalt:'nacl',pSalt:'glycero',znDose:400,seDose:7,omit:{va:true,vb:true,oligo:true,zn:true,se:true}});
 const hv=calculateHydration({...base,fluid:40,vig:2,na:0,k:0,ca:0,mg:0,doseUnit:'perKgDay',concentrations:{na:1.7,k:1.34,ca:.5,mg:.8}});
 const enteral=calculateEnteral({type:'lhop',rate:50}),integrated=integrateNutrition({source,enteral,parenteral:intravenousFromResult(source,{np,hv})});
 const lines=[],original=PDFLib.PDFPage.prototype.drawText;
 PDFLib.PDFPage.prototype.drawText=function(t,o){assert.ok(o.y>=14);assert.ok(o.x>=0&&o.x+o.font.widthOfTextAtSize(t,o.size)<=this.getWidth()-25,t);lines.push(t);return original.call(this,t,o);};
 try{const bytes=await createFentonNutritionReport({nutrition:{enteral,integrated},chart});assert.equal((await PDFLib.PDFDocument.load(bytes)).getPageCount(),2);}finally{PDFLib.PDFPage.prototype.drawText=original;}
 for(const v of ['NP','HV','Enteral','Total','60,0','40,0','50,0','150,0'])assert.ok(lines.includes(v),v);
});
