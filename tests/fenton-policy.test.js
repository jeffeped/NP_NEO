import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {FENTON_PROXY_URL} from '../fenton-config.js';
import {USAGE_ENDPOINT} from '../usage-config.js';

test('a política permite somente a própria origem e os Workers configurados de Fenton e métricas',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const {document}=parseHTML(html);
 const policies=[...document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')];
 assert.equal(policies.length,1,'A página deve declarar uma única política CSP.');
 const directives=policies[0].getAttribute('content').split(';').map(value=>value.trim().split(/\s+/));
 const connect=directives.filter(([name])=>name==='connect-src');
 assert.equal(connect.length,1,'A política precisa declarar connect-src explicitamente.');
 assert.equal(USAGE_ENDPOINT,'https://grow-neo-usage.jeffeped.workers.dev');
 const origin=new URL(FENTON_PROXY_URL).origin;
 assert.deepEqual(new Set(connect[0].slice(1)),new Set(["'self'",origin,'https://grow-neo-usage.jeffeped.workers.dev']),'O fetch da Fenton precisa estar permitido pela CSP, sem liberar outros destinos.');
});
