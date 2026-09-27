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
const base={weight:1,birthWeight:1,fluidPhase:'stable',day:2,gaWeeks:30,gaDays:0,fluid:100,aa:3.5,lip:4.1,vig:14,na:0,k:0,ca:0,mg:0,p:0,seDose:6,naSalt:'nacl',pSalt:'glycero',access:'central',omit:{va:true,vb:true,oligo:true,zn:true,se:true}};
test('PDF com cautela >20% e lipídios dentro do teto é exportável',async()=>{
  const result=calculate({...base,aa:2,lip:2,fluid:80,vig:11.5});assert.equal(result.canExport,true);
  const pdf=await createReport(result);const doc=await PDFLib.PDFDocument.load(pdf);
  assert.ok(doc.getPageCount()>=3);assert.equal(doc.getAuthor(),'Jefferson Guilherme');
});
test('PDF inclui discriminação do sódio aportado pelo glicerofosfato',async()=>{
  const result=calculate({...base,fluid:105,aa:2,lip:2,vig:5,na:1,p:0.4});
  assert.equal(result.sodiumBreakdown.phosphate,0.8);
  const pdf=await createReport(result);const doc=await PDFLib.PDFDocument.load(pdf);
  assert.ok(doc.getPageCount()>=2);
});
test('PDF rejeita o bloqueio periférico já existente',async()=>{
  const result=calculate({...base,access:'peripheral'});
  await assert.rejects(()=>createReport(result),/not exportable/);
});
test('PDF recusa as novas travas mesmo que solicitado diretamente',async()=>{
 for(const input of [{aa:3.6},{aa:3.5,fluid:87.4},{vig:18,fluid:100,aa:0,lip:0},{vig:12,weight:1,birthWeight:1},{lip:4.1}]){
   const result=calculate({...base,lip:2,aa:2,vig:5,...input});
   assert.equal(result.canExport,false,result.blocks.join(' | '));
   await assert.rejects(()=>createReport(result),/not exportable/);
 }
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
test('PDF Numeta 2:1 é exportável, identifica versão e recusa bloqueio clínico',async()=>{
 const {calculateStandard}=await import('../standard.js');
 const {createStandardReport}=await import('../standard-pdf.js');
 const r=calculateStandard({weight:.8,day:2,formulation:'2in1',mode:'protein',value:3,access:'central'});
 const bytes=await createStandardReport(r),doc=await PDFLib.PDFDocument.load(bytes);
 assert.equal(doc.getPageCount(),2);assert.match(doc.getTitle(),/2:1/);
 const blocked=calculateStandard({weight:.8,day:2,formulation:'2in1',mode:'fluid',value:100,access:'central'});
 assert.ok(blocked.blocks.some(x=>x.includes('Aminoácidos acima de 3,5')));
 await assert.rejects(()=>createStandardReport(blocked),/not exportable/);
});
