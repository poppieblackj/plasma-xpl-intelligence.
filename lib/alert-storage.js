'use strict';
const crypto=require('node:crypto');
const {get,put,list,del}=require('@vercel/blob');
const PREFIX='plasma-alerts/v1/subscribers/';
const HEALTH='plasma-alerts/v1/monitor-health.json';
const MAX_DEVICES=15;
const pathFor=(endpoint)=>PREFIX+crypto.createHash('sha256').update(endpoint).digest('hex')+'.json';
async function readPath(path){
 const r=await get(path,{access:'private',useCache:false});
 if(!r)return null;
 return JSON.parse(await new Response(r.stream).text());
}
async function writePath(path,value){
 await put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
}
async function listPaths(prefix){
 let cursor,found=[];
 do {
  const r=await list({prefix,limit:100,cursor});
  found.push(...(r.blobs||[]).map(b=>b.pathname));
  cursor=r.hasMore?r.cursor:undefined;
 }while(cursor&&found.length<200);
 return found;
}
module.exports={PREFIX,HEALTH,MAX_DEVICES,pathFor,readPath,writePath,listPaths,del};
