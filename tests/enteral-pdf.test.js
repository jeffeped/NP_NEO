import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {PDFDocument} from 'pdf-lib';
import {calculateEnteral,integrateNutrition} from '../enteral.js';

test('PDF Enteral: gera aporte nutricional total com autoria e versão',async()=>{
  const source=readFileSync(new URL('../enteral-pdf.js',import.meta.url),'utf8')
    .replace(/^import .*;\n/gm,'')
    .replace('export async function createEnteralReport','async function createEnteralReport');
  const context={PDFLib:await import('pdf-lib'),globalThis:null};
  context.globalThis=context;
  vm.runInNewContext(source+'\n;globalThis.__report=createEnteralReport;',context);
  const en=calculateEnteral({type:'lmo',lactationDays:14,rate:80});
  const integrated=integrateNutrition({parenteral:{fluid:70,calories:48,protein:2},enteral:en});
  const bytes=await context.__report({enteral:en,integrated});
  assert.ok(bytes.length>500);
  const doc=await PDFDocument.load(bytes);
  assert.equal(doc.getAuthor(),'Jefferson Guilherme');
  assert.match(doc.getTitle(),/Avaliação nutricional integrada neonatal/);
  assert.match(doc.getSubject(),/aporte nutricional total/);
  assert.equal(doc.getPageCount(),1);
});
