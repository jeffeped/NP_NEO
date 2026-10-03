// Synthetic inputs only. GROW_QA_MODULES and GROW_QA_CHROME follow verify-fenton-pdf.cjs.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.GROW_QA_MODULES,'playwright'));
const root=process.cwd(),out=path.resolve(process.env.GROW_QA_OUT||'qa-output');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html',file=path.resolve(root,name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',/\.m?js$/.test(name)?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.GROW_QA_CHROME?{executablePath:process.env.GROW_QA_CHROME}:{})});
 try{
  const ctx=await browser.newContext({viewport:{width:1100,height:900},acceptDownloads:true}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>document.getElementById('offline-status').textContent.includes('Pronto'));
  for(const [id,v] of Object.entries({weight:1000,'birth-weight':1000,day:8,ga:30,'ga-days':0,fluid:100,aa:3,lip:2,vig:5,na:0,k:0,ca:2,mg:0,p:.5,urea:34.1,triglycerides:265.1})){
   await page.locator('#'+id).evaluate(el=>{const details=el.closest('details');if(details)details.open=true;});
   await page.locator('#'+id).fill(String(v));
  }
  await page.locator('#fluid-phase').selectOption('stable');await page.locator('[name=access][value=central]').check();await page.locator('#salt-p').selectOption('glycero');
  for(const id of ['va','vb','oligo','zn','se']){await page.locator('#omit-'+id).evaluate(el=>el.closest('details').open=true);await page.locator('#omit-'+id).check();}
  await page.locator('#ceftriaxone').check();
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width);
  }
  await page.setViewportSize({width:390,height:900});await page.locator('#urea').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'clinical-fields-mobile.png')});
  await page.locator('#npp-form button[type=submit]').click();
  for(const id of ['UREA_HIGH','TRIGLYCERIDES_HIGH','ANABOLIC_HYPOPHOSPHATEMIA','CEFTRIAXONE_CALCIUM'])await page.locator('[data-alert-id='+id+']').waitFor();
  await page.locator('[data-ack=na]').check();assert.equal(await page.locator('#export-pdf').isEnabled(),true);
  await page.setViewportSize({width:1100,height:900});await page.locator('[data-alert-id=UREA_HIGH]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'clinical-alerts-desktop.png')});
  const download=async(id,name)=>{const pending=page.waitForEvent('download');await page.locator('#'+id).click();const file=await pending;await file.saveAs(path.join(out,name));assert.equal(await file.failure(),null);};
  await download('export-pdf','np-clinical-synthetic.pdf');
  await page.locator('#tab-parameters').click();await page.locator('#urea').fill('34');assert.equal(await page.locator('#pdf-download').isVisible(),false);
  await page.locator('#triglycerides').fill('249.9');await page.locator('#ceftriaxone').uncheck();await page.locator('#npp-form button[type=submit]').click();
  for(const id of ['UREA_HIGH','TRIGLYCERIDES_HIGH','CEFTRIAXONE_CALCIUM'])assert.equal(await page.locator('[data-alert-id='+id+']').count(),0);
  await ctx.setOffline(true);await page.reload();await page.waitForFunction(()=>document.getElementById('offline-status').textContent.includes('Você está offline'));
  assert.equal(await page.locator('#urea').inputValue(),'');assert.equal(await page.locator('#triglycerides').inputValue(),'');assert.equal(await page.locator('#ceftriaxone').isChecked(),false);
  await page.locator('#tab-standard').click();
  for(const [id,v] of Object.entries({'std-weight':1000,'std-birth-weight':1000,'std-day':8,'std-value':90}))await page.locator('#'+id).fill(String(v));
  await page.locator('#std-access').selectOption('central');await page.locator('#std-form button[type=submit]').click();
  assert.match(await page.locator('#std-alerts').textContent(),/sistema de administração da luz durante toda a infusão/);
  await download('std-export','numeta-clinical-synthetic.pdf');
  const version=await page.locator('#app-version').textContent();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({version,widths:[320,390,768],clinicalAlerts:true,optionalInputs:true,stalePdfInvalidation:true,offlinePdf:true,noCasePersistence:true,pageErrors:errors},null,2));
  console.log('Clinical browser and offline PDF checks passed, version '+version);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
