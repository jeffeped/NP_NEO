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
const scores={data:chart.data,scores:[{ageWeeks:30+5/7,weightGrams:{value:1300,z:-.887,percentile:19},headCm:null,lengthCm:null}]};
const growth=calculateGrowth({sex:'female',birthWeight:1400,initialWeight:1100,finalWeight:1300,gaWeeks:28,gaDays:0,initialDay:17,finalDay:20});
function nutrition(source='none',phase='growth'){
 const enteral=calculateEnteral({type:'lhop',rate:165,fm85GramsPer100mL:2});
 return {enteral,integrated:integrateNutrition({source,enteral,parenteral:{fluid:60,calories:45,protein:2,weight:1.3,formulation:source==='standard'?'2in1':undefined}}),clinical:{phase,birthWeight:1400,gestationalAge:28}};
}
for(const source of ['none','individual','standard','hydration'])for(const phase of ['growth','transition','oligoanuria']){
 test(`two-page report / ${source} / ${phase}: complete content stays inside page`,async()=>{
  const input={nutrition:nutrition(source,phase),growth,chart,scores},before=JSON.stringify(input.nutrition),texts=[];
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
  assert.ok(texts.some(x=>x.value.includes('perda ponderal: 7,1%')));
  assert.ok(texts.some(x=>x.value==='-0,887'));
  assert.ok(texts.some(x=>x.value.includes('inferior a 5 dias')));
  if(source==='standard')assert.ok(texts.some(x=>x.value.includes('Lipídios infundidos à parte')));
 });
}
test('requires current nutrition and chart',async()=>{
 await assert.rejects(createFentonNutritionReport({chart}),/Calcule o aporte/);
 await assert.rejects(createFentonNutritionReport({nutrition:nutrition()}),/Gere o gráfico/);
});
test('rejects mixed growth and chart context',async()=>{
 await assert.rejects(createFentonNutritionReport({nutrition:nutrition(),growth:{...growth,input:{...growth.input,sex:'male'}},chart,scores}),/sexo e IG/);
});
test('optional growth is explicitly absent',async()=>{
 const bytes=await createFentonNutritionReport({nutrition:nutrition(),chart,scores});
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
 try{assert.equal((await PDFLib.PDFDocument.load(await createFentonNutritionReport({nutrition:input,growth,chart,scores}))).getPageCount(),2);}
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
 try{assert.equal((await PDFLib.PDFDocument.load(await createFentonNutritionReport({nutrition:input,growth,chart,scores}))).getPageCount(),2);}
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
 try{const bytes=await createFentonNutritionReport({nutrition:{enteral,integrated},chart,scores});assert.equal((await PDFLib.PDFDocument.load(bytes)).getPageCount(),2);}finally{PDFLib.PDFPage.prototype.drawText=original;}
 for(const v of ['NP','HV','Enteral','Total','60,0','40,0','50,0','150,0'])assert.ok(lines.includes(v),v);
});
test('twenty Fenton measurements fit beside integrated assessment on one page',async()=>{
 const measurements=Array.from({length:20},(_,i)=>({weeks:30+i,days:0,weightGrams:1300+i*100,headCm:27+i*.3,lengthCm:39+i*.4}));
 const manyChart={...chart,data:{...chart.data,measurements}};
 const manyScores={data:manyChart.data,scores:measurements.map(row=>({ageWeeks:row.weeks,weightGrams:{value:row.weightGrams,z:-.8,percentile:21},headCm:{value:row.headCm,z:-.6,percentile:27},lengthCm:{value:row.lengthCm,z:-.3,percentile:38}}))};
 const original=PDFLib.PDFPage.prototype.drawText;
 PDFLib.PDFPage.prototype.drawText=function(value,opts){assert.ok(opts.y>=14&&opts.y<=this.getHeight()-20,`${value}: ${opts.y}`);if(value==='-0,800')assert.ok(opts.y>=60,`Tabela invadiu rodapé: ${opts.y}`);return original.call(this,value,opts);};
 try{const bytes=await createFentonNutritionReport({nutrition:nutrition('individual','growth'),growth,chart:manyChart,scores:manyScores});assert.equal((await PDFLib.PDFDocument.load(bytes)).getPageCount(),2);}
 finally{PDFLib.PDFPage.prototype.drawText=original;}
});
test('weight loss uses measured weight rather than D7 dosing weight',async()=>{
 const input=nutrition('individual');input.integrated.weightContext={currentWeight:.92,birthWeight:.99,calculationWeight:.99,basis:'birth'};
 const lines=[],original=PDFLib.PDFPage.prototype.drawText;
 PDFLib.PDFPage.prototype.drawText=function(value,opts){lines.push(value);return original.call(this,value,opts);};
 try{await createFentonNutritionReport({nutrition:input,chart,scores});}finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(lines.some(value=>value.includes('Peso atual: 920 g')&&value.includes('perda ponderal: 7,1%')));
});
