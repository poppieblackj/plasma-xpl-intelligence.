'use strict';
const SOURCE='https://www.plasma.org/brand/logo/';
const FILES={'symbol:svg':'plasma-symbol-dark.svg','symbol:png':'plasma-symbol-dark.png','wordmark:svg':'plasma-wordmark-dark.svg','wordmark:png':'plasma-wordmark-dark.png'};
module.exports=async(req,res)=>{
 if(req.method!=='GET'){res.status(405).end('Method Not Allowed');return}
 const asset=String(req.query.asset||'symbol'),format=String(req.query.format||'svg'),file=FILES[asset+':'+format];
 if(!file){res.status(400).end('Unsupported asset');return}
 try{
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),10500);
  let upstream;try{upstream=await fetch(SOURCE+file,{signal:ctl.signal,redirect:'follow',headers:{Accept:format==='svg'?'image/svg+xml':'image/png'}})}finally{clearTimeout(t)}
  if(!upstream.ok)throw Error('Plasma asset status '+upstream.status);
  const buf=Buffer.from(await upstream.arrayBuffer());
  if(buf.length>1500000)throw Error('Plasma asset unexpectedly large');
  if(format==='svg'&&!(/<svg[\s>]/i.test(buf.toString('utf8').slice(0,1200))))throw Error('Invalid SVG response');
  if(format==='png'&&!(buf.slice(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))))throw Error('Invalid PNG response');
  res.setHeader('Content-Type',format==='svg'?'image/svg+xml; charset=utf-8':'image/png');
  res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.status(200).send(buf);
 }catch(e){res.setHeader('Cache-Control','no-store');res.status(502).json({error:'Official Plasma logo unavailable',detail:String(e.message||e)})}
};
