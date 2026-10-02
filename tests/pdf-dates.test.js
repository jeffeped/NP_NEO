import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {formatIssueDate} from '../pdf-date.js';
import {calculate} from '../engine.js';
import {calculateHydration} from '../hydration.js';
import {calculateStandard} from '../standard.js';
import {calculateEnteral,integrateNutrition,intravenousFromResult} from '../enteral.js';
import {calculateIntergrowth} from '../intergrowth.js';
import {createReport} from '../pdf.js';
import {createHydrationReport} from '../hydration-pdf.js';
import {createStandardReport} from '../standard-pdf.js';
import {createEnteralReport} from '../enteral-pdf.js';
import {createFentonNutritionReport} from '../fenton-nutrition-pdf.js';
import {exportIntergrowthPdf,exportIntergrowthSummaryPdf} from '../intergrowth-pdf.js';
vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
globalThis.fetch=async url=>({ok:true,arrayBuffer:async()=>readFileSync(url)});
const base={weight:.920,birthWeight:.990,day:7,gaWeeks:30,gaDays:0,fluidPhase:'stable',fluid:100,aa:2,lip:2,vig:5,na:2,k:0,ca:0,mg:0,p:1,znDose:400,seDose:7,access:'central',naSalt:'nacl',pSalt:'glycero',omit:{va:true,vb:true,oligo:true,zn:true,se:true}};
const np=calculate(base),hv=calculateHydration({...base,doseUnit:'perKgDay',concentrations:{na:1.7,k:1.34,ca:.5,mg:.8}}),standard=calculateStandard({...base,mode:'fluid',value:100});
const enteral=calculateEnteral({type:'lhop',rate:60}),integrated=integrateNutrition({source:'individual',parenteral:intravenousFromResult('individual',np),enteral});
const intergrowth=calculateIntergrowth({sex:'female',measurements:[{weeks:40,days:0,weight:3000,length:47.3,head:33.7},{weeks:44,days:0,weight:4000,length:51,head:35}]});
const fixture=readFileSync(new URL('fenton-nutrition-pdf.test.js',import.meta.url),'utf8').match(/Buffer.from\('([^']+)'/)[1];
const chart={blob:new Blob([Buffer.from(fixture,'base64')],{type:'image/jpeg'}),data:{sex:'F',birthGaWeeks:30,birthGaDays:0,measurements:[{weeks:31,days:0,weightGrams:920}]}};
chart.scores=[{weeks:31,days:0,weight:{value:920,z:-1.2,percentile:11.5}}];
test('issuance date uses Manaus across UTC midnight',()=>{
 assert.equal(formatIssueDate(new Date('2026-10-02T01:05:00Z')),'Emissão: 01/10/2026 21:05 (Manaus)');
});
for(const [name,create,input,expectedWeight] of [
 ['np',createReport,np,true],['hv',createHydrationReport,hv,true],['standard',createStandardReport,standard,true],
 ['enteral',createEnteralReport,{enteral,integrated},true],
 ['fenton-combined',createFentonNutritionReport,{nutrition:{enteral,integrated},chart},true],
 ['intergrowth',exportIntergrowthPdf,intergrowth,false],['intergrowth-summary',exportIntergrowthSummaryPdf,intergrowth,false]
])test(`PDF ${name}: each page has visible issuance date matching metadata and dosing context`,async()=>{
 const original=PDFLib.PDFPage.prototype.drawText,lines=[];
 PDFLib.PDFPage.prototype.drawText=function(value,options){
  assert.ok(options.x>=0&&options.y>=0&&options.y+options.size<this.getHeight(),value);
  assert.ok(options.x+options.font.widthOfTextAtSize(value,options.size)<=this.getWidth(),value);
  lines.push({value,page:this});return original.call(this,value,options);
 };
 let bytes;try{bytes=await create(input);}finally{PDFLib.PDFPage.prototype.drawText=original;}
 const doc=await PDFLib.PDFDocument.load(bytes),dated=lines.filter(l=>l.value.startsWith('Emissão:'));
 assert.equal(dated.length,doc.getPageCount());assert.equal(new Set(dated.map(l=>l.page)).size,doc.getPageCount());
 assert.ok(dated.every(l=>l.value===formatIssueDate(doc.getCreationDate())));
 if(expectedWeight)assert.ok(lines.some(l=>l.value.includes('Peso de cálculo: 990 g')&&l.value.includes('peso ao nascer')));
 if(process.env.GROW_NEO_PDF_QA_DIR){mkdirSync(process.env.GROW_NEO_PDF_QA_DIR,{recursive:true});writeFileSync(join(process.env.GROW_NEO_PDF_QA_DIR,name+'.pdf'),bytes);}
});
