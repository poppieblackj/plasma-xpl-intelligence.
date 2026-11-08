'use strict';
const SETTINGS={rapidMovePercent:2.5,price24hPercent:8,walletDeltaXpl:1000000,tvl24hPercent:12};
function clamp(v,min,max,defaultValue){let n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):defaultValue}
function parseSettings(raw){
 const x=raw&&typeof raw==='object'?raw:{};
 return {
 rapidMovePercent:clamp(x.rapidMovePercent,1,25,SETTINGS.rapidMovePercent),
 price24hPercent:clamp(x.price24hPercent,2,50,SETTINGS.price24hPercent),
 walletDeltaXpl:clamp(x.walletDeltaXpl,10000,1000000000,SETTINGS.walletDeltaXpl),
 tvl24hPercent:clamp(x.tvl24hPercent,3,60,SETTINGS.tvl24hPercent)
 };
}
function detect(snapshot,state,settings){
 const now=Date.now(),seen=state||{},cfg=parseSettings(settings),events=[];
 const price=Number(snapshot.price),price24=Number(snapshot.priceChange24h),tvl24=Number(snapshot.tvlChange1d);
 const previousPrice=Number(seen.price);
 if(Number.isFinite(price)&&price>0&&Number.isFinite(previousPrice)&&previousPrice>0){
  const pct=(price/previousPrice-1)*100;
  if(Math.abs(pct)>=cfg.rapidMovePercent)events.push({kind:'rapid_price',direction:pct>0?'up':'down',value:pct,title:'XPL biến động nhanh',body:'XPL '+(pct>0?'tăng ':'giảm ')+Math.abs(pct).toFixed(2)+'% so với lần quét trước. Giá '+price.toFixed(5)+' USD.'});
 }
 let price24Arm=seen.price24Arm||null;
 if(Number.isFinite(price24)){
  const dir=Math.abs(price24)>=cfg.price24hPercent?(price24>=0?'up':'down'):null;
  if(dir&&dir!==price24Arm)events.push({kind:'price_24h',direction:dir,value:price24,title:'XPL biến động 24 giờ',body:'XPL '+(price24>=0?'tăng ':'giảm ')+Math.abs(price24).toFixed(2)+'% trong 24h theo nguồn giá.'});
  if(!dir&&Math.abs(price24)<cfg.price24hPercent*0.8)price24Arm=null;
  else if(dir)price24Arm=dir;
 }
 let tvlArm=seen.tvlArm||null;
 if(snapshot.tvlChange1d!==null&&snapshot.tvlChange1d!==undefined&&Number.isFinite(tvl24)){
  const dir=Math.abs(tvl24)>=cfg.tvl24hPercent?(tvl24>=0?'up':'down'):null;
  if(dir&&dir!==tvlArm)events.push({kind:'tvl_24h',direction:dir,value:tvl24,title:'Plasma TVL biến động mạnh',body:'DeFi TVL '+(tvl24>=0?'tăng ':'giảm ')+Math.abs(tvl24).toFixed(2)+'% trong 24h (DeFiLlama). Không đồng nghĩa dòng tiền ví XPL.'});
  if(!dir&&Math.abs(tvl24)<cfg.tvl24hPercent*0.8)tvlArm=null;else if(dir)tvlArm=dir;
 }
 const balances={...(seen.balances||{})};
 if(snapshot.walletsVerifiedChain===true){
  for(const wallet of snapshot.wallets||[]){
   if(typeof wallet.address!=='string'||!Number.isFinite(Number(wallet.balance)))continue;
   const current=Number(wallet.balance),before=balances[wallet.address];
   if(Number.isFinite(Number(before))&&before!==null&&before!==undefined){
    const delta=current-Number(before);
    if(Math.abs(delta)>=cfg.walletDeltaXpl)events.push({kind:'wallet_balance',direction:delta>0?'in':'out',address:wallet.address,value:delta,title:'Ví theo dõi biến động số dư XPL',body:String(wallet.label).slice(0,45)+': '+(delta>0?'+':'')+delta.toLocaleString('en-US',{maximumFractionDigits:2})+' native XPL từ lần quét trước. Nhãn ví chưa xác minh; đây KHÔNG phải bằng chứng mua/bán hoặc chuyển lên CEX.'});
   }
   balances[wallet.address]=current;
  }
 }
 const newState={price:Number.isFinite(price)&&price>0?price:seen.price||null,price24Arm,tvlArm,balances,checkedAt:new Date(now).toISOString()};
 return {events,newState};
}
module.exports={parseSettings,detect};
