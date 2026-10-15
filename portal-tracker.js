'use strict';
(()=>{
 if(location.hostname!=='despencou.com'||/^\/(entrar|teste|whatsapp)(\/|$)/.test(location.pathname)||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true||/bot\b|crawler|spider|headless|preview/i.test(navigator.userAgent))return;
 const endpoint='https://painel.despencou.com/coletar-site.php';
 const uuid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 let visitor;
 try{visitor=localStorage.getItem('despencou_portal_visitor');if(!/^[a-f0-9-]{20,64}$/i.test(visitor||'')){visitor=uuid();localStorage.setItem('despencou_portal_visitor',visitor);}}
 catch{try{visitor=sessionStorage.getItem('despencou_portal_visitor')||uuid();sessionStorage.setItem('despencou_portal_visitor',visitor);}catch{visitor=uuid();}}
 let lastPage='';
 function track(){
  if(document.visibilityState==='hidden')return;
  const params=new URLSearchParams(location.search);
  let path=location.pathname.replace(/\/index\.html$/,'/');
  // The legacy product URL redirects to its permanent page; count that final page only.
  if(path==='/oferta/')return;
  const section=path==='/'?(['cupons','blog'].includes(location.hash.slice(1))?location.hash.slice(1):'ofertas'):'';
  const key=path+'#'+section;if(lastPage===key)return;lastPage=key;
  let host='';try{host=new URL(document.referrer).hostname;}catch{}
  const ua=navigator.userAgent,device=/iPad|Tablet/i.test(ua)?'Tablet':/Mobi|Android|iPhone|iPod/i.test(ua)?'Celular':'Computador';
  const body={visitor,event_id:uuid(),path,section,device,referrer_host:host.slice(0,160),utm_source:(params.get('utm_source')||'').slice(0,80),utm_medium:(params.get('utm_medium')||'').slice(0,80),fbclid:params.has('fbclid'),gclid:params.has('gclid')};
  fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',track,{once:true});else track();
 window.addEventListener('hashchange',track);document.addEventListener('visibilitychange',track);
})();
