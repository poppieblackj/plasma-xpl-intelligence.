'use strict';
const crypto=require('node:crypto');
const webpush=require('web-push');
const store=require('../lib/alert-storage');
const {parseSettings}=require('../lib/alert-detector');
const SITE='https://plasma-xpl-intelligence.vercel.app';
function send(res,code,value){res.statusCode=code;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value))}
function sameOrigin(req){
 const origin=String(req.headers.origin||'');
 const host=String(req.headers.host||'');
 return origin===SITE||origin==='https://'+host&&host.endsWith('.vercel.app');
}
function validSub(s){
 try{
  let u=new URL(s.endpoint);
  return !!(u.protocol==='https:'&&s.endpoint.length<2000&&s.keys&&typeof s.keys.p256dh==='string'&&typeof s.keys.auth==='string'&&s.keys.p256dh.length>=40&&s.keys.auth.length>=10);
 }catch{return false}
}
function info(r){
 if(!r)return {registered:false,enabled:false,settings:parseSettings(),events:[]};
 return {registered:true,enabled:r.enabled!==false,settings:r.settings,events:(r.events||[]).slice(0,25),lastCheckAt:r.state?.checkedAt||null,lastTestAt:r.lastTestAt||null};
}
module.exports=async(req,res)=>{
 try{
  if(req.method==='GET'){
   send(res,200,{publicKey:process.env.VAPID_PUBLIC_KEY||null,ready:!!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.BLOB_READ_WRITE_TOKEN),monitor:'GitHub Actions scheduled ~5 min when enabled; Vercel Hobby daily fallback'});
   return;
  }
  if(req.method!=='POST'){send(res,405,{error:'Method not allowed'});return}
  if(!sameOrigin(req)){send(res,403,{error:'Cross-origin request rejected'});return}
  const body=typeof req.body==='object'?req.body:JSON.parse(req.body||'{}');
  const action=String(body.action||'');
  const sub=body.subscription;
  if(!sub||!validSub(sub)){send(res,400,{error:'Valid browser push subscription required'});return}
  const path=store.pathFor(sub.endpoint);
  let record=await store.readPath(path);
  if(action==='status'){send(res,200,info(record));return}
  if(action==='register'){
   if(!record){
    const paths=await store.listPaths(store.PREFIX);
    if(paths.length>=store.MAX_DEVICES){send(res,429,{error:'Đã đạt giới hạn 15 thiết bị đăng ký'});return}
   }
   record={...record,version:1,createdAt:record?.createdAt||new Date().toISOString(),subscription:{endpoint:sub.endpoint,expirationTime:sub.expirationTime||null,keys:{p256dh:sub.keys.p256dh,auth:sub.keys.auth}},enabled:true,settings:parseSettings(body.settings),events:record?.events||[],state:record?.state||{},lastTestAt:record?.lastTestAt||null};
   await store.writePath(path,record);
   send(res,200,{...info(record),message:'Đã lưu đăng ký vào kho riêng tư'});return;
  }
  if(!record){send(res,404,{error:'Subscription not found'});return}
  if(action==='delete'){await store.del(path);send(res,200,{registered:false});return}
  if(action==='settings'){
   record.settings=parseSettings(body.settings);record.enabled=body.enabled!==false;
   await store.writePath(path,record);send(res,200,info(record));return;
  }
  if(action==='test'){
   if(record.lastTestAt&&Date.now()-Date.parse(record.lastTestAt)<60000){send(res,429,{error:'Chỉ thử thông báo tối đa 1 lần/phút'});return}
   webpush.setVapidDetails(SITE,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
   const result=await webpush.sendNotification(record.subscription,JSON.stringify({title:'Plasma XPL · Thử thông báo',body:'Thiết bị đã kết nối thành công. Cảnh báo thực tế chỉ phát khi tín hiệu vượt ngưỡng.',tag:'plasma-push-test',url:'/#alerts'}),{TTL:300});
   record.lastTestAt=new Date().toISOString();await store.writePath(path,record);
   send(res,200,{sent:result.statusCode===201||result.statusCode===200,message:'Push provider accepted test notification'});return;
  }
  send(res,400,{error:'Unknown action'});
 }catch(e){
  const status=Number(e?.statusCode||e?.status)||500;
  if(status===404||status===410){send(res,410,{error:'Push subscription expired. Disable and enable notifications again.'});return}
  console.error('[alerts-subscribe]',e?.message);
  send(res,503,{error:'Alerts backend unavailable. Please retry.',detail:String(e.message||e).slice(0,180)});
 }
};
