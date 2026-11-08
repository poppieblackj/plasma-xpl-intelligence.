// Plasma dashboard: cache the UI shell only, never financial data
const CACHE='plasma-xpl-shell-v2';
const SHELL=['/','/manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const request=e.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){
  e.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('/',copy)).catch(()=>{})}return response}).catch(async()=>await caches.match('/')||Response.error()));return;
 }
 if(url.pathname==='/manifest.webmanifest'||url.pathname==='/sw.js'){e.respondWith(fetch(request).catch(()=>caches.match(request)));return}
});
