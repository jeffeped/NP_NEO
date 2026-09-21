import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {clinicalReferenceLines,assessTransition,calculateEnteral,integrateNutrition} from '../enteral.js';
import {initEnteral} from '../enteral-ui.js';
import {createEnteralReport} from '../enteral-pdf.js';
const clinical={phase:'growth',birthWeight:1200,gestationalAge:30};
const all={source:'hydration',sourceLabel:'HV',parenteral:{fluid:50,calories:20,protein:0},enteral:{fluid:100,calories:75,protein:2.2},total:{fluid:150,calories:95,protein:2.2}};
test('growth comparison: deficits, exact boundaries and above range; HV ruler remains inactive',()=>{
 const lines=clinicalReferenceLines(all,clinical).join('\n');assert.match(lines,/faltam 20,00/);assert.match(lines,/faltam 1,30/);assert.equal(assessTransition(all).active,false);
 for(const total of [{calories:115,protein:3.5},{calories:140,protein:4}])assert.equal(clinicalReferenceLines({...all,total},clinical).filter(l=>l.includes('dentro da faixa')).length,2);
 assert.match(clinicalReferenceLines({...all,total:{calories:140.01,protein:4.01}},clinical).join('\n'),/acima do limite/);
});
test('no extrapolation to early phases, missing data, term infants, birthweight >=1800 or mixed PN',()=>{
 for(const c of [{phase:'oligoanuria'},{phase:'transition'},{phase:'growth'},{...clinical,birthWeight:1800},{...clinical,gestationalAge:37}])assert.doesNotMatch(clinicalReferenceLines(all,c).join('\n'),/faltam|dentro da faixa/);
 assert.doesNotMatch(clinicalReferenceLines({...all,source:'individual'},clinical).join('\n'),/faltam|dentro da faixa/);
 assert.match(clinicalReferenceLines(all,{phase:'transition'}).join('\n'),/não definem metas próprias/);
});
test('UI computes references and invalidates on phase edit',()=>{
 const {document,window}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));const el=id=>document.getElementById(id);
 initEnteral(document,()=>all.parenteral);
 for(const [id,value] of [['en-source','hydration'],['en-type','fpt_prenan'],['en-phase','growth'],['en-fm85','0']])el(id).querySelector(`[value="${value}"]`).selected=true;
 for(const [id,v] of [['en-rate','100'],['en-birth-weight','1200'],['en-gestational-age','30']])el(id).value=v;
 el('enteral-form').dispatchEvent(new window.Event('submit',{cancelable:true,bubbles:true}));
 assert.equal(el('en-errors').hidden,true);assert.equal(el('en-result').hidden,false);assert.match(el('en-clinical-reference').textContent,/faltam 14,00/);
 el('en-phase').dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(el('en-result').hidden,true);
});
vm.runInThisContext(readFileSync(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
test('PDF includes separate reference page and author',async()=>{
 const enteral=calculateEnteral({type:'fpt_prenan',rate:100});const integrated=integrateNutrition({source:'hydration',parenteral:all.parenteral,enteral});
 const bytes=await createEnteralReport({enteral,integrated,clinical});const pdf=await PDFLib.PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);assert.equal(pdf.getAuthor(),'Jefferson P Guilherme');
 if(process.env.RENDER_ENTERAL_PDF)writeFileSync('/tmp/enteral-clinical.pdf',bytes);
});
