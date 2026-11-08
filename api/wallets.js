'use strict';
const WATCH=[
 {id:'treasury',label:'Ecosystem Treasury',address:'0xF97Ba376d3Ecb36C4472B1D3c5aaF2D158c28558',confidence:'Chưa xác minh độc lập'},
 {id:'team',label:'Team allocation',address:'0xCf54CB695A70f466fD5a271F85A7e268C2c97b25',confidence:'Chưa xác minh độc lập'},
 {id:'investor',label:'Investor allocation',address:'0xA4E25178BBc0409944df09aaebE110ce858374a4',confidence:'Chưa xác minh độc lập'}
];
const RPC='https://rpc.plasma.to';
const validHex=x=>/^0x[0-9a-f]+$/i.test(x);
async function rpc(method,params){const c=new AbortController(),t=setTimeout(()=>c.abort(),9000);try{const r=await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:c.signal});if(!r.ok)throw Error('RPC HTTP '+r.status);const j=await r.json();if(j.error)throw Error(j.error.message);return j.result}finally{clearTimeout(t)}}
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=120');
 const results=await Promise.allSettled([rpc('eth_chainId',[]),rpc('eth_blockNumber',[]),...WATCH.map(w=>rpc('eth_getBalance',[w.address,'latest']))]);
 const chainHex=results[0].status==='fulfilled'?results[0].value:null;
 const correctChain=chainHex&&parseInt(chainHex,16)===9745;
 const block=results[1].status==='fulfilled'?parseInt(results[1].value,16):null;
 const wallets=WATCH.map((w,i)=>{const s=results[i+2];let value=null; if(correctChain&&s.status==='fulfilled'&&validHex(s.value)){value=(Number(BigInt(s.value)/1000000000000n)/1e6)}return {...w,nativeXplBalance:value,explorer:'https://plasmascan.to/address/'+w.address,source:'Plasma JSON-RPC eth_getBalance',status:value===null?'unavailable':'live'};});
 res.statusCode=correctChain?200:503;
 res.end(JSON.stringify({timestamp:new Date().toISOString(),rpc:RPC,chainId:correctChain?9745:null,block,verifiedAttribution:false,explanation:'Native XPL balance only, not token holdings, vesting claims, or transaction-flow attribution. Labels are research candidates and require external verification.',wallets}));
};