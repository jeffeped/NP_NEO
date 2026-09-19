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
