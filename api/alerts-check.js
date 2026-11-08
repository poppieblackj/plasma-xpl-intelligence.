'use strict';
const webpush=require('web-push');
const store=require('../lib/alert-storage');
const {detect,parseSettings}=require('../lib/alert-detector');
const {authorized}=require('../lib/alerts-auth');
const SITE='https://plasma-xpl-intelligence.vercel.app';
async function collect(){
 const urls=[SITE+'/api/metrics',SITE+'/api/wallets'];
 const x=await Promise.allSettled(urls.map(u=>fetch(u+'?alerts='+Math.floor(Date.now()/300000),{signal:AbortSignal.timeout(16000),cache:'no-store'})));
 const out=[];
 for(const item of x){if(item.status!=='fulfilled'||!item.value.ok){out.push(null);continue}try{out.push(await item.value.json())}catch{out.push(null)}}
 const [m,w]=out,p=m?.chains?.find(c=>c.id==='plasma');
 if(!p||p.price==null||!(Number(p.price)>0))throw Error('Plasma price feed unavailable; skipped check');
 const wallets=w?.chainId===9745?(w.wallets||[]).filter(x=>x.address&&x.nativeXplBalance!=null&&Number.isFinite(Number(x.nativeXplBalance))).map(x=>({address:x.address,label:x.label,balance:Number(x.nativeXplBalance)})):[];
 return {snapshot:{price:p.price,priceChange24h:p.priceChange24h,tvlChange1d:p.tvlChange1d,walletsVerifiedChain:w?.chainId===9745,wallets},partialWallets:w?.chainId!==9745,sources:{metrics:m?.timestamp||null,wallets:w?.timestamp||null,chainId:w?.chainId||null}};
}
async function monitor(){
 const paths=await store.listPaths(store.PREFIX),x=await collect();
 webpush.setVapidDetails(SITE,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
 const summary={time:new Date().toISOString(),subscriptions:paths.length,checked:0,sent:0,errors:0,partialWallets:x.partialWallets,sources:x.sources};
 for(const path of paths.slice(0,store.MAX_DEVICES)){
  try{
   const r=await store.readPath(path);if(!r||r.enabled===false)continue;
   const data=detect(x.snapshot,r.state||{},parseSettings(r.settings));
   const delivered=[];
   for(const event of data.events.slice(0,4)){
    const key=event.kind+':'+(event.address||'')+':'+event.direction;
    if(Date.now()-(r.lastEmitted?.[key]||0)<3600000)continue;
    try{
     await webpush.sendNotification(r.subscription,JSON.stringify({title:event.title,body:event.body,tag:'plasma-'+key,url:'/#alerts'}),{TTL:600,urgency:'normal'});
     delivered.push({...event,time:new Date().toISOString()});
     r.lastEmitted={...(r.lastEmitted||{}),[key]:Date.now()};
     summary.sent++;
    }catch(e){
     if(e.statusCode===404||e.statusCode===410){await store.del(path);r.expired=true;break}
     summary.errors++;console.error('Push delivery:',String(e.message||e).slice(0,130));
    }
   }
   if(r.expired)continue;
   r.state=data.newState;r.events=[...delivered,...(r.events||[])].slice(0,30);
   await store.writePath(path,r);summary.checked++;
  }catch(e){summary.errors++;console.error('Alert monitor:',String(e.message||e).slice(0,160))}
 }
 await store.writePath(store.HEALTH,summary);
 return summary;
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method==='GET'){
  try{const health=await store.readPath(store.HEALTH);res.statusCode=200;res.end(JSON.stringify({health:health||null,configured:!!(process.env.VAPID_PRIVATE_KEY&&process.env.BLOB_READ_WRITE_TOKEN)}))}
  catch(e){res.statusCode=503;res.end(JSON.stringify({error:'Health store unavailable'}))}
  return;
 }
 if(req.method!=='POST'){res.statusCode=405;res.end('{"error":"Method not allowed"}');return}
 if(!(await authorized(req))){res.statusCode=401;res.end('{"error":"Unauthorized monitor trigger"}');return}
 try{const r=await monitor();res.statusCode=200;res.end(JSON.stringify(r))}
 catch(e){console.error('Monitor check failed:',String(e.message||e));res.statusCode=503;res.end(JSON.stringify({error:'Check failed',message:String(e.message||e).slice(0,160)}))}
};
