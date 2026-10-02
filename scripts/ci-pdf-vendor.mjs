import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const modules=process.env.GROW_QA_MODULES,source=path.join(modules,'pdfjs-dist'),destination='vendor/pdfjs';
const pkg=JSON.parse(await fs.readFile(path.join(source,'package.json'),'utf8'));
if(pkg.version!=='5.6.205')throw new Error('Unexpected PDF.js version');
await fs.mkdir(destination,{recursive:true});
const files=[['legacy/build/pdf.min.mjs','pdf.min.mjs'],['legacy/build/pdf.worker.min.mjs','pdf.worker.min.mjs'],['LICENSE','LICENSE']];
const blobs=[];
for(const [from,to] of files){
 const content=await fs.readFile(path.join(source,from)),target=path.join(destination,to);
 let existing;try{existing=await fs.readFile(target);}catch{}
 if(existing&&!existing.equals(content))throw new Error('PDF.js asset differs from pinned package: '+to);
 await fs.writeFile(target,content);
 if(!existing){
  const r=await fetch('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/git/blobs',{method:'POST',headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,'Content-Type':'application/json','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify({content:content.toString('base64'),encoding:'base64'})});
  if(!r.ok)throw new Error('Unable to stage PDF.js asset: '+r.status);
  blobs.push({path:target,mode:'100644',type:'blob',sha:(await r.json()).sha,sha256:crypto.createHash('sha256').update(content).digest('hex')});
 }
}
console.log('GROW_VENDOR_BLOBS:'+JSON.stringify(blobs));
