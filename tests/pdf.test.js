import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calculate} from '../engine.js';
import {createReport} from '../pdf.js';

vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
// A única requisição do gerador é o logo local; nenhuma rede nos testes.
globalThis.fetch=async url=>({ok:true,arrayBuffer:async()=>{
  const bytes=readFileSync(url);return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
}});
const base={weight:1,day:2,gaWeeks:30,gaDays:0,fluid:100,aa:3.5,lip:4.1,vig:14,na:0,k:0,ca:0,mg:0,p:0,seDose:6,naSalt:'nacl',pSalt:'glycero',access:'central',omit:{va:true,vb:true,oligo:true,zn:true,se:true}};
test('PDF com cautela >20%, AA ≥1000 g e teto lipídico continua exportável',async()=>{
  const result=calculate(base);assert.equal(result.canExport,true);
  const pdf=await createReport(result);const doc=await PDFLib.PDFDocument.load(pdf);
  assert.ok(doc.getPageCount()>=3);assert.equal(doc.getAuthor(),'Jefferson Guilherme');
});
test('PDF rejeita o bloqueio periférico já existente',async()=>{
  const result=calculate({...base,access:'peripheral'});
  await assert.rejects(()=>createReport(result),/not exportable/);
});

test('PDF Numeta inclui ofertas e mantém autoria; bloqueios não exportam',async()=>{
 const {calculateStandard}=await import('../standard.js');
 const {createStandardReport}=await import('../standard-pdf.js');
 const r=calculateStandard({weight:.8,day:1,mode:'protein',value:3.5,access:'central'});
 const bytes=await createStandardReport(r);const doc=await PDFLib.PDFDocument.load(bytes);
 assert.equal(doc.getPageCount(),2);assert.equal(doc.getAuthor(),'Jefferson Guilherme');
 await assert.rejects(()=>createStandardReport({...r,blocks:['Acesso periférico']}),/not exportable/);
 await assert.rejects(()=>createStandardReport({ok:false}),/not exportable/);
});
