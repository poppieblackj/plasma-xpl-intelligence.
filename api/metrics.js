'use strict';
const CHAINS = [
 {id:'plasma',name:'Plasma',tvl:'Plasma',dex:'Plasma',fee:'Plasma',stable:'Plasma',gecko:'plasma',token:'XPL'},
 {id:'arbitrum',name:'Arbitrum',tvl:'Arbitrum',dex:'Arbitrum',fee:'Arbitrum',stable:'Arbitrum',gecko:'arbitrum',token:'ARB'},
 {id:'optimism',name:'OP Mainnet',tvl:'OP Mainnet',dex:'Optimism',fee:'Optimism',stable:'OP Mainnet',gecko:'optimism',token:'OP'},
 {id:'sui',name:'Sui',tvl:'Sui',dex:'Sui',fee:'Sui',stable:'Sui',gecko:'sui',token:'SUI'}
];
let cached = null, cacheAt = 0;
const TIMEOUT = 10500;
async function getJson(url, options={}) {
 const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),TIMEOUT);
 try {const res=await fetch(url,{...options,signal:ctl.signal,headers:{'Accept':'application/json','User-Agent':'PlasmaOnchainDashboard/1.0',...(options.headers||{})}});
 if(!res.ok) throw new Error('HTTP '+res.status);
 return await res.json();
 }finally{clearTimeout(timer)}
}
function n(x){return x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null}
function tryGet(data,path){return path.reduce((o,k)=>o?.[k],data)}
function objectNum(data, keys){for(const path of keys){let v=tryGet(data,path);if(v!==undefined&&v!==null&&Number.isFinite(Number(v)))return Number(v)}return null}
const stableVal=d=>objectNum(d,[['totalCirculatingUSD','peggedUSD'],['totalCirculatingUSD','peggedUSD+'],['totalCirculating','peggedUSD']]);
function settled(s,source,errors){if(s.status==='fulfilled')return s.value;errors[source]=(s.reason?.message||String(s.reason)).slice(0,180);return null}
async function collect(){
 const now=new Date().toISOString(), errors={};
 const endpoints={chains:'https://api.llama.fi/v2/chains',stable:'https://stablecoins.llama.fi/stablecoinchains',prices:'https://api.coingecko.com/api/v3/simple/price?ids=plasma%2Carbitrum%2Coptimism%2Csui&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true'};
 const names=['chains','stable','prices'];
 const core=await Promise.allSettled(names.map(k=>getJson(endpoints[k])));
 let chains=settled(core[0],'DefiLlama TVL',errors),stable=settled(core[1],'DefiLlama Stablecoins',errors),prices=settled(core[2],'CoinGecko prices',errors);
 const rowPromises=CHAINS.map(async ch=>{
   const query='excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true';
   const [dexS,feeS,histS]=await Promise.allSettled([
     getJson('https://api.llama.fi/overview/dexs/'+encodeURIComponent(ch.dex)+'?'+query),
     getJson('https://api.llama.fi/overview/fees/'+encodeURIComponent(ch.fee)+'?'+query+'&dataType=dailyFees'),
     getJson('https://api.llama.fi/v2/historicalChainTvl/'+encodeURIComponent(ch.tvl))
   ]);
   const dex=settled(dexS,'DEX '+ch.name,errors),fee=settled(feeS,'Fees '+ch.name,errors),hist=settled(histS,'TVL history '+ch.name,errors);
   const tvlRow=Array.isArray(chains)?chains.find(x=>String(x.name).toLowerCase()===ch.tvl.toLowerCase()):null;
   const stRow=Array.isArray(stable)?stable.find(x=>String(x.name).toLowerCase()===ch.stable.toLowerCase()):null;
   const pr=prices?.[ch.gecko];
   const history=Array.isArray(hist)?hist.filter(x=>n(x.tvl)!==null&&n(x.date)!==null).slice(-120).map(x=>({date:n(x.date),value:n(x.tvl)})):[];
   const currentTvl=n(tvlRow?.tvl),currentStable=stRow?stableVal(stRow):null;
   const dex24=n(dex?.total24h), dex7=n(dex?.total7d);
   return {id:ch.id,name:ch.name,token:ch.token,price:n(pr?.usd),priceChange24h:n(pr?.usd_24h_change),marketCap:n(pr?.usd_market_cap),tokenVolume24h:n(pr?.usd_24h_vol),tokenPriceUpdatedAt:pr?.last_updated_at?new Date(pr.last_updated_at*1000).toISOString():null,tvl:currentTvl,stablecoins:currentStable,dex24h:dex24,dex7d:dex7,dex30d:n(dex?.total30d),fees24h:n(fee?.total24h),fees7d:n(fee?.total7d),tvlChange1d:n(tvlRow?.change_1d),tvlChange7d:n(tvlRow?.change_7d),dexChange1d:n(dex?.change_1d),dexChange7d:n(dex?.change_7d),tvlToStable:currentStable>0&&currentTvl!==null?currentTvl/currentStable:null,dexTvlTurnover:currentTvl>0&&dex24!==null?dex24/currentTvl:null,dexStableTurnover:currentStable>0&&dex24!==null?dex24/currentStable:null,history,sources:{tvl:currentTvl!==null?'live':'unavailable',stablecoins:currentStable!==null?'live':'unavailable',dex24h:dex24!==null?'live':'unavailable',fees24h:n(fee?.total24h)!==null?'live':'unavailable',price:n(pr?.usd)!==null?'live':'unavailable',history:history.length?'live':'unavailable'}};
 });
 let rows=await Promise.all(rowPromises);
 if(rows.every(x=>x.price===null)){
   try {const coinKeys=CHAINS.map(c=>'coingecko:'+c.gecko).join(',');const fallback=await getJson('https://coins.llama.fi/prices/current/'+coinKeys);
       for(const row of rows){const coin=fallback?.coins?.['coingecko:'+CHAINS.find(x=>x.id===row.id).gecko];if(coin&&Number.isFinite(Number(coin.price))){row.price=Number(coin.price);row.sources.price='fallback';}}
     }catch(e){errors['DefiLlama price fallback']=e.message}
 }
 const sources=[{name:'DeFiLlama TVL',status:Array.isArray(chains)?'OK':'ERROR',url:endpoints.chains},{name:'DeFiLlama Stablecoins',status:Array.isArray(stable)?'OK':'ERROR',url:endpoints.stable},{name:'CoinGecko Spot',status:prices?'OK':'ERROR',url:'https://www.coingecko.com/'},{name:'DeFiLlama DEX/Fees',status:rows.some(x=>x.dex24h!==null||x.fees24h!==null)?'PARTIAL':'ERROR',url:'https://defillama.com/'},{name:'Visa adjusted metrics',status:'NOT CONNECTED',url:'https://visaonchainanalytics.com/transactions'},{name:'On-chain wallet attribution',status:'NOT VERIFIED',url:'https://plasmascan.to/'}];
 return {timestamp:now,cacheSeconds:120,chains:rows,sources,errors,notes:['Real-time-like refresh: polling every 5 minutes while page is open; third-party data may be delayed.','OP values refer strictly to OP Mainnet, not entire Superchain.','Visa adjusted metrics are not represented by DeFiLlama DEX volume.','Null means unavailable or unverified, never zero.']};
}
module.exports=async function handler(req,res){
 if(req.method!=='GET'){res.statusCode=405;res.end('Method not allowed');return}
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
 try{if(cached&&Date.now()-cacheAt<120000){res.statusCode=200;res.end(JSON.stringify(cached));return}
 const out=await collect();cached=out;cacheAt=Date.now();res.statusCode=200;res.end(JSON.stringify(out))}
 catch(e){res.statusCode=503;res.end(JSON.stringify({timestamp:new Date().toISOString(),error:'Data collection failed',message:e.message}))}
};