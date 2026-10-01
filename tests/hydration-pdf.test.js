import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calculateHydration} from '../hydration.js';
import {createHydrationReport} from '../hydration-pdf.js';
vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
globalThis.fetch=async url=>({ok:true,arrayBuffer:async()=>{const b=readFileSync(url);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
test('HV PDF: real PDF generation, one-page prescription and author metadata',async()=>{
 const r=calculateHydration({access:'central',weight:2,fluid:100,vig:5,doseUnit:'perKgDay',na:1.7,k:1.34,ca:0.5,mg:0.8,concentrations:{na:1.7,k:1.34,ca:0.5,mg:0.8}});
 const bytes=await createHydrationReport(r),doc=await PDFLib.PDFDocument.load(bytes);
 assert.equal(doc.getPageCount(),1);assert.equal(doc.getAuthor(),'Jefferson P Guilherme');
 assert.equal(doc.getTitle(),'Hidratação venosa neonatal');
});
test('HV PDF: registra o acesso venoso e recusa mistura bloqueada em acesso periférico',async()=>{
 const base={weight:1,fluid:60,vig:5,doseUnit:'perKgDay',na:0,k:0,ca:0,mg:0,concentrations:{na:1.7,k:1.34,ca:0.5,mg:0.8}};
 const lines=[],original=PDFLib.PDFPage.prototype.drawText;
 PDFLib.PDFPage.prototype.drawText=function(text,options){lines.push(String(text));return original.call(this,text,options);};
 try{await createHydrationReport(calculateHydration({...base,access:'peripheral'}));}
 finally{PDFLib.PDFPage.prototype.drawText=original;}
 assert.ok(lines.some(l=>l.includes('Acesso: periférico')));
 const blocked=calculateHydration({...base,access:'peripheral',vig:10});
 assert.equal(blocked.canPrepare,false);
 await assert.rejects(createHydrationReport(blocked),/not exportable/);
});
