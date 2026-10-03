const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.GROW_QA_MODULES,'playwright'));
const root=process.cwd(),out=path.join(root,'qa-output');fs.mkdirSync(out,{recursive:true});
const data={sex:'F',birthGaWeeks:25,birthGaDays:0,measurements:[{weeks:25,days:0,weightGrams:760,headCm:20.5,lengthCm:30.5},{weeks:26,days:0,weightGrams:620,headCm:21.5,lengthCm:31.5},{weeks:27,days:4,weightGrams:700,headCm:22.5,lengthCm:33.5}]};
const scoreRows=[[760,.4,0,65.5,20.5,-1.3,0,9.7,30.5,-.5,0,30.9],[620,-1.6,-2,5.5,21.5,-1.4,-.1,8.1,31.5,-.7,-.2,24.2],[700,-1.9,-2.3,2.9,22.5,-1.8,-.5,3.6,33.5,-.9,-.4,18.4]];
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html',file=path.join(root,name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',/\.m?js$/.test(name)?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.GROW_QA_CHROME?{executablePath:process.env.GROW_QA_CHROME}:{})}),requests=[],errors=[];
 try{
  const ctx=await browser.newContext({viewport:{width:1100,height:900},acceptDownloads:true});
  let fixture=null;
  await ctx.route('https://grow-neo-fenton-proxy.jeffeped.workers.dev/**',async route=>{
   const endpoint=route.request().url().split('/').at(-1);requests.push(endpoint);assert.deepEqual(route.request().postDataJSON(),data);
   await route.fulfill({status:endpoint==='zscores'?502:200,contentType:endpoint==='chart'?'image/jpeg':endpoint==='chart-pdf'?'application/pdf':'application/json',body:endpoint==='chart'?Buffer.from(fixture.jpg,'base64'):endpoint==='chart-pdf'?Buffer.from(fixture.pdf,'base64'):'{"error":"unavailable"}',headers:{'Access-Control-Allow-Origin':'*'}});
  });
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.getElementById('offline-status').textContent.includes('Pronto'));
  fixture=await page.evaluate(async({data,scoreRows})=>{
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1550;const g=canvas.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,1200,1550);g.fillStyle='#174c33';g.font='bold 42px sans-serif';g.fillText('FENTON RESPONSE SIMULATED FOR TEST',70,130);g.font='28px sans-serif';g.fillText('Fabricated measurements. Not for clinical use.',70,185);
   g.strokeStyle='#2c7250';for(let y=300;y<1300;y+=100){g.beginPath();g.moveTo(70,y);g.lineTo(1130,y);g.stroke();}
   g.font='32px sans-serif';g.fillText('Expected full chart area and credits retained.',70,1430);
   const jpg=canvas.toDataURL('image/jpeg').split(',')[1],{PDFDocument,StandardFonts}=PDFLib,doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
   const first=doc.addPage([612,792]),image=await doc.embedJpg(jpg);first.drawImage(image,{x:0,y:0,width:612,height:792});
   const p=doc.addPage([612,792]),draw=(s,x,y,size=10)=>p.drawText(String(s),{x,y,size,font}),centre=(s,x,y,size=10)=>draw(s,x-font.widthOfTextAtSize(String(s),size)/2,y,size);
   draw('Sex: Female | GA at Birth: 25 weeks',55,723);draw('SIMULATED API TABLE; FABRICATED DATA',300,750,8);
   centre('GAge',78,710);centre('(weeks)',78,695);
   centre('Weight (g)',175,710);centre('Head Circ. (cm)',327,710);centre('Length (cm)',479,710);
   const xs=[121,163,205,239,273,315,357,391,425,467,509,543];
   xs.forEach((x,i)=>centre(['Value','Z','dZ','%'][i%4],x,695,8));
   data.measurements.forEach((m,i)=>{const y=680-i*15;centre(m.weeks+(m.days?' '+m.days+'/7':''),78,y);scoreRows[i].forEach((v,j)=>centre(Number.isInteger(v)?v:v.toFixed(2),xs[j],y));});
   draw('Z scores shown above are fabricated for software verification.',55,620,8);
   const bytes=await doc.save();return {jpg,pdf:btoa(String.fromCharCode(...bytes))};
  },{data,scoreRows});
  await page.locator('#tab-enteral').click();await page.locator('#en-source').selectOption('none');await page.locator('#en-type').selectOption('lhop');await page.locator('#en-rate').fill('165');await page.locator('#en-fm85').selectOption('0.5');await page.locator('#en-phase').selectOption('growth');await page.locator('#en-birth-weight').fill('760');await page.locator('#en-gestational-age').fill('25');
  assert.equal(await page.locator('#en-result').isVisible(),false);
  await page.locator('#tab-growth').click();
  for(const [id,v] of Object.entries({'gr-birth-weight':'760','gr-ga-weeks':'25','gr-ga-days':'0','gr-initial-day':'8','gr-initial-weight':'620','gr-final-day':'19','gr-final-weight':'700'}))await page.locator('#'+id).fill(v);
  await page.locator('#gr-sex').selectOption('female');
  await page.locator('#fenton-sex').selectOption('F');await page.locator('#fenton-ga-weeks').fill('25');await page.locator('#fenton-add').click();await page.locator('#fenton-add').click();
  for(let i=0;i<data.measurements.length;i++)for(const [field,v]of Object.entries(data.measurements[i]))await page.locator('.fenton-measure').nth(i).locator('[data-field='+field+']').fill(String(v));
  assert.equal(await page.locator('#fenton-pdf-button').isVisible(),false);
  assert.equal(await page.locator('#fenton-z-button').isVisible(),false);
  assert.equal(requests.length,0);
  const download=async name=>{const pending=page.waitForEvent('download');await page.locator('#fenton-total-export').click();const f=await pending;await f.saveAs(path.join(out,name));assert.equal(await f.failure(),null);};
  await download('integrated-fabricated.pdf');
  assert.deepEqual(requests,['chart','zscores','chart-pdf']);
  const result=await page.evaluate(async base64=>{
   const lib=await import('./vendor/pdfjs/pdf.min.mjs');lib.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',location.href).href;
   const task=lib.getDocument({data:Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),isEvalSupported:false,useSystemFonts:true});
   const pdf=await task.promise,output={pages:pdf.numPages,text:[],images:[]};
   for(let n=1;n<=pdf.numPages;n++){
    const p=await pdf.getPage(n);output.text.push((await p.getTextContent()).items.map(i=>i.str).join(' '));
    const viewport=p.getViewport({scale:1.3}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;output.images.push(canvas.toDataURL('image/png').split(',')[1]);
   }
   await task.destroy();return output;
  },fs.readFileSync(path.join(out,'integrated-fabricated.pdf')).toString('base64'));
  assert.equal(result.pages,2);
  for(const value of ['25+0','26+0','27+4','760','620','700','0,40','-1,60','-1,90','65,5','5,5','2,9','7,9%'])assert.ok(result.text[0].includes(value),'Missing PDF value: '+value);
  assert.ok(result.text[0].includes('tabela extraída do PDF oficial'));assert.ok(result.text[1].includes('Fenton 2025'));
  result.images.forEach((value,i)=>{fs.writeFileSync(path.join(out,'page-'+(i+1)+'.png'),Buffer.from(value,'base64'));});
  fs.writeFileSync(path.join(out,'pdf-text.json'),JSON.stringify({pages:result.pages,text:result.text},null,2));
  await ctx.setOffline(true);await download('integrated-offline-fabricated.pdf');assert.equal(requests.length,3);await ctx.setOffline(false);
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Layout overflow '+width);
   await page.locator('.fenton-report-action').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(out,'flow-'+width+'.png')});
   assert.ok(await page.evaluate(()=>document.getElementById('fenton-total-export').getBoundingClientRect().bottom<document.getElementById('fenton-chart').getBoundingClientRect().top));
  }
  await page.locator('.fenton-exports summary').click();assert.equal(await page.locator('#fenton-pdf-button').isVisible(),true);
  const repeated=page.waitForEvent('download');await page.locator('#fenton-total-download').click();assert.equal(await (await repeated).failure(),null);
  await page.locator('.fenton-exports summary').click();
  await page.locator('.fenton-measure').nth(2).locator('[data-field=weightGrams]').fill('705');assert.equal(await page.locator('#fenton-total-download').isVisible(),false);
  data.measurements[2].weightGrams=705;scoreRows[2][0]=705;
  await page.locator('#tab-enteral').click();await page.locator('#en-rate').fill('150');await page.locator('#tab-growth').click();
  // A changed chart must be fetched again. Use a valid CSV for this second response.
  await ctx.unroute('https://grow-neo-fenton-proxy.jeffeped.workers.dev/**');
  await ctx.route('https://grow-neo-fenton-proxy.jeffeped.workers.dev/**',async route=>{
   const endpoint=route.request().url().split('/').at(-1);requests.push(endpoint);assert.deepEqual(route.request().postDataJSON(),data);
   const csv='GA (wk),Wt (g),Z,%tile,dZ(birth),Head (cm),Z,%tile,dZ(birth),Length (cm),Z,%tile,dZ(birth)\n'+data.measurements.map(m=>[`${m.weeks} ${m.days}/7`,m.weightGrams,-.5,30,0,m.headCm,-.5,30,0,m.lengthCm,-.5,30,0].join(',')).join('\n');
   await route.fulfill({status:200,contentType:endpoint==='chart'?'image/jpeg':'text/csv',body:endpoint==='chart'?Buffer.from(fixture.jpg,'base64'):csv,headers:{'Access-Control-Allow-Origin':'*'}});
  });
  await download('integrated-edited-fabricated.pdf');assert.equal(requests.length,5);
  await ctx.setOffline(true);await page.reload();await page.locator('#tab-growth').click();assert.equal(await page.locator('#fenton-figure').isVisible(),false);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  assert.ok(await page.evaluate(async()=>{const c=await caches.open('npp-neo-static-0.7.11');return (await Promise.all(['fenton-pdf-scores.js','vendor/pdfjs/pdf.min.mjs','vendor/pdfjs/pdf.worker.min.mjs'].map(p=>c.match(new URL(p,location.href).href)))).every(Boolean);}));
  assert.deepEqual(errors,[]);
  const summary={passed:true,browser:browser.version(),pdfPages:2,requests,checks:['single action from filled forms','automatic nutrition and growth calculation','PDF fallback after CSV 502','grouped Z/percentile values','fractional age','weight loss percentage','offline export','input invalidation and fresh recalculation','secondary exports collapsed','download fallback link','main action before chart','mobile widths 320/390/768','offline reader cache','no case persistence'],limitations:'Transport, graph and scores are simulated with fabricated data. Parser layout was derived from the supplied official API PDF; this does not establish clinical validation or live Fenton connectivity.'};
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(summary,null,2));console.log('GROW_BROWSER_RESULT:'+JSON.stringify(summary));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
