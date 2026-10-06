import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('release 0.4.0: versão e módulo Enteral estão integrados',()=>{
 const engine=readFileSync(new URL('../engine.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(engine,/VERSION = '0\\.4\\.0'/);
 assert.match(html,/id="tab-enteral"/);
 assert.match(html,/id="en-export"/);
 for(const f of ['./enteral.js','./enteral-ui.js','./enteral-pdf.js']) assert.ok(sw.includes(f),f+' ausente do cache offline');
});
