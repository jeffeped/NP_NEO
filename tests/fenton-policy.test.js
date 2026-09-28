import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {FENTON_PROXY_URL} from '../fenton-config.js';

test('a política da página permite conectar ao Worker configurado e somente a ele além da própria origem',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const {document}=parseHTML(html);
 const policies=[...document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')];
 assert.equal(policies.length,1,'A página deve declarar uma única política CSP.');
 const directives=policies[0].getAttribute('content').split(';').map(value=>value.trim().split(/\s+/));
 const connect=directives.filter(([name])=>name==='connect-src');
 assert.equal(connect.length,1,'A política precisa declarar connect-src explicitamente.');
 const origin=new URL(FENTON_PROXY_URL).origin;
 assert.deepEqual(new Set(connect[0].slice(1)),new Set(["'self'",origin]),'O fetch da Fenton precisa estar permitido pela CSP, sem liberar outros destinos.');
});
