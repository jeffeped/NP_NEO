const CACHE='npp-neo-static-0.7.5';
const FILES=['./','./index.html','./styles.css','./app.js','./app-update.js','./assets/grow-neo-logo.png','./engine.js','./alerts.js','./fluid-guidance.js','./standard.js','./standard-ui.js','./standard-pdf.js','./hydration.js','./hydration-ui.js','./hydration-pdf.js','./pdf.js','./enteral.js','./enteral-ui.js','./enteral-pdf.js','./growth.js','./growth-ui.js','./fenton-ui.js','./fenton-config.js','./manifest.webmanifest','./vendor/pdf-lib.min.js','./assets/uea-logo.png','./assets/grow-neo-icon-192.png','./assets/grow-neo-icon-512.png','./assets/grow-neo-maskable-512.png','./assets/grow-neo-apple-touch-icon.png'];
FILES.push('./fenton-nutrition-pdf.js','./fenton-nutrition-ui.js','./intergrowth.js','./intergrowth-velocity.js','./intergrowth-ui.js','./intergrowth-charts.js','./intergrowth-pdf.js');
FILES.push('./dosing-weight.js','./pdf-date.js');
const URLS=new Set(FILES.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  for(const path of FILES){
    const url=new URL(path,self.registration.scope);
    const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin'}));
    if(!response.ok||response.redirected) throw new Error('Offline asset unavailable');
    if(path.endsWith('.js')&&!/javascript/.test(response.headers.get('content-type')||'')) throw new Error('Unexpected script response');
    await cache.put(url,response);
  }
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('npp-neo-static-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();
  if(event.data?.type==='CHECK_OFFLINE')event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const present=await Promise.all([...URLS].map(u=>cache.match(u)));
    event.ports[0]?.postMessage({ready:present.every(Boolean),version:CACHE});
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||url.search)return;
  const key=event.request.mode==='navigate'&&url.pathname===new URL(self.registration.scope).pathname?new URL('./index.html',self.registration.scope).href:url.href;
  if(!URLS.has(key))return;
  event.respondWith((async()=>{
    const cached=await (await caches.open(CACHE)).match(key);
    if(cached)return cached;
    return fetch(event.request);
  })());
});
