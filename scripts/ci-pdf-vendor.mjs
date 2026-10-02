import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const source=path.join(process.env.GROW_QA_MODULES,'pdfjs-dist');
const pkg=JSON.parse(await fs.readFile(path.join(source,'package.json'),'utf8'));
if(pkg.version!=='5.6.205')throw new Error('Unexpected PDF.js version');
const files=[['legacy/build/pdf.min.mjs','pdf.min.mjs'],['legacy/build/pdf.worker.min.mjs','pdf.worker.min.mjs'],['LICENSE','LICENSE']],verified=[];
for(const [from,to]of files){
 const expected=await fs.readFile(path.join(source,from)),target=path.join('vendor/pdfjs',to),actual=await fs.readFile(target);
 if(!actual.equals(expected))throw new Error('PDF.js asset differs from pinned package: '+to);
 verified.push({path:target,sha256:crypto.createHash('sha256').update(actual).digest('hex')});
}
console.log('GROW_PDFJS_VERIFIED:'+JSON.stringify({version:pkg.version,files:verified}));
