'use strict';
const crypto=require('node:crypto');
const REPO='poppieblackj/plasma-xpl-intelligence.';
async function githubJWT(token){
 if(!token||token.length>12000)return false;
 const bits=token.split('.');if(bits.length!==3)return false;
 let h,p;try{h=JSON.parse(Buffer.from(bits[0],'base64url')),p=JSON.parse(Buffer.from(bits[1],'base64url'))}catch{return false}
 const now=Date.now()/1000;
 if(h.alg!=='RS256'||!h.kid||p.iss!=='https://token.actions.githubusercontent.com'||p.aud!=='plasma-xpl-alert-monitor')return false;
 if(String(p.repository_id)!=='1450066795'||p.repository!==REPO||p.ref!=='refs/heads/main')return false;
 if(!['schedule','workflow_dispatch','push'].includes(p.event_name))return false;
 if(!String(p.workflow_ref||'').includes(REPO+'/.github/workflows/plasma-alerts.yml@refs/heads/main'))return false;
 if(!(p.exp>now-30)||p.nbf>now+60||p.iat>now+60)return false;
 const c=new AbortController(),t=setTimeout(()=>c.abort(),7000);
 try{
  const r=await fetch('https://token.actions.githubusercontent.com/.well-known/jwks',{signal:c.signal});
  if(!r.ok)return false;
  const jwk=(await r.json()).keys.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!jwk)return false;
  return crypto.verify('RSA-SHA256',Buffer.from(bits[0]+'.'+bits[1]),crypto.createPublicKey({key:jwk,format:'jwk'}),Buffer.from(bits[2],'base64url'));
 }catch{return false}finally{clearTimeout(t)}
}
async function authorized(req){
 const token=(String(req.headers.authorization||'').match(/^Bearer (.+)$/i)||[])[1];
 if(!token)return false;
 const s=process.env.CRON_SECRET;
 if(s&&Buffer.byteLength(token)===Buffer.byteLength(s)&&crypto.timingSafeEqual(Buffer.from(token),Buffer.from(s)))return true;
 return githubJWT(token);
}
module.exports={authorized};
