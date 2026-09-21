import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calculateHydration} from '../hydration.js';
import {createHydrationReport} from '../hydration-pdf.js';
vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
globalThis.fetch=async url=>({ok:true,arrayBuffer:async()=>{const b=readFileSync(url);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
test('HV PDF: real PDF generation, one-page prescription and author metadata',async()=>{
 const r=calculateHydration({weight:2,fluid:100,vig:5,doseUnit:'perKgDay',na:1.7,k:1.34,ca:0.5,mg:0.8,concentrations:{na:1.7,k:1.34,ca:0.5,mg:0.8}});
 const bytes=await createHydrationReport(r),doc=await PDFLib.PDFDocument.load(bytes);
 assert.equal(doc.getPageCount(),1);assert.equal(doc.getAuthor(),'Jefferson P Guilherme');
 assert.equal(doc.getTitle(),'Hidratação venosa neonatal');
});
