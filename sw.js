// Plasma dashboard: cache the UI shell only, never financial data
const CACHE='plasma-xpl-shell-v3';
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

/* Web Push on installed iPhone/macOS web apps (user-visible notifications only). */
self.addEventListener('push',event=>{
 let payload={};
 try{payload=event.data?.json()||{}}catch{payload={title:'Plasma XPL Alert',body:event.data?.text()||'Có tín hiệu mới'}}
 const title=String(payload.title||'Plasma XPL Alert').slice(0,110);
 const body=String(payload.body||'Có tín hiệu mới từ Plasma').slice(0,350);
 const link=String(payload.url||'/#alerts');
 const options={body,icon:'/api/brand?asset=symbol&format=png',badge:'/api/brand?asset=symbol&format=png',tag:String(payload.tag||'plasma-xpl'),data:{url:link},renotify:false};
 event.waitUntil((async()=>{
  await self.registration.showNotification(title,options);
  const cs=await self.clients.matchAll({includeUncontrolled:true,type:'window'});
  await Promise.all(cs.map(c=>c.postMessage({type:'plasma-push'})));
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const destination=new URL(event.notification.data?.url||'/#alerts',self.location.origin).href;
  const open=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const c of open){if(c.url.startsWith(self.location.origin)){await c.focus();if('navigate'in c)await c.navigate(destination);return}}
  if(self.clients.openWindow)await self.clients.openWindow(destination);
 })());
});
