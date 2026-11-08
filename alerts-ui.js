'use strict';
/* Plasma XPL Push Notifications / browser capabilities only; subscriptions live server-side */
(()=>{
const $=id=>document.getElementById(id);
let sub=null;
const endpoint='/api/alerts-subscribe';
const msg=t=>{$('alertMessage').textContent=t};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=()=>({rapidMovePercent:Number($('alertRapid').value),price24hPercent:Number($('alertPrice24').value),walletDeltaXpl:Number($('alertWallet').value),tvl24hPercent:Number($('alertTvl').value)});
function setOptions(v){if(!v)return;for(const [k,id] of Object.entries({rapidMovePercent:'alertRapid',price24hPercent:'alertPrice24',walletDeltaXpl:'alertWallet',tvl24hPercent:'alertTvl'})){if(Number.isFinite(Number(v[k])))$(id).value=v[k]}}
async function call(action,extra={}){
 const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,subscription:sub?.toJSON(),...extra}),cache:'no-store'});
 const v=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(v.error||('HTTP '+r.status));
 return v;
}
function render(records){
 let active=!!records?.registered&&records.enabled;
 $('alertPushState').className='alert-state'+(active?' good':'');
 $('alertPushState').textContent=active?'● PUSH ENABLED':records?.registered?'◌ PUSH PAUSED':'◌ CHƯA BẬT';
 setOptions(records?.settings);
 const ev=records?.events||[];
 $('alertEventList').innerHTML=ev.length?ev.slice(0,15).map(e=>'<div class="alert-event"><strong>'+esc(e.title)+'</strong><p>'+esc(e.body)+'</p><small>'+esc(e.time?new Date(e.time).toLocaleString('vi-VN'):'')+'</small></div>').join(''):'<div class="empty">Chưa có thông báo gửi đến thiết bị này.</div>';
}
async function health(){
 try{
  const r=await fetch('/api/alerts-check',{cache:'no-store'}),j=await r.json();
  if(!r.ok)throw Error('HTTP '+r.status);
  const h=j.health,minutes=h?.time?(Date.now()-Date.parse(h.time))/60000:Infinity;
  $('alertMonitorState').textContent=!h?'NOT STARTED':minutes<=20?'RUNNING':'STALE';
  $('alertMonitorState').className='badge '+(minutes<=20?'live':'unknown');
  const rows=[['Lần quét gần nhất',h?.time?new Date(h.time).toLocaleString('vi-VN'):'Chưa có'],['Số thiết bị đăng ký',h?.subscriptions??'—'],['Push gửi ở lần quét',h?.sent??'—'],['Lỗi ở lần quét',h?.errors??'—'],['Plasma RPC',h?(h.partialWallets?'Lỗi đọc ví':'Chain ID 9745'):'Chưa kiểm tra']];
  $('alertMonitorData').innerHTML=rows.map(x=>'<div class="line"><span>'+esc(x[0])+'</span><span>'+esc(x[1])+'</span></div>').join('');
 }catch(e){$('alertMonitorState').textContent='MONITOR ERROR';$('alertMonitorState').className='badge error';$('alertMonitorData').textContent='Lỗi nguồn giám sát: '+e.message}
}
async function device(){
 if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))return false;
 const reg=await navigator.serviceWorker.register('/sw.js');
 await navigator.serviceWorker.ready;
 sub=await reg.pushManager.getSubscription();
 return true;
}
async function refresh(){
 await health();
 try{
  const r=await fetch(endpoint,{cache:'no-store'}),info=await r.json();
  if(!r.ok||!info.ready){msg('Dịch vụ Push chưa sẵn sàng. Vui lòng thử lại sau.');return}
  if(!(await device())){msg('iPhone: Mở Safari, chọn Chia sẻ → Thêm vào Màn hình chính, rồi mở Plasma XPL từ biểu tượng. iOS yêu cầu bước này để cấp quyền Push.');return}
  if(!sub){render(null);msg('Nhấn “Bật thông báo” để đăng ký thiết bị hiện tại.');return}
  const status=await call('status');render(status);msg(status.registered?'Thiết bị đã đăng ký. Quyền hệ thống: '+Notification.permission+'.':'Cần đăng ký lại: nhấn “Bật thông báo”.');
 }catch(e){msg('Không kiểm tra được Push: '+e.message)}
}
function b64ToBytes(x){let t=atob(x.replace(/-/g,'+').replace(/_/g,'/')),a=new Uint8Array(t.length);for(let i=0;i<t.length;i++)a[i]=t.charCodeAt(i);return a}
$('alertEnable').addEventListener('click',async()=>{
 const btn=$('alertEnable');btn.disabled=true;
 try{
  if(!(await device()))throw Error('Trên iPhone phải mở ứng dụng từ Màn hình chính (iOS 16.4+).');
  if((await Notification.requestPermission())!=='granted')throw Error('Thiết bị chưa cấp quyền thông báo.');
  const info=await (await fetch(endpoint,{cache:'no-store'})).json();
  if(!info.publicKey||!info.ready)throw Error('Máy chủ Push chưa sẵn sàng');
  const reg=await navigator.serviceWorker.ready;
  sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(info.publicKey)});
  const v=await call('register',{settings:options()});render(v);msg('✅ Đăng ký thành công. Bấm “Thử thông báo” để kiểm tra thiết bị.');
 }catch(e){msg('Chưa bật được Push: '+e.message)}
 finally{btn.disabled=false}
});
$('alertSave').addEventListener('click',async()=>{
 try{if(!sub)throw Error('Chưa đăng ký thiết bị');const x=await call('settings',{enabled:true,settings:options()});render(x);msg('Đã lưu ngưỡng cảnh báo lên server.')}catch(e){msg('Lưu không thành công: '+e.message)}
});
$('alertTest').addEventListener('click',async()=>{
 try{if(!sub)throw Error('Hãy bật thông báo trước');const x=await call('test');msg('Đã gửi yêu cầu Push thử. Kiểm tra thông báo hệ thống trên iPhone hoặc MacBook. '+(x.message||''))}catch(e){msg('Thử thông báo thất bại: '+e.message)}
});
$('alertDisable').addEventListener('click',async()=>{
 try{if(sub){await call('delete');await sub.unsubscribe();sub=null}render(null);msg('Đã hủy đăng ký trên thiết bị này.')}catch(e){msg('Không hủy được đăng ký: '+e.message)}
});
if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='plasma-push')refresh().catch(()=>{})});
setInterval(health,300000);
window.addEventListener('load',()=>refresh().catch(e=>msg(String(e.message||e))));
})();
